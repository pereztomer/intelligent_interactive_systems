import { useState } from 'react'
import './AdminLogin.css'

const ADMIN_PASSWORD = '2026'

function AdminLogin({ onLogin, onCancel }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (password === ADMIN_PASSWORD) {
      onLogin()
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="hero-section">
          <img src="/hero-image.png" alt="Hero" className="hero-image" />
          <h1 className="hero-title">Presentation Rehearsal Coach</h1>
        </div>
        
        <div className="admin-login-content">
          <h2>Admin Access</h2>
          <p className="subtitle">Enter the admin password to access all user data</p>
          
          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter admin password"
                autoFocus
                required
              />
              {error && <p className="error-message">{error}</p>}
            </div>
            
            <div className="form-buttons">
              <button type="button" onClick={onCancel} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
