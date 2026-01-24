import { useState } from 'react'
import './Header.css'

function Header({ onNavigateHome, onNavigateToSessions, onNavigateToProfile, currentView, currentSession, totalSessions, sessions = [], onSelectSession, currentUser, onSwitchUser, onOpenSpeakerProfile }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const INITIAL_DISPLAY_COUNT = 3
  
  const displaySessions = isExpanded ? sessions : sessions.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreSessions = sessions.length > INITIAL_DISPLAY_COUNT

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {currentUser && (
          <div className="context-user">
            <span className="welcome-message">
              Welcome back, {currentUser.name} 😊
            </span>
          </div>
        )}
        <button 
          className={`sidebar-link ${currentView === 'landing' ? 'active' : ''}`}
          onClick={onNavigateHome}
        >
          Home
        </button>
        <button 
          className={`sidebar-link ${currentView === 'sessionList' ? 'active' : ''}`}
          onClick={onNavigateToSessions}
        >
          My Sessions
        </button>
        {sessions.length > 0 && (
          <div className="sessions-list">
            {displaySessions.map((session) => (
              <button
                key={session.id}
                className={`session-link ${currentSession?.id === session.id ? 'active' : ''}`}
                onClick={() => onSelectSession && onSelectSession(session.id)}
              >
                {session.name}
              </button>
            ))}
            {hasMoreSessions && (
              <button
                className="expand-sessions-button"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '▼ Show Less' : `▼ Show ${sessions.length - INITIAL_DISPLAY_COUNT} More`}
              </button>
            )}
          </div>
        )}
      </nav>

      <div className="sidebar-context">
        {currentUser && (
          <button 
            className="sidebar-link speaker-profile-card"
            onClick={onOpenSpeakerProfile}
            style={{ marginBottom: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: '600' }}
          >
            👤 Speaker Profile
          </button>
        )}
        {currentUser?.surveyData && (
          <button 
            className={`sidebar-link ${currentView === 'profile' ? 'active' : ''}`}
            onClick={onNavigateToProfile}
            style={{ marginBottom: '1rem' }}
          >
            My Stats
          </button>
        )}
        {currentUser && (
          <button className="switch-user-button" onClick={onSwitchUser}>
            Switch User
          </button>
        )}
        {totalSessions !== undefined && totalSessions > 0 && (
          <div className="context-stats">
            <span className="context-label">Total Sessions:</span>
            <span className="context-value">{totalSessions}</span>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Header
