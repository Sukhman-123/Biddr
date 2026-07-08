import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
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
import { endAuctionRequest, updateLotRequest } from '../tournaments/tournament.api'
import { formatPurse } from '../tournaments/tournament.utils'
import TopBar from './components/TopBar'
import AuctioneerPanel from './components/AuctioneerPanel'
import CurrentLotCard from './components/CurrentLotCard'
import BidFeed from './components/BidFeed'
import TeamBudgetSidebar from './components/TeamBudgetSidebar'
import EndAuctionModal from '../tournaments/EndAuctionModal'
import './AuctionRoomPage.css'

const isHostFor = (tournament, user) =>
  Boolean(tournament?.ownerId && user?.id && tournament.ownerId === user.id)

export default function AuctionControlPage() {
  const { id: tournamentId, lotId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const toast = useToast()
  const { socket, connected } = useSocket()
  const reduceMotion = useReducedMotion()

  const snapshotQuery = useQuery({
    queryKey: ['auction-room', tournamentId, lotId],
    queryFn: () => fetchRoomSnapshotRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  const lotsQuery = useQuery({
    queryKey: ['auction-room-lots', tournamentId],
    queryFn: () => listTournamentLotsRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  const [activeLot, setActiveLot] = useState(null)
  const [feed, setFeed] = useState([])
  const joinedRef = useRef(false)
  const lastUndoLotIdRef = useRef(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [endBusy, setEndBusy] = useState(false)
  const [endError, setEndError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)

  useEffect(() => {
    if (snapshotQuery.data) {
      setActiveLot(snapshotQuery.data.activeLot)
      setUndoAvailable(Boolean(snapshotQuery.data.undoAvailable))
      lastUndoLotIdRef.current =
        snapshotQuery.data.lastUndoLotId ?? snapshotQuery.data.activeLot?.id ?? null
    }
  }, [snapshotQuery.data])

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
      toast.success(
        `${lot.name} sold${lot.soldPrice ? ` for ${formatPurse(lot.soldPrice, snapshotQuery.data?.tournament?.currency || 'INR')}` : ''}`,
      )
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
          { id: `paused-${at}`, type: 'paused', actor: by?.fullName || 'Auctioneer', at },
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
          { id: `resumed-${at}`, type: 'resumed', actor: by?.fullName || 'Auctioneer', at },
          ...current,
        ].slice(0, 30),
      )
      toast.info('Auction resumed')
    }

    const onLotUndone = ({ action, lot, at, undoAvailable: nextUndoAvailable }) => {
      setActiveLot(lot && ['active', 'paused'].includes(lot.auctionStatus) ? lot : null)
      setUndoAvailable(Boolean(nextUndoAvailable))
      lastUndoLotIdRef.current = lot?.id ?? action?.lotId ?? null
      setFeed((current) =>
        [
          { id: `undone-${at}`, type: 'undone', actor: action.by?.fullName || 'Auctioneer', action: action.type, at },
          ...current,
        ].slice(0, 30),
      )
      toast.info('Last action undone')
      queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
    }

    const onLotDeactivated = ({ at }) => {
      setActiveLot(null)
      setUndoAvailable(false)
      lastUndoLotIdRef.current = null
      setFeed((current) =>
        [{ id: `deactivated-${at}`, type: 'deactivated', actor: 'Auctioneer', at }, ...current].slice(0, 30),
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
  }, [socket, connected, tournamentId, toast, queryClient, snapshotQuery.data?.tournament?.currency])

  const tournament = snapshotQuery.data?.tournament
  const isHost = isHostFor(tournament, user)
  const queuedLots = useMemo(
    () => (lotsQuery.data || []).filter((l) => l.status === 'queued' && l.auctionStatus === 'idle'),
    [lotsQuery.data],
  )

  useEffect(() => {
    if (!activeLot?.currentBidAt) {
      setTimerSeconds(0)
      return
    }
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

  const onActivate = useCallback(async (pickLotId) => {
    if (!isHost) return
    setBusy(true)
    try {
      await activateLotRequest(tournamentId, pickLotId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, tournamentId, toast])

  const onSaveBidIncrement = useCallback(async (lotId, bidIncrement) => {
    if (!isHost) return false
    setBusy(true)
    try {
      await updateLotRequest(lotId, { bidIncrement })
      await queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] })
      toast.success('Bid increment saved')
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [isHost, queryClient, toast, tournamentId])

  const onHammer = useCallback(async (franchiseId) => {
    if (!isHost || !activeLot) return
    setBusy(true)
    try {
      await hammerLotRequest(activeLot.id, franchiseId ? { franchiseId } : {})
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [isHost, activeLot, toast])

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
          <h2>Could not open the auctioneer console</h2>
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
        auxActionLabel="Open auction floor"
        auxActionTone="gold"
        onAuxAction={() => navigate(`/tournaments/${tournamentId}/room`)}
        showEndAuction={isHost && tournament?.status === 'live'}
        endDisabled={Boolean(activeLot) || endBusy}
        endDisabledReason={activeLot ? 'Resolve the current lot before ending the auction' : undefined}
        onEndAuction={() => {
          setEndError(null)
          setEndOpen(true)
        }}
      />

      <AuctioneerPanel
        tournament={tournament}
        activeLot={activeLot}
        queuedLots={queuedLots}
        undoAvailable={undoAvailable}
        connected={connected}
        busy={busy || endBusy}
        recentEvents={feed}
        onActivateNext={onActivate}
        onPause={onPause}
        onResume={onResume}
        onUndo={onUndo}
        onDeactivate={onDeactivate}
        onOpenEndAuction={() => {
          setEndError(null)
          setEndOpen(true)
        }}
        onSaveBidIncrement={onSaveBidIncrement}
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
            onRaisePaddle={() => {}}
            onPlaceBid={onPlaceBid}
          />
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
      <div className="skel" style={{ height: 320, borderRadius: 18 }} />
      <div className="skel" style={{ height: 220, borderRadius: 18 }} />
    </div>
  )
}
