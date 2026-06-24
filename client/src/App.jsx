import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AuthPage from './features/auth/AuthPage'
import AuthGate from './features/auth/AuthGate'
import HomePage from './features/home/HomePage'
import TournamentsPage from './features/tournaments/TournamentsPage'
import TournamentLobbyPage from './features/tournaments/TournamentLobbyPage'
import CreateTournamentPage from './features/tournaments/CreateTournamentPage'
import UserProfilePage from './features/profile/UserProfilePage'
import LandingPage from './features/landing/LandingPage'
import AppShell from './components/AppShell'

function Shell({ children }) {
  return <AppShell>{children}</AppShell>
}

function App() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/home" element={<AuthGate><Shell><HomePage /></Shell></AuthGate>} />
          <Route path="/tournaments" element={<AuthGate><Shell><TournamentsPage /></Shell></AuthGate>} />
          <Route path="/tournaments/new" element={<AuthGate><Shell><CreateTournamentPage /></Shell></AuthGate>} />
          <Route path="/tournaments/:id" element={<AuthGate><Shell><TournamentLobbyPage /></Shell></AuthGate>} />
          <Route path="/profile" element={<AuthGate><Shell><UserProfilePage /></Shell></AuthGate>} />
          <Route path="/squad" element={<AuthGate><Shell><ComingSoon label="Squad" /></Shell></AuthGate>} />
          <Route path="/analytics" element={<AuthGate><Shell><ComingSoon label="Analytics" /></Shell></AuthGate>} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function ComingSoon({ label }) {
  return (
    <main className="tournaments-main">
      <div className="tournaments-empty">
        <h2>{label} coming soon</h2>
        <p>We're focused on Tournaments for now. Check back next phase.</p>
      </div>
    </main>
  )
}

export default App
