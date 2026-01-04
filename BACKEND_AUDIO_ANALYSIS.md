# 🚀 Backend Audio Analysis - Quick Start

## Architecture

**Client (Browser):**
1. Extract audio from video recording
2. Convert to WAV format (16kHz mono)
3. Send audio data to backend API

**Server (Python):**
1. Receive audio data
2. Analyze speech (pacing, segments, pauses)
3. Transcribe audio (optional)
4. Return results to browser

**Benefits:**
- ✅ Only audio sent (much smaller than video!)
- ✅ Real analysis (not demo mode)
- ✅ Fast feedback in UI
- ✅ No file downloads needed

## Setup

### 1. Start Backend Server

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Start API server
python backend\api_server.py
```

Server will run at: `http://localhost:5000`

### 2. Use the App

The web app automatically detects if backend is running:
- ✅ **Backend available**: Uses real analysis
- 🌐 **Backend offline**: Falls back to browser demo mode

## Usage

1. **Start backend server** (terminal)
2. **Open web app** in browser (should already be running)
3. **Click "Analyze"** on any attempt
4. **Wait for analysis** (may take 30-60 seconds first time for Whisper model download)
5. **Click "View Feedback"** to see results!

## What You'll See

**Console Output (Terminal):**
```
📨 Received audio data: 1234567 characters
💾 Saved audio to temp file
🔍 Starting analysis...
✓ Audio extracted: 38.5s
✓ Speech analysis completed
✓ Transcription complete
✅ Analysis complete!
```

**Browser Feedback:**
```
🎯 BACKEND ANALYSIS RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Duration: 38.5s

📊 PACING METRICS:
   Speaking time: 32.1s (83.4%)
   Silence time: 6.4s
   Speech segments: 12
   Long pauses: 3

✅ GREAT: Good speaking pace!

🔊 AUDIO QUALITY:
   RMS Energy: 0.0823
   ✅ No clipping detected

📝 TRANSCRIPTION:
   Today I'll present our quarterly results...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Full backend analysis complete!
```

## Troubleshooting

### Backend not detected
```
Check console: Should see "🌐 Using browser analysis..."
```
**Solution:** Make sure backend server is running in terminal

### Audio extraction fails
```
Error: Failed to extract audio from video
```
**Solution:** Browser might not support audio extraction. Try a different browser (Chrome works best)

### First analysis slow
Whisper model downloads on first run (~150MB). Subsequent analyses are faster.

### CORS errors
```
Access to fetch blocked by CORS policy
```
**Solution:** Flask-CORS is installed, restart the backend server

## Performance

- **Audio extraction**: ~2-5 seconds (in browser)
- **Backend processing**: ~10-30 seconds
- **Transcription**: +15-45 seconds (optional, first run slower)

## Next Steps

Once working:
- Add filler word detection
- Calculate words per minute
- Detect awkward pauses
- Compare multiple attempts
- Export detailed reports
