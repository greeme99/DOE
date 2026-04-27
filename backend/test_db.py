import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"Testing connection to: {url}")
try:
    sb = create_client(url, key)
    res = sb.table("projects").select("count", count="exact").limit(1).execute()
    print(f"Success! Project count: {res.count}")
except Exception as e:
    print(f"Connection failed: {e}")
