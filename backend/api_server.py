"""
Flask API server for presentation analysis
Receives audio data from browser and returns analysis results
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import tempfile
import os
import sys
import json
from pathlib import Path
from datetime import datetime
import re
import PyPDF2

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.analysis.single_speaker_analyzer import analyze_single_speaker_presentation
from backend.analysis.gemini_feedback import generate_presentation_feedback, generate_session_feedback

app = Flask(__name__)
CORS(app)  # Allow requests from browser

# Sessions directory
SESSIONS_DIR = project_root / 'sessions'
SESSIONS_DIR.mkdir(exist_ok=True)

def sanitize_filename(name):
    """Remove invalid characters from filename"""
    return re.sub(r'[<>:"/\\|?*]', '_', name)

def extract_pdf_content(pdf_path):
    """
    Extract text content from PDF file page by page
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        List of dicts with page_number and content
    """
    try:
        pages_content = []
        
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                pages_content.append({
                    'page_number': page_num + 1,  # 1-indexed for user display
                    'content': text.strip()
                })
        
        print(f"✅ Extracted {len(pages_content)} pages from PDF")
        return pages_content
        
    except Exception as e:
        print(f"❌ PDF extraction error: {str(e)}")
        return []

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Analysis server running'})

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze audio from presentation recording
    
    Expected JSON:
    {
        "audioPath": "/path/to/audio.wav",  // Path to existing audio file
        "enableTranscription": true
    }
    
    Returns analysis results
    """
    try:
        data = request.get_json()
        
        if not data or 'audioPath' not in data:
            return jsonify({'error': 'No audio path provided'}), 400
        
        audio_path = data['audioPath']
        enable_transcription = data.get('enableTranscription', True)
        
        # Verify audio file exists
        if not os.path.exists(audio_path):
            return jsonify({'error': f'Audio file not found: {audio_path}'}), 404
        
        print(f"\n🔍 Analyzing existing audio file: {audio_path}")
        
        # Create analysis output directory in the same folder as audio
        audio_dir = Path(audio_path).parent
        analysis_json = audio_dir / 'analysis.json'
        
        print(f"📊 Analysis results will be saved to: {analysis_json}")
        
        # Analyze
        print(f"🔍 Starting analysis...")
        result = analyze_single_speaker_presentation(
            str(audio_path),
            str(analysis_json),
            enable_transcription=enable_transcription
        )
        
        print(f"✅ Analysis complete! Results saved to: {analysis_json}")
        
        # Return results
        response = {
            'success': True,
            'duration': result['duration'],
            'analysisPath': str(analysis_json),  # Include path in response
            'speech_segments': result['speech_segments'],  # Include segments for speaker profile
            'pacing_metrics': result['pacing_metrics'],  # Include full metrics
            'pacing': {
                'speakingTime': result['pacing_metrics']['total_speaking_time'],
                'silenceTime': result['pacing_metrics']['total_silence_time'],
                'speakingPercentage': result['pacing_metrics']['speaking_percentage'],
                'segments': result['pacing_metrics']['num_segments'],
                'longPauses': result['pacing_metrics']['num_long_pauses'],
            },
            'transcription': result['transcription']['text'] if result['transcription'] else None,
            'geminiFeedback': None  # Gemini feedback removed - use separate AI Feedback button
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/session_feedback', methods=['POST'])
def session_feedback():
    """
    Generate session-level feedback analyzing trends across all attempts
    
    Expected JSON:
    {
        "sessionName": "My Presentation",
        "sessionId": 123
    }
    
    Returns session-level feedback
    """
    try:
        data = request.get_json()
        
        if not data or 'sessionName' not in data or 'sessionId' not in data:
            return jsonify({'error': 'Session name and ID required'}), 400
        
        session_name = data['sessionName']
        session_id = data['sessionId']
        
        # Construct session directory path
        safe_session_name = sanitize_filename(session_name)
        session_dir = SESSIONS_DIR / f"{safe_session_name}_{session_id}"
        
        if not os.path.exists(session_dir):
            return jsonify({'error': f'Session directory not found: {session_dir}'}), 404
        
        print(f"\n🤖 Generating session-level feedback for: {session_dir}")
        feedback = generate_session_feedback(str(session_dir))
        
        return jsonify({
            'success': True,
            'feedback': feedback
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/generate_feedback', methods=['POST'])
def generate_feedback():
    """
    Generate AI feedback using Gemini for an existing analysis
    
    Expected JSON:
    {
        "audioPath": "/path/to/audio.wav"  // Path to audio file with existing analysis
    }
    
    Returns Gemini feedback only
    """
    try:
        data = request.get_json()
        
        if not data or 'audioPath' not in data:
            return jsonify({'error': 'Audio path required'}), 400
        
        audio_path = Path(data['audioPath'])
        
        if not audio_path.exists():
            return jsonify({'error': f'Audio file not found: {audio_path}'}), 404
        
        # Check if analysis.json exists
        audio_dir = audio_path.parent
        analysis_json = audio_dir / 'analysis.json'
        navigation_json = audio_dir / 'navigation.json'
        
        if not analysis_json.exists():
            return jsonify({'error': 'Analysis file not found. Please run full analysis first.'}), 404
        
        if not navigation_json.exists():
            return jsonify({'error': 'Navigation file not found. Please run full analysis first.'}), 404
        
        print(f"\n🤖 Generating AI feedback with Gemini...")
        
        # Look for PDF content JSON file
        pdf_content_path = audio_dir / 'pdf_content.json'
        
        # Generate Gemini feedback with PDF content
        gemini_feedback = generate_presentation_feedback(
            str(analysis_json),
            str(navigation_json),
            str(pdf_content_path) if pdf_content_path.exists() else None
        )
        
        # Save feedback to file
        feedback_path = audio_dir / 'gemini_feedback.txt'
        with open(feedback_path, 'w', encoding='utf-8') as f:
            f.write(gemini_feedback)
        print(f"✅ Gemini feedback saved to: {feedback_path}")
        
        return jsonify({
            'success': True,
            'feedback': gemini_feedback,
            'feedbackPath': str(feedback_path)
        })
        
    except Exception as e:
        print(f"❌ Error generating AI feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def sanitize_filename(name):
    """Convert session name to safe directory name"""
    # Remove/replace unsafe characters
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    safe_name = safe_name.strip()
    return safe_name if safe_name else 'unnamed_session'


@app.route('/save_recording', methods=['POST'])
def save_recording():
    """
    Save recording data (audio + video + PDF + navigation) to file system
    
    Expected JSON:
    {
        "sessionName": "My Presentation",
        "sessionId": 123,
        "attemptNumber": 1,
        "audioData": "base64_encoded_audio",
        "videoData": "base64_encoded_video" (optional),
        "pdfData": "base64_encoded_pdf" (optional),
        "fileName": "presentation.pdf" (optional),
        "navigationEvents": [...]
    }
    
    Returns paths to saved files
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract required fields
        session_name = data.get('sessionName', 'Unnamed Session')
        session_id = data.get('sessionId')
        attempt_number = data.get('attemptNumber', 1)
        audio_base64 = data.get('audioData')
        video_base64 = data.get('videoData')
        pdf_base64 = data.get('pdfData')
        pdf_file_name = data.get('fileName', 'presentation.pdf')
        navigation_events = data.get('navigationEvents', [])
        
        if not audio_base64:
            return jsonify({'error': 'No audio data provided'}), 400
        
        # Create directory structure: sessions/session_name/attempt_X/
        safe_session_name = sanitize_filename(session_name)
        session_dir = SESSIONS_DIR / f"{safe_session_name}_{session_id}"
        attempt_dir = session_dir / f"attempt_{attempt_number}"
        attempt_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n💾 Saving recording to: {attempt_dir}")
        
        # Save audio file
        audio_path = attempt_dir / 'audio.wav'
        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',', 1)[1]
        
        audio_binary = base64.b64decode(audio_base64)
        with open(audio_path, 'wb') as f:
            f.write(audio_binary)
        
        print(f"✅ Audio saved: {audio_path}")
        
        # Save video file (if provided)
        video_path = None
        if video_base64:
            video_path = attempt_dir / 'video.webm'
            if ',' in video_base64:
                video_base64 = video_base64.split(',', 1)[1]
            
            video_binary = base64.b64decode(video_base64)
            with open(video_path, 'wb') as f:
                f.write(video_binary)
            
            print(f"✅ Video saved: {video_path}")
        
        # Save PDF file (if provided)
        pdf_path = None
        if pdf_base64:
            # Use provided filename or default to 'presentation.pdf'
            pdf_filename = pdf_file_name if pdf_file_name.endswith('.pdf') else f"{pdf_file_name}.pdf"
            pdf_path = attempt_dir / pdf_filename
            if ',' in pdf_base64:
                pdf_base64 = pdf_base64.split(',', 1)[1]
            
            pdf_binary = base64.b64decode(pdf_base64)
            with open(pdf_path, 'wb') as f:
                f.write(pdf_binary)
            
            print(f"✅ PDF saved: {pdf_path}")
            
            # Extract PDF content to JSON
            pdf_content = extract_pdf_content(pdf_path)
            if pdf_content:
                pdf_content_path = attempt_dir / 'pdf_content.json'
                with open(pdf_content_path, 'w', encoding='utf-8') as f:
                    json.dump(pdf_content, f, indent=2, ensure_ascii=False)
                print(f"✅ PDF content extracted: {pdf_content_path}")
        
        # Save navigation events JSON
        navigation_path = attempt_dir / 'navigation.json'
        with open(navigation_path, 'w', encoding='utf-8') as f:
            json.dump(navigation_events, f, indent=2)
        
        print(f"✅ Navigation data saved: {navigation_path}")
        
        # Return success with paths
        response = {
            'success': True,
            'sessionDir': str(session_dir),
            'attemptDir': str(attempt_dir),
            'audioPath': str(audio_path),
            'videoPath': str(video_path) if video_path else None,
            'pdfPath': str(pdf_path) if pdf_path else None,
            'navigationPath': str(navigation_path),
            'message': f'Recording saved successfully to {attempt_dir.name}'
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error saving recording: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*80)
    print("PRESENTATION ANALYSIS SERVER")
    print("="*80)
    print("\nStarting Flask server...")
    print("API will be available at: http://localhost:5000")
    print("\nEndpoints:")
    print("  GET  /health         - Health check")
    print("  POST /analyze        - Analyze audio")
    print("  POST /save_recording - Save recording data to file system")
    print("  POST /session_feedback - Generate session-level AI feedback")
    print("\n" + "="*80)
    
    app.run(host='localhost', port=5000, debug=True)
