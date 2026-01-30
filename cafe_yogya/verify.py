from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

response = supabase.table("cafes").select("id", count="exact").execute()
print(f"Total cafes: {len(response.data)}")
for cafe in response.data[:5]:
    print(f"- {cafe.get('name', 'No Name')}")
