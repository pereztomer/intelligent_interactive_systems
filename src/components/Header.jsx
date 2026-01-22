import { useState } from 'react'
import './Header.css'

function Header({ onNavigateHome, onNavigateToSessions, currentView, currentSession, totalSessions, sessions = [], onSelectSession, currentUser, onSwitchUser }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const INITIAL_DISPLAY_COUNT = 3
  
  const displaySessions = isExpanded ? sessions : sessions.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreSessions = sessions.length > INITIAL_DISPLAY_COUNT

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
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
          <div className="context-user">
            <span className="context-label">Current User:</span>
            <span className="context-value">{currentUser.name}</span>
            <button className="switch-user-button" onClick={onSwitchUser}>
              Switch User
            </button>
          </div>
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
