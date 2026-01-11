# Backend Analysis Setup Guide

## 🚀 Quick Start: Real Audio Analysis

You now have the **Export** button to save recordings and run full backend analysis!

### Step 1: Install FFmpeg

FFmpeg is required to extract audio from video.

**Windows:**
1. Download from https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add to PATH:
   ```powershell
   $env:Path += ";C:\ffmpeg\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, "User")
   ```
4. Verify:
   ```powershell
   ffmpeg -version
   ```

**Alternative (scoop):**
```powershell
scoop install ffmpeg
```

### Step 2: Test Backend Libraries

Libraries are already installed in your venv. Let's verify:

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Test imports
python -c "import librosa; import soundfile; print('✓ Audio libraries ready')"
python -c "import whisper; print('✓ Whisper ready')"
```

### Step 3: Export & Analyze Recording

**In the Web App:**
1. Go to your session
2. Find an attempt with a recording
3. Click **"Export"** button
4. Recording will download as `.webm` file

**In Terminal:**
```powershell
# Activate venv (if not already)
.\venv\Scripts\Activate.ps1

# Analyze the exported recording
python analyze_recording.py recording_1_2026-01-04.webm

# Or specify output directory
python analyze_recording.py recording_1_2026-01-04.webm ./my_analysis
```

### Step 4: View Results

The script will create an output folder with:
- `extracted_audio.wav` - Audio extracted from video
- `analysis_results.json` - Full analysis data
- Console output with summary

## 📊 What You'll Get

**Terminal Output:**
```
📊 SUMMARY:
   Duration: 38.5s
   Speaking time: 32.1s (83.4%)
   Silence: 6.4s
   Speech segments: 12
   Long pauses (>1s): 3

📝 TRANSCRIPTION:
   Today I'll present our quarterly results. We've seen significant growth...
```

**JSON File:** Complete data including:
- Speech segments with timestamps
- Pacing metrics
- Audio quality metrics
- Full transcription with word-level timestamps
- Pause analysis

## 🔧 Troubleshooting

### FFmpeg not found
```
❌ Audio extraction failed: ffmpeg error
```
**Solution:** Install FFmpeg and add to PATH (see Step 1)

### Whisper taking too long
First run downloads the Whisper model (~150MB). Subsequent runs are faster.

To skip transcription:
```python
# Edit backend/analysis/single_speaker_analyzer.py
# Change: enable_transcription=False
```

### Out of memory
Whisper "base" model is used (good balance). For lower memory:
```python
# In single_speaker_analyzer.py, line ~167
model = whisper.load_model("tiny")  # Change from "base"
```

## 🎯 Workflow

**Development Cycle:**
1. Record presentation in web app
2. Quick validation with browser "Analyze" button
3. Export recording for detailed analysis
4. Run backend script
5. Review detailed metrics
6. Iterate and improve

**Benefits:**
- ✅ Browser mode: Fast feedback loop
- ✅ Backend mode: Detailed analysis
- ✅ No server needed (local processing)
- ✅ Full control over your data

## 🚀 Next Enhancements

Once this works, we can add:
- Filler word detection ("um", "uh", "like")
- Speaking rate (words per minute)
- Slide-speech alignment
- Confidence/emotion analysis
- Batch processing multiple recordings
- Auto-import results back to web app

## 💡 Tips

- **First recording:** Test with a short 30-second recording
- **Large files:** Recordings over 100MB may take a few minutes
- **Quality:** Use a good microphone for best transcription
- **Storage:** Exported files can be deleted after analysis
