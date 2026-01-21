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

# System prompt for consistent AI behavior
SYSTEM_PROMPT = """You are an experienced presentation teacher. Your role is to provide clear, actionable feedback to help students improve their presentation skills. Focus on what was done well and what needs improvement. Be specific, encouraging, and constructive."""


def generate_presentation_feedback(analysis_json_path, navigation_json_path, pdf_path=None):
    """
    Generate presentation feedback using Gemini AI
    
    Args:
        analysis_json_path: Path to analysis.json file
        navigation_json_path: Path to navigation.json file
        pdf_path: Optional path to PDF file (not used, kept for compatibility)
    
    Returns:
        str: Feedback text from Gemini
    """
    # Read analysis data
    with open(analysis_json_path, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)
    
    # Read navigation data
    with open(navigation_json_path, 'r', encoding='utf-8') as f:
        navigation_data = json.load(f)
    
    # Read PDF content data (if available)
    pdf_content = []
    # PDF content extraction not implemented - will work without it
    
    # Build comprehensive prompt with all available data
    transcription = analysis_data.get('transcription', {})
    transcription_text = transcription.get('text', 'No transcription available')
    
    prompt = f"""{SYSTEM_PROMPT}

=== PRESENTATION DATA ===

1. SLIDE CONTENT (from PDF):
"""
    
    # Add PDF content page by page
    if pdf_content:
        for page in pdf_content:
            prompt += f"\nPage {page['page_number']}:\n{page['content']}\n"
    else:
        prompt += "No PDF content available.\n"
    
    prompt += f"""
2. WHAT THE USER SAID (transcription):
"{transcription_text}"

3. NAVIGATION & TIMING DATA:
Total presentation duration: {analysis_data.get('duration', 0):.1f}s
"""
    
    # Add detailed slide-by-slide timing analysis
    prompt += "\nSlide-by-slide breakdown:\n"
    for i, nav in enumerate(navigation_data):
        if nav.get('method') == 'start':
            prompt += f"- Page {nav.get('toPage')}: Started at 0.0s\n"
        else:
            duration = nav.get('duration', 0)
            prompt += f"- Page {nav.get('fromPage')}: Spent {duration:.1f}s on this page (from {nav.get('timestamp', 0) - duration:.1f}s to {nav.get('timestamp', 0):.1f}s)\n"
    
    # Add last page duration
    if navigation_data:
        last_nav = navigation_data[-1]
        last_page = last_nav.get('toPage', 1)
        last_timestamp = last_nav.get('timestamp', 0)
        total_duration = analysis_data.get('duration', 0)
        final_duration = total_duration - last_timestamp
        prompt += f"- Page {last_page}: Spent {final_duration:.1f}s on this page (from {last_timestamp:.1f}s to {total_duration:.1f}s)\n"
    
    prompt += """
=== YOUR TASK ===
Analyze the presentation and provide feedback in EXACTLY 3 sections:

1. CONTENT ANALYSIS:
   - Compare what the user said (transcription) with what's written on the slides (PDF content)
   - Did they explain the slides in a logical, coherent way?

2. TIMING ANALYSIS:
   - How did they divide time across slides, was it too fast or too long?

3. IMPROVEMENT & PRESERVATION:
   - What should they improve? (2 specific points)
   - What should they preserve/keep doing well? (2 specific point)

Format:
CONTENT:
[3 bullet points analyzing content quality]

TIMING:
[2 bullet points analyzing time management]

IMPROVEMENT & PRESERVATION:
[4 bullet points (2 improvement, 2 preservation)]

"""
    # Generate feedback with token limit
    response = client.models.generate_content(
        model='gemini-2.5-flash-exp',
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            max_output_tokens=20000
        )
    )
    
    return response.text


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

    # Generate feedback
    response = client.models.generate_content(
        model='gemini-2.0-flash-exp',
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

