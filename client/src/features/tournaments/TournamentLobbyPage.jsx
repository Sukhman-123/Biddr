import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EditTournamentModal from './EditTournamentModal'
import AuctionPoolSection from './AuctionPoolSection'
import {
  ArrowLeft,
  Calendar,
  CircleDot,
  Eye,
  Flag,
  Gavel,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { formatDateRange, formatPurse } from './tournament.utils'
import {
  listInvitesRequest,
  createInviteRequest,
  revokeInviteRequest,
  startAuctionRequest,
} from './tournament.api'
import { fetchRoomSnapshotRequest } from '../auction/auctionRoom.api'
import StartAuctionModal from './StartAuctionModal'
import './TournamentLobbyPage.css'

async function fetchTournament(id) {
  const { data } = await api.get(`/tournaments/${id}`)
  return data?.tournament ?? null
}

function TournamentLobbyPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: tournament, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
    enabled: Boolean(id),
  })

  // Light-weight probe of the room: just enough to know whether
  // there's an active lot so we can light up the "Enter a room"
  // button on the lobby. We don't render the full room here — the
  // user clicks through to /tournaments/:id/rooms/:lotId.
  const { data: roomSnapshot } = useQuery({
    queryKey: ['auction-room-probe', id],
    queryFn: () => fetchRoomSnapshotRequest(id),
    enabled: Boolean(id),
    staleTime: 5_000,
  })

  const isOwner = Boolean(user && tournament && tournament.ownerId === user.id)
  const isHost = isOwner
  const showInvites = isOwner && tournament?.visibility === 'invite-only'

  const { data: invites = [] } = useQuery({
    queryKey: ['tournament-invites', id],
    queryFn: () => listInvitesRequest(id),
    enabled: Boolean(showInvites),
  })

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState(null)

  // Start-auction modal state. `open` controls the modal; `busy`
  // and `errorMessage` are surfaced from the API call. The
  // tournament is re-fetched on success so the lobby's status
  // pill and Enter-a-room button update.
  const [startOpen, setStartOpen] = useState(false)
  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState(null)

  const sendInvite = async (e) => {
    e.preventDefault()
    if (inviteBusy) return
    const email = inviteEmail.trim()
    if (!email) {
      setInviteError('Enter an email address')
      return
    }
    setInviteBusy(true)
    setInviteError(null)
    try {
      await createInviteRequest(id, email)
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['tournament-invites', id] })
    } catch (err) {
      setInviteError(err?.message ?? 'Could not send invite')
    } finally {
      setInviteBusy(false)
    }
  }

  const onRevoke = async (inviteId) => {
    if (inviteBusy) return
    setInviteBusy(true)
    setInviteError(null)
    try {
      await revokeInviteRequest(id, inviteId)
      queryClient.invalidateQueries({ queryKey: ['tournament-invites', id] })
    } catch (err) {
      setInviteError(err?.message ?? 'Could not revoke invite')
    } finally {
      setInviteBusy(false)
    }
  }

  const onStartAuction = async () => {
    if (startBusy) return
    setStartBusy(true)
    setStartError(null)
    try {
      const updated = await startAuctionRequest(id)
      // Re-fetch so the lobby's status pill, copy, and
      // Enter-a-room button all reflect the new state.
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['auction-room-probe', id] })
      if (updated?.status) {
        // The success path closes the modal; if the server returned
        // an already-live tournament (idempotent), we still close.
        setStartOpen(false)
      }
    } catch (err) {
      setStartError(err?.message ?? 'Could not start the auction')
    } finally {
      setStartBusy(false)
    }
  }

  const [editing, setEditing] = useState(false)

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

  const isAuctioneer = isOwner

  return (
    <main className="tournaments-main lobby-main">
      <Link to="/tournaments" className="lobby-back">
        <ArrowLeft size={14} />
        Back to tournaments
      </Link>

      {showInvites ? (
        <section className="lobby-invites" aria-label="Manage invites">
          <header className="lobby-invites-head">
            <div className="lobby-invites-title">
              <Lock size={14} />
              <h2>Invite bidders</h2>
              <span className="lobby-invites-count">
                {invites.length} pending
              </span>
            </div>
            <p>Private tournament — only invited bidders can see it.</p>
          </header>
          <form className="lobby-invites-form" onSubmit={sendInvite}>
            <div className="lobby-invites-input">
              <Mail size={14} />
              <input
                type="email"
                placeholder="bidder@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteBusy}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="lobby-invites-send"
              disabled={inviteBusy || !inviteEmail.trim()}
            >
              <Send size={14} />
              {inviteBusy ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {inviteError ? (
            <div className="lobby-invites-error">{inviteError}</div>
          ) : null}
          {invites.length > 0 ? (
            <ul className="lobby-invites-list">
              <AnimatePresence initial={false}>
                {invites.map((invite) => (
                  <motion.li
                    key={invite._id}
                    className="lobby-invites-row"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <span className="lobby-invites-email">{invite.email}</span>
                    <span className="lobby-invites-status">
                      {invite.status === 'accepted' ? 'Accepted' : 'Pending'}
                    </span>
                    <button
                      type="button"
                      className="lobby-invites-revoke"
                      onClick={() => onRevoke(invite._id)}
                      disabled={inviteBusy}
                      aria-label={`Revoke invite for ${invite.email}`}
                    >
                      <X size={12} />
                      Revoke
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="lobby-invites-empty">No invites yet.</p>
          )}
        </section>
      ) : null}

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

          {isAuctioneer ? (
            <div className="lobby-host-actions">
              <button
                type="button"
                className="lobby-edit-btn"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} />
                Edit tournament
              </button>
            </div>
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
              ? 'Auction room open'
              : tournament.status === 'upcoming'
              ? 'No live rooms yet'
              : 'Archive ready'}
          </h2>
          <p className="lobby-status-sub">
            {tournament.status === 'live'
              ? 'Host can bring lots to the floor from the auction room.'
              : tournament.status === 'upcoming'
              ? 'The auctioneer will spin up rooms once the auction starts.'
              : 'Squads are locked. Browse the recap.'}
          </p>
          {(() => {
            // Wire the lobby CTA based on status + role:
            //   live + active lot → "Enter the room" link
            //   live + no lot yet → "Enter a room (waiting)" disabled
            //   upcoming + host   → "Start the auction" (gated by startDate)
            //   upcoming + viewer → "Notify me when live" disabled
            //   completed         → "View recap" disabled
            const liveLot = roomSnapshot?.activeLot
            const startDateArrived =
              !tournament.startDate ||
              new Date(tournament.startDate).getTime() <= Date.now()

            if (tournament.status === 'live') {
              // Link to the room — if there's an active lot, go directly to it;
              // otherwise go to the generic room where the host can activate.
              const roomUrl = liveLot
                ? `/tournaments/${id}/rooms/${liveLot.id}`
                : `/tournaments/${id}/room`
              return (
                <Link to={roomUrl} className="cta-btn">
                  <span className="cta-btn-content">
                    <Gavel size={16} />
                    {liveLot
                      ? `Enter the room — ${liveLot.name}`
                      : 'Enter the auction room'}
                  </span>
                </Link>
              )
            }
            if (tournament.status === 'upcoming' && isHost) {
              if (!startDateArrived) {
                return (
                  <button
                    type="button"
                    className="cta-btn"
                    disabled
                    title="The auction starts on the configured start date"
                  >
                    <span className="cta-btn-content">
                      <Gavel size={16} />
                      Starts on{' '}
                      {new Date(tournament.startDate).toLocaleDateString([], {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  className="cta-btn"
                  onClick={() => setStartOpen(true)}
                  data-testid="start-auction-button"
                >
                  <span className="cta-btn-content">
                    <Gavel size={16} />
                    Start the auction
                  </span>
                </button>
              )
            }
            if (tournament.status === 'upcoming') {
              return (
                <button
                  type="button"
                  className="cta-btn"
                  disabled
                  title="The host will start the auction when the date arrives"
                >
                  <span className="cta-btn-content">
                    <Gavel size={16} />
                    Notify me when live
                  </span>
                </button>
              )
            }
            if (tournament.status === 'completed') {
              return (
                <button
                  type="button"
                  className="cta-btn"
                  disabled
                  title="Recap is coming next phase"
                >
                  <span className="cta-btn-content">
                    <Gavel size={16} />
                    View recap
                  </span>
                </button>
              )
            }
            return null
          })()}
        </div>
      </section>

      {isHost ? (
        <AuctionPoolSection
          tournamentId={tournament.id}
          currency={tournament.currency}
        />
      ) : null}

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
      {editing ? (
        <EditTournamentModal
          tournament={tournament}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            refetch()
          }}
        />
      ) : null}
      <StartAuctionModal
        open={startOpen}
        tournament={tournament}
        busy={startBusy}
        errorMessage={startError}
        onConfirm={onStartAuction}
        onCancel={() => {
          if (startBusy) return
          setStartOpen(false)
          setStartError(null)
        }}
      />
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
