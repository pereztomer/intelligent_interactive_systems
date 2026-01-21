import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    print("❌ Error: GOOGLE_API_KEY not found in .env file")
    exit(1)

# Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-pro')

# Simple test
print("🧪 Testing Gemini API...")
print("Sending: 'Hello, can you hear me?'")
print()

response = model.generate_content("Hello, can you hear me?")
print("✅ Response from Gemini:")
print(response.text)
