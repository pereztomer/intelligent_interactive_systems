import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'
import { 
  createSession, 
  getAllSessions, 
  getSession, 
  updateSession,
  deleteSession,
  saveAttempt,
  updateAttempt,
  deleteAttempt
} from './utils/recordingStorage'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [currentView, setCurrentView] = useState('landing') // 'landing', 'sessionList', 'session', 'attempt', 'createAttempt'
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [currentAttempt, setCurrentAttempt] = useState(null)
  
  // PDF viewer state
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  
  // Analysis state
  const [pyodide, setPyodide] = useState(null)
  const [analyzing, setAnalyzing] = useState({})

  // Load sessions on mount
  useEffect(() => {
    if (currentView === 'sessionList' || currentView === 'landing') {
      loadSessions()
    }
  }, [currentView])

  // Load Pyodide for analysis
  useEffect(() => {
    const loadPyodide = async () => {
      try {
        if (window.loadPyodide) {
          const pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
          })
          setPyodide(pyodideInstance)
          return
        }

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
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('Failed to load sessions')
    }
  }

  const loadSession = async (sessionId) => {
    try {
      const session = await getSession(sessionId)
      setCurrentSession(session)
      return session
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session')
    }
  }

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

  const loadPDFFromFile = (uploadedFile) => {
    if (!uploadedFile.name.endsWith('.pdf')) {
      setError('Please upload a .pdf file')
      return false
    }

    setLoading(true)
    setError(null)
    setFile(uploadedFile)
    setPageNumber(1)
    return true
  }

  const loadPDFFromData = async (pdfData, fileName) => {
    try {
      setLoading(true)
      setError(null)
      // Convert base64 to blob
      const response = await fetch(pdfData)
      const blob = await response.blob()
      const file = new File([blob], fileName || 'presentation.pdf', { type: 'application/pdf' })
      setFile(file)
      setPageNumber(1)
      return true
    } catch (err) {
      setError('Failed to load PDF')
      return false
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
    try {
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

      const combinedStream = new MediaStream()
      screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track))
      audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))

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
        
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64data = reader.result
          
          let pdfData = null
          let fileName = 'presentation.pdf'
          if (file) {
            pdfData = await new Promise((resolve) => {
              const pdfReader = new FileReader()
              pdfReader.onloadend = () => resolve(pdfReader.result)
              pdfReader.readAsDataURL(file)
            })
            fileName = file.name
          }
          
          try {
            // Save as attempt in current session
            const attempt = await saveAttempt({
              sessionId: currentSession.id,
              videoData: base64data,
              pdfData: pdfData,
              fileName: fileName,
              duration: recordingTime
            })
            
            // Update current attempt
            setCurrentAttempt(attempt)
            
            // Reload session to show new attempt
            await loadSession(currentSession.id)
            
            alert('Recording saved successfully!')
          } catch (err) {
            console.error('Error saving recording:', err)
            alert('Error saving recording')
          }
        }
        reader.readAsDataURL(blob)

        combinedStream.getTracks().forEach(track => track.stop())
        screenStream.getTracks().forEach(track => track.stop())
        audioStream.getAudioTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

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

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  // Handle new session creation
  const handleNewSession = async () => {
    try {
      const sessionName = prompt('Enter a name for your session (or leave blank for default):')
      const session = await createSession(sessionName || null)
      await loadSession(session.id)
      setCurrentView('session')
    } catch (err) {
      console.error('Error creating session:', err)
      alert('Failed to create session')
    }
  }

  // Handle continue existing session
  const handleContinueSession = () => {
    setCurrentView('sessionList')
  }

  // Handle session selection
  const handleSelectSession = async (sessionId) => {
    await loadSession(sessionId)
    setCurrentView('session')
  }

  // Handle new attempt creation
  const handleNewAttempt = async (usePreviousPDF = false) => {
    if (!currentSession) return

    // If using previous PDF, get it from the last attempt
    if (usePreviousPDF && currentSession.attempts && currentSession.attempts.length > 0) {
      const lastAttempt = currentSession.attempts[0] // Most recent
      if (lastAttempt.pdfData) {
        await loadPDFFromData(lastAttempt.pdfData, lastAttempt.fileName)
        setCurrentView('attempt')
        return
      }
    }

    // Otherwise, show file upload
    document.getElementById('file-upload-attempt').click()
  }

  const handleFileUploadForAttempt = async (event) => {
    const uploadedFile = event.target.files[0]
    if (!uploadedFile) return

    if (loadPDFFromFile(uploadedFile)) {
      setCurrentView('attempt')
    }
  }

  // Handle attempt selection
  const handleSelectAttempt = async (attempt) => {
    setCurrentAttempt(attempt)
    if (attempt.pdfData) {
      await loadPDFFromData(attempt.pdfData, attempt.fileName)
    }
    setCurrentView('attempt')
  }

  // Handle analyze attempt
  const handleAnalyzeAttempt = async (attemptId) => {
    setAnalyzing(prev => ({ ...prev, [attemptId]: true }))
    
    try {
      if (!currentSession) {
        throw new Error('No session loaded')
      }

      const attempt = currentSession.attempts?.find(a => a.id === attemptId)
      if (!attempt) {
        throw new Error('Attempt not found')
      }

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
      const presentationData = attempt.pdfData || ''
      
      // Set the data in Python's global scope
      pyodide.globals.set('video_data', videoData)
      pyodide.globals.set('presentation_data', presentationData)
      
      // Call the Python function with the data
      const analysisResult = pyodide.runPython('analyze_presentation(video_data, presentation_data)')
      
      // Update the attempt with the analysis result as attemptFeedback
      await updateAttempt(attemptId, { attemptFeedback: analysisResult })
      
      // Reload session to show the result
      await loadSession(currentSession.id)
      
      alert('Analysis completed!')
    } catch (err) {
      console.error('Error analyzing attempt:', err)
      alert('Error analyzing attempt: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [attemptId]: false }))
    }
  }

  // ========== VIEW RENDERS ==========

  // Landing Page
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
              <button className="cta-button" onClick={handleNewSession}>
                Start New Session
              </button>
              <button className="cta-button secondary" onClick={handleContinueSession}>
                Continue Existing Session
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Session List Page
  if (currentView === 'sessionList') {
    return (
      <div className="App">
        <div className="session-list-page">
          <div className="session-list-header">
            <h2>My Sessions</h2>
            <button className="back-button" onClick={() => setCurrentView('landing')}>
              ← Back
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="no-sessions">
              <p>No sessions yet. Start a new session to begin!</p>
              <button className="cta-button" onClick={handleNewSession}>
                Start New Session
              </button>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-item"
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="session-info">
                    <h3>{session.name}</h3>
                    <p className="session-meta">
                      {formatDate(session.createdAt)} • {session.attempts?.length || 0} attempt(s)
                    </p>
                    {session.processFeedback && (
                      <p className="feedback-preview">📊 Process Feedback Available</p>
                    )}
                  </div>
                  <div className="session-actions">
                    <button
                      className="delete-button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('Are you sure you want to delete this session?')) {
                          try {
                            await deleteSession(session.id)
                            loadSessions()
                          } catch (err) {
                            alert('Error deleting session')
                          }
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Session Detail Page
  if (currentView === 'session' && currentSession) {
    return (
      <div className="App">
        <div className="session-page">
          <div className="session-header">
            <h2>{currentSession.name}</h2>
            <button className="back-button" onClick={() => {
              setCurrentSession(null)
              setCurrentView('sessionList')
            }}>
              ← Back
            </button>
          </div>

          <div className="session-feedback-section">
            {currentSession.processFeedback ? (
              <div className="session-feedback-box">
                <h3>Session Process Feedback</h3>
                <p>{currentSession.processFeedback}</p>
                <button 
                  className="regenerate-feedback-button"
                  onClick={async () => {
                    // Generate process feedback from all attempts
                    if (currentSession.attempts && currentSession.attempts.length > 0) {
                      const feedback = `This session contains ${currentSession.attempts.length} attempt(s). Review your attempts to see detailed feedback for each one.`
                      await updateSession(currentSession.id, { processFeedback: feedback })
                      await loadSession(currentSession.id)
                    }
                  }}
                >
                  Regenerate Feedback
                </button>
              </div>
            ) : (
              currentSession.attempts && currentSession.attempts.length > 0 && (
                <button 
                  className="generate-feedback-button"
                  onClick={async () => {
                    // Generate process feedback from all attempts
                    const feedback = `This session contains ${currentSession.attempts.length} attempt(s). Review your attempts to see detailed feedback for each one.`
                    await updateSession(currentSession.id, { processFeedback: feedback })
                    await loadSession(currentSession.id)
                  }}
                >
                  Generate Session Feedback
                </button>
              )
            )}
          </div>

          <div className="session-actions-bar">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUploadForAttempt}
              id="file-upload-attempt"
              style={{ display: 'none' }}
            />
            <button 
              className="cta-button"
              onClick={() => handleNewAttempt(false)}
            >
              + New Attempt (Upload PDF)
            </button>
            {currentSession.attempts && currentSession.attempts.length > 0 && (
              <button 
                className="cta-button secondary"
                onClick={() => handleNewAttempt(true)}
              >
                + New Attempt (Use Previous PDF)
              </button>
            )}
          </div>

          {currentSession.attempts && currentSession.attempts.length > 0 ? (
            <div className="attempts-list">
              <h3>Attempts ({currentSession.attempts.length})</h3>
              {currentSession.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="attempt-item"
                  onClick={() => handleSelectAttempt(attempt)}
                >
                  <div className="attempt-info">
                    <h4>Attempt {currentSession.attempts.indexOf(attempt) + 1}</h4>
                    <p className="attempt-meta">
                      {formatDate(attempt.timestamp)} • {formatTime(attempt.duration || 0)}
                    </p>
                    <p className="attempt-file">{attempt.fileName || 'Presentation'}</p>
                    {attempt.attemptFeedback && (
                      <p className="feedback-preview">📊 Feedback Available</p>
                    )}
                  </div>
                  <div className="attempt-actions">
                    <button
                      className="analyze-button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await handleAnalyzeAttempt(attempt.id)
                      }}
                      disabled={analyzing[attempt.id] || !pyodide}
                    >
                      {!pyodide ? 'Loading Python...' : analyzing[attempt.id] ? 'Analyzing...' : 'Analyze'}
                    </button>
                    <button
                      className="delete-button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('Are you sure you want to delete this attempt?')) {
                          try {
                            await deleteAttempt(attempt.id)
                            await loadSession(currentSession.id)
                          } catch (err) {
                            alert('Error deleting attempt')
                          }
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-attempts">
              <p>No attempts yet. Create your first attempt to start practicing!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Attempt Viewer Page (PDF + Recording)
  if (currentView === 'attempt') {
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
              {file ? (
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
              ) : (
                <div className="no-pdf">
                  <p>No PDF loaded. Please upload a PDF file.</p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUploadForAttempt}
                    id="file-upload-attempt"
                    style={{ display: 'none' }}
                  />
                  <button onClick={() => document.getElementById('file-upload-attempt').click()}>
                    Upload PDF
                  </button>
                </div>
              )}
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
              className="back-button"
              onClick={async () => {
                if (currentSession) {
                  await loadSession(currentSession.id)
                  setCurrentView('session')
                } else {
                  setCurrentView('sessionList')
                }
                setFile(null)
                setCurrentAttempt(null)
              }}
            >
              Back to Session
            </button>
          </div>

          {currentAttempt && (
            <div className="attempt-details-section">
              {currentAttempt.videoData && (
                <div className="attempt-video-player">
                  <h3>Recording</h3>
                  <video
                    controls
                    src={currentAttempt.videoData}
                    className="attempt-video"
                  >
                    Your browser does not support video playback.
                  </video>
                  <div className="attempt-video-info">
                    <p><strong>Duration:</strong> {formatTime(currentAttempt.duration || 0)}</p>
                    <p><strong>Recorded:</strong> {formatDate(currentAttempt.timestamp)}</p>
                  </div>
                </div>
              )}
              
              {currentAttempt.attemptFeedback && (
                <div className="attempt-feedback-box">
                  <h3>Attempt Feedback</h3>
                  <p>{currentAttempt.attemptFeedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="loading">Loading...</div>
    </div>
  )
}

export default App
