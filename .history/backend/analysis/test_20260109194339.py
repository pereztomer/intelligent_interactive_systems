from google import genai
from google.genai import types

# Configure the client
client = genai.Client(api_key=api_key)

# Use the correct model name (gemini-pro is now gemini-1.5-flash or gemini-1.5-pro)
response = client.models.generate_content(
    model='gemini-1.5-flash',  # or 'gemini-1.5-pro' for more capable model
    contents='Hello, can you hear me?'
)

print(response.text)
