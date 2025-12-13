import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'
import { saveRecording } from './utils/recordingStorage'
import { requestDirectoryAccess, saveFileToDirectory, createSubdirectory, readFileFromDirectory } from './utils/fileStorage'

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
        const url = URL.createObjectURL(blob)
        
        // Convert blob to base64 for storage
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64data = reader.result
          
          // Also convert PDF to base64 if available
          let pdfData = null
          if (file) {
            pdfData = await new Promise((resolve) => {
              const pdfReader = new FileReader()
              pdfReader.onloadend = () => resolve(pdfReader.result)
              pdfReader.readAsDataURL(file)
            })
          }
          
          try {
            await saveRecording({
              videoData: base64data,
              pdfData: pdfData,
              fileName: file?.name || 'presentation.pdf',
              duration: recordingTime,
              timestamp: Date.now()
            })
            alert('Recording saved successfully!')
          } catch (err) {
            console.error('Error saving recording:', err)
            alert('Error saving recording')
          }
        }
        reader.readAsDataURL(blob)

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

      // Load the Python file from public folder
      const pythonFileResponse = await fetch('/python/analyze.py')
      const pythonCode = await pythonFileResponse.text()
      
      // Run the Python code to define the function
      pyodide.runPython(pythonCode)
      
      // Get video and PDF data from recording
      const videoData = recording.videoData || ''
      const presentationData = recording.pdfData || ''
      
      // Set the data in Python's global scope
      pyodide.globals.set('video_data', videoData)
      pyodide.globals.set('presentation_data', presentationData)
      
      // Call the Python function with the data
      const analysisResult = pyodide.runPython('analyze_presentation(video_data, presentation_data)')
      
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
              <div className="recording-player">
                <h3>Recording Preview</h3>
                <video
                  controls
                  src={selectedRecording.videoData}
                  className="recording-video"
                >
                  Your browser does not support video playback.
                </video>
                <div className="recording-details">
                  <p><strong>File:</strong> {selectedRecording.fileName}</p>
                  <p><strong>Date:</strong> {formatDate(selectedRecording.timestamp)}</p>
                  <p><strong>Duration:</strong> {formatTime(selectedRecording.duration || 0)}</p>
                  {selectedRecording.analysisResult && (
                    <div className="analysis-result-box">
                      <p><strong>Analysis:</strong> {selectedRecording.analysisResult}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
