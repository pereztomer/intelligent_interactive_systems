// Utility functions for storing and retrieving recordings

const DB_NAME = 'PresentationRehearsalDB'
const STORE_NAME = 'recordings'
const DB_VERSION = 1

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// Save a recording
export const saveRecording = async (recordingData) => {
  const db = await initDB()
  const transaction = db.transaction([STORE_NAME], 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  
  const recording = {
    ...recordingData,
    timestamp: Date.now(),
    id: Date.now() // Simple ID generation
  }

  return new Promise((resolve, reject) => {
    const request = store.add(recording)
    request.onsuccess = () => resolve(recording.id)
    request.onerror = () => reject(request.error)
  })
}

// Get all recordings
export const getAllRecordings = async () => {
  const db = await initDB()
  const transaction = db.transaction([STORE_NAME], 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('timestamp')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = () => {
      const recordings = request.result.sort((a, b) => b.timestamp - a.timestamp)
      resolve(recordings)
    }
    request.onerror = () => reject(request.error)
  })
}

// Get a single recording by ID
export const getRecording = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([STORE_NAME], 'readonly')
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Delete a recording
export const deleteRecording = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([STORE_NAME], 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Update a recording (e.g., to add analysis result)
export const updateRecording = async (id, updates) => {
  const db = await initDB()
  const transaction = db.transaction([STORE_NAME], 'readwrite')
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const recording = getRequest.result
      if (recording) {
        const updatedRecording = { ...recording, ...updates }
        const putRequest = store.put(updatedRecording)
        putRequest.onsuccess = () => resolve(updatedRecording)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Recording not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

