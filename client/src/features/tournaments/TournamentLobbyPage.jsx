import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EditTournamentModal from './EditTournamentModal'
import AuctionPoolSection from './AuctionPoolSection'
import TournamentFranchises from '../franchise/TournamentFranchises'
import {
  ArrowLeft,
  Calendar,
  CircleDot,
  Eye,
  Flag,
  Gavel,
  Laptop2,
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
import { useSocket } from '../../lib/socket'
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
  const { socket, connected } = useSocket()
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

  useEffect(() => {
    if (!socket || !connected || !id) return undefined

    socket.emit('room:join', { tournamentId: id })

    const handleSetupUpdated = ({ tournament: updatedTournament }) => {
      if (updatedTournament) {
        queryClient.setQueryData(['tournament', id], updatedTournament)
        queryClient.setQueryData(['auction-room-probe', id], (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['tournament', id] })
      queryClient.invalidateQueries({ queryKey: ['auction-room-probe', id] })
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    }

    socket.on('auction:setup-updated', handleSetupUpdated)

    return () => {
      socket.off('auction:setup-updated', handleSetupUpdated)
      socket.emit('room:leave', { tournamentId: id })
    }
  }, [socket, connected, id, queryClient])

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
            <li>
              {tournament.auctionMode === 'physical' ? <Gavel size={14} /> : <Laptop2 size={14} />}
              <span>
                {tournament.auctionMode === 'physical'
                  ? 'Physical auction'
                  : 'Remote auction'}
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
              ? tournament.auctionMode === 'physical'
                ? 'Auctioneer controls every bid and floor decision from the live room.'
                : 'Host can bring lots to the floor while franchises bid from their own devices.'
              : tournament.status === 'upcoming'
              ? tournament.auctionMode === 'physical'
                ? 'The auctioneer will run this as a floor auction once the room opens.'
                : 'The auctioneer will spin up rooms once the auction starts.'
              : 'Squads are locked. Browse the recap.'}
          </p>
          <div className="lobby-mode-strip" aria-label="Auction mode summary">
            <span className={`lobby-mode-pill ${tournament.auctionMode === 'physical' ? 'is-physical' : 'is-remote'}`}>
              {tournament.auctionMode === 'physical' ? 'Physical room' : 'Remote room'}
            </span>
            <span className="lobby-mode-copy">
              {tournament.auctionMode === 'physical'
                ? 'Bids are entered only by the auctioneer.'
                : 'Franchise owners can bid from their own devices.'}
            </span>
          </div>
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
              const viewerUrl = `/tournaments/${id}/watch`
              return (
                <div className="lobby-live-actions">
                  <Link to={isHost ? roomUrl : viewerUrl} className="lobby-room-action is-primary">
                    <span className="lobby-room-action-icon">
                      {isHost ? <Gavel size={16} /> : <Laptop2 size={16} />}
                    </span>
                    <span>
                      {isHost
                        ? liveLot
                          ? `Enter the room — ${liveLot.name}`
                          : 'Enter the auction room'
                        : 'Watch live auction'}
                    </span>
                  </Link>
                  {isHost ? (
                    <Link
                      to={`/tournaments/${id}/presenter`}
                      className="lobby-room-action is-secondary"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="lobby-room-action-icon">
                        <Laptop2 size={16} />
                      </span>
                      <span>Presenter view</span>
                    </Link>
                  ) : null}
                </div>
              )
            }
            if (tournament.status === 'upcoming' && isHost) {
              if (!startDateArrived) {
                return (
                  <button
                    type="button"
                    className="lobby-room-action is-primary"
                    disabled
                    title="The auction starts on the configured start date"
                  >
                    <span className="lobby-room-action-icon">
                      <Gavel size={16} />
                    </span>
                    <span>
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
                  className="lobby-room-action is-primary"
                  onClick={() => setStartOpen(true)}
                  data-testid="start-auction-button"
                >
                  <span className="lobby-room-action-icon">
                    <Gavel size={16} />
                  </span>
                  <span>Start the auction</span>
                </button>
              )
            }
            if (tournament.status === 'upcoming') {
              return (
                <button
                  type="button"
                  className="lobby-room-action is-primary"
                  disabled
                  title="The host will start the auction when the date arrives"
                >
                  <span className="lobby-room-action-icon">
                    <Gavel size={16} />
                  </span>
                  <span>Notify me when live</span>
                </button>
              )
            }
            if (tournament.status === 'completed') {
              return (
                <button
                  type="button"
                  className="lobby-room-action is-primary"
                  disabled
                  title="Recap is coming next phase"
                >
                  <span className="lobby-room-action-icon">
                    <Gavel size={16} />
                  </span>
                  <span>View recap</span>
                </button>
              )
            }
            return null
          })()}
        </div>
      </section>

      {isHost ? (
        <AccessManagementSection
          tournament={tournament}
          invites={invites}
          inviteEmail={inviteEmail}
          inviteBusy={inviteBusy}
          inviteError={inviteError}
          onInviteEmailChange={setInviteEmail}
          onSendInvite={sendInvite}
          onRevoke={onRevoke}
          currentUserId={user?.id}
          isHost={isHost}
        />
      ) : null}

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
                ? tournament.auctionMode === 'physical'
                  ? 'You have full control of the floor: activate lots, record bids, pause, undo, skip, and hammer results.'
                  : 'You can spin up rooms, manage player queues, and oversee live bidder activity end-to-end.'
                : tournament.auctionMode === 'physical'
                  ? 'Browse freely. The auctioneer will record all physical-room bids and decisions live.'
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
          onSaved={(updatedTournament) => {
            setEditing(false)
            if (updatedTournament?.id) {
              queryClient.setQueryData(['tournament', id], updatedTournament)
            }
            queryClient.invalidateQueries({ queryKey: ['tournament', id] })
            queryClient.invalidateQueries({ queryKey: ['auction-room-probe', id] })
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

function AccessManagementSection({
  tournament,
  invites,
  inviteEmail,
  inviteBusy,
  inviteError,
  onInviteEmailChange,
  onSendInvite,
  onRevoke,
  currentUserId,
  isHost,
}) {
  const isInviteOnly = tournament.visibility === 'invite-only'
  const franchiseOwnerCount = (tournament.franchises || []).reduce(
    (count, franchise) =>
      count + (franchise.members || []).filter((member) => member.role === 'owner').length,
    0,
  )
  const assignedTeams = (tournament.franchises || []).filter((franchise) =>
    (franchise.members || []).some((member) => member.role === 'owner'),
  ).length
  const pendingInvites = invites.filter((invite) => invite.status !== 'accepted').length
  const acceptedInvites = invites.filter((invite) => invite.status === 'accepted').length

  return (
    <section className="lobby-access" aria-label="Invite and access management">
      <div className="lobby-access-top">
        <div>
          <p className="lobby-access-eyebrow">
            <ShieldCheck size={15} />
            Invite & Access Management
          </p>
          <h2>Control who can enter this tournament.</h2>
          <p>
            Invite viewers for private tournaments, then assign franchise owners
            to decide who can bid when the auction goes live.
          </p>
        </div>
        <div className="lobby-access-mode">
          {isInviteOnly ? <Lock size={17} /> : <Eye size={17} />}
          <span>{isInviteOnly ? 'Invite-only tournament' : 'Public tournament'}</span>
        </div>
      </div>

      <div className="lobby-access-stats">
        <AccessStat label="Pending invites" value={isInviteOnly ? pendingInvites : 'Open'} />
        <AccessStat label="Accepted invites" value={isInviteOnly ? acceptedInvites : 'Public'} />
        <AccessStat label="Teams assigned" value={`${assignedTeams}/${tournament.franchises.length}`} />
        <AccessStat label="Franchise owners" value={franchiseOwnerCount} />
      </div>

      <div className="lobby-access-grid">
        <div className="lobby-access-card">
          <header className="lobby-access-card-head">
            <div>
              <h3>{isInviteOnly ? 'Invite people' : 'Tournament visibility'}</h3>
              <p>
                {isInviteOnly
                  ? 'Only invited users can open this tournament and its rooms.'
                  : 'This tournament is public, so invite emails are not required for viewers.'}
              </p>
            </div>
            <span className={clsx('lobby-access-badge', { 'is-open': !isInviteOnly })}>
              {isInviteOnly ? 'Private' : 'Open'}
            </span>
          </header>

          {isInviteOnly ? (
            <>
              <form className="lobby-invites-form" onSubmit={onSendInvite}>
                <div className="lobby-invites-input">
                  <Mail size={14} />
                  <input
                    type="email"
                    placeholder="bidder@example.com"
                    value={inviteEmail}
                    onChange={(event) => onInviteEmailChange(event.target.value)}
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
                  {inviteBusy ? 'Sending...' : 'Send invite'}
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
            </>
          ) : (
            <div className="lobby-access-open-note">
              <Eye size={18} />
              <span>
                Anyone with access to Biddr can browse this tournament. Use
                franchise owner assignment below to control who can bid.
              </span>
            </div>
          )}
        </div>

        <div className="lobby-access-card">
          <header className="lobby-access-card-head">
            <div>
              <h3>Franchise bidding access</h3>
              <p>Assign owners to each franchise. Owners can raise paddles in remote auctions.</p>
            </div>
            <span className="lobby-access-badge">
              {assignedTeams}/{tournament.franchises.length} ready
            </span>
          </header>

          {tournament.franchises.length > 0 ? (
            <TournamentFranchises
              tournamentId={tournament.id}
              isHost={isHost}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="lobby-access-open-note">
              <Users size={18} />
              <span>Add franchises first, then assign team owners here.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function AccessStat({ label, value }) {
  return (
    <div className="lobby-access-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
