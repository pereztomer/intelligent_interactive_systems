import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './App.css'
import './components/SurveyModal.css'
import Header from './components/Header'
import UserSelection from './components/UserSelection'
import CreateUserPage from './components/CreateUserPage'
import ProfilePage from './components/ProfilePage'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import ProsodicDiagram from './components/ProsodicDiagram'
import SessionDiagram from './components/SessionDiagram'
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
import { createUser, updateUser } from './utils/userStorage'
import {
  checkBackendAvailable,
  saveRecording as saveRecordingToBackend,
  analyzeAttempt as analyzeAttemptAPI,
  generateAIFeedback as generateAIFeedbackAPI,
  generateSessionFeedback as generateSessionFeedbackAPI,
  saveFeedback as saveFeedbackAPI
} from './utils/apiClient'
import { extractAudioFromVideo } from './utils/audioProcessing'
import { generateSpeakerProfile, formatGeminiFeedback, formatAnalysisResults, extractProsodicMetrics } from './utils/analysisFormatting'
import { formatTime, formatDate } from './utils/formatting'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentView, setCurrentView] = useState('userSelection') // 'userSelection', 'createUser', 'landing', 'sessionList', 'session', 'attempt', 'createAttempt', 'profile', 'adminLogin', 'adminDashboard'
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [currentAttempt, setCurrentAttempt] = useState(null)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [ratingData, setRatingData] = useState({
    relevance: '',
    helpfulness: '',
    clarity: '',
    actionability: '',
    recommendation: ''
  })
  
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
  const recordingStartTime = useRef(null)
  
  // Navigation tracking
  const [navigationEvents, setNavigationEvents] = useState([])
  const navigationEventsRef = useRef([])
  const pageStartTimeRef = useRef(null)
  
  // Analysis state
  const [pyodide, setPyodide] = useState(null)
  const [analyzing, setAnalyzing] = useState({})
  
  // Session popup state
  const [activePopup, setActivePopup] = useState(null) // 'feedback', 'diagram', 'attempts'

  // Load sessions on mount
  useEffect(() => {
    if (currentUser && (currentView === 'sessionList' || currentView === 'landing')) {
      loadSessions()
    }
  }, [currentView, currentUser])

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
      if (!currentUser) return
      const allSessions = await getAllSessions(currentUser.id)
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
      setLoading(false)
      return true
    } catch (err) {
      setError('Failed to load PDF')
      setLoading(false)
      return false
    }
  }

  // Track page navigation
  const trackPageNavigation = (fromPage, toPage, method = 'button') => {
    if (!isRecording) return
    
    const currentTime = parseFloat(recordingTime.toFixed(1))
    const previousTime = pageStartTimeRef.current !== null ? pageStartTimeRef.current : 0
    const duration = parseFloat((currentTime - previousTime).toFixed(1))
    
    const event = {
      timestamp: currentTime,
      fromPage,
      toPage,
      method, // 'button' (prev/next), 'page-button', or 'start'
      duration: duration
    }
    
    // Update both state and ref
    setNavigationEvents(prev => [...prev, event])
    navigationEventsRef.current = [...navigationEventsRef.current, event]
    pageStartTimeRef.current = currentTime
    
    console.log('Navigation tracked:', event)
  }

  const goToPrevPage = () => {
    const currentPage = pageNumber
    const newPage = Math.max(pageNumber - 1, 1)
    if (currentPage !== newPage) {
      trackPageNavigation(currentPage, newPage, 'button')
    }
    setPageNumber(newPage)
  }

  const goToNextPage = () => {
    const currentPage = pageNumber
    const newPage = Math.min(pageNumber + 1, numPages)
    if (currentPage !== newPage) {
      trackPageNavigation(currentPage, newPage, 'button')
    }
    setPageNumber(newPage)
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

  // Format Gemini Feedback with proper structure
  const formatGeminiFeedbackHTML = (feedbackText) => {
    if (!feedbackText) return null

    // Split into lines and clean up
    const lines = feedbackText.split('\n').map(line => line.trim()).filter(line => line)
    
    const sections = []
    let currentSection = null
    let currentItem = null

    lines.forEach(line => {
      // Remove markdown asterisks
      const cleanLine = line.replace(/^\*+\s*/, '').replace(/\*\*/g, '')
      
      // Check if this is a section header (all caps)
      const isHeader = /^[A-Z\s&]+:?\s*$/.test(cleanLine)
      
      // Check if this is a labeled item (Improvement 1:, Preservation 2:, etc.)
      const labelMatch = cleanLine.match(/^(Improvement \d+|Preservation \d+):\s*(.*)$/i)
      
      if (isHeader) {
        // Save previous section if exists
        if (currentSection) {
          if (currentItem) {
            currentSection.items.push(currentItem)
            currentItem = null
          }
          sections.push(currentSection)
        }
        // Start new section
        currentSection = {
          header: cleanLine.replace(/:$/, ''),
          items: []
        }
      } else if (labelMatch && currentSection) {
        // Save previous item if exists
        if (currentItem) {
          currentSection.items.push(currentItem)
        }
        // Start new labeled item
        currentItem = {
          label: labelMatch[1],
          content: [labelMatch[2]]
        }
      } else if (currentItem && cleanLine) {
        // Add to current item's content
        currentItem.content.push(cleanLine)
      } else if (currentSection && cleanLine) {
        // Regular text without label
        if (currentItem) {
          currentSection.items.push(currentItem)
          currentItem = null
        }
        currentSection.items.push({ label: null, content: [cleanLine] })
      }
    })
    
    // Add last item and section
    if (currentItem && currentSection) {
      currentSection.items.push(currentItem)
    }
    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  // Recording functions
  const startRecording = async () => {
    try {
      // Initialize navigation tracking
      setNavigationEvents([])
      navigationEventsRef.current = []
      pageStartTimeRef.current = 0
      
      // Add initial page event
      const initialEvent = {
        timestamp: 0,
        fromPage: null,
        toPage: pageNumber,
        method: 'start',
        duration: 0
      }
      setNavigationEvents([initialEvent])
      navigationEventsRef.current = [initialEvent]
      
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
          
          // Extract audio from video
          console.log('📤 Extracting audio from video...')
          const audioData = await extractAudioFromVideo(base64data)
          
          if (!audioData) {
            alert('Failed to extract audio from recording')
            return
          }
          
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
            // First, save to IndexedDB (for video playback in UI)
            const attempt = await saveAttempt({
              sessionId: currentSession.id,
              videoData: base64data,
              pdfData: pdfData,
              fileName: fileName,
              duration: recordingTime,
              navigationEvents: navigationEventsRef.current // Use ref to ensure latest data
            })
            
            // Then, save audio + navigation to file system via backend
            console.log('💾 Saving audio and navigation data to file system...')
            console.log('Navigation events to save:', navigationEventsRef.current)
            
            // Calculate session-specific attempt number (count attempts in this session)
            const sessionAttemptNumber = (currentSession.attempts?.length || 0) + 1
            console.log(`Session attempt number: ${sessionAttemptNumber}`)
            
            try {
              const result = await saveRecordingToBackend({
                sessionName: currentSession.name,
                sessionId: currentSession.id,
                attemptNumber: sessionAttemptNumber,
                audioData: audioData,
                videoData: base64data,
                pdfData: pdfData,
                fileName: fileName,
                navigationEvents: navigationEventsRef.current,
                surveyData: currentSession.surveyData || null
              })
              
              console.log('✅ Files saved to:', result.attemptDir)
              
              // Update attempt with file paths
              await updateAttempt(attempt.id, { 
                audioPath: result.audioPath,
                videoPath: result.videoPath,
                pdfPath: result.pdfPath,
                navigationPath: result.navigationPath 
              })
              
              alert(`Recording saved successfully!\n\nFiles saved to: ${result.attemptDir}`)
            } catch (backendErr) {
              console.error('Backend not available:', backendErr)
              alert('Recording saved to browser, but backend is not running.\nAudio and navigation files were NOT saved to disk.')
            }
            
            // Update current attempt
            setCurrentAttempt(attempt)
            
            // Reload session to show new attempt
            await loadSession(currentSession.id)
            
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
      recordingStartTime.current = Date.now()

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTime.current) / 1000
        setRecordingTime(elapsed)
      }, 100)

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

  // Handle user selection
  const handleUserSelect = async (user) => {
    setCurrentUser(user)
    await updateUser(user.id, { lastActive: Date.now() })
    setCurrentView('landing')
  }

  // Handle create new user
  const handleCreateUser = () => {
    setCurrentView('createUser')
  }

  // Handle create user form submission
  const handleCreateUserSubmit = async (userName, surveyData) => {
    try {
      const user = await createUser(userName || null, surveyData)
      setCurrentUser(user)
      // Go to landing page instead of creating session immediately
      setCurrentView('landing')
    } catch (err) {
      console.error('Error creating user:', err)
      alert('Failed to create user: ' + err.message)
    }
  }

  // Handle update user stats
  const handleUpdateUserStats = async (userId, surveyData) => {
    try {
      const updatedUser = await updateUser(userId, { surveyData })
      setCurrentUser(updatedUser)
    } catch (err) {
      console.error('Error updating user stats:', err)
      throw err
    }
  }

  // Handle cancel create user
  const handleCancelCreateUser = () => {
    setCurrentView('userSelection')
  }

  // Handle new session creation (for existing users)
  const handleNewSession = async () => {
    if (!currentUser) {
      setCurrentView('userSelection')
      return
    }
    // Create new session directly without survey
    try {
      const session = await createSession(null, null, currentUser.id)
      await loadSession(session.id)
      setCurrentView('session')
    } catch (err) {
      console.error('Error creating session:', err)
      alert('Failed to create session: ' + err.message)
    }
  }

  // Handle rating form submission
  const handleRatingSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await saveFeedbackAPI(
        currentSession.name,
        currentSession.id,
        currentSession.attempts.findIndex(a => a.id === currentAttempt.id) + 1,
        ratingData
      )
      
      alert('Thank you for your feedback!')
      setShowRatingForm(false)
      setRatingData({
        relevance: '',
        helpfulness: '',
        clarity: '',
        actionability: '',
        recommendation: ''
      })
    } catch (err) {
      console.error('Error saving feedback:', err)
      alert('Error saving feedback. Make sure the backend server is running.')
    }
  }

  // Handle rating change
  const handleRatingChange = (field, value) => {
    setRatingData(prev => ({ ...prev, [field]: value }))
  }

  // Handle continue existing session
  const handleContinueSession = () => {
    setCurrentView('sessionList')
  }

  // Handle navigation to home
  const handleNavigateHome = () => {
    if (!currentUser) {
      setCurrentView('userSelection')
    } else {
      setCurrentView('landing')
      setCurrentSession(null)
      setCurrentAttempt(null)
    }
  }

  // Handle navigation to sessions list
  const handleNavigateToSessions = () => {
    setCurrentView('sessionList')
    setCurrentSession(null)
    setCurrentAttempt(null)
  }

  const handleNavigateToProfile = () => {
    setCurrentView('profile')
  }

  // Handle admin login
  const handleAdminLogin = () => {
    setIsAdmin(true)
    setCurrentView('adminDashboard')
  }

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false)
    setCurrentView('userSelection')
  }

  // Handle navigate to admin login
  const handleNavigateToAdminLogin = () => {
    setCurrentView('adminLogin')
  }

  // Handle session selection
  const handleSelectSession = async (sessionId) => {
    await loadSession(sessionId)
    setCurrentView('session')
  }

  // Handle attempt selection (for admin - takes sessionId and attemptId)
  const handleAdminSelectAttempt = async (sessionId, attemptId) => {
    const session = await getSession(sessionId)
    if (session) {
      setCurrentSession(session)
      const attempt = session.attempts?.find(a => a.id === attemptId)
      if (attempt) {
        setCurrentAttempt(attempt)
        if (attempt.pdfData) {
          await loadPDFFromData(attempt.pdfData, attempt.fileName)
        }
        setCurrentView('attempt')
      }
    }
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

  // Helper functions for backend analysis (now using apiClient)

  // Analysis formatting functions moved to utils/analysisFormatting.js

  // Handle export recording
  const handleExportRecording = (attempt) => {
    try {
      if (!attempt.videoData) {
        alert('No video data found')
        return
      }

      // Convert base64 to blob
      const base64Data = attempt.videoData.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteArrays = []

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512)
        const byteNumbers = new Array(slice.length)
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
      }

      const blob = new Blob(byteArrays, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const a = document.createElement('a')
      a.href = url
      a.download = `recording_${attempt.id}_${new Date(attempt.timestamp).toISOString().slice(0, 10)}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('Recording exported successfully!\n\nTo analyze:\n1. Open terminal in project folder\n2. Run: python analyze_recording.py ' + a.download)
    } catch (err) {
      console.error('Error exporting recording:', err)
      alert('Error exporting recording: ' + err.message)
    }
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

      // Check if backend server is running
      const useBackend = await checkBackendAvailable()
      
      if (useBackend) {
        // Backend mode: Use existing audio file
        console.log('🚀 Using backend analysis...')
        
        // Check if attempt has audio path (from file system save)
        if (!attempt.audioPath) {
          throw new Error('Audio file path not found. Please re-record with backend running.')
        }
        
        console.log('📁 Using audio file:', attempt.audioPath)
        
        // Send audio file path to backend
        const result = await analyzeAttemptAPI(attempt.audioPath)
        
        // Debug logging
        console.log('📊 Analysis result:', result)
        console.log('📝 Transcription segments:', result.transcriptionSegments)
        
        // Format results for display
        const geminiFeedback = formatGeminiFeedback(result)
        const analysisResults = formatAnalysisResults(result)
        const prosodicMetrics = extractProsodicMetrics(result)
        
        // Save both feedbacks separately along with transcription segments and metrics
        await updateAttempt(attemptId, { 
          geminiFeedback: geminiFeedback,
          analysisResults: analysisResults,
          transcriptionSegments: result.transcriptionSegments || null,
          prosodicMetrics: prosodicMetrics
        })
        await loadSession(currentSession.id)
        
        console.log('💾 Saved transcription segments:', result.transcriptionSegments?.length || 0, 'segments')
        
        alert('Backend analysis completed!\n\nClick "View Feedback" to see results.')
      } else {
        // Browser mode (fallback)
        console.log('🌐 Using browser analysis...')
        
        if (!pyodide) {
          throw new Error('Pyodide is still loading. Please wait a moment and try again.')
        }

        const pythonFileResponse = await fetch('/python/demo_analyze.py')
        const pythonCode = await pythonFileResponse.text()
        pyodide.runPython(pythonCode)
        
        const videoData = attempt.videoData || ''
        const presentationData = attempt.pdfData || ''
        
        pyodide.globals.set('video_data', videoData)
        pyodide.globals.set('presentation_data', presentationData)
        
        const analysisResult = pyodide.runPython('analyze_presentation(video_data, presentation_data)')
        
        await updateAttempt(attemptId, { attemptFeedback: analysisResult })
        await loadSession(currentSession.id)
        
        const summary = analysisResult.split('\n').slice(0, 5).join('\n')
        alert('Analysis completed!\n\nClick "View Feedback" to see full results.\n\nPreview:\n' + summary)
      }
    } catch (err) {
      console.error('Error analyzing attempt:', err)
      alert('Error analyzing attempt: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [attemptId]: false }))
    }
  }

  // Handle AI feedback generation (Gemini only)
  const handleGenerateAIFeedback = async (attemptId) => {
    setAnalyzing(prev => ({ ...prev, [`ai_${attemptId}`]: true }))
    
    try {
      if (!currentSession) {
        throw new Error('No session loaded')
      }

      const attempt = currentSession.attempts?.find(a => a.id === attemptId)
      if (!attempt) {
        throw new Error('Attempt not found')
      }

      // Check if backend server is running
      const useBackend = await checkBackendAvailable()
      
      if (!useBackend) {
        throw new Error('Backend server is not running. Please start the backend to use AI Feedback.')
      }

      // Check if attempt has audio path (analysis must have been run first)
      if (!attempt.audioPath) {
        throw new Error('Please run full Analysis first before generating AI Feedback.')
      }
      
      console.log('🤖 Generating AI feedback only...')
      
      // Call Gemini feedback endpoint
      const result = await generateAIFeedbackAPI(attempt.audioPath)
      
      // Format and save Gemini feedback separately
      const geminiFeedback = formatGeminiFeedback(result)
      
      // Save Gemini feedback
      await updateAttempt(attemptId, { geminiFeedback: geminiFeedback })
      await loadSession(currentSession.id)
      
      alert('AI Feedback generated!\n\nClick "View Feedback" to see results.')
    } catch (err) {
      console.error('Error generating AI feedback:', err)
      alert('Error generating AI feedback: ' + err.message)
    } finally {
      setAnalyzing(prev => ({ ...prev, [`ai_${attemptId}`]: false }))
    }
  }

  // ========== VIEW RENDERS ==========

  // Admin Login Page
  if (currentView === 'adminLogin') {
    return (
      <div className="App user-selection-app">
        <AdminLogin 
          onLogin={handleAdminLogin}
          onCancel={() => setCurrentView('userSelection')}
        />
      </div>
    )
  }

  // Admin Dashboard
  if (currentView === 'adminDashboard' && isAdmin) {
    return (
      <div className="App">
        <AdminDashboard 
          onLogout={handleAdminLogout}
          onSelectSession={handleSelectSession}
          onSelectAttempt={handleAdminSelectAttempt}
        />
      </div>
    )
  }

  // User Selection Page (First page)
  if (currentView === 'userSelection' || (!currentUser && currentView !== 'createUser' && !isAdmin)) {
    return (
      <div className="App user-selection-app">
        <UserSelection 
          onUserSelect={handleUserSelect}
          onCreateUser={handleCreateUser}
          onAdminLogin={handleNavigateToAdminLogin}
        />
      </div>
    )
  }

  // Create User Page
  if (currentView === 'createUser') {
    return (
      <div className="App">
        <CreateUserPage
          onSubmit={handleCreateUserSubmit}
          onCancel={handleCancelCreateUser}
        />
      </div>
    )
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="App">
        <Header 
          onNavigateHome={handleNavigateHome}
          onNavigateToSessions={handleNavigateToSessions}
          onNavigateToProfile={handleNavigateToProfile}
          currentView={currentView}
          currentSession={currentSession}
          totalSessions={sessions.length}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          currentUser={currentUser}
          onSwitchUser={() => {
            setCurrentUser(null)
            setCurrentView('userSelection')
            setCurrentSession(null)
            setCurrentAttempt(null)
          }}
          onUpdateUserStats={handleUpdateUserStats}
        />
        <div className="main-content-card">
          {/* Hero Section - Top 1/4 */}
          <div className="hero-section">
            <img src="/hero-image.png" alt="Hero" className="hero-image" />
            <h1 className="hero-title">Presentation Rehearsal Coach</h1>
          </div>
          
          {/* Page Content - Bottom 3/4 */}
          <div className="page-content">
            <div className="landing-content">
              <div className="landing-main">
                <div className="landing-text">
                  <p className="problem-text">
                    Strong presentations depend on clarity, pacing, and alignment between spoken content and slides. 
                    Most people practice alone due to shyness, lack of listening audience, and receive little objective feedback. 
                    While existing tools effectively analyze speech or slide mechanics individually, the market remains fragmented. 
                    There is a lack of accessible, unified systems that evaluate delivery, slide usage, and content coherence in a single interface. 
                    The goal is to create an AI-based coach that provides concrete, personalized insights to help users significantly improve their communication skills.
                  </p>
                </div>
                <div className="landing-image">
                  <img src="/workflow.png" alt="Workflow: Upload Slides → Practice → Feedback" />
                </div>
              </div>
              
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
      </div>
    )
  }

  // Profile/Stats Page
  if (currentView === 'profile') {
    return (
      <div className="App">
        <Header 
          onNavigateHome={handleNavigateHome}
          onNavigateToSessions={handleNavigateToSessions}
          onNavigateToProfile={handleNavigateToProfile}
          currentView={currentView}
          currentSession={currentSession}
          totalSessions={sessions.length}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          currentUser={currentUser}
          onSwitchUser={() => {
            setCurrentUser(null)
            setCurrentView('userSelection')
            setCurrentSession(null)
            setCurrentAttempt(null)
          }}
        />
        <ProfilePage 
          currentUser={currentUser}
          onUpdateUserStats={handleUpdateUserStats}
        />
      </div>
    )
  }

  // Session List Page
  if (currentView === 'sessionList') {
    return (
      <div className="App">
        <Header 
          onNavigateHome={handleNavigateHome}
          onNavigateToSessions={handleNavigateToSessions}
          onNavigateToProfile={handleNavigateToProfile}
          currentView={currentView}
          currentSession={currentSession}
          totalSessions={sessions.length}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          currentUser={currentUser}
          onSwitchUser={() => {
            setCurrentUser(null)
            setCurrentView('userSelection')
            setCurrentSession(null)
            setCurrentAttempt(null)
          }}
          onUpdateUserStats={handleUpdateUserStats}
        />
        <div className="main-content-card">
          {/* Hero Section - Top 1/4 */}
          <div className="hero-section">
            <img src="/hero-image.png" alt="Hero" className="hero-image" />
            <h1 className="hero-title">Presentation Rehearsal Coach</h1>
            {/* Session List Header Overlay */}
            <div className="session-list-header-overlay">
              <h2>My Sessions</h2>
            </div>
          </div>
          
          {/* Page Content - Bottom 3/4 */}
          <div className="page-content">
            <div className="session-list-page">

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
        </div>
      </div>
    )
  }

  // Session Detail Page (for regular users and admin)
  if (currentView === 'session' && currentSession && (currentUser || isAdmin)) {
    return (
      <div className="App">
        <Header 
          onNavigateHome={handleNavigateHome}
          onNavigateToSessions={handleNavigateToSessions}
          onNavigateToProfile={handleNavigateToProfile}
          currentView={currentView}
          currentSession={currentSession}
          totalSessions={sessions.length}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          currentUser={currentUser}
          onSwitchUser={() => {
            if (isAdmin) {
              setIsAdmin(false)
              setCurrentView('adminDashboard')
            } else {
              setCurrentUser(null)
              setCurrentView('userSelection')
            }
            setCurrentSession(null)
            setCurrentAttempt(null)
          }}
          onUpdateUserStats={handleUpdateUserStats}
        />
        <div className="main-content-card">
          {/* Hero Section - Top 1/4 */}
          <div className="hero-section">
            <img src="/hero-image.png" alt="Hero" className="hero-image" />
            <h1 className="hero-title">Presentation Rehearsal Coach</h1>
            
            {/* Admin Back Button Overlay - Top Right */}
            {isAdmin && (
              <div className="admin-back-overlay">
                <button 
                  className="admin-back-button"
                  onClick={() => {
                    setCurrentView('adminDashboard')
                    setCurrentSession(null)
                    setCurrentAttempt(null)
                  }}
                >
                  ← Back to Admin Dashboard
                </button>
              </div>
            )}
            
            {/* Session Header Overlay */}
            <div className="session-header-overlay">
              <h2>{currentSession.name}</h2>
            </div>

            {/* Session Actions Overlay */}
            <div className="session-actions-overlay">
              <div className="session-actions-bar-overlay">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUploadForAttempt}
                  id="file-upload-attempt"
                  style={{ display: 'none' }}
                />
                {currentSession.processFeedback ? (
                  <button 
                    className="regenerate-feedback-button"
                    onClick={async () => {
                      try {
                        // Check if backend is available
                        const useBackend = await checkBackendAvailable()
                        
                        if (!useBackend) {
                          alert('Backend server is not running. Please start it to regenerate AI session feedback.')
                          return
                        }
                        
                        // Generate session feedback with Gemini
                        const result = await generateSessionFeedbackAPI(currentSession.name, currentSession.id)
                        await updateSession(currentSession.id, { processFeedback: result.feedback })
                        await loadSession(currentSession.id)
                        
                        alert('Session feedback regenerated successfully!')
                      } catch (err) {
                        console.error('Error regenerating session feedback:', err)
                        alert('Failed to regenerate session feedback: ' + err.message)
                      }
                    }}
                  >
                    Regenerate Feedback
                  </button>
                ) : (
                  currentSession.attempts && currentSession.attempts.length > 0 && (
                    <button 
                      className="generate-feedback-button"
                      onClick={async () => {
                        try {
                          // Check if backend is available
                          const useBackend = await checkBackendAvailable()
                          
                          if (!useBackend) {
                            alert('Backend server is not running. Please start it to generate AI session feedback.')
                            return
                          }
                          
                          // Generate session feedback with Gemini
                          const result = await generateSessionFeedbackAPI(currentSession.name, currentSession.id)
                          await updateSession(currentSession.id, { processFeedback: result.feedback })
                          await loadSession(currentSession.id)
                          
                          alert('Session feedback generated successfully!')
                        } catch (err) {
                          console.error('Error generating session feedback:', err)
                          alert('Failed to generate session feedback: ' + err.message)
                        }
                      }}
                    >
                      Generate Session Feedback
                    </button>
                  )
                )}
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
            </div>
          </div>
          
          {/* Page Content - Bottom 3/4 */}
          <div className="page-content">
            <div className="session-page">
              {/* Three Main Cards */}
              <div className="session-cards-container" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '2rem',
                padding: '2rem',
                maxWidth: '1200px',
                margin: '0 auto'
              }}>
                {/* Card 1: Session Feedback */}
                <div 
                  className="session-card"
                  onClick={() => setActivePopup('feedback')}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '2rem',
                    cursor: currentSession.processFeedback ? 'pointer' : 'not-allowed',
                    opacity: currentSession.processFeedback ? 1 : 0.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    textAlign: 'center',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (currentSession.processFeedback) {
                      e.currentTarget.style.transform = 'translateY(-5px)'
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📝</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Session Feedback</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {currentSession.processFeedback ? 'Click to view feedback' : 'No feedback yet'}
                  </p>
                </div>

                {/* Card 2: Improvement Diagram */}
                <div 
                  className="session-card"
                  onClick={() => currentSession.attempts?.length > 0 && setActivePopup('diagram')}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '2rem',
                    cursor: currentSession.attempts?.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: currentSession.attempts?.length > 0 ? 1 : 0.5,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    textAlign: 'center',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (currentSession.attempts?.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-5px)'
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📊</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Improvement Timeline</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {currentSession.attempts?.length > 0 ? 'Click to view progress' : 'No attempts yet'}
                  </p>
                </div>

                {/* Card 3: Attempts */}
                <div 
                  className="session-card"
                  onClick={() => setActivePopup('attempts')}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '2rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    textAlign: 'center',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🎯</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>View Attempts</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {currentSession.attempts?.length || 0} attempt(s)
                  </p>
                </div>
              </div>

              {/* Popup: Session Feedback */}
              {activePopup === 'feedback' && currentSession.processFeedback && (
                <div className="survey-overlay" onClick={() => setActivePopup(null)} style={{ zIndex: 1000 }}>
                  <div className="survey-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
                    <button 
                      onClick={() => setActivePopup(null)}
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        color: '#666',
                        lineHeight: '1'
                      }}
                    >
                      ×
                    </button>
                    <div className="session-feedback-box" style={{ margin: 0 }}>
                      <h3>Session Process Feedback</h3>
                      <div className="session-feedback-content">
                        {currentSession.processFeedback.split(/(?=\d+\.\s)/).filter(line => line.trim()).map((line, idx) => (
                          <p key={idx}>{line.trim()}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup: Improvement Diagram */}
              {activePopup === 'diagram' && currentSession.attempts?.length > 0 && (
                <div className="survey-overlay" onClick={() => setActivePopup(null)} style={{ zIndex: 1000 }}>
                  <div className="survey-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto' }}>
                    <button 
                      onClick={() => setActivePopup(null)}
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        color: '#666',
                        lineHeight: '1',
                        zIndex: 10
                      }}
                    >
                      ×
                    </button>
                    <SessionDiagram attempts={currentSession.attempts} />
                  </div>
                </div>
              )}

              {/* Popup: Attempts List */}
              {activePopup === 'attempts' && (
                <div className="survey-overlay" onClick={() => setActivePopup(null)} style={{ zIndex: 1000 }}>
                  <div className="survey-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '80vh', overflow: 'auto' }}>
                    <button 
                      onClick={() => setActivePopup(null)}
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        color: '#666',
                        lineHeight: '1',
                        zIndex: 10
                      }}
                    >
                      ×
                    </button>
                    {currentSession.attempts && currentSession.attempts.length > 0 ? (
                      <div className="attempts-list" style={{ margin: 0 }}>
                        <h3>Attempts ({currentSession.attempts.length})</h3>
                        {currentSession.attempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="attempt-item"
                            onClick={() => {
                              setActivePopup(null)
                              handleSelectAttempt(attempt)
                            }}
                          >
                            <div className="attempt-info">
                              <h4>Attempt {currentSession.attempts.indexOf(attempt) + 1}</h4>
                              <p className="attempt-meta">
                                {formatDate(attempt.timestamp)} • {formatTime(attempt.duration || 0)}
                              </p>
                              <p className="attempt-file">{attempt.fileName || 'Presentation'}</p>
                              {(attempt.geminiFeedback || attempt.analysisResults) && (
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
                                {!pyodide ? '⏳ Loading Python...' : analyzing[attempt.id] ? '⏳ Analyzing...' : '📊 Analyze'}
                              </button>
                              <button
                                className="analyze-button secondary"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await handleGenerateAIFeedback(attempt.id)
                                }}
                                disabled={analyzing[`ai_${attempt.id}`] || !attempt.audioPath}
                                title={!attempt.audioPath ? 'Run full Analysis first' : 'Generate AI feedback using Gemini'}
                              >
                                {analyzing[`ai_${attempt.id}`] ? '⏳ Generating...' : '🤖 AI Feedback'}
                              </button>
                              {(attempt.geminiFeedback || attempt.analysisResults) && (
                                <button
                                  className="analyze-button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActivePopup(null)
                                    handleSelectAttempt(attempt)
                                  }}
                                >
                                  👁️ View Feedback
                                </button>
                              )}
                              <button
                                className="analyze-button secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleExportRecording(attempt)
                                }}
                                title="Export recording for backend analysis"
                              >
                                💾 Export
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
                      <div className="no-attempts" style={{ margin: 0 }}>
                        <p>No attempts yet. Create your first attempt to start practicing!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Attempt Viewer Page (PDF + Recording) - for regular users and admin
  // Allow rendering if we have a file (new attempt) OR currentAttempt (existing attempt)
  if (currentView === 'attempt' && currentSession && (currentUser || isAdmin) && (file || currentAttempt)) {
    // Get attempt number if viewing a previous attempt
    let attemptNumber = null
    if (currentAttempt && currentSession && currentSession.attempts) {
      const attemptIndex = currentSession.attempts.findIndex(a => a.id === currentAttempt.id)
      if (attemptIndex !== -1) {
        attemptNumber = attemptIndex + 1
      }
    }
    
    return (
      <div className="App">
        <Header 
          onNavigateHome={handleNavigateHome}
          onNavigateToSessions={handleNavigateToSessions}
          onNavigateToProfile={handleNavigateToProfile}
          currentView={currentView}
          currentSession={currentSession}
          totalSessions={sessions.length}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          currentUser={currentUser}
          onSwitchUser={() => {
            if (isAdmin) {
              setIsAdmin(false)
              setCurrentView('adminDashboard')
            } else {
              setCurrentUser(null)
              setCurrentView('userSelection')
            }
            setCurrentSession(null)
            setCurrentAttempt(null)
          }}
          onUpdateUserStats={handleUpdateUserStats}
        />
        {/* Rating Form Modal */}
        {showRatingForm && (
          <div className="survey-overlay" onClick={() => setShowRatingForm(false)}>
            <div className="survey-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="survey-header">
                <h2>Rate AI Feedback</h2>
                <p className="survey-subtitle">Please rate the AI feedback you received</p>
                <button 
                  onClick={() => setShowRatingForm(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>
              <form className="survey-form" onSubmit={handleRatingSubmit}>
                {/* Question 1: Relevance */}
                <div className="survey-field">
                  <label>1. Was it relevant?</label>
                  <div className="scale-container">
                    <span className="scale-label-left">1 - Not at all</span>
                    <div className="scale-options">
                      {[1, 2, 3, 4, 5].map(value => (
                        <label key={value} className="scale-option">
                          <input
                            type="radio"
                            name="relevance"
                            value={value}
                            checked={ratingData.relevance === String(value)}
                            onChange={(e) => handleRatingChange('relevance', e.target.value)}
                            required
                          />
                          <span className="scale-number">{value}</span>
                        </label>
                      ))}
                    </div>
                    <span className="scale-label-right">5 - Very relevant</span>
                  </div>
                </div>

                {/* Question 2: Helpfulness */}
                <div className="survey-field">
                  <label>2. Was it helpful?</label>
                  <div className="scale-container">
                    <span className="scale-label-left">1 - Not at all</span>
                    <div className="scale-options">
                      {[1, 2, 3, 4, 5].map(value => (
                        <label key={value} className="scale-option">
                          <input
                            type="radio"
                            name="helpfulness"
                            value={value}
                            checked={ratingData.helpfulness === String(value)}
                            onChange={(e) => handleRatingChange('helpfulness', e.target.value)}
                            required
                          />
                          <span className="scale-number">{value}</span>
                        </label>
                      ))}
                    </div>
                    <span className="scale-label-right">5 - Very helpful</span>
                  </div>
                </div>

                {/* Question 3: Clarity */}
                <div className="survey-field">
                  <label>3. Was it clear and easy to understand?</label>
                  <div className="scale-container">
                    <span className="scale-label-left">1 - Not clear</span>
                    <div className="scale-options">
                      {[1, 2, 3, 4, 5].map(value => (
                        <label key={value} className="scale-option">
                          <input
                            type="radio"
                            name="clarity"
                            value={value}
                            checked={ratingData.clarity === String(value)}
                            onChange={(e) => handleRatingChange('clarity', e.target.value)}
                            required
                          />
                          <span className="scale-number">{value}</span>
                        </label>
                      ))}
                    </div>
                    <span className="scale-label-right">5 - Very clear</span>
                  </div>
                </div>

                {/* Question 4: Actionability */}
                <div className="survey-field">
                  <label>4. Was it actionable and practical?</label>
                  <div className="scale-container">
                    <span className="scale-label-left">1 - Not actionable</span>
                    <div className="scale-options">
                      {[1, 2, 3, 4, 5].map(value => (
                        <label key={value} className="scale-option">
                          <input
                            type="radio"
                            name="actionability"
                            value={value}
                            checked={ratingData.actionability === String(value)}
                            onChange={(e) => handleRatingChange('actionability', e.target.value)}
                            required
                          />
                          <span className="scale-number">{value}</span>
                        </label>
                      ))}
                    </div>
                    <span className="scale-label-right">5 - Very actionable</span>
                  </div>
                </div>

                {/* Question 5: Recommendation */}
                <div className="survey-field">
                  <label>5. Would you recommend this feedback tool?</label>
                  <div className="scale-container">
                    <span className="scale-label-left">1 - No</span>
                    <div className="scale-options">
                      {[1, 2, 3, 4, 5].map(value => (
                        <label key={value} className="scale-option">
                          <input
                            type="radio"
                            name="recommendation"
                            value={value}
                            checked={ratingData.recommendation === String(value)}
                            onChange={(e) => handleRatingChange('recommendation', e.target.value)}
                            required
                          />
                          <span className="scale-number">{value}</span>
                        </label>
                      ))}
                    </div>
                    <span className="scale-label-right">5 - Definitely</span>
                  </div>
                </div>

                <div className="survey-buttons">
                  <button type="button" onClick={() => setShowRatingForm(false)} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Submit Rating
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="main-content-card">
          {/* Hero Section - Top 1/4 */}
          <div className="hero-section">
            <img src="/hero-image.png" alt="Hero" className="hero-image" />
            <h1 className="hero-title">Presentation Rehearsal Coach</h1>
            
            {/* Admin Back Button Overlay - Top Right */}
            {isAdmin && (
              <div className="admin-back-overlay">
                <button 
                  className="admin-back-button"
                  onClick={() => {
                    setCurrentView('adminDashboard')
                    setCurrentSession(null)
                    setCurrentAttempt(null)
                  }}
                >
                  ← Back to Admin Dashboard
                </button>
              </div>
            )}
            
            {/* Attempt Header Overlay */}
            {(currentSession || currentAttempt) && (
              <div className="attempt-header-overlay">
                <h2>
                  {currentSession?.name || 'Session'}
                  {attemptNumber && ` - Attempt ${attemptNumber}`}
                </h2>
                <div className="attempt-actions-overlay">
                  {currentAttempt && (
                    <>
                      <button
                        className="analyze-button"
                        onClick={async () => {
                          if (currentAttempt && currentAttempt.id) {
                            await handleAnalyzeAttempt(currentAttempt.id)
                          }
                        }}
                        disabled={analyzing[currentAttempt?.id] || !pyodide}
                      >
                        {!pyodide ? 'Loading Python...' : analyzing[currentAttempt?.id] ? 'Analyzing...' : '📊 Analyze Attempt'}
                      </button>
                      <button
                        className="analyze-button secondary"
                        onClick={async () => {
                          if (currentAttempt && currentAttempt.id) {
                            await handleGenerateAIFeedback(currentAttempt.id)
                          }
                        }}
                        disabled={analyzing[`ai_${currentAttempt?.id}`] || !currentAttempt.audioPath}
                        title={!currentAttempt.audioPath ? 'Run full Analysis first' : 'Generate AI feedback using Gemini'}
                      >
                        {analyzing[`ai_${currentAttempt?.id}`] ? '⏳ Generating...' : '🤖 AI Feedback'}
                      </button>
                    </>
                  )}
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
                    ← Back to Session
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Page Content - Bottom 3/4 */}
          <div className="page-content">
            <div className="presentation-viewer">

          {!currentAttempt && (
            <>
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
                <div className="zoom-controls">
                  <button onClick={zoomOut} disabled={scale <= 0.5}>−</button>
                  <span className="zoom-level">{Math.round(scale * 100)}%</span>
                  <button onClick={zoomIn} disabled={scale >= 3.0}>+</button>
                  <button onClick={resetZoom} className="reset-zoom">Reset</button>
                </div>
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
                        id="file-upload-attempt-inline"
                        style={{ display: 'none' }}
                      />
                      <button onClick={() => document.getElementById('file-upload-attempt-inline').click()}>
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
                      onClick={() => {
                        const newPage = idx + 1
                        console.log(`Page button clicked: ${pageNumber} → ${newPage}, Recording: ${isRecording}`)
                        if (newPage !== pageNumber) {
                          trackPageNavigation(pageNumber, newPage, 'page-button')
                        }
                        setPageNumber(newPage)
                      }}
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {currentAttempt && (
            <div className="attempt-details-section">
              {/* 1. Gemini Feedback First */}
              {currentAttempt.geminiFeedback && (
                <div className="attempt-feedback-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>🤖 AI Presentation Coach Feedback</h3>
                    <button 
                      className="rate-feedback-button"
                      onClick={() => setShowRatingForm(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                    >
                      Rate me 😊
                    </button>
                  </div>
                  <div style={{ lineHeight: '1.8' }}>
                    {(() => {
                      const sections = formatGeminiFeedbackHTML(currentAttempt.geminiFeedback)
                      if (!sections) {
                        return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{currentAttempt.geminiFeedback}</pre>
                      }
                      
                      return sections.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: '2rem' }}>
                          <h2 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            marginBottom: '1rem',
                            color: '#2c3e50',
                            borderBottom: '2px solid #3498db',
                            paddingBottom: '0.5rem'
                          }}>
                            {section.header}
                          </h2>
                          <div style={{ paddingLeft: '1rem' }}>
                            {section.items.map((item, itemIdx) => {
                              if (item.label) {
                                return (
                                  <div key={itemIdx} style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ 
                                      marginBottom: '0.5rem',
                                      fontSize: '1rem',
                                      color: '#34495e'
                                    }}>
                                      <strong>{item.label}:</strong> {item.content.join(' ')}
                                    </p>
                                  </div>
                                )
                              }
                              
                              return (
                                <p key={itemIdx} style={{ 
                                  marginBottom: '0.75rem',
                                  fontSize: '1rem',
                                  color: '#34495e'
                                }}>
                                  {item.content.join(' ')}
                                </p>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
              
              {/* 2. Video Second */}
              {currentAttempt.videoData && (
                <div className="attempt-video-player">
                  <h3>Recording</h3>
                  <video
                    id="attempt-video-player"
                    controls
                    src={currentAttempt.videoData}
                    className="attempt-video"
                  >
                    Your browser does not support video playback.
                  </video>
                  <div className="attempt-video-info">
                    <p><strong>Duration:</strong> {formatTime(currentAttempt.duration || 0)}</p>
                    <p><strong>Recorded:</strong> {formatDate(currentAttempt.timestamp)}</p>
                    {currentAttempt.navigationEvents && currentAttempt.navigationEvents.length > 0 && (
                      <p><strong>Page Navigations:</strong> {currentAttempt.navigationEvents.length - 1} time(s)</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Interactive Transcription with Hover Timestamps */}
              {(() => {
                console.log('🔍 Checking transcription segments:', {
                  hasCurrentAttempt: !!currentAttempt,
                  hasTranscriptionSegments: !!currentAttempt?.transcriptionSegments,
                  segmentsLength: currentAttempt?.transcriptionSegments?.length,
                  segments: currentAttempt?.transcriptionSegments
                })
                return null
              })()}
              {currentAttempt.transcriptionSegments && currentAttempt.transcriptionSegments.length > 0 && (
                <div className="transcription-box">
                  <h3>📝 Full Transcription</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                    Hover over words to see timestamps • Click to jump to that time in the video
                  </p>
                  <div className="transcription-content">
                    {currentAttempt.transcriptionSegments.map((seg, segIdx) => (
                      <div key={segIdx} className="transcription-segment">
                        {seg.words && seg.words.length > 0 ? (
                          seg.words.map((word, wordIdx) => (
                            <span
                              key={wordIdx}
                              className="transcription-word"
                              title={`Time: ${formatTime(word.start)} - ${formatTime(word.end)}`}
                              onClick={() => {
                                const video = document.getElementById('attempt-video-player')
                                if (video) {
                                  video.currentTime = word.start
                                  video.play()
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                padding: '2px 1px',
                                borderRadius: '3px',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#e3f2fd'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent'
                              }}
                            >
                              {word.word}
                            </span>
                          ))
                        ) : (
                          <span>{seg.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 2.5. Prosodic Features Diagram */}
              {currentAttempt.prosodicMetrics && (
                <ProsodicDiagram prosodicMetrics={currentAttempt.prosodicMetrics} />
              )}
              
              {/* 3. Analysis Results Third */}
              {currentAttempt.analysisResults && (
                <div className="attempt-feedback-box">
                  <h3>Analysis Results</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {currentAttempt.analysisResults}
                  </pre>
                </div>
              )}
              
              {/* 4. Navigation Feedback Last */}
              {currentAttempt.navigationEvents && currentAttempt.navigationEvents.length > 0 && (
                <div className="navigation-tracking-box">
                  <h3>📄 Page Navigation Timeline</h3>
                  <div className="navigation-events">
                    {currentAttempt.navigationEvents.map((event, idx) => (
                      <div key={idx} className="navigation-event">
                        <div className="event-time">{formatTime(event.timestamp)}</div>
                        <div className="event-details">
                          {event.method === 'start' ? (
                            <>
                              <strong>Started on Page {event.toPage}</strong>
                            </>
                          ) : (
                            <>
                              <strong>Page {event.fromPage} → {event.toPage}</strong>
                              <span className="event-method">via {event.method}</span>
                              {event.duration > 0 && (
                                <span className="event-duration">
                                  (spent {formatTime(event.duration)} on page {event.fromPage})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
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
