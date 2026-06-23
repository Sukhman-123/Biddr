import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Gavel,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import AuthBrand from '../auth/components/AuthBrand'
import './LandingPage.css'

const FEATURES = [
  {
    icon: Gavel,
    title: 'Live bidding',
    body: 'Real-time paddles, increment timers, and gavel drops streamed to every franchise in the room.',
  },
  {
    icon: Users,
    title: 'Franchise rosters',
    body: 'Cap every purse, track unsold players, and run a clean sell-by-sell ledger for every team.',
  },
  {
    icon: Wallet,
    title: 'Purse control',
    body: 'Per-franchise budgets with retention rules, RTM cards, and unsold-player auto-rollover.',
  },
  {
    icon: ShieldCheck,
    title: 'Invite & control',
    body: 'Open halls for free, or run an invite-only auction with private links and per-tournament roles.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Create the tournament',
    body: 'Pick a format, set the purse, customize the cover with franchise colors.',
  },
  {
    n: '02',
    title: 'Invite the franchises',
    body: 'Drop in captains, send invite links, and assign viewer or auctioneer roles.',
  },
  {
    n: '03',
    title: 'Run the gavel',
    body: 'Open rooms, manage lots, hammer sales, and stream the live auction to anyone watching.',
  },
]

function LandingPage() {
  return (
    <div className="landing-stage">
      <div className="biddr-grid" aria-hidden="true" />
      <div className="biddr-glow" aria-hidden="true" />

      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Biddr home">
          <AuthBrand />
        </Link>

        <nav className="landing-header-nav" aria-label="Account">
          <Link to="/login" className="landing-header-link">
            Sign in
          </Link>
          <Link to="/register" className="landing-header-cta">
            Get started
          </Link>
        </nav>
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
            player bidding, manage tournaments, teams and players, and stream
            it all live to the web.
          </p>

          <div className="landing-actions">
            <Link to="/register" className="landing-btn landing-btn--primary">
              Create an account
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
            <Link to="/login" className="landing-btn landing-btn--secondary">
              Sign in
            </Link>
          </div>

          <ul className="landing-trust" aria-label="Highlights">
            <li>
              <Trophy size={14} /> Built for franchise leagues
            </li>
            <li>
              <ShieldCheck size={14} /> Phone + email verification
            </li>
            <li>
              <Gavel size={14} /> Real-time gavel drops
            </li>
          </ul>
        </motion.section>

        <motion.section
          className="landing-features"
          aria-labelledby="landing-features-title"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="landing-section-head">
            <p className="landing-eyebrow">What you get</p>
            <h2 id="landing-features-title" className="landing-section-title">
              Everything an auction floor needs
              <span className="landing-title-accent">.</span>
            </h2>
          </header>

          <ul className="landing-feature-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          className="landing-how"
          aria-labelledby="landing-how-title"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="landing-section-head">
            <p className="landing-eyebrow">How it works</p>
            <h2 id="landing-how-title" className="landing-section-title">
              From sign-up to gavel in minutes
              <span className="landing-title-accent">.</span>
            </h2>
          </header>

          <ol className="landing-step-list">
            {STEPS.map((step) => (
              <li key={step.n} className="landing-step">
                <span className="landing-step-num">{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          className="landing-cta-band"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <h2 className="landing-cta-title">
              Ready to raise the gavel
              <span className="landing-title-accent">?</span>
            </h2>
            <p className="landing-cta-sub">
              Create an account, host your first auction, and let the bids
              roll in.
            </p>
          </div>
          <Link to="/register" className="landing-btn landing-btn--primary">
            Create an account
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Biddr</span>
        <span className="landing-footer-sep" aria-hidden="true">·</span>
        <Link to="/login" className="landing-footer-link">
          Sign in
        </Link>
      </footer>
    </div>
  )
}

export default LandingPage