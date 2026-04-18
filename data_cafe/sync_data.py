import json
import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

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

DAYS_MAP = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
    "Thursday": 4, "Friday": 5, "Saturday": 6
}

def parse_hours(hours_list):
    parsed_hours = []
    # hours_list example: ["Tuesday \t 8.00 am–11.00 pm \t ", ...]
    for item in hours_list:
        try:
            # Clean string
            clean_item = item.strip().replace('\t', ' ')
            # Extract day
            day_found = None
            for day_name, day_idx in DAYS_MAP.items():
                if day_name in clean_item:
                    day_found = day_idx
                    break
            
            if day_found is not None:
                # Extract time range
                # Regex for "8.00 am–11.00 pm" or "8.00 am–11.00 pm" (unicode spaces)
                time_match = re.search(r'(\d{1,2}[\.:]\d{2})\s*[aApP][mM]\s*[–-]\s*(\d{1,2}[\.:]\d{2})\s*[aApP][mM]', clean_item)
                if time_match:
                    open_time = convert_to_24h(time_match.group(0).split('–')[0].strip()) # Simplified for now
                    close_time = convert_to_24h(time_match.group(0).split('–')[1].strip())
                    
                    # Better parsing because split by dash might fail if dash is different char
                    # Let's try to match open and close separately if needed, but regex above captures groups?
                    # Actually re.search returns match object.
                    
                    # Re-do regex to capture groups
                    complex_match = re.search(r'(\d{1,2}[\.:]\d{2}\s*[aApP][mM])\s*[–-]\s*(\d{1,2}[\.:]\d{2}\s*[aApP][mM])', clean_item)
                    if complex_match:
                         open_str = complex_match.group(1)
                         close_str = complex_match.group(2)
                         parsed_hours.append({
                             "day_of_week": day_found,
                             "open_time": convert_to_24h(open_str),
                             "close_time": convert_to_24h(close_str),
                             "is_closed": False
                         })
                    else:
                        # Maybe 24h format? or "Closed"?
                        if "24 hours" in clean_item:
                             parsed_hours.append({
                                 "day_of_week": day_found,
                                 "open_time": "00:00",
                                 "close_time": "23:59",
                                 "is_closed": False
                             })
                        elif "Closed" in clean_item:
                             parsed_hours.append({
                                 "day_of_week": day_found,
                                 "open_time": None,
                                 "close_time": None,
                                 "is_closed": True
                             })
        except Exception as e:
            # print(f"Error parsing hours '{item}': {e}")
            pass
    return parsed_hours

def convert_to_24h(time_str):
    try:
        # Replace dot with colon if needed, remove unicode spaces
        clean = time_str.replace('.', ':').replace('\u202f', ' ').strip()
        dt = datetime.strptime(clean, '%I:%M %p')
        return dt.strftime('%H:%M:00')
    except Exception as e:
        # print(f"Time parse error {time_str}: {e}")
        return None

def sync_data(input_files=None):
    all_cafes = []
    
    if input_files is None:
        print("Loading data from default JSON files...")
        input_files = [filename for filename in REGIONS.values() if os.path.exists(filename)]
    
    for filename in input_files:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_cafes.extend(data)

    print(f"Total cafes loaded: {len(all_cafes)}")

    # Fetch existing cafes to link IDs
    print("Fetching existing map...")
    cafe_map = {} # name -> id
    
    page = 0
    while True:
        res = supabase.table("cafes").select("id, name").range(page*1000, (page+1)*1000 - 1).execute()
        if not res.data: break
        for c in res.data:
            cafe_map[c['name']] = c['id']
        page += 1
        if len(res.data) < 1000: break
    
    print(f"Mapped {len(cafe_map)} existing cafes.")

    hours_data = []
    reviews_data = []
    images_data = []
    menus_data = []
    cafes_update_data = []
    
    # Track which cafes we are updating so we can clean them up first
    synced_cafe_ids = []

    print("Processing rich data...")
    for cafe in all_cafes:
        name = cafe.get("name")
        if not name or name not in cafe_map:
            # If cafe doesn't exist, we might need to create it?
            # For now, let's assume cafes were created by an earlier batch or create them if missing.
            # Let's try to create them if missing.
            try:
                print(f"      [NEW] Creating cafe: {name}")
                new_cafe = {
                    "name": name,
                    "address": cafe.get("address", ""),
                    "phone": cafe.get("phone", ""),
                    "category": cafe.get("category", ""),
                    "is_active": True
                }
                res = supabase.table("cafes").insert(new_cafe).execute()
                if res.data:
                    cafe_id_db = res.data[0]['id']
                    cafe_map[name] = cafe_id_db
                else: continue
            except: continue
            
        cafe_id_db = cafe_map[name]
        synced_cafe_ids.append(cafe_id_db)

        # 1. Operating Hours
        if "opening_hours" in cafe and isinstance(cafe["opening_hours"], list):
            parsed = parse_hours(cafe["opening_hours"])
            for h in parsed:
                h["cafe_id"] = cafe_id_db
                hours_data.append(h)

        # Update Cafe Stats
        try:
            r_val = str(cafe.get("rating", "0")).replace(',', '.')
            rating = float(r_val) if r_val else 0
        except:
            rating = 0
            
        try:
            rc_val = cafe.get("reviews_count") or cafe.get("review_count") or 0
            if isinstance(rc_val, str):
                rc_val = re.sub(r'[^\d]', '', rc_val)
            review_count = int(rc_val)
        except:
            review_count = 0
            
        cafes_update_data.append({
            "id": cafe_id_db,
            "rating": rating,
            "review_count": review_count
        })

        # 2. Images & Menu
        
        # Cafe Photos -> cafe_images
        photos = cafe.get("photos", [])
        if isinstance(photos, list):
            for i, url in enumerate(photos):
                if url:
                    images_data.append({
                        "cafe_id": cafe_id_db,
                        "image_url": url,
                        "is_primary": i == 0
                    })
                    
        # Menu Photos -> cafe_menus (name='Foto Menu')
        menu_obj = cafe.get("menu", {})
        if isinstance(menu_obj, dict):
            img_list = menu_obj.get("images", [])
            for url in img_list:
                if url:
                    menus_data.append({
                        "cafe_id": cafe_id_db,
                        "name": "Foto Menu",
                        "price": 0,
                        "category": "food",
                        "description": url, # We store HD URL in description for our custom UI
                        "is_available": True
                    })
            
            menu_link = menu_obj.get("link")
            if menu_link:
                menus_data.append({
                    "cafe_id": cafe_id_db,
                    "name": "Link Menu",
                    "price": 0,
                    "category": "non_coffee",
                    "description": menu_link,
                    "is_available": True
                })

        # 3. Reviews
        reviews = cafe.get("customer_reviews", [])
        if isinstance(reviews, list):
            for rev in reviews:
                try:
                    r_star = int(re.search(r'\d', str(rev.get("rating", "5"))).group())
                except:
                    r_star = 5
                
                comment = rev.get("text", "")
                author = rev.get("author", "Anonymous")
                full_comment = f"[{author}] {comment}" if comment else f"Rating by {author}"

                reviews_data.append({
                    "cafe_id": cafe_id_db,
                    "rating": r_star,
                    "comment": full_comment,
                    "user_id": None,
                    "is_admin_created": False
                })

    print(f"Prepared {len(hours_data)} hours, {len(images_data)} images, {len(reviews_data)} reviews.")

    # --- CLEANUP STEP ---
    # Delete existing child data for these cafes to avoid duplicates
    if synced_cafe_ids:
        print(f"Cleaning existing data for {len(synced_cafe_ids)} cafes...")
        # Since Supabase filter size is limited, we might need to batch deletions if many
        for i in range(0, len(synced_cafe_ids), 100):
            chunk = synced_cafe_ids[i:i+100]
            try:
                supabase.table("operating_hours").delete().in_("cafe_id", chunk).execute()
                supabase.table("cafe_images").delete().in_("cafe_id", chunk).execute()
                supabase.table("cafe_menus").delete().in_("cafe_id", chunk).execute()
                supabase.table("reviews").delete().in_("cafe_id", chunk).execute()
            except Exception as e:
                print(f"      Cleanup error: {e}")

    # Batch Insert Helper
    def batch_insert(table, data, batch_size=50):
        if not data: return
        print(f"Inserting into {table}...")
        for i in range(0, len(data), batch_size):
            chunk = data[i:i+batch_size]
            try:
                supabase.table(table).insert(chunk).execute()
            except: pass
        print(f"Done {table}.")

    batch_insert("operating_hours", hours_data)
    batch_insert("cafe_images", images_data)
    batch_insert("reviews", reviews_data)
    batch_insert("cafe_menus", menus_data)
    
    print(f"Updating stats for {len(cafes_update_data)} cafes...")
    for update_item in cafes_update_data:
        try:
            supabase.table("cafes").update({
                "rating": update_item["rating"], 
                "review_count": update_item["review_count"]
            }).eq("id", update_item["id"]).execute()
        except: pass
    print("Done sync.")

import sys
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Run for specific files: python sync_data.py test_output_ekstens.json
        sync_data(sys.argv[1:])
    else:
        sync_data()

