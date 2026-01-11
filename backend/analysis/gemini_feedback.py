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

# System prompt for consistent AI behavior
SYSTEM_PROMPT = """You are an experienced presentation teacher. Your role is to provide clear, actionable feedback to help students improve their presentation skills. Focus on what was done well and what needs improvement. Be specific, encouraging, and constructive."""


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
    
    # Build comprehensive prompt with all available data
    pacing = analysis_data.get('pacing_metrics', {})
    transcription = analysis_data.get('transcription', {})
    pause_analysis = analysis_data.get('pause_analysis', {})
    segments = analysis_data.get('speech_segments', [])
    
    prompt = f"""{SYSTEM_PROMPT}

=== PRESENTATION ANALYSIS ===

OVERALL METRICS:
- Total duration: {analysis_data.get('duration', 0):.1f}s
- Speaking time: {pacing.get('total_speaking_time', 0):.1f}s ({pacing.get('speaking_percentage', 0):.1f}%)
- Silence time: {pacing.get('total_silence_time', 0):.1f}s
- Number of speech segments: {pacing.get('num_segments', 0)}
- Average segment length: {pacing.get('avg_segment_length', 0):.1f}s

PAUSE ANALYSIS:
- Total pauses: {pause_analysis.get('total_pauses', 0)}
- Average pause duration: {pause_analysis.get('avg_pause_duration', 0):.2f}s
- Long pauses (≥1s): {pause_analysis.get('long_pauses_count', 0)}
- Problematic pauses (≥5s): {pacing.get('num_long_pauses', 0)}
"""
    
    # Add specific pause locations
    pauses = pacing.get('pauses', [])
    if pauses:
        prompt += "\nSPECIFIC LONG PAUSES:\n"
        for pause in pauses:
            prompt += f"- {pause.get('duration', 0):.1f}s pause at {pause.get('start', 0):.1f}s\n"
    
    # Add detailed segment analysis
    if segments:
        prompt += "\nDETAILED SEGMENT ANALYSIS:\n"
        for i, seg in enumerate(segments, 1):
            features = seg.get('audio_features', {})
            prompt += f"""
Segment {i} ({seg.get('segment_id', '')}):
- Time: {seg.get('start', 0):.1f}s - {seg.get('end', 0):.1f}s (duration: {seg.get('duration', 0):.1f}s)
- Text: "{seg.get('text', '')}"
- Word count: {seg.get('word_count', 0)} words
- Speaking rate: {features.get('words_per_minute', 0):.1f} words/min
- Pitch: {features.get('pitch_mean_hz', 0):.1f} Hz (range: {features.get('pitch_range_hz', 0):.1f} Hz)
- Energy variance: {features.get('energy_variance', 0):.6f}
- Filler words: {', '.join(features.get('filler_words', [])) if features.get('filler_words') else 'None'}
"""
    
    # Add speaking rate trend analysis
    if len(segments) > 1:
        rates = [seg.get('audio_features', {}).get('words_per_minute', 0) for seg in segments]
        prompt += f"\nSPEAKING RATE TREND: {rates[0]:.1f} → {rates[-1]:.1f} wpm"
        if rates[-1] < rates[0]:
            prompt += " (SLOWING DOWN)"
        elif rates[-1] > rates[0]:
            prompt += " (SPEEDING UP)"
    
    # Add full transcription
    prompt += f'\n\nFULL TRANSCRIPTION:\n"{transcription.get("text", "No transcription available")}"'
    
    # Add comprehensive navigation data
    prompt += f"\n\nSLIDE NAVIGATION ANALYSIS:\n- Total page changes: {len(navigation_data) - 1}\n"
    
    for nav in navigation_data:
        if nav.get('method') == 'start':
            prompt += f"- Started on page {nav.get('toPage')} at 0.0s\n"
        else:
            prompt += f"- Page {nav.get('fromPage')} → {nav.get('toPage')} at {nav.get('timestamp', 0):.1f}s (via {nav.get('method')}, spent {nav.get('duration', 0):.1f}s on page {nav.get('fromPage')})\n"
    
    if pdf_path:
        prompt += f"\nPDF: {Path(pdf_path).name}"
    
    prompt += """\n\n=== YOUR TASK ===
Provide ultra-concise feedback in exactly 5 bullet points:
- 2 strengths (what was done well)
- 3 improvements (what needs work)

Requirements:
- Each bullet point must be ONE sentence only
- Use specific numbers from the data (e.g., "6.5s pause at 4.7s", "rate dropped from 95 to 78 wpm")
- Be direct and actionable (e.g., "Reduce long pauses" not "You might want to consider...")
- No explanations or elaborations
- Plain text only, no markdown formatting

Format:
Strengths:
- [one sentence]
- [one sentence]

Improvements:
- [one sentence]
- [one sentence]
- [one sentence]"""

    # Generate feedback with token limit
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
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
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content(prompt)
    
    return response.text


if __name__ == '__main__':
    # Test
    analysis_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\analysis.json"
    nav_path = r"C:\Users\perez\Desktop\intelligent_interactive_systems\sessions\test_seasion_11\attempt_1\navigation.json"
    
    feedback = generate_presentation_feedback(analysis_path, nav_path)
    print("📝 PRESENTATION FEEDBACK:")
    print("=" * 80)
    print(feedback)

