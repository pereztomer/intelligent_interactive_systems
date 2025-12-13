import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'
import { saveRecording } from './utils/recordingStorage'
import { requestDirectoryAccess, saveFileToDirectory, createSubdirectory, readFileFromDirectory, getFileBlobURL } from './utils/fileStorage'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1.0)
  const [showLanding, setShowLanding] = useState(true)
  const [currentView, setCurrentView] = useState('landing') // 'landing', 'viewer', 'recordings'
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const baseDirectoryHandleRef = useRef(null) // Store the base directory handle

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageNumber(1)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error) => {
    setError(`Error loading PDF: ${error.message}`)
    setLoading(false)
  }

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.pdf')) {
      setError('Please upload a .pdf file')
      return
    }

    setLoading(true)
    setError(null)
    setFile(uploadedFile)
    setPageNumber(1)
    setShowLanding(false)
    setCurrentView('viewer')
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  const handleGetStarted = () => {
    document.getElementById('file-upload').click()
  }

  // Recording functions
  const startRecording = async () => {
    try {
      // Request screen and microphone access
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Combine streams
      const combinedStream = new MediaStream()
      screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track))
      audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })

      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        
        try {
          // Request directory access if not already set
          if (!baseDirectoryHandleRef.current) {
            const directoryHandle = await requestDirectoryAccess()
            if (!directoryHandle) {
              alert('Please select a directory to save recordings')
              return
            }
            baseDirectoryHandleRef.current = directoryHandle
          }
          
          // Create a folder for this recording
          const recordingId = Date.now()
          const recordingFolderName = `recording_${recordingId}`
          const recordingFolder = await createSubdirectory(
            baseDirectoryHandleRef.current,
            recordingFolderName
          )
          
          // Save video file (save as .mp4 extension, but content is WebM)
          // Note: For true MP4 conversion, you'd need ffmpeg.wasm
          const videoFileName = 'video.mp4'
          await saveFileToDirectory(recordingFolder, videoFileName, blob)
          
          // Save PDF file if available
          let pdfFileName = null
          if (file) {
            pdfFileName = 'presentation.pdf'
            await saveFileToDirectory(recordingFolder, pdfFileName, file)
          }
          
          // Save recording metadata to IndexedDB
          await saveRecording({
            id: recordingId,
            folderName: recordingFolderName,
            videoFileName: videoFileName,
            pdfFileName: pdfFileName,
            fileName: file?.name || 'presentation.pdf',
            duration: recordingTime,
            timestamp: Date.now()
          })
          
          alert('Recording saved successfully!')
        } catch (err) {
          console.error('Error saving recording:', err)
          alert('Error saving recording: ' + err.message)
        }

        // Stop all tracks
        combinedStream.getTracks().forEach(track => track.stop())
        screenStream.getTracks().forEach(track => track.stop())
        audioStream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Handle screen share stop
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording. Please grant screen and microphone permissions.')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (currentView === 'landing' || showLanding) {
    return (
      <div className="App">
        <div className="landing-page">
          <h1 className="app-title">Presentation Rehearsal Coach</h1>
          
          <div className="landing-content">
            <p className="problem-text">
              Strong presentations depend on clarity, pacing, and alignment between spoken content and slides. 
              Most people practice alone due to shyness, lack of listening audience, and receive little objective feedback. 
              While existing tools effectively analyze speech or slide mechanics individually, the market remains fragmented. 
              There is a lack of accessible, unified systems that evaluate delivery, slide usage, and content coherence in a single interface. 
              The goal is to create an AI-based coach that provides concrete, personalized insights to help users significantly improve their communication skills.
            </p>
            
            <div className="cta-section">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                id="file-upload"
                style={{ display: 'none' }}
              />
              <button className="cta-button" onClick={handleGetStarted}>
                Get Started
              </button>
              <button 
                className="view-recordings-button-landing" 
                onClick={() => {
                  setCurrentView('recordings')
                  setShowLanding(false)
                }}
              >
                View My Recordings
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'recordings') {
    return (
      <RecordingsPage onBack={() => {
        if (file) {
          setCurrentView('viewer')
        } else {
          setCurrentView('landing')
        }
      }} />
    )
  }

  return (
    <div className="App">
      <div className="presentation-viewer">
        <div className="controls-top">
          <div className="navigation-controls">
            <button onClick={goToPrevPage} disabled={pageNumber <= 1}>
              ← Previous
            </button>
            <span className="page-counter">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <button onClick={goToNextPage} disabled={pageNumber >= numPages}>
              Next →
            </button>
          </div>
          <div className="zoom-controls">
            <button onClick={zoomOut} disabled={scale <= 0.5}>−</button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={scale >= 3.0}>+</button>
            <button onClick={resetZoom} className="reset-zoom">Reset</button>
          </div>
        </div>

        <div className="recording-controls">
          {!isRecording ? (
            <button className="record-button" onClick={startRecording}>
              🎥 Start Recording
            </button>
          ) : (
            <div className="recording-status">
              <button className="stop-button" onClick={stopRecording}>
                ⏹ Stop Recording
              </button>
              <span className="recording-indicator">
                <span className="recording-dot"></span>
                Recording: {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
        
        <div className="pdf-container">
          <div className="pdf-wrapper">
            {error && <p className="error">{error}</p>}
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="loading">
                  <p>Loading PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>

        {numPages && numPages > 1 && (
          <div className="page-thumbnails">
            {Array.from({ length: numPages }, (_, idx) => (
              <div
                key={idx + 1}
                className={`thumbnail ${idx + 1 === pageNumber ? 'active' : ''}`}
                onClick={() => setPageNumber(idx + 1)}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        )}

        <div className="bottom-actions">
          <button 
            className="view-recordings-button"
            onClick={() => setCurrentView('recordings')}
          >
            View Recordings
          </button>
          <button 
            className="reset-button"
            onClick={() => {
              setFile(null)
              setNumPages(null)
              setPageNumber(1)
              setError(null)
              setScale(1.0)
              setShowLanding(true)
              setCurrentView('landing')
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

// Recordings Page Component
function RecordingsPage({ onBack }) {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [analyzing, setAnalyzing] = useState({}) // Track which recordings are being analyzed
  const [pyodide, setPyodide] = useState(null) // Pyodide instance
  const baseDirectoryHandleRef = useRef(null) // Store the base directory handle

  useEffect(() => {
    loadRecordings()
    
    // Dynamically load Pyodide using script tag
    const loadPyodide = async () => {
      try {
        // Check if Pyodide is already loaded
        if (window.loadPyodide) {
          const pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
          })
          setPyodide(pyodideInstance)
          return
        }

        // Load Pyodide script dynamically
        const script = document.createElement('script')
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"
        script.async = true
        
        script.onload = async () => {
          try {
            const pyodideInstance = await window.loadPyodide({
              indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
            })
            setPyodide(pyodideInstance)
          } catch (err) {
            console.error('Error initializing Pyodide:', err)
          }
        }
        
        script.onerror = (err) => {
          console.error('Error loading Pyodide script:', err)
        }
        
        document.head.appendChild(script)
      } catch (err) {
        console.error('Error loading Pyodide:', err)
      }
    }
    
    loadPyodide()
  }, [])

  const loadRecordings = async () => {
    try {
      const { getAllRecordings } = await import('./utils/recordingStorage')
      const allRecordings = await getAllRecordings()
      setRecordings(allRecordings)
      
      // Update selected recording if it exists
      if (selectedRecording) {
        const updated = allRecordings.find(r => r.id === selectedRecording.id)
        if (updated) {
          setSelectedRecording(updated)
        }
      }
    } catch (err) {
      console.error('Error loading recordings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      try {
        const { deleteRecording } = await import('./utils/recordingStorage')
        await deleteRecording(id)
        loadRecordings()
        if (selectedRecording?.id === id) {
          setSelectedRecording(null)
        }
      } catch (err) {
        console.error('Error deleting recording:', err)
        alert('Error deleting recording')
      }
    }
  }

  const handleAnalyze = async (recordingId) => {
    setAnalyzing(prev => ({ ...prev, [recordingId]: true }))
    
    try {
      // Get the recording
      const recording = recordings.find(r => r.id === recordingId)
      if (!recording) {
        throw new Error('Recording not found')
      }

      // Wait for Pyodide to load if not ready
      if (!pyodide) {
        throw new Error('Pyodide is still loading. Please wait a moment and try again.')
      }

      // Request directory access to read files
      if (!baseDirectoryHandleRef.current) {
        const directoryHandle = await requestDirectoryAccess()
        if (!directoryHandle) {
          throw new Error('Please select the recordings directory')
        }
        baseDirectoryHandleRef.current = directoryHandle
      }

      // Read the video and PDF files
      const recordingFolder = await baseDirectoryHandleRef.current.getDirectoryHandle(
        recording.folderName,
        { create: false }
      )
      
      const videoFile = await readFileFromDirectory(recordingFolder, recording.videoFileName)
      const pdfFile = await readFileFromDirectory(recordingFolder, recording.pdfFileName)
      
      // Convert files to Uint8Array for Pyodide's virtual file system
      const videoArrayBuffer = await videoFile.arrayBuffer()
      const videoBytes = new Uint8Array(videoArrayBuffer)
      
      const pdfArrayBuffer = await pdfFile.arrayBuffer()
      const pdfBytes = new Uint8Array(pdfArrayBuffer)
      
      // Mount files in Pyodide's virtual file system
      pyodide.FS.writeFile('/video.mp4', videoBytes)
      pyodide.FS.writeFile('/presentation.pdf', pdfBytes)
      
      // Load the Python file from public folder
      const pythonFileResponse = await fetch('/python/analyze.py')
      const pythonCode = await pythonFileResponse.text()
      
      // Run the Python code to define the function
      pyodide.runPython(pythonCode)
      
      // Call the Python function with file paths
      const analysisResult = pyodide.runPython('analyze_presentation("/video.mp4", "/presentation.pdf")')
      
      // Clean up virtual files
      pyodide.FS.unlink('/video.mp4')
      pyodide.FS.unlink('/presentation.pdf')
      
      // Update the recording with the analysis result
      const { updateRecording } = await import('./utils/recordingStorage')
      await updateRecording(recordingId, { analysisResult })
      
      // Reload recordings to show the result
      loadRecordings()
      
      // Update selected recording if it's the one being analyzed
      if (selectedRecording?.id === recordingId) {
        const updated = recordings.find(r => r.id === recordingId)
        if (updated) {
          setSelectedRecording({ ...updated, analysisResult })
        }
      }
    } catch (err) {
      console.error('Error analyzing recording:', err)
      alert('Error analyzing recording: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [recordingId]: false }))
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="App">
        <div className="recordings-page">
          <div className="loading">Loading recordings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="recordings-page">
        <div className="recordings-header">
          <h2>My Recordings</h2>
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>

        {recordings.length === 0 ? (
          <div className="no-recordings">
            <p>No recordings yet. Start practicing to create your first recording!</p>
          </div>
        ) : (
          <div className="recordings-container">
            <div className="recordings-list">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className={`recording-item ${selectedRecording?.id === recording.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRecording(recording)}
                >
                  <div className="recording-info">
                    <h3>{recording.fileName || 'Presentation'}</h3>
                    <p className="recording-meta">
                      {formatDate(recording.timestamp)} • {formatTime(recording.duration || 0)}
                    </p>
                    {recording.analysisResult && (
                      <p className="analysis-result">📊 {recording.analysisResult}</p>
                    )}
                  </div>
                  <div className="recording-actions">
                    <button
                      className="analyze-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnalyze(recording.id)
                      }}
                      disabled={analyzing[recording.id] || !pyodide}
                    >
                      {!pyodide ? 'Loading Python...' : analyzing[recording.id] ? 'Analyzing...' : 'Analyze'}
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(recording.id)
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedRecording && (
              <RecordingPlayer 
                recording={selectedRecording}
                baseDirectoryHandleRef={baseDirectoryHandleRef}
                requestDirectoryAccess={requestDirectoryAccess}
                getFileBlobURL={getFileBlobURL}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Recording Player Component
function RecordingPlayer({ recording, baseDirectoryHandleRef, requestDirectoryAccess, getFileBlobURL, formatDate, formatTime }) {
  const [videoUrl, setVideoUrl] = useState(null)
  const [loadingError, setLoadingError] = useState(null)

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setLoadingError(null)
        
        // Check if recording has the necessary file information
        if (!recording.folderName || !recording.videoFileName) {
          setLoadingError('Recording file information is missing. This recording may have been saved in an older format.')
          return
        }

        if (!baseDirectoryHandleRef.current) {
          const directoryHandle = await requestDirectoryAccess()
          if (!directoryHandle) {
            setLoadingError('Please select the recordings directory to view videos')
            return
          }
          baseDirectoryHandleRef.current = directoryHandle
        }

        const recordingFolder = await baseDirectoryHandleRef.current.getDirectoryHandle(
          recording.folderName,
          { create: false }
        )
        
        const url = await getFileBlobURL(recordingFolder, recording.videoFileName)
        setVideoUrl(url)
      } catch (err) {
        console.error('Error loading video:', err)
        setLoadingError(`Error loading video: ${err.message}. Please make sure you select the correct recordings directory.`)
      }
    }

    loadVideo()

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [recording, baseDirectoryHandleRef, requestDirectoryAccess, getFileBlobURL])

  return (
    <div className="recording-player">
      <h3>Recording Preview</h3>
      {videoUrl ? (
        <video
          controls
          src={videoUrl}
          className="recording-video"
        >
          Your browser does not support video playback.
        </video>
      ) : loadingError ? (
        <div className="error" style={{ padding: '2rem', textAlign: 'center' }}>
          {loadingError}
        </div>
      ) : (
        <div className="loading">Loading video...</div>
      )}
      <div className="recording-details">
        <p><strong>File:</strong> {recording.fileName}</p>
        <p><strong>Date:</strong> {formatDate(recording.timestamp)}</p>
        <p><strong>Duration:</strong> {formatTime(recording.duration || 0)}</p>
        {recording.analysisResult && (
          <div className="analysis-result-box">
            <p><strong>Analysis:</strong> {recording.analysisResult}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
