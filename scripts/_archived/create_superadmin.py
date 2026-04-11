
import requests
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://upqwgwemuaqhnxskxbfr.supabase.co')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

payload = {
    "email": "admin@glrsdac.com",
    "password": "Admin@123"
}
headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

response = requests.post(
    f"{SUPABASE_URL}/auth/v1/signup",
    json=payload,
    headers=headers
)
print("Status:", response.status_code)
print("Response:", response.text)
