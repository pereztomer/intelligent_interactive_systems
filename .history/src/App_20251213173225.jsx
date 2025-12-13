import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'
import { 
  createSession, 
  getAllSessions, 
  getSession, 
  saveAttempt, 
  updateSession,
  updateAttempt,
  deleteSession,
  deleteAttempt
} from './utils/recordingStorage'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [currentView, setCurrentView] = useState('landing') // 'landing', 'session-select', 'viewer', 'sessions'
  const [currentSession, setCurrentSession] = useState(null)
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1.0)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

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

  const handleNewSession = () => {
    document.getElementById('file-upload').click()
  }

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.pdf')) {
      setError('Please upload a .pdf file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert PDF to base64
      const pdfData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(uploadedFile)
      })

      // Create a new session
      const sessionId = await createSession({
        pdfFileName: uploadedFile.name,
        pdfData: pdfData
      })

      // Load the session
      const session = await getSession(sessionId)
      setCurrentSession(session)
      setFile(uploadedFile)
      setPageNumber(1)
      setCurrentView('viewer')
      setLoading(false)
    } catch (err) {
      console.error('Error creating session:', err)
      setError('Failed to create session')
      setLoading(false)
    }
  }

  const handleContinueSession = async (sessionId) => {
    setLoading(true)
    try {
      const session = await getSession(sessionId)
      if (!session) {
        setError('Session not found')
        setLoading(false)
        return
      }

      // Convert base64 PDF back to File object for react-pdf
      if (session.pdfData) {
        const response = await fetch(session.pdfData)
        const blob = await response.blob()
        const pdfFile = new File([blob], session.pdfFileName || 'presentation.pdf', { type: 'application/pdf' })
        setFile(pdfFile)
      }

      setCurrentSession(session)
      setCurrentView('viewer')
      setLoading(false)
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session')
      setLoading(false)
    }
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

  // Recording functions
  const startRecording = async () => {
    if (!currentSession) {
      setError('No active session')
      return
    }

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
        
        // Convert blob to base64 for storage
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64data = reader.result
          
          try {
            // Save as an attempt in the current session
            await saveAttempt(currentSession.id, {
              videoData: base64data,
              pdfData: currentSession.pdfData,
              fileName: currentSession.pdfFileName || 'presentation.pdf',
              duration: recordingTime
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
        audioStream.getAudioTracks().forEach(track => track.stop())
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

  // Landing page
  if (currentView === 'landing') {
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
              <button className="cta-button" onClick={handleNewSession}>
                Start New Session
              </button>
              <button 
                className="view-recordings-button-landing" 
                onClick={() => setCurrentView('session-select')}
              >
                Continue Existing Session
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Session selection page
  if (currentView === 'session-select') {
    return (
      <SessionSelectPage 
        onSelectSession={handleContinueSession}
        onBack={() => setCurrentView('landing')}
      />
    )
  }

  // Sessions/Recordings page
  if (currentView === 'sessions') {
    return (
      <SessionsPage 
        onBack={() => {
          if (currentSession) {
            setCurrentView('viewer')
          } else {
            setCurrentView('landing')
          }
        }}
      />
    )
  }

  // Viewer page (requires active session)
  if (!currentSession || !file) {
    return (
      <div className="App">
        <div className="loading">Loading session...</div>
      </div>
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

        <div className="session-info">
          <h3>Session: {currentSession.pdfFileName}</h3>
          <p>Attempts: {currentSession.attempts?.length || 0}</p>
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
            onClick={() => setCurrentView('sessions')}
          >
            View Sessions
          </button>
          <button 
            className="reset-button"
            onClick={() => {
              setCurrentSession(null)
              setFile(null)
              setNumPages(null)
              setPageNumber(1)
              setError(null)
              setScale(1.0)
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

// Session Selection Page Component
function SessionSelectPage({ onSelectSession, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions()
      setSessions(allSessions)
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="App">
        <div className="recordings-page">
          <div className="loading">Loading sessions...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="recordings-page">
        <div className="recordings-header">
          <h2>Select Session to Continue</h2>
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="no-recordings">
            <p>No sessions yet. Start a new session to begin!</p>
          </div>
        ) : (
          <div className="recordings-container">
            <div className="recordings-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="recording-item"
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="recording-info">
                    <h3>{session.pdfFileName || 'Presentation'}</h3>
                    <p className="recording-meta">
                      {formatDate(session.timestamp)} • {session.attempts?.length || 0} attempt(s)
                    </p>
                    {session.processFeedback && (
                      <p className="analysis-result">📊 Process Feedback Available</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sessions Page Component (shows all sessions with attempts)
function SessionsPage({ onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [analyzing, setAnalyzing] = useState({}) // Track which attempts are being analyzed
  const [pyodide, setPyodide] = useState(null) // Pyodide instance

  useEffect(() => {
    loadSessions()
    
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

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions()
      setSessions(allSessions)
      
      // Update selected session if it exists
      if (selectedSession) {
        const updated = allSessions.find(s => s.id === selectedSession.id)
        if (updated) {
          setSelectedSession(updated)
        }
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeAttempt = async (sessionId, attemptId) => {
    const key = `${sessionId}-${attemptId}`
    setAnalyzing(prev => ({ ...prev, [key]: true }))
    
    try {
      // Get the session and attempt
      const session = sessions.find(s => s.id === sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      
      const attempt = session.attempts?.find(a => a.id === attemptId)
      if (!attempt) {
        throw new Error('Attempt not found')
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
      
      // Get video and PDF data from attempt
      const videoData = attempt.videoData || ''
      const presentationData = attempt.pdfData || session.pdfData || ''
      
      // Set the data in Python's global scope
      pyodide.globals.set('video_data', videoData)
      pyodide.globals.set('presentation_data', presentationData)
      
      // Call the Python function with the data
      const analysisResult = pyodide.runPython('analyze_presentation(video_data, presentation_data)')
      
      // Update the attempt with the analysis result
      await updateAttempt(attemptId, { feedback: analysisResult })
      
      // Reload sessions to show the result
      loadSessions()
      
      // Update selected attempt if it's the one being analyzed
      if (selectedAttempt?.id === attemptId) {
        const updatedSession = sessions.find(s => s.id === sessionId)
        const updatedAttempt = updatedSession?.attempts?.find(a => a.id === attemptId)
        if (updatedAttempt) {
          setSelectedAttempt({ ...updatedAttempt, feedback: analysisResult })
        }
      }
    } catch (err) {
      console.error('Error analyzing attempt:', err)
      alert('Error analyzing attempt: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAnalyzeSession = async (sessionId) => {
    const key = `session-${sessionId}`
    setAnalyzing(prev => ({ ...prev, [key]: true }))
    
    try {
      const session = sessions.find(s => s.id === sessionId)
      if (!session || !session.attempts || session.attempts.length === 0) {
        throw new Error('Session has no attempts to analyze')
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
      
      // Analyze all attempts in the session
      // For now, we'll create a combined analysis
      // In the future, this could analyze patterns across attempts
      let combinedAnalysis = "Session Process Feedback:\n\n"
      
      for (const attempt of session.attempts) {
        const videoData = attempt.videoData || ''
        const presentationData = attempt.pdfData || session.pdfData || ''
        
        pyodide.globals.set('video_data', videoData)
        pyodide.globals.set('presentation_data', presentationData)
        
        const attemptAnalysis = pyodide.runPython('analyze_presentation(video_data, presentation_data)')
        combinedAnalysis += `Attempt ${session.attempts.indexOf(attempt) + 1}:\n${attemptAnalysis}\n\n`
      }
      
      // Update the session with process feedback
      await updateSession(sessionId, { processFeedback: combinedAnalysis })
      
      // Reload sessions
      loadSessions()
      
      // Update selected session if it's the one being analyzed
      if (selectedSession?.id === sessionId) {
        const updated = sessions.find(s => s.id === sessionId)
        if (updated) {
          setSelectedSession({ ...updated, processFeedback: combinedAnalysis })
        }
      }
    } catch (err) {
      console.error('Error analyzing session:', err)
      alert('Error analyzing session: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleDeleteSession = async (sessionId) => {
    if (confirm('Are you sure you want to delete this session and all its attempts?')) {
      try {
        await deleteSession(sessionId)
        loadSessions()
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null)
          setSelectedAttempt(null)
        }
      } catch (err) {
        console.error('Error deleting session:', err)
        alert('Error deleting session')
      }
    }
  }

  const handleDeleteAttempt = async (sessionId, attemptId) => {
    if (confirm('Are you sure you want to delete this attempt?')) {
      try {
        await deleteAttempt(attemptId)
        loadSessions()
        if (selectedAttempt?.id === attemptId) {
          setSelectedAttempt(null)
        }
        // Update selected session
        const updated = sessions.find(s => s.id === sessionId)
        if (updated) {
          setSelectedSession(updated)
        }
      } catch (err) {
        console.error('Error deleting attempt:', err)
        alert('Error deleting attempt')
      }
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
          <div className="loading">Loading sessions...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="recordings-page">
        <div className="recordings-header">
          <h2>My Sessions</h2>
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="no-recordings">
            <p>No sessions yet. Start practicing to create your first session!</p>
          </div>
        ) : (
          <div className="recordings-container">
            <div className="recordings-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`recording-item ${selectedSession?.id === session.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSession(session)
                    setSelectedAttempt(null)
                  }}
                >
                  <div className="recording-info">
                    <h3>{session.pdfFileName || 'Presentation'}</h3>
                    <p className="recording-meta">
                      {formatDate(session.timestamp)} • {session.attempts?.length || 0} attempt(s)
                    </p>
                    {session.processFeedback && (
                      <p className="analysis-result">📊 Process Feedback Available</p>
                    )}
                  </div>
                  <div className="recording-actions">
                    <button
                      className="analyze-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnalyzeSession(session.id)
                      }}
                      disabled={analyzing[`session-${session.id}`] || !pyodide || !session.attempts || session.attempts.length === 0}
                    >
                      {!pyodide ? 'Loading Python...' : analyzing[`session-${session.id}`] ? 'Analyzing...' : 'Analyze Session'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedSession && (
              <div className="recording-player">
                <h3>Session: {selectedSession.pdfFileName}</h3>
                
                {/* Session-level process feedback */}
                {selectedSession.processFeedback && (
                  <div className="analysis-result-box">
                    <h4>Process Feedback (All Attempts)</h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedSession.processFeedback}</p>
                  </div>
                )}

                {/* List of attempts */}
                <div className="attempts-list">
                  <h4>Attempts ({selectedSession.attempts?.length || 0})</h4>
                  {selectedSession.attempts && selectedSession.attempts.length > 0 ? (
                    selectedSession.attempts.map((attempt, idx) => (
                      <div
                        key={attempt.id}
                        className={`attempt-item ${selectedAttempt?.id === attempt.id ? 'selected' : ''}`}
                        onClick={() => setSelectedAttempt(attempt)}
                      >
                        <div className="attempt-info">
                          <h5>Attempt {idx + 1}</h5>
                          <p className="recording-meta">
                            {formatDate(attempt.timestamp)} • {formatTime(attempt.duration || 0)}
                          </p>
                          {attempt.feedback && (
                            <p className="analysis-result">✓ Feedback Available</p>
                          )}
                        </div>
                        <div className="recording-actions">
                          <button
                            className="analyze-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnalyzeAttempt(selectedSession.id, attempt.id)
                            }}
                            disabled={analyzing[`${selectedSession.id}-${attempt.id}`] || !pyodide}
                          >
                            {analyzing[`${selectedSession.id}-${attempt.id}`] ? 'Analyzing...' : 'Analyze'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No attempts yet</p>
                  )}
                </div>

                {/* Selected attempt details */}
                {selectedAttempt && (
                  <div className="attempt-details">
                    <h4>Attempt Details</h4>
                    <video
                      controls
                      src={selectedAttempt.videoData}
                      className="recording-video"
                    >
                      Your browser does not support video playback.
                    </video>
                    <div className="recording-details">
                      <p><strong>Date:</strong> {formatDate(selectedAttempt.timestamp)}</p>
                      <p><strong>Duration:</strong> {formatTime(selectedAttempt.duration || 0)}</p>
                      {selectedAttempt.feedback && (
                        <div className="analysis-result-box">
                          <p><strong>Feedback:</strong></p>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{selectedAttempt.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
