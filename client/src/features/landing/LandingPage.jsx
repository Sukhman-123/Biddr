import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback } from 'react'
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

const FEATURE_CARDS = [
  {
    icon: Gavel,
    title: 'Auction floor control',
    body: 'Keep the room moving with lot flow, timing, and clean status changes that feel built for live auction work.',
  },
  {
    icon: ShieldCheck,
    title: 'Invite-first access',
    body: 'Run a private hall or a broader league room with simple access controls and clear role boundaries.',
  },
  {
    icon: Users,
    title: 'Franchise coordination',
    body: 'Bring captains, viewers, and auctioneers into one shared workspace without clutter or confusion.',
  },
  {
    icon: Wallet,
    title: 'Budget guardrails',
    body: 'Support purse planning and auction rules with a layout that keeps the important controls front and center.',
  },
]

const FLOW_STEPS = [
  {
    n: '01',
    title: 'Shape the hall',
    body: 'Set up a tournament space with the access model and room style you want.',
  },
  {
    n: '02',
    title: 'Bring people in',
    body: 'Share the room with the right franchises, observers, and auction staff.',
  },
  {
    n: '03',
    title: 'Run the floor',
    body: 'Keep the auction moving with live room updates, lot control, and clear state changes.',
  },
  {
    n: '04',
    title: 'Stay aligned',
    body: 'Let everyone follow the same room state without exposing anything you do not want visible.',
  },
]

const LIVE_STATES = ['Live floor', 'Invite-only', 'Auctioneer ready', 'Room sync']

const SIGNAL_CARDS = [
  'Create hall',
  'Invite teams',
  'Control room',
  'Keep sync',
]

function LandingPage() {
  const reduceMotion = useReducedMotion()
  const cardHover = reduceMotion ? undefined : { y: -6, scale: 1.015 }

  // Cursor-tracked aurora reflection on feature cards.
  // Updates CSS variables --mx/--my on the element under the pointer.
  const onCardMove = useCallback((event) => {
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    const mx = ((event.clientX - rect.left) / rect.width) * 100
    const my = ((event.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--mx', `${mx}%`)
    el.style.setProperty('--my', `${my}%`)
  }, [])

  const fadeUp = {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 18,
      filter: reduceMotion ? 'none' : 'blur(8px)',
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  }

  const stagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.08,
        delayChildren: 0.05,
      },
    },
  }

  return (
    <div className="landing-stage">
      <div className="landing-backdrop" aria-hidden="true">
        <div className="landing-grid" />
        <div className="landing-aurora landing-aurora--gold" />
        <div className="landing-aurora landing-aurora--green" />
        <div className="landing-aurora landing-aurora--blue" />
        <div className="landing-aurora-blobs">
          <div className="landing-aurora-blob landing-aurora-blob--a" />
          <div className="landing-aurora-blob landing-aurora-blob--b" />
          <div className="landing-aurora-blob landing-aurora-blob--c" />
          <div className="landing-aurora-blob landing-aurora-blob--d" />
        </div>
        <div className="landing-spot landing-spot--left" />
        <div className="landing-spot landing-spot--right" />
        <div className="landing-pitch" />
        <div className="landing-vignette" />
      </div>

      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Biddr home">
          <AuthBrand />
        </Link>

        <nav className="landing-nav" aria-label="Account">
          <Link to="/login" className="landing-nav-link">
            Sign in
          </Link>
          <Link to="/register" className="landing-nav-cta">
            Get started
          </Link>
        </nav>
      </header>

      <main className="landing-main">
        <motion.section
          className="landing-hero"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div className="landing-hero-copy" variants={fadeUp}>
            <span className="landing-eyebrow">
              <Sparkles size={14} strokeWidth={2.4} />
              Cricket auction management, made polished
            </span>

            <h1 className="landing-title">
              {['Biddr', 'cricket', 'auction', 'rooms.'].map((word, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'inline-block', marginRight: '0.25em' }}
                  initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1],
                    delay: reduceMotion ? 0 : 0.1 + i * 0.08,
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <p className="landing-subtitle">
              Biddr brings tournament setup, invite management, live room flow,
              and franchise coordination into one premium workspace designed for
              cricket auctions.
            </p>

            <div className="landing-actions">
              <Link to="/register" className="landing-btn landing-btn--primary">
                Create account
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link to="/login" className="landing-btn landing-btn--secondary">
                Sign in
              </Link>
            </div>

            <ul className="landing-highlights" aria-label="Highlights">
              <li>
                <Trophy size={14} />
                Built for tournament floors
              </li>
              <li>
                <ShieldCheck size={14} />
                Invite-first access control
              </li>
              <li>
                <Gavel size={14} />
                Live room state management
              </li>
            </ul>

            <motion.div
              className="landing-signal-rail"
              variants={stagger}
              aria-label="Auction workflow"
            >
              {SIGNAL_CARDS.map((signal) => (
                <motion.span
                  key={signal}
                  className="landing-signal-pill"
                  variants={fadeUp}
                  whileHover={cardHover}
                >
                  {signal}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="landing-console"
            variants={fadeUp}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="landing-console-shell">
              <div className="landing-console-top">
                <span className="landing-console-badge">
                  <span className="landing-console-dot" />
                  Auction room
                </span>
                <span className="landing-console-meta">Room sync active</span>
              </div>

              <div className="landing-console-body">
                <div className="landing-console-panel landing-console-panel--main">
                  <div className="landing-console-labels">
                    <span className="landing-tag">Lot ready</span>
                    <span className="landing-tag">Timer armed</span>
                  </div>

                  <div className="landing-console-frame">
                    <div className="landing-console-track" />
                    <AuctionPulseScene reduceMotion={reduceMotion} />
                    <div className="landing-console-card">
                      <span className="landing-console-card-kicker">
                        Player lot
                      </span>
                      <strong className="landing-console-card-title">
                        Awaiting presentation
                      </strong>
                      <p className="landing-console-card-copy">
                        The layout stays focused on the current floor state,
                        without exposing any private auction details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="landing-console-panel landing-console-panel--side">
                  <div className="landing-console-stack">
                    <motion.div className="landing-state-card" whileHover={cardHover}>
                      <span className="landing-state-label">Access</span>
                      <strong>Invite-only ready</strong>
                    </motion.div>
                    <motion.div className="landing-state-card" whileHover={cardHover}>
                      <span className="landing-state-label">Control</span>
                      <strong>Auctioneer tools on deck</strong>
                    </motion.div>
                    <motion.div className="landing-state-card" whileHover={cardHover}>
                      <span className="landing-state-label">Flow</span>
                      <strong>Live room updates</strong>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="landing-console-foot">
                {LIVE_STATES.map((state) => (
                  <motion.span
                    key={state}
                    className="landing-console-chip"
                    whileHover={cardHover}
                  >
                    {state}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          className="landing-section"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.24 }}
        >
          <motion.header className="landing-section-head" variants={fadeUp}>
            <p className="landing-kicker">Why it feels different</p>
            <h2 className="landing-section-title">
              Designed for the people actually running the room.
            </h2>
          </motion.header>

          <motion.ul className="landing-feature-grid" variants={stagger}>
            {FEATURE_CARDS.map(({ icon: Icon, title, body }) => (
              <motion.li
                key={title}
                className="landing-feature-card"
                variants={fadeUp}
                whileHover={cardHover}
                onMouseMove={onCardMove}
              >
                <span className="landing-feature-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>

        <motion.section
          className="landing-section landing-section--flow"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.24 }}
        >
          <motion.header className="landing-section-head" variants={fadeUp}>
            <p className="landing-kicker">How the product moves</p>
            <h2 className="landing-section-title">
              A room flow that stays clear from first setup to final hammer.
            </h2>
          </motion.header>

          <div className="landing-flow">
            {FLOW_STEPS.map((step) => (
              <motion.article
                key={step.n}
                className="landing-flow-card"
                variants={fadeUp}
                whileHover={cardHover}
              >
                <span className="landing-flow-num">{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="landing-section landing-promise"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.24 }}
        >
          <motion.div className="landing-promise-copy" variants={fadeUp}>
            <p className="landing-kicker">Built for restraint</p>
            <h2 className="landing-section-title">
              Show the experience, not the private auction details.
            </h2>
            <p className="landing-promise-text">
              The landing page keeps the product story premium and energetic
              while staying completely free of player names, amounts, or live
              database content.
            </p>
          </motion.div>

          <motion.div className="landing-promise-grid" variants={stagger}>
            <motion.div
              className="landing-promise-card"
              variants={fadeUp}
              whileHover={cardHover}
            >
              <ShieldCheck size={18} strokeWidth={2.2} />
              <strong>Private by default</strong>
              <span>Invite-first positioning from the first screen.</span>
            </motion.div>
            <motion.div
              className="landing-promise-card"
              variants={fadeUp}
              whileHover={cardHover}
            >
              <Users size={18} strokeWidth={2.2} />
              <strong>Shared workflow</strong>
              <span>Everything centered around the people running the room.</span>
            </motion.div>
            <motion.div
              className="landing-promise-card"
              variants={fadeUp}
              whileHover={cardHover}
            >
              <Wallet size={18} strokeWidth={2.2} />
              <strong>Budget-aware</strong>
              <span>Supports purse thinking without showing amounts.</span>
            </motion.div>
            <motion.div
              className="landing-promise-card"
              variants={fadeUp}
              whileHover={cardHover}
            >
              <Gavel size={18} strokeWidth={2.2} />
              <strong>Live-floor energy</strong>
              <span>Motion and layout carry the auction feeling.</span>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          className="landing-cta"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.24 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <h2 className="landing-cta-title">Ready to launch your auction room?</h2>
            <p className="landing-cta-text">
              Create your account and start shaping a cleaner, calmer cricket
              auction experience.
            </p>
          </div>

          <Link to="/register" className="landing-btn landing-btn--primary">
            Create account
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Biddr</span>
        <span className="landing-footer-sep" aria-hidden="true">
          ·
        </span>
        <Link to="/login" className="landing-footer-link">
          Sign in
        </Link>
      </footer>
    </div>
  )
}

function AuctionPulseScene({ reduceMotion }) {
  const pulse = reduceMotion
    ? undefined
    : {
        opacity: [0.34, 1, 0.34],
        scale: [0.96, 1.08, 0.96],
      }

  const draw = reduceMotion
    ? undefined
    : {
        pathLength: [0.18, 1, 0.18],
        opacity: [0.3, 0.9, 0.3],
      }

  return (
    <motion.svg
      className="landing-lottie-scene"
      viewBox="0 0 320 210"
      aria-hidden="true"
      initial={false}
    >
      <motion.path
        className="landing-lottie-path landing-lottie-path--one"
        d="M32 156 C86 68 136 162 184 82 S267 84 292 42"
        fill="none"
        strokeLinecap="round"
        animate={draw}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        className="landing-lottie-path landing-lottie-path--two"
        d="M44 116 C94 118 104 46 155 58 S213 154 278 112"
        fill="none"
        strokeLinecap="round"
        animate={draw}
        transition={{
          duration: 5.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.35,
        }}
      />

      {[54, 136, 216, 278].map((cx, index) => (
        <motion.circle
          key={cx}
          className="landing-lottie-node"
          cx={cx}
          cy={[142, 72, 102, 52][index]}
          r="6"
          animate={pulse}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.28,
          }}
        />
      ))}

      <motion.g
        className="landing-lottie-gavel"
        animate={reduceMotion ? undefined : { rotate: [-7, 7, -7], y: [0, -4, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '210px 138px' }}
      >
        <rect x="182" y="88" width="62" height="18" rx="5" />
        <rect x="205" y="104" width="12" height="62" rx="5" />
        <rect x="160" y="156" width="76" height="12" rx="6" />
      </motion.g>
    </motion.svg>
  )
}

export default LandingPage
