"""
Simple script to test Gemini API with different models
Helps identify which models are available and working
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    print("❌ Error: GOOGLE_API_KEY not found in .env file")
    exit(1)

genai.configure(api_key=api_key)

# List of models to test
models_to_test = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',
]

print("=" * 80)
print("TESTING GEMINI MODELS")
print("=" * 80)
print(f"API Key found: {api_key[:10]}...{api_key[-4:]}\n")

# Simple test prompt
test_prompt = "Say 'Hello, this is a test' in one sentence."

# Try to list available models first
print("📋 Attempting to list available models...")
try:
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"  ✓ {model.name}")
except Exception as e:
    print(f"  ⚠️  Could not list models: {e}\n")

print("\n" + "=" * 80)
print("TESTING EACH MODEL")
print("=" * 80)

working_models = []

for model_name in models_to_test:
    print(f"\n🧪 Testing: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(test_prompt)
        print(f"  ✅ SUCCESS!")
        print(f"  Response: {response.text[:100]}...")
        working_models.append(model_name)
    except Exception as e:
        error_msg = str(e)
        if '404' in error_msg or 'not found' in error_msg.lower():
            print(f"  ❌ Model not found")
        elif 'quota' in error_msg.lower() or '429' in error_msg:
            print(f"  ⚠️  Quota exceeded (but model exists)")
            working_models.append(model_name)  # Model exists, just quota issue
        else:
            print(f"  ❌ Error: {error_msg[:100]}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
if working_models:
    print(f"✅ Working models: {', '.join(working_models)}")
    print(f"\n💡 Recommended model: {working_models[0]}")
else:
    print("❌ No working models found. Check your API key and quota.")

