import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
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

async function fetchTournaments() {
  const { data } = await api.get('/tournaments')
  return data?.tournaments ?? []
}

function HomePage() {
  const { user } = useAuth()
  const isAuctioneer = user?.role === 'auctioneer'

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

  const liveRooms = useMemo(
    () =>
      tournaments
        .filter((t) => t.status === 'live')
        .slice(0, 3)
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

  const recentTournaments = useMemo(
    () => tournaments.slice(0, 4),
    [tournaments],
  )

  const firstName = user?.fullName?.split(/\s+/)[0] || 'there'

  return (
    <main className="home-main">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            <Sparkles size={12} strokeWidth={2.4} />
            Auction Hall
          </p>
          <h1 className="home-title">
            Welcome back, {firstName}
            <span className="home-title-dot">.</span>
          </h1>
          <p className="home-subtitle">
            {isAuctioneer
              ? 'Spin up a new tournament, manage a live room, or review yesterday’s bidding.'
              : 'Pick a tournament, follow the live rooms, and watch every paddle fall.'}
          </p>

          <div className="home-hero-cta">
            <Link
              to="/tournaments"
              className={clsx('cta-btn', 'home-cta-primary')}
            >
              <span className="cta-btn-shine" aria-hidden="true" />
              <span className="cta-btn-content">
                Browse tournaments
                <ArrowRight size={16} strokeWidth={2.4} />
              </span>
            </Link>
            {isAuctioneer ? (
              <button
                type="button"
                className="home-cta-secondary"
                disabled
                title="Create tournament flow is coming next phase"
              >
                <Plus size={16} strokeWidth={2.4} />
                New tournament
              </button>
            ) : null}
          </div>
        </div>

        <ul className="home-stats">
          <li>
            <span className="home-stat-value">{counts.total}</span>
            <span className="home-stat-label">Tournaments</span>
          </li>
          <li>
            <span className="home-stat-value">
              <CircleDot size={14} />
              {counts.live}
            </span>
            <span className="home-stat-label">Live now</span>
          </li>
          <li>
            <span className="home-stat-value">{counts.upcoming}</span>
            <span className="home-stat-label">Upcoming</span>
          </li>
          <li>
            <span className="home-stat-value">{counts.completed}</span>
            <span className="home-stat-label">Recaps</span>
          </li>
        </ul>
      </section>

      {/* Live rooms */}
      <section className="home-section">
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
        ) : liveRooms.length === 0 ? (
          <div className="home-section-empty">
            <Gavel size={20} />
            <span>No live rooms at the moment.</span>
          </div>
        ) : (
          <div className="home-live-grid">
            {liveRooms.map((room) => {
              const gradientStyle = room.cover?.gradientVia
                ? {
                    backgroundImage: `linear-gradient(135deg, ${room.cover.gradientFrom} 0%, ${room.cover.gradientVia} 50%, ${room.cover.gradientTo} 100%)`,
                  }
                : {
                    backgroundImage: `linear-gradient(135deg, ${room.cover?.gradientFrom ?? '#1d2436'} 0%, ${room.cover?.gradientTo ?? '#0a0d16'} 100%)`,
                  }
              return (
                <Link
                  key={room.id}
                  to={`/tournaments/${room.id}`}
                  className="home-live-card"
                  style={gradientStyle}
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
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent tournaments */}
      <section className="home-section">
        <header className="home-section-head">
          <div>
            <h2 className="home-section-title">
              <Trophy size={16} />
              {isAuctioneer
                ? 'Your tournaments'
                : 'Recent tournaments'}
            </h2>
            <p className="home-section-sub">
              {isAuctioneer
                ? 'Tournaments you host or have recently visited.'
                : 'Across every league we follow.'}
            </p>
          </div>
          <Link to="/tournaments" className="home-section-link">
            Open tournaments
            <ArrowRight size={14} />
          </Link>
        </header>

        {isLoading ? (
          <div className="home-recent-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="home-recent-row home-recent-row--skel" />
            ))}
          </div>
        ) : recentTournaments.length === 0 ? (
          <div className="home-section-empty">
            <Trophy size={20} />
            <span>
              No tournaments yet. {isAuctioneer ? 'Create the first one.' : 'Check back soon.'}
            </span>
          </div>
        ) : (
          <ul className="home-recent-list">
            {recentTournaments.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/tournaments/${t.id}`}
                  className="home-recent-row"
                >
                  <span
                    className="home-recent-pill"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${
                        t.cover?.gradientFrom ?? '#1d2436'
                      }, ${t.cover?.gradientTo ?? '#0a0d16'})`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="home-recent-meta">
                    <span className="home-recent-name">{t.name}</span>
                    <span className="home-recent-sub">
                      {t.hostName || t.region || t.shortCode} ·{' '}
                      {formatDateRange(t.startDate, t.endDate)}
                    </span>
                  </div>
                  <span
                    className={clsx('home-recent-status', `is-${t.status}`)}
                  >
                    {t.status}
                  </span>
                  <ArrowRight size={14} className="home-recent-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default HomePage
