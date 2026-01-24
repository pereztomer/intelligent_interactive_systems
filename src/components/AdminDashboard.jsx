import { useState, useEffect } from 'react'
import { getAllUsers } from '../utils/userStorage'
import { getAllSessions } from '../utils/recordingStorage'
import './AdminDashboard.css'

function AdminDashboard({ onLogout, onSelectSession, onSelectAttempt }) {
  const [users, setUsers] = useState([])
  const [allSessions, setAllSessions] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users') // 'users', 'sessions', 'attempts'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersData, sessionsData] = await Promise.all([
        getAllUsers(),
        getAllSessions(null) // Get all sessions for all users
      ])
      setUsers(usersData)
      setAllSessions(sessionsData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading admin data:', err)
      alert('Failed to load admin data: ' + err.message)
      setLoading(false)
    }
  }

  const formatStatValue = (key, value) => {
    if (!value) return 'Not set'
    
    const formatMap = {
      gender: {
        'male': 'Male',
        'female': 'Female',
        'prefer_not_to_answer': 'Prefer not to answer'
      },
      education: {
        'high_school': 'High School',
        'bachelor': 'Bachelor',
        'master': 'Master',
        'higher': 'Higher'
      },
      englishFluency: {
        'beginner': 'Beginner',
        'intermediate': 'Intermediate',
        'advanced': 'Advanced',
        'native': 'Native'
      },
      lastPresentation: {
        'week': 'Within a week',
        'month': 'Within a month',
        '6_months': 'Within 6 months',
        'more_than_year': 'More than a year'
      },
      managerialExperience: {
        'yes': 'Yes',
        'no': 'No'
      },
      presentationTime: value => `${value} minute${value > 1 ? 's' : ''}`,
      confidenceLevel: value => `${value}/7`,
      domainKnowledge: value => `${value}/7`,
      crowdAttention: value => `${value}/7`
    }

    if (formatMap[key]) {
      if (typeof formatMap[key] === 'function') {
        return formatMap[key](value)
      }
      return formatMap[key][value] || value
    }
    return value
  }

  const formatStatLabel = (key) => {
    const labels = {
      age: 'Age',
      gender: 'Gender',
      education: 'Education',
      englishFluency: 'English Fluency',
      lastPresentation: 'Last Presentation',
      managerialExperience: 'Managerial Experience',
      presentationTime: 'Presentation Time (min)',
      confidenceLevel: 'Confidence Level',
      domainKnowledge: 'Domain Knowledge',
      crowdAttention: 'Crowd Attention'
    }
    return labels[key] || key
  }

  const getUserSessions = (userId) => {
    return allSessions.filter(session => session.userId === userId)
  }

  const getTotalAttempts = (userId) => {
    const userSessions = getUserSessions(userId)
    return userSessions.reduce((total, session) => {
      return total + (session.attempts?.length || 0)
    }, 0)
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading admin data...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="main-content-card">
        <div className="hero-section">
          <img src="/hero-image.png" alt="Hero" className="hero-image" />
          <h1 className="hero-title">Presentation Rehearsal Coach</h1>
          <div className="admin-header-overlay">
            <h2>Admin Dashboard</h2>
            <button className="admin-logout-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
        
        <div className="page-content">
          <div className="admin-content">
            <div className="admin-tabs">
              <button 
                className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                Users ({users.length})
              </button>
              <button 
                className={`admin-tab ${activeTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                All Sessions ({allSessions.length})
              </button>
            </div>

            {activeTab === 'users' && (
              <div className="admin-users-section">
                <div className="admin-stats-summary">
                  <div className="stat-box">
                    <div className="stat-box-value">{users.length}</div>
                    <div className="stat-box-label">Total Users</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-value">{allSessions.length}</div>
                    <div className="stat-box-label">Total Sessions</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-value">
                      {allSessions.reduce((total, session) => total + (session.attempts?.length || 0), 0)}
                    </div>
                    <div className="stat-box-label">Total Attempts</div>
                  </div>
                </div>

                <div className="users-grid">
                  {users.map((user) => {
                    const userSessions = getUserSessions(user.id)
                    const totalAttempts = getTotalAttempts(user.id)
                    
                    return (
                      <div key={user.id} className="admin-user-card">
                        <div className="admin-user-header">
                          <h3>{user.name}</h3>
                          <div className="admin-user-meta">
                            <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                            <span>Sessions: {userSessions.length}</span>
                            <span>Attempts: {totalAttempts}</span>
                          </div>
                        </div>
                        
                        {user.surveyData && (
                          <div className="admin-user-stats">
                            <h4>Profile Statistics</h4>
                            <div className="stats-grid">
                              {Object.entries(user.surveyData).map(([key, value]) => (
                                <div key={key} className="stat-item">
                                  <span className="stat-label">{formatStatLabel(key)}:</span>
                                  <span className="stat-value">{formatStatValue(key, value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {userSessions.length > 0 && (
                          <div className="admin-user-sessions">
                            <h4>Sessions</h4>
                            <div className="sessions-list">
                              {userSessions.map((session) => (
                                <div key={session.id} className="session-item clickable" onClick={() => onSelectSession && onSelectSession(session.id)}>
                                  <div className="session-info">
                                    <strong>{session.name}</strong>
                                    <span className="session-meta">
                                      Created: {new Date(session.createdAt).toLocaleDateString()} | 
                                      Attempts: {session.attempts?.length || 0}
                                    </span>
                                  </div>
                                  {session.attempts && session.attempts.length > 0 && (
                                    <div className="attempts-list">
                                      {session.attempts.map((attempt, idx) => (
                                        <div 
                                          key={attempt.id} 
                                          className="attempt-item clickable" 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (onSelectAttempt) {
                                              onSelectAttempt(session.id, attempt.id)
                                            }
                                          }}
                                        >
                                          <span>Attempt {idx + 1}</span>
                                          <span>{new Date(attempt.timestamp).toLocaleString()}</span>
                                          {attempt.duration && (
                                            <span>Duration: {Math.floor(attempt.duration / 60)}:{(attempt.duration % 60).toString().padStart(2, '0')}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="admin-sessions-section">
                <div className="sessions-table">
                  {allSessions.map((session) => {
                    const user = users.find(u => u.id === session.userId)
                    return (
                      <div key={session.id} className="admin-session-card clickable" onClick={() => onSelectSession && onSelectSession(session.id)}>
                        <div className="admin-session-header">
                          <h3>{session.name}</h3>
                          <div className="admin-session-meta">
                            <span><strong>User:</strong> {user?.name || 'Unknown'}</span>
                            <span><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</span>
                            <span><strong>Attempts:</strong> {session.attempts?.length || 0}</span>
                          </div>
                        </div>
                        {session.attempts && session.attempts.length > 0 && (
                          <div className="admin-session-attempts">
                            <h4>Attempts</h4>
                            {session.attempts.map((attempt, idx) => (
                              <div 
                                key={attempt.id} 
                                className="admin-attempt-item clickable"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onSelectAttempt) {
                                    onSelectAttempt(session.id, attempt.id)
                                  }
                                }}
                              >
                                <div className="attempt-header">
                                  <strong>Attempt {idx + 1}</strong>
                                  <span>{new Date(attempt.timestamp).toLocaleString()}</span>
                                </div>
                                {attempt.duration && (
                                  <div className="attempt-details">
                                    <span>Duration: {Math.floor(attempt.duration / 60)}:{(attempt.duration % 60).toString().padStart(2, '0')}</span>
                                    {attempt.fileName && <span>File: {attempt.fileName}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
