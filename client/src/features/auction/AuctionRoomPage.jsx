import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MonitorUp } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
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
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  // List of queued lots — used to populate the "Activate" picker
  // in HostControls when the room is empty.
  const lotsQuery = useQuery({
    queryKey: ['auction-room-lots', tournamentId],
    queryFn: () => listTournamentLotsRequest(tournamentId),
    enabled: Boolean(tournamentId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
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

  const refreshRoomQueries = useCallback(
    async ({ includeTournament = false, updatedTournament = null } = {}) => {
      if (updatedTournament) {
        queryClient.setQueryData(['tournament', tournamentId], updatedTournament)
        queryClient.setQueriesData({ queryKey: ['auction-room', tournamentId] }, (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
        queryClient.setQueryData(['auction-room-probe', tournamentId], (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
      }

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-lots', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId, lotId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room-probe', tournamentId] }),
      ]
      if (includeTournament) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
          queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
        )
      }
      await Promise.all(invalidations)
    },
    [queryClient, tournamentId, lotId],
  )

  // Seed local state from the snapshot whenever it loads.
  useEffect(() => {
    if (snapshotQuery.data) {
      setActiveLot(snapshotQuery.data.activeLot)
      setFeed(mapRecentBidsToFeed(snapshotQuery.data.recentBids, snapshotQuery.data.activeLot))
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
      refreshRoomQueries()
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
      toast.success(
        `${lot.name} sold${lot.soldPrice ? ` for ${formatPurse(lot.soldPrice, snapshotQuery.data?.tournament?.currency || 'INR')}` : ''}`,
      )
      refreshRoomQueries({ includeTournament: true })
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
      refreshRoomQueries()
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
      refreshRoomQueries({ includeTournament: true })
    }

    const onLotDeactivated = ({ at }) => {
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
      refreshRoomQueries()
    }

    const onSetupUpdated = ({ tournament: updatedTournament }) => {
      refreshRoomQueries({ includeTournament: true, updatedTournament })
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
    socket.on('auction:setup-updated', onSetupUpdated)

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
      socket.off('auction:setup-updated', onSetupUpdated)
      if (joinedRef.current) {
        socket.emit('room:leave', { tournamentId })
        joinedRef.current = false
      }
    }
  }, [socket, connected, tournamentId, toast, refreshRoomQueries, snapshotQuery.data?.tournament?.currency])

  const tournament = snapshotQuery.data?.tournament
  const isHost = isHostFor(tournament, user)

  useEffect(() => {
    if (!tournament || isHost || tournament.auctionMode !== 'physical') return
    navigate(`/tournaments/${tournamentId}/presenter`, { replace: true })
  }, [isHost, navigate, tournament, tournamentId])

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
      if (activeLot) {
        toast.info('Resolve the current lot before activating another player')
        return
      }
      setBusy(true)
      try {
        const lot = await activateLotRequest(tournamentId, pickLotId)
        if (lot) {
          setActiveLot(lot)
          lastUndoLotIdRef.current = lot.id
        }
        await refreshRoomQueries()
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    },
    [isHost, activeLot, tournamentId, toast, refreshRoomQueries],
  )
  const onHammer = useCallback(
    async (franchiseId) => {
      if (!isHost || !activeLot) return
      setBusy(true)
      try {
        const lot = await hammerLotRequest(activeLot.id, franchiseId ? { franchiseId } : {})
        if (lot) {
          setActiveLot(null)
          setUndoAvailable(true)
          lastUndoLotIdRef.current = lot.id
        }
        await refreshRoomQueries({ includeTournament: true })
      } catch (err) {
        toast.error(err.message)
      } finally {
        setBusy(false)
      }
    },
    [isHost, activeLot, toast, refreshRoomQueries],
  )
  const onPass = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      const lot = await passLotRequest(activeLot.id)
      if (lot) {
        setActiveLot(null)
        setUndoAvailable(true)
        lastUndoLotIdRef.current = lot.id
      }
      await refreshRoomQueries()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast, refreshRoomQueries])

  const onPause = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      const lot = await pauseLotRequest(activeLot.id)
      if (lot) {
        setActiveLot(lot)
        lastUndoLotIdRef.current = lot.id
      }
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
      const lot = await resumeLotRequest(activeLot.id)
      if (lot) {
        setActiveLot(lot)
        lastUndoLotIdRef.current = lot.id
      }
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
      const result = await undoLastActionRequest(targetLotId)
      const lot = result?.lot
      setActiveLot(lot && ['active', 'paused'].includes(lot.auctionStatus) ? lot : null)
      setUndoAvailable(Boolean(result?.undoAvailable))
      lastUndoLotIdRef.current = lot?.id ?? result?.action?.lotId ?? null
      await refreshRoomQueries({ includeTournament: true })
      toast.success('Action undone')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast, undoAvailable, refreshRoomQueries])

  const onDeactivate = useCallback(async () => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await deactivateLotRequest(activeLot.id)
      setActiveLot(null)
      setUndoAvailable(false)
      lastUndoLotIdRef.current = null
      await refreshRoomQueries()
      toast.success('Lot returned to queue')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast, refreshRoomQueries])

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
      const lot = await placeBidRequest(activeLot.id, { franchiseId, amount })
      if (lot) {
        setActiveLot(lot)
        setUndoAvailable(true)
        lastUndoLotIdRef.current = lot.id
      }
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
      const lot = await placeBidRequest(activeLot.id, { franchiseId, amount })
      if (lot) {
        setActiveLot(lot)
        setUndoAvailable(true)
        lastUndoLotIdRef.current = lot.id
      }
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
        auxActions={
          isHost
            ? [
                {
                  label: 'Open admin panel',
                  tone: 'gold',
                  onClick: () => window.open(`/tournaments/${tournamentId}/control-room`, '_blank', 'noopener,noreferrer'),
                },
                {
                  label: 'Presenter view',
                  tone: 'blue',
                  icon: <MonitorUp size={15} />,
                  onClick: () => window.open(`/tournaments/${tournamentId}/presenter`, '_blank', 'noopener,noreferrer'),
                },
              ]
            : undefined
        }
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
            currentUserId={user?.id}
          />
          {/* PaddlesRail — franchise bidding interface */}
          <PaddlesRail
            franchises={tournament?.franchises || []}
            activeLot={activeLot}
            auctionMode={tournament?.auctionMode || 'remote'}
            currentUserId={user?.id}
            isHost={isHost}
            currency={tournament?.currency || 'INR'}
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
              busy={busy || Boolean(activeLot)}
              currency={tournament?.currency || 'INR'}
            />
          )}
        </div>
        <aside className="auction-room-right" aria-label="Auction event feed">
          <TeamBudgetSidebar
            franchises={tournament?.franchises || []}
            activeLot={activeLot}
            lots={lotsQuery.data || []}
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

function mapRecentBidsToFeed(recentBids = [], activeLot = null) {
  if (!Array.isArray(recentBids)) return []
  return recentBids
    .slice()
    .reverse()
    .map((bid, index) => ({
      id: `${activeLot?.id || 'snapshot'}-bid-${bid.at || index}`,
      type: 'bid',
      actor: bid.userFullName || bid.franchiseName || 'Bidder',
      lotName: activeLot?.name || 'Current lot',
      franchiseName: bid.franchiseName,
      amount: bid.amount,
      at: bid.at,
    }))
}
