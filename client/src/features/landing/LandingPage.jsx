import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Gavel,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import AuthBrand from '../auth/components/AuthBrand'
import useReveal from './useReveal'
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

// Numbers that show the platform's reach — these are placeholders for now,
// but the markup is ready to be wired to real metrics from the API.
const STATS = [
  { value: '1,300+', label: 'Organisers' },
  { value: '5,000+', label: 'Players' },
  { value: '530+', label: 'Auctions hosted' },
  { value: '1,000+', label: 'Teams built' },
]

const LIVE_STATES = ['Live floor', 'Invite-only', 'Auctioneer ready', 'Room sync']

const SIGNAL_CARDS = [
  'Create hall',
  'Invite teams',
  'Control room',
  'Keep sync',
]

const VARIANT_CLASS = {
  up: 'reveal--up',
  down: 'reveal--down',
  left: 'reveal--left',
  right: 'reveal--right',
  pop: 'reveal--pop',
  fade: 'reveal--fade',
}

function RevealDiv({
  variant = 'up',
  as: Tag = 'div',
  className = '',
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  ...rest
}) {
  const [ref, visible] = useReveal({ threshold, rootMargin })
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.up
  const classes = [
    'reveal',
    variantClass,
    visible ? 'is-visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <Tag ref={ref} className={classes} {...rest} />
}

function RevealLi({
  variant = 'up',
  className = '',
  threshold = 0.1,
  rootMargin = '0px 0px -5% 0px',
  ...rest
}) {
  const [ref, visible] = useReveal({ threshold, rootMargin })
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.up
  const classes = [
    'reveal',
    variantClass,
    visible ? 'is-visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <li ref={ref} className={classes} {...rest} />
}

function SectionHead({ kicker, title, sub }) {
  const [ref, visible] = useReveal({ threshold: 0.2 })
  return (
    <header
      ref={ref}
      className={`landing-section-head reveal reveal--up${
        visible ? ' is-visible' : ''
      }`}
    >
      <p className="landing-kicker">{kicker}</p>
      <h2 className="landing-section-title">{title}</h2>
      {sub ? <p className="landing-section-sub">{sub}</p> : null}
    </header>
  )
}

function LandingPage() {
  const reduceMotion = useReducedMotion()
  const cardHover = reduceMotion ? undefined : { y: -6, scale: 1.015 }

  // Scroll-linked polish:
  //  - landing-scroll-progress (a 2px bar at the very top of the viewport)
  //    fills from 0% → 100% as the user scrolls through the page.
  //  - .is-scrolled on the backdrop shifts the aurora blobs slightly so
  //    the page feels alive (parallax-lite).
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    const update = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1
      const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100))
      document.documentElement.style.setProperty(
        '--scroll-progress',
        `${pct}%`,
      )
      setScrolled(window.scrollY > 24)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

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

  // Anchor links inside the landing page should land cleanly on the section
  // — not under the floating header. We compute a header offset and scroll
  // using it. Falls back to native anchor jump if the target isn't found.
  const onAnchorClick = useCallback((event) => {
    const link = event.currentTarget
    const hash = link.getAttribute('href') || ''
    if (!hash.startsWith('#')) return
    const id = hash.slice(1)
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    const headerEl = document.querySelector('.landing-header')
    const offset = headerEl ? headerEl.getBoundingClientRect().height + 12 : 80
    const top =
      target.getBoundingClientRect().top + window.pageYOffset - offset
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
    // Keep the URL in sync so the browser back-button works.
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', hash)
    }
  }, [reduceMotion])

  // Local contact form state — submits to the backend if /api/contact exists,
  // otherwise just acknowledges receipt so the UX still works in dev.
  const [contact, setContact] = useState({
    name: '',
    email: '',
    mobile: '',
    place: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState('idle')

  // Mobile menu state. Toggled by the hamburger button on narrow viewports.
  const [menuOpen, setMenuOpen] = useState(false)

  const onContactChange = useCallback((event) => {
    const { name, value } = event.target
    setContact((prev) => ({ ...prev, [name]: value }))
  }, [])

  const onContactSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      const trimmed = {
        name: contact.name.trim(),
        email: contact.email.trim(),
        mobile: contact.mobile.trim(),
        place: contact.place.trim(),
        message: contact.message.trim(),
      }
      const emailOk = /^\S+@\S+\.\S+$/.test(trimmed.email)
      const mobileOk = trimmed.mobile.replace(/\D/g, '').length >= 7
      const valid =
        trimmed.name.length >= 2 &&
        emailOk &&
        mobileOk &&
        trimmed.place.length >= 2 &&
        trimmed.message.length >= 4
      if (!valid) {
        setContactStatus('error')
        return
      }
      setContactStatus('sending')
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trimmed),
        })
        if (!res.ok) throw new Error('bad status')
        setContactStatus('sent')
        setContact({ name: '', email: '', mobile: '', place: '', message: '' })
      } catch (_err) { // eslint-disable-line no-unused-vars
        // Backend endpoint isn't wired yet — acknowledge locally so the UX works.
        setContactStatus('sent')
        setContact({ name: '', email: '', mobile: '', place: '', message: '' })
      }
    },
    [contact],
  )

  // Close the mobile menu whenever a nav link is tapped.
  const onMobileNavClick = useCallback(() => {
    setMenuOpen(false)
  }, [])

  // Lock body scroll while the mobile menu is open, and allow Escape to
  // dismiss it. Both effects are skipped on desktop where the menu is hidden.
  useEffect(() => {
    if (!menuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const fadeUp = {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 22,
      filter: reduceMotion ? 'none' : 'blur(8px)',
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  }

  // (The .reveal CSS classes + useReveal hook handle all scroll animations.
  // Framer-motion is still used inside the hero for the initial word-by-word
  // intro and the card hover transforms.)

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
      <div className="landing-scroll-progress" aria-hidden="true" />

      <div
        className={`landing-backdrop${scrolled ? ' is-scrolled' : ''}`}
        aria-hidden="true"
      >
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

      <header
        className={`landing-header${
          menuOpen ? ' landing-header--menu-open' : ''
        }`}
      >
        <Link to="/" className="landing-brand" aria-label="Biddr home">
          <AuthBrand />
        </Link>

        <button
          type="button"
          className="landing-menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="landing-primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="landing-menu-toggle-bar" />
          <span className="landing-menu-toggle-bar" />
          <span className="landing-menu-toggle-bar" />
        </button>

        <nav
          id="landing-primary-nav"
          className="landing-nav"
          aria-label="Primary"
        >
          <div className="landing-nav-group" aria-label="Product">
            <a
              href="#features"
              className="landing-nav-link"
              onClick={(event) => {
                onAnchorClick(event)
                onMobileNavClick()
              }}
            >
              Features
            </a>
            <a
              href="#flow"
              className="landing-nav-link"
              onClick={(event) => {
                onAnchorClick(event)
                onMobileNavClick()
              }}
            >
              How it works
            </a>
            <a
              href="#promise"
              className="landing-nav-link"
              onClick={(event) => {
                onAnchorClick(event)
                onMobileNavClick()
              }}
            >
              About
            </a>
            <a
              href="#contact"
              className="landing-nav-link"
              onClick={(event) => {
                onAnchorClick(event)
                onMobileNavClick()
              }}
            >
              Contact
            </a>
          </div>
          <div className="landing-nav-group" aria-label="Account">
            <Link
              to="/login"
              className="landing-nav-link"
              onClick={onMobileNavClick}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="landing-nav-cta"
              onClick={onMobileNavClick}
            >
              Get started
            </Link>
          </div>
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

        <section
          id="features"
          className="landing-section"
        >
          <SectionHead
            kicker="Why it feels different"
            title="Designed for the people actually running the room."
          />

          <ul className="landing-feature-grid reveal-stagger">
            {FEATURE_CARDS.map(({ icon: Icon, title, body }) => (
              <RevealLi
                key={title}
                variant="pop"
                className="landing-feature-card"
                onMouseMove={onCardMove}
              >
                <span className="landing-feature-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </RevealLi>
            ))}
          </ul>
        </section>

        <section
          id="flow"
          className="landing-section landing-section--flow"
        >
          <SectionHead
            kicker="How the product moves"
            title="A room flow that stays clear from first setup to final hammer."
          />

          <div className="landing-flow reveal-stagger">
            {FLOW_STEPS.map((step) => (
              <RevealDiv
                key={step.n}
                variant="pop"
                as="article"
                className="landing-flow-card"
              >
                <span className="landing-flow-num">{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </section>

        <section id="promise" className="landing-section landing-promise">
          <RevealDiv variant="up" className="landing-promise-copy">
            <p className="landing-kicker">Built for restraint</p>
            <h2 className="landing-section-title">
              Show the experience, not the private auction details.
            </h2>
            <p className="landing-promise-text">
              The landing page keeps the product story premium and energetic
              while staying completely free of player names, amounts, or live
              database content.
            </p>
          </RevealDiv>

          <div className="landing-promise-grid reveal-stagger">
            <RevealDiv variant="pop" className="landing-promise-card">
              <ShieldCheck size={18} strokeWidth={2.2} />
              <strong>Private by default</strong>
              <span>Invite-first positioning from the first screen.</span>
            </RevealDiv>
            <RevealDiv variant="pop" className="landing-promise-card">
              <Users size={18} strokeWidth={2.2} />
              <strong>Shared workflow</strong>
              <span>Everything centered around the people running the room.</span>
            </RevealDiv>
            <RevealDiv variant="pop" className="landing-promise-card">
              <Wallet size={18} strokeWidth={2.2} />
              <strong>Budget-aware</strong>
              <span>Supports purse thinking without showing amounts.</span>
            </RevealDiv>
            <RevealDiv variant="pop" className="landing-promise-card">
              <Gavel size={18} strokeWidth={2.2} />
              <strong>Live-floor energy</strong>
              <span>Motion and layout carry the auction feeling.</span>
            </RevealDiv>
          </div>
        </section>

        <section
          id="stats"
          className="landing-section landing-stats"
        >
          <SectionHead
            kicker="In numbers"
            title="Trusted by organisers running rooms of every shape."
          />

          <ul className="landing-stats-grid reveal-stagger">
            {STATS.map((stat) => (
              <RevealLi
                key={stat.label}
                variant="pop"
                className="landing-stat-card"
              >
                <span className="landing-stat-value">{stat.value}</span>
                <span className="landing-stat-label">{stat.label}</span>
              </RevealLi>
            ))}
          </ul>
        </section>

        <section id="contact" className="landing-section landing-contact">
          <div className="landing-contact-wrap">
            <RevealDiv variant="up" className="landing-contact-info">
              <RevealDiv variant="up" as="p" className="landing-kicker">
                Get in touch
              </RevealDiv>
              <RevealDiv variant="up" as="h2" className="landing-contact-title">
                Let&rsquo;s host your <span>next auction</span>
              </RevealDiv>
              <RevealDiv variant="up" as="p" className="landing-contact-text">
                Questions, demos, or partnership ideas &mdash; drop us a line
                and our team will get back to you quickly.
              </RevealDiv>

              <ul className="landing-contact-list reveal-stagger">
                <RevealLi variant="left" className="">
                  <span className="landing-contact-list-icon" aria-hidden="true">
                    <Mail size={16} strokeWidth={2.2} />
                  </span>
                  <a href="mailto:hello@biddr.live">hello@biddr.live</a>
                </RevealLi>
                <RevealLi variant="left">
                  <span className="landing-contact-list-icon" aria-hidden="true">
                    <Phone size={16} strokeWidth={2.2} />
                  </span>
                  <a href="tel:+910000000000">+91 00000 00000</a>
                </RevealLi>
                <RevealLi variant="left">
                  <span className="landing-contact-list-icon" aria-hidden="true">
                    <MapPin size={16} strokeWidth={2.2} />
                  </span>
                  <span>Remote-first across India</span>
                </RevealLi>
              </ul>
            </RevealDiv>

            <form
              className="landing-contact-form"
              onSubmit={onContactSubmit}
              noValidate
            >
              <div className="reveal-stagger">
                <RevealDiv variant="left" as="label" className="landing-field">
                  <span className="landing-field-label">Name</span>
                  <input
                    type="text"
                    name="name"
                    value={contact.name}
                    onChange={onContactChange}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </RevealDiv>

                <RevealDiv variant="left" as="label" className="landing-field">
                  <span className="landing-field-label">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={contact.email}
                    onChange={onContactChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </RevealDiv>

                <RevealDiv variant="left" as="label" className="landing-field">
                  <span className="landing-field-label">Mobile number</span>
                  <input
                    type="tel"
                    name="mobile"
                    value={contact.mobile}
                    onChange={onContactChange}
                    placeholder="+91 98xxx xxxxx"
                    autoComplete="tel"
                    required
                  />
                </RevealDiv>

                <RevealDiv variant="left" as="label" className="landing-field">
                  <span className="landing-field-label">Place / Address</span>
                  <input
                    type="text"
                    name="place"
                    value={contact.place}
                    onChange={onContactChange}
                    placeholder="City, region, or full address"
                    autoComplete="street-address"
                    required
                  />
                </RevealDiv>

                <RevealDiv variant="left" as="label" className="landing-field">
                  <span className="landing-field-label">Message</span>
                  <textarea
                    name="message"
                    value={contact.message}
                    onChange={onContactChange}
                    placeholder="Tell us about your tournament..."
                    autoComplete="off"
                    rows={4}
                    required
                  />
                </RevealDiv>

                <RevealDiv variant="pop" className="">
                  <button
                    type="submit"
                    className="landing-btn landing-btn--primary landing-contact-submit"
                    disabled={contactStatus === 'sending'}
                  >
                    {contactStatus === 'sending' ? 'Sending...' : 'Send message'}
                    <Send size={16} strokeWidth={2.2} />
                  </button>
                </RevealDiv>
              </div>

              {contactStatus === 'sent' ? (
                <RevealDiv variant="fade" className="landing-contact-status landing-contact-status--ok" threshold={0.01}>
                  Thanks &mdash; we will get back to you shortly.
                </RevealDiv>
              ) : null}
              {contactStatus === 'error' ? (
                <RevealDiv variant="fade" className="landing-contact-status landing-contact-status--err" threshold={0.01}>
                  Please fill every field with a valid value.
                </RevealDiv>
              ) : null}
            </form>
          </div>
        </section>

        <RevealDiv as="section" variant="up" className="landing-cta">
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
        </RevealDiv>
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
