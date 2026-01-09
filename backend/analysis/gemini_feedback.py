import os
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in .env file")

client = genai.Client(api_key=api_key)


def generate_presentation_feedback(analysis_json_path, navigation_json_path, pdf_path=None):
    """
    Generate presentation feedback using Gemini AI
    
    Args:
        analysis_json_path: Path to analysis.json file
        navigation_json_path: Path to navigation.json file
        pdf_path: Optional path to PDF file
    
    Returns:
        str: Feedback text from Gemini
    """
    # Read analysis data
    with open(analysis_json_path, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)
    
    # Read navigation data
    with open(navigation_json_path, 'r', encoding='utf-8') as f:
        navigation_data = json.load(f)
    
    # Build prompt
    prompt = f"""You are an expert presentation coach. Analyze this presentation data and provide specific, actionable feedback to help improve presentation skills.

PRESENTATION ANALYSIS DATA:
- Duration: {analysis_data.get('duration', 0):.1f} seconds
- Speaking time: {analysis_data.get('pacing_metrics', {}).get('total_speaking_time', 0):.1f}s ({analysis_data.get('pacing_metrics', {}).get('speaking_percentage', 0):.1f}%)
- Speech segments: {analysis_data.get('pacing_metrics', {}).get('num_segments', 0)}
- Long pauses: {analysis_data.get('pacing_metrics', {}).get('num_long_pauses', 0)}

TRANSCRIPTION:
{analysis_data.get('transcription', {}).get('text', 'No transcription available')}

SPEECH SEGMENTS WITH METRICS:
"""
    
    # Add segment details
    for seg in analysis_data.get('speech_segments', [])[:5]:  # Limit to first 5 segments
        features = seg.get('audio_features', {})
        prompt += f"""
- Segment {seg.get('segment_id', '')}: {seg.get('duration', 0):.1f}s
  Text: {seg.get('text', '')[:100]}...
  Words/min: {features.get('words_per_minute', 0):.1f}
  Filler words: {', '.join(features.get('filler_words', [])) if features.get('filler_words') else 'None'}
"""
    
    # Add navigation info
    prompt += f"""
SLIDE NAVIGATION:
- Total page changes: {len(navigation_data) - 1}
"""
    for nav in navigation_data[:5]:  # First 5 navigation events
        if nav.get('method') != 'start':
            prompt += f"- Page {nav.get('fromPage')} → {nav.get('toPage')} at {nav.get('timestamp', 0):.1f}s (spent {nav.get('duration', 0):.1f}s on previous page)\n"
    
    if pdf_path:
        prompt += f"\nPDF PRESENTATION: Available for reference (file: {Path(pdf_path).name})"
    
    prompt += """

Provide concise, specific feedback (max 300 words) focusing on:
1. Pacing and timing issues
2. Filler word usage
3. Speaking clarity and speed
4. Slide navigation patterns
5. Overall presentation flow

Format as clear, actionable recommendations."""

    # Generate feedback
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt
    )
    
    return response.text


if __name__ == '__main__':
    # Test
    analysis_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\analysis.json"
    nav_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\navigation.json"
    
    feedback = generate_presentation_feedback(analysis_path, nav_path)
    print("📝 PRESENTATION FEEDBACK:")
    print("=" * 80)
    print(feedback)

