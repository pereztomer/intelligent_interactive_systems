import os
import json
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in .env file")

genai.configure(api_key=api_key)


def _generate_with_fallback(prompt):
    """
    Generate content using Gemini with automatic fallback between models.
    Tries gemini-2.5-flash first, then gemini-2.5-pro if quota exceeded.
    
    Args:
        prompt: The prompt text to send to the model
    
    Returns:
        str: Generated text response
    
    Raises:
        Exception: If both models fail
    """
    # Try gemini-2.5-flash first (available and working)
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        error_str = str(e).lower()
        # If quota exceeded, try pro model
        if 'quota' in error_str or '429' in error_str or 'resourceexhausted' in error_str:
            print(f"⚠️  Quota exceeded for gemini-2.5-flash, trying gemini-2.5-pro...")
            try:
                model = genai.GenerativeModel('gemini-2.5-pro')
                response = model.generate_content(prompt)
                return response.text
            except Exception as e2:
                raise Exception(f"Both models failed. Flash error: {str(e)}, Pro error: {str(e2)}")
        else:
            # For other errors, re-raise immediately
            raise


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
    
    # Add segment details with timestamps
    for seg in analysis_data.get('speech_segments', [])[:5]:  # Limit to first 5 segments
        features = seg.get('audio_features', {})
        start_time = seg.get('start', 0)
        end_time = seg.get('end', 0)
        prompt += f"""
- Segment {seg.get('segment_id', '')}: {seg.get('duration', 0):.1f}s (at {start_time:.1f}s - {end_time:.1f}s)
  Text: {seg.get('text', '')[:100]}...
  Words/min: {features.get('words_per_minute', 0):.1f}
  Filler words: {', '.join(features.get('filler_words', [])) if features.get('filler_words') else 'None'}
"""
    
    # Add pause analysis
    pause_analysis = analysis_data.get('pause_analysis')
    if pause_analysis:
        prompt += f"""
PAUSE ANALYSIS:
- Total pauses (>300ms): {pause_analysis.get('total_pauses', 0)}
- Average pause duration: {pause_analysis.get('avg_pause_duration', 0):.2f}s
- Long pauses (>1s): {pause_analysis.get('long_pauses_count', 0)}
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

Provide VERY SHORT feedback: exactly 2-3 main points, each point a single short sentence.
Focus on the most critical issues from:
- Pacing and timing
- Filler word usage
- Speaking clarity and speed
- Slide navigation patterns

Format: One sentence per point, each point on a new line, no explanations."""

    # Generate feedback using helper function with automatic fallback
    return _generate_with_fallback(prompt)


def generate_session_feedback(session_dir):
    """
    Generate session-level feedback analyzing trends across all attempts
    
    Args:
        session_dir: Path to session directory containing attempt folders
    
    Returns:
        str: Session-level feedback text
    """
    session_path = Path(session_dir)
    attempt_dirs = sorted([d for d in session_path.iterdir() if d.is_dir() and d.name.startswith('attempt_')])
    
    if not attempt_dirs:
        return "No attempts found in this session."
    
    # Collect feedback from all attempts
    feedbacks = []
    for attempt_dir in attempt_dirs:
        feedback_file = attempt_dir / 'gemini_feedback.txt'
        if feedback_file.exists():
            with open(feedback_file, 'r', encoding='utf-8') as f:
                feedbacks.append({
                    'attempt': attempt_dir.name,
                    'feedback': f.read()
                })
    
    if not feedbacks:
        return "No feedback files found. Please analyze attempts first."
    
    # Build prompt
    prompt = f"""You are an expert presentation coach. Analyze feedback from {len(feedbacks)} presentation attempts and provide session-level insights.

ATTEMPT FEEDBACKS:
"""
    for i, fb in enumerate(feedbacks, 1):
        prompt += f"\n--- Attempt {i} ({fb['attempt']}) ---\n{fb['feedback']}\n"
    
    prompt += f"""
Provide VERY SHORT session-level analysis: exactly 2-3 main points, each point a single short sentence.
Focus on:
- Overall improvement trends
- Persistent issues
- Key recommendations

Format: One sentence per point, no explanations."""

    # Generate feedback using helper function with automatic fallback
    return _generate_with_fallback(prompt)


if __name__ == '__main__':
    # Test
    analysis_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\analysis.json"
    nav_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\navigation.json"
    
    feedback = generate_presentation_feedback(analysis_path, nav_path)
    print("📝 PRESENTATION FEEDBACK:")
    print("=" * 80)
    print(feedback)

