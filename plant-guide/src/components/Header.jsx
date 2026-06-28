export default function Header({ activeTab, onTabChange, onAdminClick }) {
  return (
    <header className="header">
      <div className="header__top">
        <div className="header__brand">
          <span className="header__logo">🌿</span>
          <span className="header__title">Brock's Plants</span>
        </div>
        <button className="header__admin-btn" onClick={onAdminClick} aria-label="Admin">
          ⚙️
        </button>
      </div>

      <nav className="header__nav">
        <button
          className={`nav-tab ${activeTab === 'today' ? 'nav-tab--active' : ''}`}
          onClick={() => onTabChange('today')}
        >
          Today
        </button>
        <button
          className={`nav-tab ${activeTab === 'plants' ? 'nav-tab--active' : ''}`}
          onClick={() => onTabChange('plants')}
        >
          All Plants
        </button>
      </nav>
    </header>
  )
}
