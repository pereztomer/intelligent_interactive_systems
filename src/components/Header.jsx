import './Header.css'

function Header({ onNavigateHome }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo" onClick={onNavigateHome}>
          <span className="logo-text">Presentation Rehearsal Coach</span>
        </div>
      </div>
    </header>
  )
}

export default Header
