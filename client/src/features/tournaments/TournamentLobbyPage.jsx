import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  CircleDot,
  Eye,
  Flag,
  Gavel,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { formatDateRange, formatPurse } from './tournament.utils'
import './TournamentLobbyPage.css'

async function fetchTournament(id) {
  const { data } = await api.get(`/tournaments/${id}`)
  return data?.tournament ?? null
}

function TournamentLobbyPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const { data: tournament, isLoading, isError, error } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return <LobbySkeleton />
  }

  if (isError || !tournament) {
    return (
      <main className="tournaments-main">
        <Link to="/tournaments" className="lobby-back">
          <ArrowLeft size={14} />
          Back to tournaments
        </Link>
        <div className="tournaments-empty is-error">
          <Trophy size={28} strokeWidth={1.6} />
          <h2>Tournament not found</h2>
          <p>{error?.message ?? 'It may have been removed or moved.'}</p>
        </div>
      </main>
    )
  }

  const isAuctioneer =
    user && tournament && tournament.ownerId === user.id

  return (
    <main className="tournaments-main lobby-main">
      <Link to="/tournaments" className="lobby-back">
        <ArrowLeft size={14} />
        Back to tournaments
      </Link>

      <section className="lobby-hero">
        <div className="lobby-hero-text">
          <span className="tournaments-eyebrow">
            <Sparkles size={14} strokeWidth={2.4} />
            {tournament.shortCode}
          </span>
          <h1 className="lobby-title">{tournament.name}</h1>
          {tournament.description ? (
            <p className="lobby-subtitle">{tournament.description}</p>
          ) : null}

          <ul className="lobby-stats">
            <li>
              <Calendar size={14} />
              <span>
                {formatDateRange(tournament.startDate, tournament.endDate)}
              </span>
            </li>
            <li>
              <Users size={14} />
              <span>
                {tournament.franchiseCount} franchise
                {tournament.franchiseCount === 1 ? '' : 's'}
              </span>
            </li>
            <li>
              <Wallet size={14} />
              <span>
                {formatPurse(tournament.pursePerFranchise, tournament.currency)}{' '}
                purse
              </span>
            </li>
          </ul>
        </div>

        <div
          className={clsx('lobby-status-card', `is-${tournament.status}`)}
        >
          <span className="lobby-status-label">
            {tournament.status === 'live' ? <CircleDot size={14} /> : null}
            {tournament.status === 'live'
              ? 'Live auction in progress'
              : tournament.status === 'upcoming'
              ? 'Auction opens soon'
              : 'This tournament has ended'}
          </span>
          <h2 className="lobby-status-title">
            {tournament.status === 'live'
              ? '0 rooms live'
              : tournament.status === 'upcoming'
              ? 'No live rooms yet'
              : 'Archive ready'}
          </h2>
          <p className="lobby-status-sub">
            {tournament.status === 'live'
              ? 'Pick a room below to enter the bidding floor.'
              : tournament.status === 'upcoming'
              ? 'The auctioneer will spin up rooms once the auction starts.'
              : 'Squads are locked. Browse the recap.'}
          </p>
          <button
            type="button"
            className="cta-btn"
            disabled
            title="Coming next phase"
          >
            <span className="cta-btn-content">
              <Gavel size={16} />
              {tournament.status === 'live'
                ? 'Enter a room (soon)'
                : tournament.status === 'upcoming'
                ? 'Notify me when live'
                : 'View recap'}
            </span>
          </button>
        </div>
      </section>

      <section className="lobby-grid">
        <div className="lobby-col">
          <header className="lobby-col-header">
            <h2>
              <Flag size={16} />
              Franchises
            </h2>
            <span>
              {tournament.franchises.length} of {tournament.franchiseCount}{' '}
              registered
            </span>
          </header>

          {tournament.franchises.length === 0 ? (
            <div className="lobby-empty">
              <ShieldCheck size={20} />
              <p>No franchises added yet for this tournament.</p>
            </div>
          ) : (
            <ul className="franchise-list">
              {tournament.franchises.map((f) => (
                <li key={f.id} className="franchise-row">
                  <span
                    className="franchise-chip"
                    style={{ background: f.colorHex }}
                    aria-hidden="true"
                  />
                  <div className="franchise-info">
                    <span className="franchise-name">{f.name}</span>
                    <span className="franchise-city">
                      <MapPin size={12} />
                      {f.city || 'City TBA'}
                    </span>
                  </div>
                  <span
                    className={clsx('franchise-pill', {
                      taken: f.taken,
                    })}
                  >
                    {f.taken ? 'Claimed' : 'Open slot'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lobby-aside">
          <header className="lobby-col-header">
            <h2>
              <Eye size={16} />
              Your access
            </h2>
          </header>
          <div className="lobby-role-card">
            <span className="lobby-role-label">Logged in as</span>
            <span className="lobby-role-name">{user?.fullName}</span>
            <span className="lobby-role-role">
              {isAuctioneer ? 'Auctioneer' : 'Viewer'}
            </span>
            <p className="lobby-role-help">
              {isAuctioneer
                ? 'You can spin up rooms, manage player queues, and run this auction end-to-end.'
                : 'Browse freely. Live rooms will open here when the host starts them.'}
            </p>
            {!isAuctioneer ? (
              <div className="lobby-role-hint">
                Tournament management tools appear here for the host.
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  )
}

function LobbySkeleton() {
  return (
    <main className="tournaments-main lobby-main">
      <div className="skeleton-block" style={{ height: 220, borderRadius: 18 }} />
      <div
        className="skeleton-block"
        style={{ height: 280, borderRadius: 18, marginTop: 18 }}
      />
    </main>
  )
}

export default TournamentLobbyPage
