import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    print("❌ GOOGLE_API_KEY not found in .env file")
    exit(1)

print(f"✅ API Key found")
print(f"\n🔍 Testing gemini-2.5-flash with a simple prompt...\n")

# Configure the API
genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say hello and confirm you're working in exactly 5 words.")
    
    print("="*60)
    print("✅ SUCCESS! API is working!")
    print("="*60)
    print(f"\nResponse: {response.text}")
    print("\n" + "="*60)
    print("✅ gemini-2.5-flash has available quota!")
    print("="*60)
    
except Exception as e:
    print("="*60)
    print("❌ FAILED")
    print("="*60)
    print(f"\nError: {str(e)[:300]}")
