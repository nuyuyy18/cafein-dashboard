"""
Script to list all images for a specific cafe to analyze patterns
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

CAFE_ID = "e2696e38-dd7a-4f90-b25c-161388a1dd9d"

response = supabase.table("cafe_images").select("id, image_url").eq("cafe_id", CAFE_ID).execute()

print(f"Found {len(response.data)} images")
for i, img in enumerate(response.data):
    print(f"{i}: {img['id'][:8]}... {img['image_url']}")
