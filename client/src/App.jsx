import { Route, Routes } from 'react-router-dom'
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
  return (
    <Routes>
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