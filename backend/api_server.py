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
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.analysis.single_speaker_analyzer import analyze_single_speaker_presentation

app = Flask(__name__)
CORS(app)  # Allow requests from browser

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
        "audioData": "base64_encoded_audio",
        "enableTranscription": true
    }
    
    Returns analysis results
    """
    try:
        data = request.get_json()
        
        if not data or 'audioData' not in data:
            return jsonify({'error': 'No audio data provided'}), 400
        
        audio_base64 = data['audioData']
        enable_transcription = data.get('enableTranscription', True)
        
        print(f"\n📨 Received audio data: {len(audio_base64)} characters")
        
        # Create analysis output directory in project folder
        output_dir = project_root / 'analysis_results' / datetime.now().strftime('%Y%m%d_%H%M%S')
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_path = output_dir / 'audio.wav'
        analysis_json = output_dir / 'analysis.json'
        
        # Save audio data to file
        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',', 1)[1]
        
        audio_binary = base64.b64decode(audio_base64)
        with open(audio_path, 'wb') as f:
            f.write(audio_binary)
        
        print(f"💾 Saved audio to: {audio_path}")
        
        # Analyze
        print(f"🔍 Starting analysis...")
        result = analyze_single_speaker_presentation(
            str(audio_path),
            str(analysis_json),
            enable_transcription=enable_transcription
        )
        
        print(f"✅ Analysis complete! Results saved to: {output_dir}")
        
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
            'quality': result['audio_quality'],
            'transcription': result['transcription']['text'] if result['transcription'] else None
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
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
    print("  GET  /health  - Health check")
    print("  POST /analyze - Analyze audio")
    print("\n" + "="*80)
    
    app.run(host='localhost', port=5000, debug=True)
