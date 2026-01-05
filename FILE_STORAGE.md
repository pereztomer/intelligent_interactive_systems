# File System Storage Guide

## Overview
This system now saves recording data to the file system instead of only storing it in the browser's IndexedDB. This enables:
- Better data persistence
- Easy access to files for analysis
- Integration with backend processing tools
- Backup and archival capabilities

## Directory Structure

When you create sessions and record attempts, files are saved to:

```
intelligent_interactive_systems/
└── sessions/
    ├── SessionName_123/
    │   ├── attempt_1/
    │   │   ├── audio.wav
    │   │   └── navigation.json
    │   ├── attempt_2/
    │   │   ├── audio.wav
    │   │   └── navigation.json
    │   └── attempt_3/
    │       ├── audio.wav
    │       └── navigation.json
    └── MyPresentation_456/
        └── attempt_1/
            ├── audio.wav
            └── navigation.json
```

### Directory Naming
- **Session folders:** `{SessionName}_{SessionID}`
  - Session name is sanitized (unsafe characters replaced with `_`)
  - Session ID ensures uniqueness
- **Attempt folders:** `attempt_{AttemptNumber}`
  - Numbered sequentially (1, 2, 3, ...)

## File Types

### 1. audio.wav
- **Format:** WAV (PCM 16-bit, 16kHz mono)
- **Source:** Extracted from video recording
- **Purpose:** For speech analysis, transcription, and audio processing
- **Size:** Typically 1-2 MB per minute of recording

### 2. navigation.json
- **Format:** JSON array
- **Content:** Timeline of PDF page navigation events
- **Purpose:** Track user's presentation flow and timing
- **Structure:**
  ```json
  [
    {
      "timestamp": 0,
      "fromPage": null,
      "toPage": 1,
      "method": "start",
      "duration": 0
    },
    {
      "timestamp": 15,
      "fromPage": 1,
      "toPage": 2,
      "method": "button",
      "duration": 15
    }
  ]
  ```

## How It Works

### When Recording Starts
1. User clicks "Start Recording"
2. System captures screen + audio
3. Navigation tracking initializes
4. Page changes are logged with timestamps

### When Recording Stops
1. User clicks "Stop Recording"
2. **Video processing:**
   - Video blob is created from recorded chunks
   - Audio is extracted from video (WAV format)
3. **Backend API call:**
   - POST to `http://localhost:5000/save_recording`
   - Sends: session info, audio data, navigation events
4. **File system save:**
   - Backend creates directory structure
   - Saves `audio.wav`
   - Saves `navigation.json`
5. **Browser storage:**
   - Video + metadata saved to IndexedDB
   - Enables video playback in the UI

### When Analysis is Run

1. User clicks "Analyze Attempt"
2. **System uses existing audio file:**
   - Sends audio file path to backend (not the audio data)
   - Backend reads the already-saved `audio.wav` file
   - No duplicate audio file is created
3. **Analysis results saved:**
   - Results saved to same directory: `analysis.json`
   - Located at: `sessions/SessionName_ID/attempt_X/analysis.json`
4. **Feedback displayed:**
   - Results shown in the UI
   - Stored in IndexedDB for quick access

### File Structure After Analysis

```
sessions/
  └── SessionName_ID/
      └── attempt_X/
          ├── audio.wav         ← Original audio
          ├── navigation.json   ← Navigation data
          └── analysis.json     ← Analysis results
```

**File System (Backend)**
- ✅ Audio files for analysis
- ✅ Navigation JSON for processing
- ✅ Persistent across browser sessions
- ✅ Accessible by other tools

**IndexedDB (Frontend)**
- ✅ Video for playback in browser
- ✅ PDF data
- ✅ Quick UI access
- ✅ Works offline

## Backend Requirements

### Starting the Backend Server

The backend must be running to save files to disk:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (if using one)
# On Windows:
..\venv\Scripts\activate
# On Mac/Linux:
source ../venv/bin/activate

# Start the server
python api_server.py
```

Server will start on `http://localhost:5000`

### API Endpoint

**POST /save_recording**

Request body:
```json
{
  "sessionName": "My Presentation",
  "sessionId": 123,
  "attemptNumber": 1,
  "audioData": "data:audio/wav;base64,...",
  "navigationEvents": [...]
}
```

Response:
```json
{
  "success": true,
  "sessionDir": "C:/path/to/sessions/MyPresentation_123",
  "attemptDir": "C:/path/to/sessions/MyPresentation_123/attempt_1",
  "audioPath": "C:/path/to/sessions/MyPresentation_123/attempt_1/audio.wav",
  "navigationPath": "C:/path/to/sessions/MyPresentation_123/attempt_1/navigation.json",
  "message": "Recording saved successfully to attempt_1"
}
```

### Error Handling

**If backend is not running:**
- Recording still saves to IndexedDB
- User sees warning: "Recording saved to browser, but backend is not running."
- Audio and navigation files are NOT saved to disk
- Video playback still works in UI

**If backend save fails:**
- User sees error message
- Can check backend console for details
- IndexedDB data remains intact

## File Access

### Viewing Files

You can access saved files directly:

```bash
# Navigate to sessions directory
cd sessions

# List all sessions
ls

# View a specific attempt
cd SessionName_123/attempt_1

# List files
ls
# Output: audio.wav  navigation.json

# Play audio (example with ffplay)
ffplay audio.wav

# View navigation data
cat navigation.json
```

### Using Files for Analysis

Files are ready for external processing:

```python
# Python example
import json
import wave

# Read audio
with wave.open('sessions/SessionName_123/attempt_1/audio.wav', 'rb') as wav:
    audio_data = wav.readframes(wav.getnframes())
    
# Read navigation
with open('sessions/SessionName_123/attempt_1/navigation.json', 'r') as f:
    navigation = json.load(f)
    
# Process data...
```

## Benefits

1. **Persistence:** Files survive browser cache clearing
2. **Portability:** Easy to backup, transfer, or archive
3. **Analysis:** Direct access for processing scripts
4. **Integration:** Works with existing audio analysis tools
5. **Debugging:** Can inspect files directly
6. **Collaboration:** Easy to share recordings

## Future Enhancements

Potential additions:
- PDF file saved alongside audio and navigation
- Metadata file (recording date, duration, etc.)
- Compressed archive option (ZIP)
- Cloud storage integration
- Automatic cleanup of old recordings
- Export to different audio formats
