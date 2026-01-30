from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
import serpapi
import os
from dotenv import load_dotenv
from typing import List, Optional

# Load environment variables
load_dotenv()

app = FastAPI()

# Configuration
SERP_API_KEY = os.getenv("SERP_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not all([SERP_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing environment variables. Please check .env file.")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# serpapi.Client does not exist in the official python library (google-search-results)
# We use GoogleSearch directly or a wrapper.
# However, to search using the client-like interface we need to use the class directly.
from serpapi import GoogleSearch


@app.get("/")
def read_root():
    return {"message": "Cafe Sync Service is running"}

# ... imports ...
import logging

# Configure logging
logging.basicConfig(
    filename='sync_log.txt',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ... (rest of code) ...

@app.post("/sync")
def sync_cafes():
    try:
        logging.info("Starting sync process...")
        print("Starting sync process...")
        
        # 1. Fetch data from SerpApi
        params = {
            "engine": "google",
            "type": "search",
            "q": "Coffeeshop in Yogyakarta",
            "ll": "@-7.7729949,110.3309142,13z",
            "start": "0",
            "num": "20"
        }
        
        logging.info(f"Searching for: {params['q']}")
        
        # Add api_key to params
        params["api_key"] = SERP_API_KEY
        search = GoogleSearch(params)
        results = search.get_dict()
        
        if "error" in results:
            raise HTTPException(status_code=500, detail=f"SerpApi error: {results['error']}")
            
        local_results = results.get("local_results", [])
        logging.info(f"Found {len(local_results)} cafes from SerpApi")
        print(f"Found {len(local_results)} cafes from SerpApi")

        # ... mapping ...
        mapped_cafes = []
        
        for place in local_results:
            # Debugging: Log keys if needed
            # logging.info(f"Place keys: {place.keys()}")
            
            gps = place.get("gps_coordinates", {})
            
            cafe_data = {
                "name": place.get("title"),
                "address": place.get("address", "Unknown Address"),
                "phone": place.get("phone"),
                "latitude": gps.get("latitude"), # Can be None
                "longitude": gps.get("longitude"), # Can be None
                "rating": place.get("rating", 0),
                "review_count": place.get("reviews", 0),
                "is_active": True
            }
            
            mapped_cafes.append(cafe_data)

        
        if not mapped_cafes:
            logging.info("No mapped cafes found.")
            return {"message": "No new cafes to sync", "count": 0}

        logging.info(f"Upserting {len(mapped_cafes)} cafes to Supabase...")
        
        synced_count = 0
        for cafe in mapped_cafes:
            try:
                # Check if exists by name
                existing = supabase.table("cafes").select("id").eq("name", cafe["name"]).execute()
                
                if existing.data:
                    cafe_id = existing.data[0]['id']
                    supabase.table("cafes").update(cafe).eq("id", cafe_id).execute()
                    logging.info(f"Updated: {cafe['name']}")
                else:
                    supabase.table("cafes").insert(cafe).execute()
                    logging.info(f"Inserted: {cafe['name']}")
                
                synced_count += 1
            except Exception as e:
                logging.error(f"Failed to sync {cafe['name']}: {str(e)}")
                print(f"Failed to sync {cafe['name']}: {str(e)}")
            
        return {
            "message": "Sync completed successfully", 
            "synced_count": synced_count,
            "total_found": len(local_results)
        }

    except Exception as e:
        logging.error(f"Error during sync: {e}")
        print(f"Error during sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
