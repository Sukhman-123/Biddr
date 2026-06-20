import { Navigate, useLocation } from 'react-router-dom'
import { AUTH_STATUS, useAuth } from '../auth/useAuth'

function Splash() {
  return (
    <div className="biddr-stage">
      <div className="biddr-grid" aria-hidden="true" />
      <div className="biddr-glow" aria-hidden="true" />
      <main className="biddr-main">
        <div
          className="auth-card auth-card--splash"
          role="status"
          aria-live="polite"
        >
          <span className="splash-spinner" aria-hidden="true" />
          <p>Warming up the auction floor…</p>
        </div>
      </main>
    </div>
  )
}

function AuthGate({ children }) {
  const { isAuthenticated, status } = useAuth()
  const location = useLocation()

  if (status === AUTH_STATUS.LOADING) {
    return <Splash />
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ next }} />
  }

  return children
}

export default AuthGate
