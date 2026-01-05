# PDF Navigation Tracking

## Overview
This system now tracks PDF page navigation during recording sessions, capturing when and how users move between pages in their presentations.

## What Gets Tracked

### Navigation Events
Each time a user changes pages during recording, the system captures:

1. **Timestamp** - When the navigation occurred (in seconds from recording start)
2. **From Page** - The page the user was leaving
3. **To Page** - The page the user navigated to
4. **Method** - How the navigation occurred:
   - `'start'` - Initial page when recording begins
   - `'button'` - Previous/Next navigation buttons
   - `'thumbnail'` - Clicking page thumbnails in sidebar
5. **Duration** - Time spent on the previous page (in seconds)

### Example Navigation Data
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
  },
  {
    "timestamp": 32,
    "fromPage": 2,
    "toPage": 5,
    "method": "thumbnail",
    "duration": 17
  }
]
```

## How It Works

### During Recording
1. When **Start Recording** is pressed:
   - Navigation tracking is initialized
   - Initial page event is recorded
   - Page timer starts

2. When user navigates (Previous/Next/Thumbnail):
   - Current timestamp is captured
   - Duration on previous page is calculated
   - Navigation event is logged with method type
   - Page timer resets for new page

3. When **Stop Recording** is pressed:
   - Audio is extracted from the video recording
   - Navigation events are prepared for saving
   - Both files are immediately saved to the file system via backend API
   - Data is stored at: `sessions/SessionName_ID/attempt_X/`
     - `audio.wav` - Extracted audio file
     - `navigation.json` - PDF navigation events
   - Video data is also saved to IndexedDB for playback in the browser

### Viewing Navigation Data
When viewing a recorded attempt, the system displays:
- Total number of page navigations
- Timeline of all navigation events
- Time spent on each page
- Navigation method used

## UI Components

### Navigation Display
Located in the attempt details view:
- **📄 Page Navigation Timeline** section
- Shows chronological list of all page changes
- Color-coded by navigation method
- Time stamps in MM:SS format

### Visual Elements
- Blue badges indicate navigation method (button/thumbnail)
- Time spent on each page shown in italics
- Hover effects for better readability

## Benefits

1. **Performance Analysis** - See which pages took longest to present
2. **Flow Tracking** - Understand presentation navigation patterns
3. **Practice Insights** - Identify pages that needed revisiting
4. **Timing Optimization** - Analyze time allocation across pages

## Data Storage

### File System (for analysis)
Audio and navigation data are saved to the file system at:
```
sessions/
  SessionName_ID/
    attempt_1/
      audio.wav         - Audio extracted from video
      navigation.json   - PDF navigation events
    attempt_2/
      audio.wav
      navigation.json
```

### IndexedDB (for UI)
Additional data stored in browser's IndexedDB for the user interface:
```javascript
{
  sessionId: "...",
  videoData: "...",  // For video playback in browser
  pdfData: "...",
  duration: 120,
  navigationEvents: [ /* array of events */ ]
}
```

### Navigation Events JSON Format
The `navigation.json` file contains:
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

## Backend Requirements

The backend server must be running to save files to the file system:

1. **Start the backend:**
   ```bash
   cd backend
   python api_server.py
   ```

2. **Backend endpoint:** `POST http://localhost:5000/save_recording`

3. **What happens if backend is not running:**
   - Recording still saves to browser (IndexedDB)
   - User gets a warning message
   - Audio and navigation files are NOT saved to disk

## Console Logging

During development, navigation events are logged to the console:
```
Navigation tracked: {
  timestamp: 15,
  fromPage: 1,
  toPage: 2,
  method: 'button',
  duration: 15
}
```

## Future Enhancements

Potential additions:
- Heat map showing most visited pages
- Average time per page statistics
- Navigation pattern visualization
- Export navigation data to CSV
- Compare navigation across multiple attempts
