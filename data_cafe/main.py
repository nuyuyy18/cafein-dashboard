from fastapi import FastAPI, HTTPException, Query
from typing import List, Optional, Dict
import json
import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Yogyakarta Cafe API", description="API for accessing cafe data in Yogyakarta regions", version="1.0.0")

# Data Storage
CAFE_DATA: Dict[str, List[dict]] = {}
ALL_CAFES: List[dict] = []

REGIONS = {
    "sleman": "cafe_data_Sleman.json",
    "kota_yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "bantul": "cafe_data_Bantul.json",
    "kulon_progo": "cafe_data_Kulon_Progo.json",
    "gunung_kidul": "cafe_data_Gunung_Kidul.json"
}

def load_data():
    """Load data from JSON files on startup"""
    global CAFE_DATA, ALL_CAFES
    ALL_CAFES = []
    
    for region_key, filename in REGIONS.items():
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Enrich data with region info
                    for entry in data:
                        entry['region_id'] = region_key
                        entry['region_name'] = region_key.replace("_", " ").title()
                    
                    CAFE_DATA[region_key] = data
                    ALL_CAFES.extend(data)
                print(f"✓ Loaded {len(data)} cafes from {region_key}")
            except Exception as e:
                print(f"✗ Error loading {filename}: {e}")
                CAFE_DATA[region_key] = []
        else:
            print(f"✗ File not found: {filename}")
            CAFE_DATA[region_key] = []

# Load data immediately
load_data()

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Yogyakarta Cafe API",
        "total_cafes": len(ALL_CAFES),
        "regions": list(REGIONS.keys()),
        "endpoints": [
            "/cafes",
            "/cafes/{region}",
            "/search?q={query}"
        ]
    }

@app.get("/cafes", response_model=List[dict])
def get_all_cafes(skip: int = 0, limit: int = 100):
    """Get all cafes with pagination"""
    return ALL_CAFES[skip : skip + limit]

@app.get("/cafes/{region}", response_model=List[dict])
def get_cafes_by_region(region: str, skip: int = 0, limit: int = 100):
    """Get cafes by specific region (sleman, kota_yogyakarta, bantul, kulon_progo, gunung_kidul)"""
    region_key = region.lower().replace(" ", "_")
    if region_key not in CAFE_DATA:
        raise HTTPException(status_code=404, detail=f"Region '{region}' not found. Available: {list(REGIONS.keys())}")
    
    return CAFE_DATA[region_key][skip : skip + limit]

@app.get("/search", response_model=List[dict])
def search_cafes(q: str = Query(..., min_length=3, description="Search query for cafe name")):
    """Search cafes by name (case-insensitive)"""
    query = q.lower()
    results = [
        cafe for cafe in ALL_CAFES 
        if query in cafe.get('name', '').lower() or query in cafe.get('address', '').lower()
    ]
    return results[:50]  # Limit search results

@app.get("/stats")
def get_stats():
    """Get count stats per region"""
    stats = {r: len(data) for r, data in CAFE_DATA.items()}
    stats['total'] = sum(stats.values())
    return stats

@app.post("/sync")
def sync_to_supabase():
    """Sync all cafe data from JSON files to Supabase database"""
    # Initialize Supabase client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # 1. Fetch existing cafes to prevent duplicates (since unique constraint might be missing)
        existing_response = supabase.table("cafes").select("name").execute()
        existing_names = {item['name'] for item in existing_response.data}
        
        # 2. Prepare cafe data for Supabase
        cafes_to_insert = []
        for cafe in ALL_CAFES:
            name = cafe.get("name", "Unknown Cafe")
            if name in existing_names:
                continue
                
            # Parse numeric fields
            try:
                rating_str = str(cafe.get("rating", "0"))
                rating = float(rating_str.replace(",", "."))
            except ValueError:
                rating = 0.0
                
            try:
                reviews_str = str(cafe.get("reviews_count", "0"))
                # Remove commas, dots, and non-digit chars
                reviews_clean = re.sub(r"[^\d]", "", reviews_str)
                review_count = int(reviews_clean) if reviews_clean else 0
            except ValueError:
                review_count = 0

            # Map JSON fields to Supabase schema
            cafe_data = {
                "name": name,
                "address": cafe.get("address", ""),
                "phone": cafe.get("phone") if cafe.get("phone") != "N/A" else None,
                "latitude": None, # JSON has no lat/long
                "longitude": None,
                "rating": rating,
                "review_count": review_count,
                "is_active": True
            }
            cafes_to_insert.append(cafe_data)
            existing_names.add(name) # Prevent duplicates within the batch
        
        # 3. Bulk insert new cafes
        if cafes_to_insert:
            # Insert in chunks of 50 to avoid payload limits
            chunk_size = 50
            for i in range(0, len(cafes_to_insert), chunk_size):
                chunk = cafes_to_insert[i:i + chunk_size]
                supabase.table("cafes").insert(chunk).execute()
            
            message = f"Successfully inserted {len(cafes_to_insert)} new cafes."
        else:
            message = "No new cafes to sync."
            
        return {
            "success": True,
            "message": message,
            "total_synced": len(cafes_to_insert)
        }
    except Exception as e:
        print(f"Sync Error: {str(e)}") # Log to console
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
