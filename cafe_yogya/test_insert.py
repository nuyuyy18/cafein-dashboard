from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

test_data = {
    "name": "Test Cafe Sync",
    "address": "Test Address",
    "rating": 5,
    "review_count": 0,
    "is_active": False
}

try:
    data = supabase.table("cafes").insert(test_data).execute()
    print("Insert Check: SUCCESS")
    print(data)
except Exception as e:
    print("Insert Check: FAILED")
    print(e)
