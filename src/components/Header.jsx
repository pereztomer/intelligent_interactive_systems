import './Header.css'

function Header({ onNavigateHome, onNavigateToSessions, currentView, currentSession, totalSessions }) {
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
      </nav>

      <div className="sidebar-context">
        {currentSession && (
          <div className="context-session">
            <span className="context-label">Session:</span>
            <span className="context-value">{currentSession.name}</span>
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
