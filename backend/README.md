# Backend Analysis Module

This directory contains Python scripts for advanced presentation analysis.

## 📁 Structure

```
backend/
└── analysis/
    ├── audio_extractor.py           # Extract audio from video recordings
    ├── single_speaker_analyzer.py   # Single-speaker analysis (NEW!)
    └── presentation_analyzer.py     # Main orchestrator
```

## 🎯 Single-Speaker Focus

This system is optimized for **solo presentations** (one speaker only):
- ✅ Speech activity detection (when speaking vs silence)
- ✅ Pacing analysis (speaking time, pauses)
- ✅ Audio quality metrics
- ✅ Transcription (what was said)
- ❌ No speaker diarization needed (simplified!)

## 🔄 Data Flow

```
Browser (App) → IndexedDB → Base64 Video Data → Backend Analysis → Feedback
```

### Current Architecture

The app runs in two modes:

#### 1. **Browser Mode** (Current - Limited)
- Uses Pyodide (Python in browser)
- Limited libraries available
- Good for: Basic validation, simple checks
- File: `public/python/demo_analyze.py`

#### 2. **Backend Mode** (Full Features)
- Full Python environment
- All libraries available (pyannote, librosa, etc.)
- Good for: Speaker diarization, advanced audio analysis
- Files: This directory

## 🚀 Usage

### Option A: Quick Test (Browser Only)
The app currently uses browser-mode analysis. Click "Analyze" to test.

### Option B: Full Backend Analysis
For advanced features (speaker diarization), run analysis locally:

```python
from backend.analysis.presentation_analyzer import analyze_presentation_recording

# Get video data from IndexedDB (base64 string)
video_base64 = "data:video/webm;base64,GkXf..."

# Run analysis
results = analyze_presentation_recording(
    video_base64_data=video_base64,
    pdf_base64_data=None,  # Optional
    output_dir="./analysis_output"
)

print(results['feedback'])
``` (simplified for single speaker!)
pip install -r requirements.txt
```

### Key Libraries:
- **librosa**: Audio analysis
- **soundfile**: Audio I/O
- **openai-whisper**: Speech-to-text transcription
- **numpy, scipy**: Numerical processing📦 Requirements

Install dependencies:
```b~~HuggingFace Token~~ (Not Needed!)

Since we're doing single-speaker analysis, no speaker diarization required.
Your HuggingFace token is stored in `.env` but won't be used.extraction requires FFmpeg to be installed:
- **Windows**: Download from https://ffmpeg.org/download.html
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

### HuggingFace Token

For speaker diarization, you need a HuggingFace token:

1. Create account at https://huggingface.co
2. Accept terms for `pyannote/speaker-diarization-3.1`
3. Get token from https://huggingface.co/settings/tokens
4. Set environment variable:
   ```powershell
   $env:HF_TOKEN = "your_token_here"
   ```

## 🔧 Integration Options

### Option 1: Local Processing Script
Run analysis on saved recordings via Python script:

```python
# Extract recording from IndexedDB and save to file
# Then process locally with full capabilities
```

### Option 2: Backend Server (Recommended for Production)
Create a Flask/FastAPI server:

```python
from flask import Flask, request, jsonify
from presentation_analyzer import analyze_presentation_recording

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    video_data = request.json['video_data']
    result = analyze_presentation_recording(video_data)
    return jsonify(result)
```

### Option 3: Hybrid Approach
- Browser: Basic validation and UI
- Backend: Heavy processing (diarization, transcription)
- Communech Analysis** (`single_speaker_analyzer.py`)
   - Detect speech segments vs silence
   - Calculate pacing metrics (speaking %, pauses)
   - Analyze audio quality
   - Transcribe speech to text (Whisper)
1. **Audio Extraction** (`audio_extractor.py`)
   - Convert base64 video → binary → WAV audio
   - Mono, 16kHz (optimized for speech)

2. **Speaker Diarization** (`diarization_analyzer.py`)
   - Detect who spoke when
   - Segment by speaker
   - Calculate speaking time distribution

3. **Feedback Generation** (`presentation_analyzer.py`)
   - Combine all analysis results
   - Generate user-friendly feedback
   - Save detailed JSON results

## 🎯 Current Status

✅ **Implemented:**
- Audio extraction utility
- Speaker diarization integration
- Browser-mode demo analysis
- Project structure and documentation

⏳ **Next Steps:**
1. Test audio extraction with real recording
2. Validate diarization on presentation audio
3. Choose integration approach (local script vs server)
4. Add transcription (Whisper) if needed
5. Add slide-speech alignment analysis

## 💡 Tips

- **Recordings are large**: Consider processing in chunks
- **Browser storage limits**: IndexedDB has ~50MB limit in some browsers
- **Processing time**: Diarization takes ~1-2 min per 10 min of audio
- **Privacy**: Backend processing keeps recordings on your machine
