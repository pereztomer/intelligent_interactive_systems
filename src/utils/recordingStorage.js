// Utility functions for storing and retrieving sessions and attempts

const DB_NAME = 'PresentationRehearsalDB'
const SESSIONS_STORE = 'sessions'
const ATTEMPTS_STORE = 'attempts'
const USERS_STORE = 'users'
const DB_VERSION = 5 // Bumped to match userStorage version

// Initialize IndexedDB (shared with userStorage)
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Delete old stores if they exist (clean migration)
      if (db.objectStoreNames.contains('recordings')) {
        db.deleteObjectStore('recordings')
      }
      
      // Create users store if it doesn't exist
      if (!db.objectStoreNames.contains(USERS_STORE)) {
        const usersStore = db.createObjectStore(USERS_STORE, { keyPath: 'id', autoIncrement: true })
        usersStore.createIndex('name', 'name', { unique: false })
        usersStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
      
      // Create sessions store if it doesn't exist
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id', autoIncrement: true })
        sessionsStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
      
      // Create attempts store if it doesn't exist
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
export const createSession = async (sessionName, surveyData = null, userId = null) => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readwrite')
  const store = transaction.objectStore(SESSIONS_STORE)
  
  const session = {
    name: sessionName || `Session ${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
    processFeedback: null,
    surveyData: surveyData,
    userId: userId
  }

  return new Promise((resolve, reject) => {
    const request = store.add(session)
    request.onsuccess = () => {
      resolve({ ...session, id: request.result })
    }
    request.onerror = () => reject(request.error)
  })
}

// Get all sessions
export const getAllSessions = async (userId = null) => {
  const db = await initDB()
  const transaction = db.transaction([SESSIONS_STORE], 'readonly')
  const store = transaction.objectStore(SESSIONS_STORE)
  const index = store.index('createdAt')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = async () => {
      let sessions = request.result
      
      // Filter by userId if provided
      if (userId) {
        sessions = sessions.filter(session => session.userId === userId)
      }
      
      sessions = sessions.sort((a, b) => b.createdAt - a.createdAt)
      
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

// Delete a session and all its attempts
export const deleteSession = async (id) => {
  const db = await initDB()
  
  // First, delete all attempts in this session
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

// Save an attempt
export const saveAttempt = async (attemptData) => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readwrite')
  const store = transaction.objectStore(ATTEMPTS_STORE)
  
  const attempt = {
    ...attemptData,
    timestamp: Date.now(),
    attemptFeedback: null
  }

  return new Promise((resolve, reject) => {
    const request = store.add(attempt)
    request.onsuccess = () => {
      resolve({ ...attempt, id: request.result })
    }
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
      const attempts = request.result.sort((a, b) => b.timestamp - a.timestamp)
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

// Update an attempt (e.g., to add attempt feedback)
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

// ========== LEGACY SUPPORT (for backward compatibility) ==========

// Legacy function - now creates a session and attempt
export const saveRecording = async (recordingData) => {
  // Create a session if not provided
  let sessionId = recordingData.sessionId
  if (!sessionId) {
    const session = await createSession()
    sessionId = session.id
  }
  
  // Save as attempt
  return await saveAttempt({
    sessionId,
    videoData: recordingData.videoData,
    pdfData: recordingData.pdfData,
    fileName: recordingData.fileName,
    duration: recordingData.duration
  })
}

// Legacy function - get all recordings (now returns all attempts)
export const getAllRecordings = async () => {
  const db = await initDB()
  const transaction = db.transaction([ATTEMPTS_STORE], 'readonly')
  const store = transaction.objectStore(ATTEMPTS_STORE)
  const index = store.index('timestamp')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = () => {
      const attempts = request.result.sort((a, b) => b.timestamp - a.timestamp)
      resolve(attempts)
    }
    request.onerror = () => reject(request.error)
  })
}

// Legacy function - get recording by ID (now gets attempt)
export const getRecording = async (id) => {
  return await getAttempt(id)
}

// Legacy function - delete recording (now deletes attempt)
export const deleteRecording = async (id) => {
  return await deleteAttempt(id)
}

// Legacy function - update recording (now updates attempt)
export const updateRecording = async (id, updates) => {
  return await updateAttempt(id, updates)
}

