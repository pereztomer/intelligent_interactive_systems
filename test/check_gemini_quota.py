import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    print("❌ GOOGLE_API_KEY not found in .env file")
    exit(1)

print(f"✅ API Key found: {api_key[:20]}...")

# Configure the API
genai.configure(api_key=api_key)

# Try to make a simple request to test the API
print("\n🔍 Testing API with a simple request...")

try:
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    response = model.generate_content("Say 'API is working' in one word")
    
    print(f"✅ API Response: {response.text}")
    print("\n✅ Your API key is working! You have quota available.")
    print("\n📊 Note: Google doesn't provide a direct API endpoint to check remaining quota.")
    print("   You can monitor your usage at: https://ai.google.dev/gemini-api/docs/quota")
    
except Exception as e:
    error_msg = str(e)
    print(f"\n❌ API Error: {error_msg}")
    
    if "429" in error_msg or "quota" in error_msg.lower():
        print("\n⚠️  Quota exceeded! You've hit your rate limit.")
        print("   Free tier limits:")
        print("   - 15 requests per minute")
        print("   - 1,500 requests per day")
        print("\n   Solutions:")
        print("   1. Wait until tomorrow for quota reset")
        print("   2. Upgrade to a paid plan at: https://ai.google.dev/pricing")
    elif "401" in error_msg or "403" in error_msg:
        print("\n⚠️  Authentication error - check your API key")
    else:
        print("\n⚠️  Unexpected error occurred")
