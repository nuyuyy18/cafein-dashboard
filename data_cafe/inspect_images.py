import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY")
    exit(1)

supabase: Client = create_client(url, key)

CAFE_ID = "0db6f9aa-be2d-4b9e-a101-6efc2769d3aa"

def inspect_images():
    response = supabase.table("cafe_images").select("*").eq("cafe_id", CAFE_ID).execute()
    images = response.data
    
    print(f"Found {len(images)} images for cafe {CAFE_ID}")
    
    # Check for duplicates by URL
    seen_urls = {}
    duplicates = []
    
    for img in images:
        url = img['image_url']
        if url in seen_urls:
            duplicates.append((img['id'], url))
        else:
            seen_urls[url] = img['id']
            
    print(f"\nDuplicates: {len(duplicates)}")
    for id, url in duplicates:
        print(f"Duplicate ID: {id}, URL: {url}")
        
    print("\nAll Images:")
    for img in images:
        print(f"ID: {img['id']}, URL: {img['image_url']}")

if __name__ == "__main__":
    inspect_images()
