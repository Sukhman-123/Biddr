import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import AuthBrand from '../auth/components/AuthBrand'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-stage">
      <div className="biddr-grid" aria-hidden="true" />
      <div className="biddr-glow" aria-hidden="true" />

      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Biddr home">
          <AuthBrand />
        </Link>
      </header>

      <main className="landing-main">
        <motion.section
          className="landing-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="landing-eyebrow">
            <Sparkles size={14} strokeWidth={2.4} />
            Auction halls reimagined
          </span>
          <h1 className="landing-title">
            Run a cricket auction house
            <span className="landing-title-accent">.</span>
          </h1>
          <p className="landing-subtitle">
            Biddr is the all-in-one cricket auction platform — host real-time 
            player bidding, manage tournaments, teams and players, and 
            stream it all live to the web.
          </p>

          <div className="landing-status" role="status">
            <span className="landing-status-dot" aria-hidden="true" />
            Landing Page coming soon — explore the rest of the app in the meantime.
          </div>

          <div className="landing-actions">
            <Link to="/login" className="landing-btn landing-btn--primary">
              Sign in
            </Link>
            <Link
              to="/register"
              className="landing-btn landing-btn--secondary"
            >
              Create an account
            </Link>
          </div>
        </motion.section>
      </main>
    </div>
  )
}

export default LandingPage