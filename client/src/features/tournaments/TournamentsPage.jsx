import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  CircleDot,
  Gavel,
  MapPin,
  Search,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import api from '../../lib/api'
import { formatDateRange, formatPurse } from './tournament.utils'
import './TournamentsPage.css'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

async function fetchTournaments(status) {
  const params = {}
  if (status !== 'all') params.status = status
  const { data } = await api.get('/tournaments', { params })
  return data?.tournaments ?? []
}

async function fetchTournamentCounts() {
  const { data } = await api.get('/tournaments')
  const list = data?.tournaments ?? []
  return {
    all: list.length,
    live: list.filter((t) => t.status === 'live').length,
    upcoming: list.filter((t) => t.status === 'upcoming').length,
    completed: list.filter((t) => t.status === 'completed').length,
  }
}

function TournamentsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const { data: counts } = useQuery({
    queryKey: ['tournaments', 'counts'],
    queryFn: fetchTournamentCounts,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tournaments', tab],
    queryFn: () => fetchTournaments(tab),
  })

  const filtered = useMemo(() => {
    const list = data ?? []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortCode.toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <main className="tournaments-main">
      <header className="hall-header">
        <p className="hall-eyebrow">
          <span className="hall-eyebrow-icon">★</span>
          AUCTION HALL · <span>Tournaments</span>
        </p>
        <h1 className="hall-title">Find your next auction</h1>
        <p className="hall-subtitle">
          Live, upcoming, or already in the books — every franchise and every
          gavel lives here.
        </p>
        <Link
          to="/tournaments/new"
          className="hall-create-btn"
        >
          <Plus size={14} strokeWidth={2.4} />
          Create tournament
        </Link>
      </header>

      <section className="hall-toolbar">
        <div className="hall-tabs" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => {
            const count = counts?.[t.id] ?? null
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={clsx('hall-tab', { active: isActive })}
                onClick={() => setTab(t.id)}
              >
                <span>{t.label}</span>
                <span className="hall-tab-count">{count ?? '·'}</span>
              </button>
            )
          })}
        </div>

        <div className="hall-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or code…"
            aria-label="Search tournaments"
          />
        </div>
      </section>

      {isLoading ? (
        <TournamentsSkeleton />
      ) : isError ? (
        <EmptyState
          title="Couldn't load tournaments"
          message={error?.message ?? 'Please try again in a moment.'}
          tone="error"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tournaments yet"
          message={
            search.trim()
              ? `Nothing matches “${search.trim()}”.`
              : tab === 'all'
              ? 'When an auctioneer creates a tournament it will appear here.'
              : `No ${tab} tournaments right now.`
          }
        />
      ) : (
        <ul className="tournaments-grid">
          {filtered.map((tournament) => (
            <li key={tournament.id}>
              <TournamentCard
                tournament={tournament}
                onOpen={() => navigate(`/tournaments/${tournament.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function TournamentCard({ tournament, onOpen }) {
  const isLive = tournament.status === 'live'
  const isCompleted = tournament.status === 'completed'
  const isInviteOnly = tournament.visibility === 'invite-only'
  const cover = tournament.cover ?? {}
  const liveRooms = cover.liveRoomCount ?? 0

  const gradientStyle = cover.gradientVia
    ? {
        backgroundImage: `linear-gradient(135deg, ${cover.gradientFrom} 0%, ${cover.gradientVia} 50%, ${cover.gradientTo} 100%)`,
      }
    : {
        backgroundImage: `linear-gradient(135deg, ${cover.gradientFrom} 0%, ${cover.gradientTo} 100%)`,
      }

  const accentStyle = cover.accentHex ? { '--card-accent': cover.accentHex } : null

  const ctaLabel = isCompleted
    ? 'View recap'
    : isLive
    ? 'Enter rooms'
    : 'Open lobby'

  return (
    <article
      className={clsx('t-card', {
        't-card--live': isLive,
        't-card--completed': isCompleted,
        't-card--invite': isInviteOnly,
      })}
      style={{ ...gradientStyle, ...accentStyle }}
    >
      <div className="t-card-noise" aria-hidden="true" />
      <div className="t-card-glow" aria-hidden="true" />

      <header className="t-card-tags">
        <span className="t-card-code">{tournament.shortCode}</span>
        <span
          className={clsx('t-card-status', `is-${tournament.status}`)}
          title={isInviteOnly ? 'Invite-only' : undefined}
        >
          {isLive ? <CircleDot size={11} /> : null}
          {isLive && liveRooms > 0
            ? `${liveRooms} ${liveRooms === 1 ? 'room' : 'rooms'} live`
            : tournament.status}
        </span>
      </header>

      <div className="t-card-body">
        <h2 className="t-card-title">{tournament.name}</h2>

        <div className="t-card-subrow">
          <span className="t-card-host">by {tournament.hostName || 'TBD'}</span>
          <span className="t-card-dot" aria-hidden="true">·</span>
          <span className="t-card-region">
            <MapPin size={11} />
            {tournament.region || `${tournament.franchiseCount} cities`}
          </span>
        </div>

        <p className="t-card-dates">
          <Calendar size={12} />
          {formatDateRange(tournament.startDate, tournament.endDate)}
        </p>

        <ul className="t-card-stats">
          <li>
            <span className="t-card-stat-label">Teams</span>
            <span className="t-card-stat-value">
              <Users size={12} />
              {tournament.franchiseCount}
            </span>
          </li>
          <li>
            <span className="t-card-stat-label">Purse</span>
            <span className="t-card-stat-value">
              <Wallet size={12} />
              {formatPurse(tournament.pursePerFranchise, tournament.currency, {
                compact: true,
              })}
            </span>
          </li>
          <li>
            <span className="t-card-stat-label">Rooms</span>
            <span className="t-card-stat-value">
              <Gavel size={12} />
              {liveRooms}
            </span>
          </li>
        </ul>
      </div>

      <footer className="t-card-footer">
        <span className="t-card-host-credit">
          <Trophy size={12} />
          {tournament.hostName || 'Biddr'}
        </span>

        <button
          type="button"
          className="t-card-cta"
          onClick={onOpen}
        >
          {ctaLabel}
        </button>
      </footer>
    </article>
  )
}

function TournamentsSkeleton() {
  return (
    <ul className="tournaments-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="t-card t-card--skeleton" />
      ))}
    </ul>
  )
}

function EmptyState({ title, message, tone = 'default' }) {
  return (
    <div className={clsx('tournaments-empty', `is-${tone}`)}>
      <Trophy size={28} strokeWidth={1.6} />
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  )
}

export default TournamentsPage