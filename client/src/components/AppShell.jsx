import { NavLink } from 'react-router-dom'
import { CircleDot, LogOut } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import AuthBrand from '../features/auth/components/AuthBrand'
import './AppShell.css'

const NAV_LINKS = [
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/squad', label: 'Squad' },
  { to: '/analytics', label: 'Analytics' },
]

function getInitials(name) {
  if (!name) return '·'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function AppShell({ children, liveRoomCount = 0 }) {
  const { user, logout } = useAuth()

  return (
    <div className="biddr-stage">
      <div className="biddr-grid" aria-hidden="true" />
      <div className="biddr-glow" aria-hidden="true" />

      <header className="appshell-nav">
        <div className="appshell-nav-left">
          <AuthBrand compact size={26} />
          <nav className="appshell-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'appshell-nav-link is-active' : 'appshell-nav-link'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="appshell-nav-right">
          <span
            className="appshell-live-pill"
            title="Live rooms across all tournaments"
          >
            <CircleDot size={12} strokeWidth={3} />
            <span>
              <strong>{liveRoomCount}</strong> {liveRoomCount === 1 ? 'room' : 'rooms'} live
            </span>
          </span>

          <div className="appshell-user">
            <span className="appshell-user-avatar" aria-hidden="true">
              {getInitials(user?.fullName)}
            </span>
            <span className="appshell-user-meta">
              <span className="appshell-user-name">{user?.fullName}</span>
              <span className="appshell-user-role">{user?.role}</span>
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}

export default AppShell
