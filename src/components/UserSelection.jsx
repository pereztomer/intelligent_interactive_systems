import { useState, useEffect } from 'react'
import { getAllUsers, createUser } from '../utils/userStorage'
import './UserSelection.css'

function UserSelection({ onUserSelect, onCreateUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setLoading(false)
    } catch (err) {
      console.error('Error loading users:', err)
      setLoading(false)
    }
  }

  const handleSelectUser = (user) => {
    onUserSelect(user)
  }

  const handleCreateNew = () => {
    onCreateUser()
  }

  if (loading) {
    return (
      <div className="user-selection-page">
        <div className="user-selection-card">
          <div className="loading">Loading users...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="user-selection-page">
      <div className="user-selection-card">
        <div className="hero-section">
          <img src="/hero-image.png" alt="Hero" className="hero-image" />
          <h1 className="hero-title">Presentation Rehearsal Coach</h1>
        </div>
        
        <div className="user-selection-content">
          <h2>Select User</h2>
          <p className="subtitle">Choose an existing user or create a new one to get started</p>
          
          <div className="users-list">
            {users.map((user) => (
              <button
                key={user.id}
                className="user-item"
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <p className="user-meta">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="user-arrow">→</div>
              </button>
            ))}
          </div>
          
          <button className="create-user-button" onClick={handleCreateNew}>
            + Create New User
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserSelection
