# Quick Start - File Storage System

## TL;DR

Recording data now saves to `sessions/` folder as **audio.wav** and **navigation.json** files.

## Setup (One-Time)

### 1. Start Backend
```bash
cd backend
python api_server.py
```

Keep this terminal running.

### 2. Start Frontend (New Terminal)
```bash
npm run dev
```

## Usage

1. **Create Session** → Upload PDF
2. **Start Recording** → Navigate through slides
3. **Stop Recording** → Files automatically saved!

## Where Are My Files?

```
sessions/
  └── YourSessionName_123/
      └── attempt_1/
          ├── audio.wav         ← Your audio
          └── navigation.json   ← Page navigation data
```

## Quick Check

After recording, verify files exist:

```bash
# Windows PowerShell
ls sessions/*/attempt_*/

# Expected output:
# audio.wav
# navigation.json
```

## Troubleshooting

### "Backend is not running" warning
**Problem:** Recording saved to browser only, NOT to disk.

**Fix:** Start backend server:
```bash
cd backend
python api_server.py
```

### Files not appearing
1. Check backend terminal for errors
2. Verify `sessions/` folder exists in project root
3. Make sure backend URL is `http://localhost:5000`

### Backend won't start
```bash
# Install dependencies
pip install -r requirements.txt

# Try again
python backend/api_server.py
```

## What Gets Saved Where

| Data | Location | Purpose |
|------|----------|---------|
| **Audio** | `sessions/.../audio.wav` | Analysis, transcription |
| **Navigation** | `sessions/.../navigation.json` | Page flow tracking |
| **Video** | Browser IndexedDB | Playback in UI |
| **PDF** | Browser IndexedDB | Display in UI |

## Example Session

```
sessions/
  └── MyPresentation_1/
      ├── attempt_1/          ← First recording
      │   ├── audio.wav       (2.1 MB)
      │   └── navigation.json (387 bytes)
      ├── attempt_2/          ← Second try
      │   ├── audio.wav       (1.8 MB)
      │   └── navigation.json (512 bytes)
      └── attempt_3/          ← Third practice
          ├── audio.wav       (2.4 MB)
          └── navigation.json (623 bytes)
```

## Success Indicators

✅ Backend shows: `✅ Audio saved:` and `✅ Navigation data saved:`  
✅ Alert shows file path: `Files saved to: sessions/...`  
✅ Files exist when you check the folder

## That's It!

Your recordings are now saved to disk automatically. 🎉

For more details, see [FILE_STORAGE.md](FILE_STORAGE.md)
