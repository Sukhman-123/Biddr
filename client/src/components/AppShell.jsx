import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CircleDot, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import AuthBrand from '../features/auth/components/AuthBrand'
import './AppShell.css'

const NAV_LINKS = [
  { to: '/home', label: 'Home', end: true },
  { to: '/tournaments', label: 'Tournaments' },
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia('(min-width: 881px)')
    const onChange = (event) => {
      if (event.matches) setDrawerOpen(false)
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      {/* Fixed navbar — outside the scrollable page */}
      <header className="appshell-nav">
        <div className="appshell-nav-left">
          <AuthBrand compact size={26} />
          <nav className="appshell-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={Boolean(link.end)}
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
              <strong>{liveRoomCount}</strong>{' '}
              {liveRoomCount === 1 ? 'room' : 'rooms'} live
            </span>
          </span>

          <Link
            to="/profile"
            className="appshell-user"
            aria-label="Open your profile"
          >
            <span className="appshell-user-avatar" aria-hidden="true">
              {getInitials(user?.fullName)}
            </span>
            <span className="appshell-user-meta">
              <span className="appshell-user-name">{user?.fullName}</span>
              <span className="appshell-user-role">Signed in</span>
            </span>
            <button
              type="button"
              className="icon-btn appshell-signout"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </Link>

          <button
            type="button"
            className="appshell-hamburger"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            aria-controls="appshell-drawer"
            onClick={() => setDrawerOpen((value) => !value)}
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        id="appshell-drawer"
        className={`appshell-drawer${drawerOpen ? ' is-open' : ''}`}
        hidden={!drawerOpen}
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={Boolean(link.end)}
            onClick={closeDrawer}
            className={({ isActive }) =>
              isActive ? 'appshell-nav-link is-active' : 'appshell-nav-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
        <span
          className="appshell-live-pill"
          title="Live rooms across all tournaments"
        >
          <CircleDot size={12} strokeWidth={3} />
          <span>
            <strong>{liveRoomCount}</strong>{' '}
            {liveRoomCount === 1 ? 'room' : 'rooms'} live
          </span>
        </span>
      </div>

      {/* Page content — scrollable, offset for the fixed header */}
      <div className="appshell-page">
        {children}
      </div>
    </>
  )
}

export default AppShell
