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

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.analysis.single_speaker_analyzer import analyze_single_speaker_presentation

app = Flask(__name__)
CORS(app)  # Allow requests from browser

# Sessions directory
SESSIONS_DIR = project_root / 'sessions'
SESSIONS_DIR.mkdir(exist_ok=True)

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
            'pacing': {
                'speakingTime': result['pacing_metrics']['total_speaking_time'],
                'silenceTime': result['pacing_metrics']['total_silence_time'],
                'speakingPercentage': result['pacing_metrics']['speaking_percentage'],
                'segments': result['pacing_metrics']['num_segments'],
                'longPauses': result['pacing_metrics']['num_long_pauses'],
            },
            'transcription': result['transcription']['text'] if result['transcription'] else None
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
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
    Save recording data (audio + navigation) to file system
    
    Expected JSON:
    {
        "sessionName": "My Presentation",
        "sessionId": 123,
        "attemptNumber": 1,
        "audioData": "base64_encoded_audio",
        "navigationEvents": [...],
        "videoData": "base64_encoded_video" (optional, for reference)
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
    print("\n" + "="*80)
    
    app.run(host='localhost', port=5000, debug=True)
