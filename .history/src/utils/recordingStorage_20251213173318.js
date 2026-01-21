// Utility functions for storing and retrieving sessions and attempts

const DB_NAME = 'PresentationRehearsalDB'
const SESSIONS_STORE = 'sessions'
const ATTEMPTS_STORE = 'attempts'
const DB_VERSION = 2

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create sessions store
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id', autoIncrement: true })
        sessionsStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      // Create attempts store
      if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
        const attemptsStore = db.createObjectStore(ATTEMPTS_STORE, { keyPath: 'id', autoIncrement: true })
        attemptsStore.createIndex('sessionId', 'sessionId', { unique: false })
        attemptsStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// ========== SESSION FUNCTIONS ==========

// Create a new session
export const createSession = async (sessionData) => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readwrite')
  const store = transaction.objectStore(SESSIONS_STORE)
  
  const session = {
    ...sessionData,
    timestamp: Date.now(),
    id: Date.now(),
    processFeedback: null, // Session-level feedback for all attempts
    attempts: [] // Will be populated when loading session with attempts
  }

  return new Promise((resolve, reject) => {
    const request = store.add(session)
    request.onsuccess = () => resolve(session.id)
    request.onerror = () => reject(request.error)
  })
}

// Get all sessions
export const getAllSessions = async () => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readonly')
  const store = transaction.objectStore(SESSIONS_STORE)
  const index = store.index('timestamp')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = async () => {
      const sessions = request.result.sort((a, b) => b.timestamp - a.timestamp)
      
      // Load attempts for each session
      const sessionsWithAttempts = await Promise.all(
        sessions.map(async (session) => {
          const attempts = await getAttemptsBySession(session.id)
          return { ...session, attempts }
        })
      )
      
      resolve(sessionsWithAttempts)
    }
    request.onerror = () => reject(request.error)
  })
}

// Get a single session by ID
export const getSession = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readonly')
  const store = transaction.objectStore(SESSIONS_STORE)

  return new Promise(async (resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = async () => {
      const session = request.result
      if (session) {
        const attempts = await getAttemptsBySession(id)
        resolve({ ...session, attempts })
      } else {
        resolve(null)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

// Update a session (e.g., to add process feedback)
export const updateSession = async (id, updates) => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readwrite')
  const store = transaction.objectStore(SESSIONS_STORE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const session = getRequest.result
      if (session) {
        const updatedSession = { ...session, ...updates }
        const putRequest = store.put(updatedSession)
        putRequest.onsuccess = () => resolve(updatedSession)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Session not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Delete a session (and all its attempts)
export const deleteSession = async (id) => {
  const db = await initDB()
  
  // First delete all attempts
  const attempts = await getAttemptsBySession(id)
  await Promise.all(attempts.map(attempt => deleteAttempt(attempt.id)))
  
  // Then delete the session
  const transaction = db.transaction([SESSIONS_STORE], 'readwrite')
  const store = transaction.objectStore(SESSIONS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ========== ATTEMPT FUNCTIONS ==========

// Save an attempt (recording) to a session
export const saveAttempt = async (sessionId, attemptData) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readwrite')
  const store = transaction.objectStore(ATTEMPTS_STORE)
  
  const attempt = {
    ...attemptData,
    sessionId,
    timestamp: Date.now(),
    id: Date.now(),
    feedback: null // Attempt-level feedback
  }

  return new Promise((resolve, reject) => {
    const request = store.add(attempt)
    request.onsuccess = () => resolve(attempt.id)
    request.onerror = () => reject(request.error)
  })
}

// Get all attempts for a session
export const getAttemptsBySession = async (sessionId) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readonly')
  const store = transaction.objectStore(ATTEMPTS_STORE)
  const index = store.index('sessionId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(sessionId)
    request.onsuccess = () => {
      const attempts = request.result.sort((a, b) => a.timestamp - b.timestamp)
      resolve(attempts)
    }
    request.onerror = () => reject(request.error)
  })
}

// Get a single attempt by ID
export const getAttempt = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readonly')
  const store = transaction.objectStore(ATTEMPTS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Update an attempt (e.g., to add feedback)
export const updateAttempt = async (id, updates) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readwrite')
  const store = transaction.objectStore(ATTEMPTS_STORE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const attempt = getRequest.result
      if (attempt) {
        const updatedAttempt = { ...attempt, ...updates }
        const putRequest = store.put(updatedAttempt)
        putRequest.onsuccess = () => resolve(updatedAttempt)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Attempt not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Delete an attempt
export const deleteAttempt = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readwrite')
  const store = transaction.objectStore(ATTEMPTS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ========== LEGACY FUNCTIONS (for backward compatibility) ==========

// Legacy: Save a recording (now creates a session with one attempt)
export const saveRecording = async (recordingData) => {
  // Create a new session
  const sessionId = await createSession({
    pdfFileName: recordingData.fileName || 'presentation.pdf',
    pdfData: recordingData.pdfData
  })
  
  // Save the recording as an attempt
  await saveAttempt(sessionId, {
    videoData: recordingData.videoData,
    pdfData: recordingData.pdfData,
    fileName: recordingData.fileName || 'presentation.pdf',
    duration: recordingData.duration
  })
  
  return sessionId
}

// Legacy: Get all recordings (now returns sessions)
export const getAllRecordings = async () => {
  return getAllSessions()
}

// Legacy: Get a single recording (now returns session)
export const getRecording = async (id) => {
  return getSession(id)
}

// Legacy: Delete a recording (now deletes session)
export const deleteRecording = async (id) => {
  return deleteSession(id)
}

// Legacy: Update a recording (now updates session)
export const updateRecording = async (id, updates) => {
  return updateSession(id, updates)
}

