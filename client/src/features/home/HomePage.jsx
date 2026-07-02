import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Gavel,
  Plus,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { formatDateRange, formatPurse } from '../tournaments/tournament.utils'
import './HomePage.css'

const MotionLink = motion(Link)
const easeOut = [0.22, 1, 0.36, 1]

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
}

const stageReveal = {
  hidden: { opacity: 0, x: 24, scale: 0.97 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.6, ease: easeOut, delay: 0.2 } },
}

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
}

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: easeOut } },
}

function useCountUp(target, active) {
  const [value, setValue] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (!active) return undefined
    if (prefersReduced) {
      setValue(target)
      return undefined
    }
    let raf
    const duration = 900
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, prefersReduced])

  return value
}

function coverGradient(cover) {
  if (cover?.gradientVia) {
    return {
      backgroundImage: `linear-gradient(135deg, ${cover.gradientFrom} 0%, ${cover.gradientVia} 50%, ${cover.gradientTo} 100%)`,
    }
  }
  return {
    backgroundImage: `linear-gradient(135deg, ${cover?.gradientFrom ?? '#1d2436'} 0%, ${cover?.gradientTo ?? '#0a0d16'} 100%)`,
  }
}

async function fetchTournaments() {
  const { data } = await api.get('/tournaments')
  return data?.tournaments ?? []
}

function HomePage() {
  const { user } = useAuth()
  const galleryRef = useRef(null)
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', 'home'],
    queryFn: fetchTournaments,
  })

  const counts = useMemo(() => {
    return {
      total: tournaments.length,
      live: tournaments.filter((t) => t.status === 'live').length,
      upcoming: tournaments.filter((t) => t.status === 'upcoming').length,
      completed: tournaments.filter((t) => t.status === 'completed').length,
    }
  }, [tournaments])

  const statsReady = !isLoading
  const totalCount = useCountUp(counts.total, statsReady)
  const liveCount = useCountUp(counts.live, statsReady)
  const upcomingCount = useCountUp(counts.upcoming, statsReady)
  const completedCount = useCountUp(counts.completed, statsReady)

  const liveRooms = useMemo(
    () =>
      tournaments
        .filter((t) => t.status === 'live')
        .map((t) => ({
          id: t.id,
          name: t.name,
          code: t.shortCode,
          rooms: t.cover?.liveRoomCount ?? 0,
          purse: t.pursePerFranchise,
          currency: t.currency,
          cover: t.cover,
          region: t.region,
        })),
    [tournaments],
  )

  const featuredRoom = liveRooms[0]
  const gridRooms = liveRooms.slice(0, 4)

  const recentTournaments = useMemo(
    () => tournaments.slice(0, 8),
    [tournaments],
  )

  const tickerItems = useMemo(() => {
    if (liveRooms.length > 0) {
      return liveRooms.map((r) => ({
        id: r.id,
        label: `${r.name} · ${r.region || 'Region TBD'}`,
        purse: formatPurse(r.purse, r.currency, { compact: true }),
      }))
    }
    return [
      { id: 'a', label: 'Track every bid as it happens', purse: null },
      { id: 'b', label: 'Set your own bid increments and rules', purse: null },
      { id: 'c', label: 'Bring your squads to the table', purse: null },
      { id: 'd', label: 'One paddle, one floor, one winner', purse: null },
    ]
  }, [liveRooms])

  const scrollGallery = (direction) => {
    const node = galleryRef.current
    if (!node) return
    node.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  const firstName = user?.fullName?.split(/\s+/)[0] || 'there'

  return (
    <main className="home-main">
      <div className="home-ticker" role="marquee" aria-label="Live auction activity">
        <div className="home-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <span className="home-ticker-item" key={`${item.id}-${idx}`}>
              <CircleDot size={9} />
              {item.label}
              {item.purse ? <em>{item.purse} purse</em> : null}
            </span>
          ))}
        </div>
      </div>

      <motion.section
        className="home-hero"
        variants={heroContainer}
        initial="hidden"
        animate="show"
      >
        <span className="home-spotlight home-spotlight-a" aria-hidden="true" />
        <span className="home-spotlight home-spotlight-b" aria-hidden="true" />

        <div className="home-hero-copy">
          <motion.p className="home-eyebrow" variants={heroItem}>
            <Sparkles size={12} strokeWidth={2.4} />
            Auction Hall
          </motion.p>
          <motion.h1 className="home-title" variants={heroItem}>
            Welcome back, {firstName}
            <span className="home-title-dot">.</span>
          </motion.h1>
          <motion.p className="home-subtitle" variants={heroItem}>
            Step onto the floor. Run a room, chase a paddle, or watch the
            purses empty in real time.
          </motion.p>

          <motion.div className="home-hero-cta" variants={heroItem}>
            <MotionLink
              to="/tournaments"
              className={clsx('cta-btn', 'home-cta-primary')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="cta-btn-shine" aria-hidden="true" />
              <span className="cta-btn-content">
                Browse tournaments
                <ArrowRight size={16} strokeWidth={2.4} />
              </span>
            </MotionLink>
            <MotionLink
              to="/tournaments/new"
              className="home-cta-secondary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={16} strokeWidth={2.4} />
              New tournament
            </MotionLink>
          </motion.div>

          <motion.div className="home-scoreboard" variants={heroItem}>
            <div className="home-score-cell">
              <span className="home-score-value">{totalCount}</span>
              <span className="home-score-label">Tournaments</span>
            </div>
            <span className="home-score-divider" aria-hidden="true" />
            <div className="home-score-cell">
              <span className="home-score-value home-score-value--live">
                <CircleDot size={12} />
                {liveCount}
              </span>
              <span className="home-score-label">Live now</span>
            </div>
            <span className="home-score-divider" aria-hidden="true" />
            <div className="home-score-cell">
              <span className="home-score-value">{upcomingCount}</span>
              <span className="home-score-label">Upcoming</span>
            </div>
            <span className="home-score-divider" aria-hidden="true" />
            <div className="home-score-cell">
              <span className="home-score-value">{completedCount}</span>
              <span className="home-score-label">Recaps</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="home-stage"
          variants={stageReveal}
          initial="hidden"
          animate="show"
        >
          {featuredRoom ? (
            <Link
              to={`/tournaments/${featuredRoom.id}`}
              className="home-stage-card"
              style={coverGradient(featuredRoom.cover)}
            >
              <span className="home-stage-grid" aria-hidden="true" />
              <span className="home-stage-live">
                <CircleDot size={10} />
                On the floor now
              </span>
              <h3 className="home-stage-name">{featuredRoom.name}</h3>
              <p className="home-stage-region">{featuredRoom.region}</p>

              <div className="home-stage-bars" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} style={{ '--bar-delay': `${i * 0.13}s` }} />
                ))}
              </div>

              <div className="home-stage-foot">
                <span className="home-stage-purse">
                  <Wallet size={13} />
                  {formatPurse(featuredRoom.purse, featuredRoom.currency, {
                    compact: true,
                  })}{' '}
                  purse
                </span>
                <span className="home-stage-enter">
                  Enter room
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ) : (
            <div className="home-stage-card home-stage-card--empty">
              <Gavel size={26} />
              <h3 className="home-stage-empty-title">
                The floor is quiet right now
              </h3>
              <p className="home-stage-empty-sub">
                No rooms are live this moment — start one and be the first
                paddle up.
              </p>
              <Link to="/tournaments/new" className="home-stage-empty-cta">
                <Plus size={14} />
                Start a tournament
              </Link>
            </div>
          )}
        </motion.div>
      </motion.section>

      <motion.section
        className="home-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <header className="home-section-head">
          <div>
            <h2 className="home-section-title">
              <CircleDot size={16} />
              Live right now
            </h2>
            <p className="home-section-sub">
              Auctions with rooms currently on the floor.
            </p>
          </div>
          <Link to="/tournaments" className="home-section-link">
            View all
            <ArrowRight size={14} />
          </Link>
        </header>

        {isLoading ? (
          <div className="home-live-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="home-live-card home-live-card--skel" />
            ))}
          </div>
        ) : gridRooms.length === 0 ? (
          <div className="home-section-empty">
            <Gavel size={20} />
            <span>No live rooms at the moment.</span>
          </div>
        ) : (
          <motion.div
            className="home-live-grid"
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {gridRooms.map((room, idx) => (
              <MotionLink
                key={room.id}
                to={`/tournaments/${room.id}`}
                className={clsx('home-live-card', idx === 0 && 'is-featured')}
                style={coverGradient(room.cover)}
                variants={cardItem}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="home-live-tag">{room.code}</span>
                <span className="home-live-status">
                  <CircleDot size={10} />
                  {room.rooms} {room.rooms === 1 ? 'room' : 'rooms'} live
                </span>
                <h3 className="home-live-name">{room.name}</h3>
                <p className="home-live-region">{room.region}</p>
                <p className="home-live-purse">
                  <Wallet size={12} />
                  {formatPurse(room.purse, room.currency, { compact: true })}
                </p>
              </MotionLink>
            ))}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        className="home-section"
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <header className="home-section-head">
          <div>
            <h2 className="home-section-title">
              <Trophy size={16} />
              Recent tournaments
            </h2>
            <p className="home-section-sub">Across every league we follow.</p>
          </div>
          <div className="home-section-head-actions">
            <button
              type="button"
              className="home-gallery-nav"
              onClick={() => scrollGallery(-1)}
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="home-gallery-nav"
              onClick={() => scrollGallery(1)}
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
            <Link to="/tournaments" className="home-section-link">
              Open tournaments
              <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        {isLoading ? (
          <div className="home-gallery">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="home-gallery-card home-gallery-card--skel" />
            ))}
          </div>
        ) : recentTournaments.length === 0 ? (
          <div className="home-section-empty">
            <Trophy size={20} />
            <span>No tournaments yet. Be the first to create one.</span>
          </div>
        ) : (
          <motion.ul
            className="home-gallery"
            ref={galleryRef}
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            {recentTournaments.map((t) => (
              <motion.li
                key={t.id}
                className="home-gallery-card"
                variants={cardItem}
                whileHover={{ y: -4 }}
              >
                <Link to={`/tournaments/${t.id}`} className="home-gallery-link">
                  <span
                    className="home-gallery-thumb"
                    style={coverGradient(t.cover)}
                  >
                    <span
                      className={clsx('home-recent-status', `is-${t.status}`)}
                    >
                      {t.status}
                    </span>
                  </span>
                  <div className="home-gallery-meta">
                    <span className="home-gallery-name">{t.name}</span>
                    <span className="home-gallery-sub">
                      {t.hostName || t.region || t.shortCode} ·{' '}
                      {formatDateRange(t.startDate, t.endDate)}
                    </span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.section>
    </main>
  )
}

export default HomePage