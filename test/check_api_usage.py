import os
from dotenv import load_dotenv
import google.generativeai as genai
import requests

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    print("❌ GOOGLE_API_KEY not found in .env file")
    exit(1)

print(f"✅ API Key: {api_key[:20]}...{api_key[-10:]}")
print(f"   Full length: {len(api_key)} characters")

# Configure the API
genai.configure(api_key=api_key)

print("\n" + "="*70)
print("TESTING DIFFERENT MODELS")
print("="*70)

models_to_test = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
]

for model_name in models_to_test:
    print(f"\n🔍 Testing: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Respond with only: OK")
        print(f"   ✅ SUCCESS - Response: {response.text.strip()}")
        print(f"   ✅ This model is available and has quota!")
        break
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            print(f"   ❌ Quota exceeded")
        elif "404" in error_msg:
            print(f"   ⚠️  Model not found")
        elif "400" in error_msg:
            print(f"   ⚠️  Bad request")
        else:
            print(f"   ❌ Error: {error_msg[:100]}")

print("\n" + "="*70)
print("API KEY INFORMATION")
print("="*70)

# Try to list available models (this uses minimal quota)
print("\n📋 Attempting to list available models...")
try:
    available_models = genai.list_models()
    print("✅ Successfully connected to API!")
    print(f"\n📊 Available models for your API key:")
    count = 0
    for model in available_models:
        if count < 5:  # Show first 5
            print(f"   - {model.name}")
            count += 1
    print(f"   ... and {sum(1 for _ in available_models) - 5} more")
except Exception as e:
    print(f"❌ Could not list models: {str(e)[:200]}")

print("\n" + "="*70)
print("USAGE MONITORING LINKS")
print("="*70)
print("\n🔗 Check your actual usage at these official Google links:")
print(f"\n1. General API Usage Dashboard:")
print(f"   https://aistudio.google.com/apikey")
print(f"\n2. Quota & Rate Limits Info:")
print(f"   https://ai.google.dev/gemini-api/docs/rate-limits")
print(f"\n3. Direct Rate Limit Monitor:")
print(f"   https://ai.dev/rate-limit")

print("\n" + "="*70)
print("DIAGNOSIS")
print("="*70)
print("\n⚠️  If all models show 'Quota exceeded' but you haven't used the API:")
print("   • Your API key might be shared/used by another application")
print("   • The project might have billing disabled")
print("   • You may need to enable the Generative Language API in Google Cloud Console")
print("   • The daily quota resets at midnight UTC")
print("\n💡 Free tier limits:")
print("   • 15 requests per minute")
print("   • 1,500 requests per day")
print("   • 1 million tokens per minute")
