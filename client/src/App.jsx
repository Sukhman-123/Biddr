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
import LegalPage from './features/legal/LegalPage'
import AnalyticsPage from './features/analytics/AnalyticsPage'
import AppShell from './components/AppShell'
import AuctionRoomPage from './features/auction/AuctionRoomPage'
import AuctionControlPage from './features/auction/AuctionControlPage'
import AuctionPresenterPage from './features/auction/AuctionPresenterPage'
import { ToastProvider } from './components/ToastProvider'

function Shell({ children }) {
  return <AppShell>{children}</AppShell>
}

function App() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    // ToastProvider mounts once for the whole app. Routes can call
    // useToast() to push notifications; the region is rendered at the
    // bottom-right of the viewport regardless of which page is active.
    <ToastProvider>
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
            <Route path="/forgot-password" element={<AuthPage />} />
            <Route path="/reset-password" element={<AuthPage />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/home" element={<AuthGate><Shell><HomePage /></Shell></AuthGate>} />
            <Route path="/tournaments" element={<AuthGate><Shell><TournamentsPage /></Shell></AuthGate>} />
            <Route path="/tournaments/new" element={<AuthGate><Shell><CreateTournamentPage /></Shell></AuthGate>} />
            <Route path="/tournaments/:id" element={<AuthGate><Shell><TournamentLobbyPage /></Shell></AuthGate>} />
            <Route path="/tournaments/:id/room" element={<AuthGate><Shell><AuctionRoomPage /></Shell></AuthGate>} />
            <Route path="/tournaments/:id/control-room" element={<AuthGate><Shell><AuctionControlPage /></Shell></AuthGate>} />
            <Route path="/tournaments/:id/watch" element={<AuthGate><AuctionPresenterPage /></AuthGate>} />
            <Route path="/tournaments/:id/presenter" element={<AuthGate><AuctionPresenterPage /></AuthGate>} />
            <Route path="/tournaments/:id/rooms/:lotId" element={<AuthGate><Shell><AuctionRoomPage /></Shell></AuthGate>} />
            <Route path="/profile" element={<AuthGate><Shell><UserProfilePage /></Shell></AuthGate>} />
            <Route path="/analytics" element={<AuthGate><Shell><AnalyticsPage /></Shell></AuthGate>} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </ToastProvider>
  )
}

export default App
