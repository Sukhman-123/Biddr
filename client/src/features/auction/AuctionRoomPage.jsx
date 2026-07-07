import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleDot, Gavel, Wifi, WifiOff } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { useAuth } from '../auth/useAuth'
import { useSocket } from '../../lib/socket'
import { useToast } from '../../components/ToastProvider'
import {
  fetchRoomSnapshotRequest,
  listTournamentLotsRequest,
  activateLotRequest,
  hammerLotRequest,
  passLotRequest,
  pauseLotRequest,
  resumeLotRequest,
  placeBidRequest,
  undoLastActionRequest,
  deactivateLotRequest,
} from './auctionRoom.api'
import { endAuctionRequest } from '../tournaments/tournament.api'
import { formatPurse } from '../tournaments/tournament.utils'
import TopBar from './components/TopBar'
import CurrentLotCard from './components/CurrentLotCard'
import HostControls from './components/HostControls'
import PaddlesRail from './components/PaddlesRail'
import BidFeed from './components/BidFeed'
import TeamBudgetSidebar from './components/TeamBudgetSidebar'
import PlayerQueuePanel from './components/PlayerQueuePanel'
import EndAuctionModal from '../tournaments/EndAuctionModal'
import './AuctionRoomPage.css'

// =============================================================
// AuctionRoomPage — the live bidding floor.
//
// Skeleton (v1): the room renders, the socket connects, the host
// can activate / hammer / pass lots, and viewers see those events
// in real time. There is NO paddle raise / bid placement in v1
// (that's v2). Paddles are visible and clickable so the UI feels
// real, but clicks only fire a "coming in v2" toast.
//
// Total-host-control: only the host sees HostControls. Viewers
// see the same live state via socket broadcasts.
// =============================================================

const isHostFor = (tournament, user) =>
  Boolean(tournament?.ownerId && user?.id && tournament.ownerId === user.id)

export default function AuctionRoomPage() {
  const { id: tournamentId, lotId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const toast = useToast()
  const { socket, connected } = useSocket()
  const reduceMotion = useReducedMotion()

  // Server-side snapshot — drives the initial render. After mount,
  // the socket is the source of truth and we patch `activeLot`
  // in-place from broadcasts.
  const snapshotQuery = useQuery({
    queryKey: ['auction-room', tournamentId, lotId],
    queryFn: () => fetchRoomSnapshotRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  // List of queued lots — used to populate the "Activate" picker
  // in HostControls when the room is empty.
  const lotsQuery = useQuery({
    queryKey: ['auction-room-lots', tournamentId],
    queryFn: () => listTournamentLotsRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  // Local mirrors of the live state. We keep the snapshot as the
  // seed and patch from socket events.
  const [activeLot, setActiveLot] = useState(null)
  const [feed, setFeed] = useState([])
  const joinedRef = useRef(false)
  const lastUndoLotIdRef = useRef(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [endBusy, setEndBusy] = useState(false)
  const [endError, setEndError] = useState(null)

  // Seed local state from the snapshot whenever it loads.
  useEffect(() => {
    if (snapshotQuery.data) {
      setActiveLot(snapshotQuery.data.activeLot)
      setUndoAvailable(Boolean(snapshotQuery.data.undoAvailable))
      lastUndoLotIdRef.current =
        snapshotQuery.data.lastUndoLotId ?? snapshotQuery.data.activeLot?.id ?? null
    }
  }, [snapshotQuery.data])

  // ============================================================
  // Socket: room:join on connect, room:leave on unmount, subscribe
  // to lot:activated / lot:hammered / lot:passed. Each event
  // updates local state and pushes a row into the bid feed.
  // ============================================================
  useEffect(() => {
    if (!socket || !tournamentId) return
    if (!connected) return
    if (joinedRef.current) return

    const onJoined = (payload) => {
      joinedRef.current = true
      // The server can send an initial `room:state` on join (future
      // improvement); for v1 we already have the REST snapshot.
      if (payload?.activeLot) {
        setActiveLot(payload.activeLot)
      }
    }
    const onConnect = () => {
      socket.emit('room:join', { tournamentId }, (ack) => {
        if (ack?.ok) {
          joinedRef.current = true
        } else if (ack?.status === 403) {
          toast.error('You do not have access to this auction room')
        } else if (ack?.status === 404) {
          toast.error('Auction room not found')
        } else if (ack && ack.ok === false) {
          toast.error(ack.message || 'Could not join the auction room')
        }
      })
    }
    const onLotActivated = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `${lot.id}-activated-${at}`,
            type: 'activated',
            actor: by?.fullName || 'Auctioneer',
            lotName: lot.name,
            amount: lot.currentBid,
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }
    const onLotHammered = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(null)
      setUndoAvailable(true)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `${lot.id}-hammered-${at}`,
            type: 'hammered',
            actor: by?.fullName || 'Auctioneer',
            lotName: lot.name,
            amount: lot.soldPrice ?? lot.currentBid,
            winnerFranchiseId: lot.soldToFranchiseId,
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      toast.success(`${lot.name} sold${lot.soldPrice ? ' for ' + formatPurse(lot.soldPrice, lot.soldPrice && 'INR') : ''}`)
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }
    const onLotPassed = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(null)
      setUndoAvailable(true)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `${lot.id}-passed-${at}`,
            type: 'passed',
            actor: by?.fullName || 'Auctioneer',
            lotName: lot.name,
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }
    const onBidPlaced = ({ lot, franchise, amount, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      setUndoAvailable(true)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `${lot.id}-bid-${at}`,
            type: 'bid',
            actor: by?.fullName || franchise?.name || 'Bidder',
            lotName: lot.name,
            franchiseName: franchise?.name,
            amount,
            at,
          },
          ...current,
        ].slice(0, 30),
      )
    }
    const onAuctionPaused = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `paused-${at}`,
            type: 'paused',
            actor: by?.fullName || 'Auctioneer',
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      toast.warn('Auction paused by auctioneer')
    }
    const onAuctionResumed = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      lastUndoLotIdRef.current = lot.id
      setFeed((current) =>
        [
          {
            id: `resumed-${at}`,
            type: 'resumed',
            actor: by?.fullName || 'Auctioneer',
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      toast.info('Auction resumed')
    }

    const onLotUndone = ({ action, lot, at, undoAvailable: nextUndoAvailable }) => {
      setActiveLot(
        lot && ['active', 'paused'].includes(lot.auctionStatus) ? lot : null,
      )
      setUndoAvailable(Boolean(nextUndoAvailable))
      lastUndoLotIdRef.current = lot?.id ?? action?.lotId ?? null
      setFeed((current) =>
        [
          {
            id: `undone-${at}`,
            type: 'undone',
            actor: action.by?.fullName || 'Auctioneer',
            action: action.type,
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      toast.info('Last action undone')
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }

    const onLotDeactivated = ({ lot, at }) => {
      setActiveLot(null)
      setUndoAvailable(false)
      lastUndoLotIdRef.current = null
      setFeed((current) =>
        [
          {
            id: `deactivated-${at}`,
            type: 'deactivated',
            actor: 'Auctioneer',
            at,
          },
          ...current,
        ].slice(0, 30),
      )
      toast.info('Lot returned to queue')
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)
    socket.on('lot:activated', onLotActivated)
    socket.on('lot:hammered', onLotHammered)
    socket.on('lot:passed', onLotPassed)
    socket.on('bid:placed', onBidPlaced)
    socket.on('auction:paused', onAuctionPaused)
    socket.on('auction:resumed', onAuctionResumed)
    socket.on('lot:undone', onLotUndone)
    socket.on('lot:deactivated', onLotDeactivated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('lot:activated', onLotActivated)
      socket.off('lot:hammered', onLotHammered)
      socket.off('lot:passed', onLotPassed)
      socket.off('bid:placed', onBidPlaced)
      socket.off('auction:paused', onAuctionPaused)
      socket.off('auction:resumed', onAuctionResumed)
      socket.off('lot:undone', onLotUndone)
      socket.off('lot:deactivated', onLotDeactivated)
      if (joinedRef.current) {
        socket.emit('room:leave', { tournamentId })
        joinedRef.current = false
      }
    }
  }, [socket, connected, tournamentId, toast, queryClient])

  const tournament = snapshotQuery.data?.tournament
  const isHost = isHostFor(tournament, user)
  const queuedLots = useMemo(
    () => (lotsQuery.data || []).filter((l) => l.status === 'queued' && l.auctionStatus === 'idle'),
    [lotsQuery.data],
  )

  // Timer: derive seconds remaining from activeLot.currentBidAt.
  // We treat currentBidAt as "the timer started now" and count down
  // from 60s. The server owns the truth; this is just for UX.
  const [timerSeconds, setTimerSeconds] = useState(0)
  useEffect(() => {
    if (!activeLot?.currentBidAt) { setTimerSeconds(0); return }
    const started = new Date(activeLot.currentBidAt).getTime()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const remaining = Math.max(0, 60 - elapsed)
      setTimerSeconds(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeLot?.currentBidAt])

  // ============================================================
  // Host actions — only callable by the host. Each posts to the
  // matching REST endpoint; the server broadcasts to the room
  // and our socket listeners update the local state.
  // ============================================================
  const [busy, setBusy] = useState(false)
  const onActivate = useCallback(
    async (pickLotId) => {
      if (!isHost) return
      setBusy(true)
      try {
        await activateLotRequest(tournamentId, pickLotId)
        // The socket broadcast will update activeLot.
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    },
    [isHost, tournamentId, toast],
  )
  const onHammer = useCallback(
    async (franchiseId) => {
      if (!isHost || !activeLot) return
      setBusy(true)
      try {
        await hammerLotRequest(activeLot.id, franchiseId ? { franchiseId } : {})
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    },
    [isHost, activeLot, toast],
  )
  const onPass = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await passLotRequest(activeLot.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

  const onPause = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await pauseLotRequest(activeLot.id)
      toast.info('Auction paused')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

  const onResume = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await resumeLotRequest(activeLot.id)
      toast.info('Auction resumed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

  const onUndo = useCallback(async () => {
    const targetLotId = activeLot?.id || lastUndoLotIdRef.current
    if (!isHost || !targetLotId || !undoAvailable) return
    setBusy(true)
    try {
      await undoLastActionRequest(targetLotId)
      toast.success('Action undone')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast, undoAvailable])

  const onDeactivate = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await deactivateLotRequest(activeLot.id)
      toast.success('Lot returned to queue')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

  const onEndAuction = useCallback(async () => {
    if (!isHost || endBusy) return
    setEndBusy(true)
    setEndError(null)
    try {
      await endAuctionRequest(tournamentId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room-probe', tournamentId] }),
      ])
      toast.success('Auction completed')
      navigate(`/tournaments/${tournamentId}`)
    } catch (err) {
      setEndError(err.message)
    } finally {
      setEndBusy(false)
    }
  }, [isHost, endBusy, tournamentId, queryClient, toast, navigate])

  const onPlaceBid = useCallback(async (franchiseId, amount) => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await placeBidRequest(activeLot.id, { franchiseId, amount })
      toast.success('Bid placed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

  const onRaisePaddle = useCallback(async (franchiseId, amount) => {
    if (!activeLot) return
    setBusy(true)
    try {
      await placeBidRequest(activeLot.id, { franchiseId, amount })
      toast.success('Paddle raised!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [activeLot, toast])

  // ============================================================
  // Render.
  // ============================================================
  if (snapshotQuery.isLoading) {
    return (
      <main className="auction-room-main">
        <RoomSkeleton />
      </main>
    )
  }
  if (snapshotQuery.isError) {
    return (
      <main className="auction-room-main">
        <div className="auction-room-error">
          <h2>Could not open the auction room</h2>
          <p>{snapshotQuery.error?.message || 'Try again in a moment.'}</p>
          <Link to={`/tournaments/${tournamentId}`} className="cta-btn">
            <span className="cta-btn-content"><ArrowLeft size={16} />Back to lobby</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="auction-room-main">
      <TopBar
        tournament={tournament}
        connected={connected}
        onLeave={() => navigate(`/tournaments/${tournamentId}`)}
        showEndAuction={isHost && tournament?.status === 'live'}
        endDisabled={Boolean(activeLot) || endBusy}
        endDisabledReason={
          activeLot
            ? 'Resolve the current lot before ending the auction'
            : undefined
        }
        onEndAuction={() => {
          setEndError(null)
          setEndOpen(true)
        }}
      />

      {isHost ? (
        <AuctioneerDesk
          tournament={tournament}
          activeLot={activeLot}
          queuedCount={queuedLots.length}
          undoAvailable={undoAvailable}
          connected={connected}
        />
      ) : null}

      <motion.section
        className="auction-room-grid"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auction-room-left">
          <CurrentLotCard
            lot={activeLot}
            isHost={isHost}
            queuedLots={queuedLots}
            busy={busy}
            timerSeconds={timerSeconds}
            franchises={tournament?.franchises || []}
            auctionMode={tournament?.auctionMode || 'remote'}
            currency={tournament?.currency || 'INR'}
            canUndo={undoAvailable}
            onActivate={onActivate}
            onHammer={onHammer}
            onPass={onPass}
            onDeactivate={onDeactivate}
            onPause={onPause}
            onResume={onResume}
            onUndo={onUndo}
            onRaisePaddle={onRaisePaddle}
            onPlaceBid={onPlaceBid}
          />
          {/* PaddlesRail — franchise bidding interface */}
          <PaddlesRail
            franchises={tournament?.franchises || []}
            activeLot={activeLot}
            auctionMode={tournament?.auctionMode || 'remote'}
            onPaddleClick={(franchise, amount) => {
              // v1: raise paddle triggers a real bid in remote mode,
              // or shows a hint in physical mode (host-only control).
              if (isHost || (tournament?.auctionMode === 'physical')) {
                toast.info(
                  `${franchise.name} is actively bidding. The auctioneer will call the hammer.`,
                )
              } else {
                // In remote mode: franchise owner raises paddle
                onRaisePaddle(franchise.id, amount)
              }
            }}
          />
          {isHost && (
            <PlayerQueuePanel
              lots={lotsQuery.data || []}
              onSelectLot={onActivate}
              busy={busy}
            />
          )}
        </div>
        <aside className="auction-room-right" aria-label="Auction event feed">
          <TeamBudgetSidebar
            franchises={tournament?.franchises || []}
            activeLot={activeLot}
            currency={tournament?.currency || 'INR'}
          />
          <BidFeed items={feed} currency={tournament?.currency || 'INR'} />
        </aside>
      </motion.section>

      <EndAuctionModal
        open={endOpen}
        tournament={tournament}
        busy={endBusy}
        errorMessage={endError}
        onConfirm={onEndAuction}
        onCancel={() => !endBusy && setEndOpen(false)}
      />
    </main>
  )
}

function RoomSkeleton() {
  return (
    <div className="auction-room-skeleton">
      <div className="skel" style={{ height: 56, borderRadius: 14 }} />
      <div className="skel" style={{ height: 220, borderRadius: 18 }} />
      <div className="skel" style={{ height: 120, borderRadius: 18 }} />
    </div>
  )
}

function AuctioneerDesk({
  tournament,
  activeLot,
  queuedCount,
  undoAvailable,
  connected,
}) {
  const auctionMode = tournament?.auctionMode || 'remote'
  const isPhysical = auctionMode === 'physical'
  const lotState = activeLot
    ? activeLot.auctionStatus === 'paused'
      ? 'Paused'
      : 'Live on floor'
    : 'No live lot'

  const guidance = activeLot
    ? isPhysical
      ? 'Call each floor bid, then record the leading franchise from this desk before you hammer or pass.'
      : 'Franchise owners can bid directly, while you stay in control of pause, undo, skip, and hammer.'
    : isPhysical
      ? 'Bring the next player to the floor when the room is ready and run the bidding from this control desk.'
      : 'Open the next lot when you are ready. Franchise owners will handle paddle raises from their own devices.'

  return (
    <section className="auctioneer-desk" aria-label="Auctioneer desk">
      <div className="auctioneer-desk-head">
        <div>
          <span className="auctioneer-desk-eyebrow">Auctioneer Desk</span>
          <h2 className="auctioneer-desk-title">
            {isPhysical ? 'Physical room control' : 'Remote room control'}
          </h2>
        </div>
        <div className="auctioneer-desk-pills">
          <span className={`auctioneer-desk-pill ${isPhysical ? 'is-physical' : 'is-remote'}`}>
            {isPhysical ? 'Physical auction' : 'Remote auction'}
          </span>
          <span className={`auctioneer-desk-pill ${connected ? 'is-online' : 'is-offline'}`}>
            {connected ? 'Room synced' : 'Reconnecting'}
          </span>
        </div>
      </div>

      <div className="auctioneer-desk-grid">
        <div className="auctioneer-desk-card">
          <span className="auctioneer-desk-label">Bid entry</span>
          <strong>{isPhysical ? 'Auctioneer controlled' : 'Franchise self-bidding'}</strong>
          <p>
            {isPhysical
              ? 'Only you should record bids, winners, pauses, and skips during the live floor auction.'
              : 'Teams can raise bids live, but final auction flow stays with the auctioneer.'}
          </p>
        </div>
        <div className="auctioneer-desk-card">
          <span className="auctioneer-desk-label">Current lot</span>
          <strong>{activeLot?.name || 'Waiting for next lot'}</strong>
          <p>{lotState}</p>
        </div>
        <div className="auctioneer-desk-card">
          <span className="auctioneer-desk-label">Queue & recovery</span>
          <strong>{queuedCount} queued · {undoAvailable ? 'Undo ready' : 'Undo clear'}</strong>
          <p>{guidance}</p>
        </div>
      </div>
    </section>
  )
}
