// API Client for backend communication
const API_BASE_URL = 'http://localhost:5000'

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }
  
  return response.json()
}

// Check if backend server is available
export const checkBackendAvailable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
    return response.ok
  } catch (err) {
    return false
  }
}

// Save recording to backend
export const saveRecording = async (data) => {
  return apiRequest('/save_recording', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Analyze attempt
export const analyzeAttempt = async (audioPath) => {
  return apiRequest('/analyze', {
    method: 'POST',
    body: JSON.stringify({
      audioPath,
      enableTranscription: true
    })
  })
}

// Generate AI feedback (Gemini)
export const generateAIFeedback = async (audioPath) => {
  return apiRequest('/generate_feedback', {
    method: 'POST',
    body: JSON.stringify({ audioPath })
  })
}

// Generate session feedback
export const generateSessionFeedback = async (sessionName, sessionId) => {
  return apiRequest('/session_feedback', {
    method: 'POST',
    body: JSON.stringify({ sessionName, sessionId })
  })
}

// Save user feedback/rating
export const saveFeedback = async (sessionName, sessionId, attemptNumber, feedback) => {
  return apiRequest('/save_feedback', {
    method: 'POST',
    body: JSON.stringify({
      sessionName,
      sessionId,
      attemptNumber,
      feedback
    })
  })
}

