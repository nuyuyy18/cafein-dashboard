"""
Script to extract latitude/longitude from Google Maps links and update the cafes table.
"""
import os
import re
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY")
    exit(1)

supabase: Client = create_client(url, key)

REGIONS = {
    "sleman": "cafe_data_Sleman.json",
    "kota_yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "bantul": "cafe_data_Bantul.json",
    "kulon_progo": "cafe_data_Kulon_Progo.json",
    "gunung_kidul": "cafe_data_Gunung_Kidul.json"
}

def extract_coords_from_link(link: str) -> tuple[float, float] | None:
    """Extract latitude and longitude from Google Maps link."""
    if not link:
        return None
    
    # Pattern 1: @lat,lng,zoom in URL
    match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', link)
    if match:
        return float(match.group(1)), float(match.group(2))
    
    # Pattern 2: !3d{lat}!4d{lng} in URL
    match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', link)
    if match:
        return float(match.group(1)), float(match.group(2))
    
    # Pattern 3: ll={lat},{lng} in query params
    match = re.search(r'll=(-?\d+\.\d+),(-?\d+\.\d+)', link)
    if match:
        return float(match.group(1)), float(match.group(2))
    
    return None

def update_coordinates():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    updated = 0
    not_found = 0
    no_coords = 0
    
    for region, filename in REGIONS.items():
        filepath = os.path.join(base_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            cafes = json.load(f)
        
        print(f"\nProcessing {region}: {len(cafes)} cafes")
        
        for cafe in cafes:
            name = cafe.get('name')
            link = cafe.get('link')
            
            if not name:
                continue
                
            coords = extract_coords_from_link(link)
            
            if not coords:
                no_coords += 1
                continue
            
            lat, lng = coords
            
            # Update in database - find by name
            result = supabase.table('cafes').update({
                'latitude': lat,
                'longitude': lng
            }).eq('name', name).execute()
            
            if result.data:
                updated += 1
            else:
                not_found += 1
                
        print(f"  Updated: {updated}, Not found: {not_found}, No coords: {no_coords}")
    
    print(f"\n=== Final Summary ===")
    print(f"Total updated: {updated}")
    print(f"Not found in DB: {not_found}")
    print(f"No coordinates in link: {no_coords}")

if __name__ == "__main__":
    update_coordinates()
