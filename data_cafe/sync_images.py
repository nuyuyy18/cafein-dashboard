import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

REGIONS = {
    "sleman": "cafe_data_Sleman.json",
    "kota_yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "bantul": "cafe_data_Bantul.json",
    "kulon_progo": "cafe_data_Kulon_Progo.json",
    "gunung_kidul": "cafe_data_Gunung_Kidul.json"
}

def sync_images():
    print("Loading clean data from JSON files...")
    kept_image_urls = set()
    
    for region_key, filename in REGIONS.items():
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for cafe in data:
                    # Check cafe_images
                    if 'cafe_images' in cafe and isinstance(cafe['cafe_images'], list):
                        for img in cafe['cafe_images']:
                             url = ""
                             if isinstance(img, dict):
                                 url = img.get('image_url') or img.get('url')
                             elif isinstance(img, str):
                                 url = img
                             
                             if url:
                                 kept_image_urls.add(url)
                    
                    # Check menu images if any (though we focused on cafe_images)
                    if 'menu' in cafe and isinstance(cafe['menu'], dict):
                        img_list = cafe['menu'].get('images')
                        if isinstance(img_list, list):
                            for url in img_list:
                                if url:
                                    kept_image_urls.add(url)

    print(f"Total kept unique images in JSON: {len(kept_image_urls)}")

    print("Fetching existing images from DB...")
    # Fetch all images in batches
    db_images = [] # list of {id, image_url}
    page = 0
    batch_size = 1000
    while True:
        res = supabase.table("cafe_images").select("id, image_url").range(page*batch_size, (page+1)*batch_size - 1).execute()
        if not res.data: break
        
        db_images.extend(res.data)
        page += 1
        print(f"Fetched {len(db_images)}...", end='\r')
        if len(res.data) < batch_size: break
    
    print(f"\nTotal images in DB: {len(db_images)}")

    # Identify images to delete
    ids_to_delete = []
    urls_to_delete = []
    
    for img in db_images:
        if img['image_url'] not in kept_image_urls:
            ids_to_delete.append(img['id'])
            urls_to_delete.append(img['image_url'])

    print(f"Found {len(ids_to_delete)} images to delete (present in DB but not in Clean JSON).")

    if not ids_to_delete:
        print("No images to delete.")
        return

    # Batch delete
    print("Deleting images...")
    batch_size = 100
    total_deleted = 0
    for i in range(0, len(ids_to_delete), batch_size):
        batch_ids = ids_to_delete[i:i+batch_size]
        try:
            supabase.table("cafe_images").delete().in_("id", batch_ids).execute()
            total_deleted += len(batch_ids)
            print(f"Deleted {total_deleted}/{len(ids_to_delete)}", end='\r')
        except Exception as e:
            print(f"\nError deleting batch: {e}")

    print("\nSync complete.")

if __name__ == "__main__":
    sync_images()
