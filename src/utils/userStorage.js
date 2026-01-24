// Utility functions for storing and retrieving users

const DB_NAME = 'PresentationRehearsalDB'
const USERS_STORE = 'users'
const SESSIONS_STORE = 'sessions'
const ATTEMPTS_STORE = 'attempts'
const DB_VERSION = 5 // Bumped to ensure all stores are created

// Initialize IndexedDB (shared with recordingStorage)
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
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

// ========== USER FUNCTIONS ==========

// Create a new user
export const createUser = async (userName, surveyData = null) => {
  const db = await initDB()
  const transaction = db.transaction([USERS_STORE], 'readwrite')
  const store = transaction.objectStore(USERS_STORE)
  
  const user = {
    name: userName || `User ${Date.now()}`,
    createdAt: Date.now(),
    surveyData: surveyData,
    lastActive: Date.now()
  }

  return new Promise((resolve, reject) => {
    const request = store.add(user)
    request.onsuccess = () => {
      resolve({ ...user, id: request.result })
    }
    request.onerror = () => reject(request.error)
  })
}

// Get all users
export const getAllUsers = async () => {
  const db = await initDB()
  const transaction = db.transaction([USERS_STORE], 'readonly')
  const store = transaction.objectStore(USERS_STORE)
  const index = store.index('createdAt')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = () => {
      const users = request.result.sort((a, b) => b.lastActive - a.lastActive)
      resolve(users)
    }
    request.onerror = () => reject(request.error)
  })
}

// Get a single user by ID
export const getUser = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([USERS_STORE], 'readonly')
  const store = transaction.objectStore(USERS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Update a user
export const updateUser = async (id, updates) => {
  const db = await initDB()
  const transaction = db.transaction([USERS_STORE], 'readwrite')
  const store = transaction.objectStore(USERS_STORE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const user = getRequest.result
      if (user) {
        const updatedUser = { ...user, ...updates, lastActive: Date.now() }
        const putRequest = store.put(updatedUser)
        putRequest.onsuccess = () => resolve(updatedUser)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('User not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Delete a user
export const deleteUser = async (id) => {
  const db = await initDB()
  const transaction = db.transaction([USERS_STORE], 'readwrite')
  const store = transaction.objectStore(USERS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
