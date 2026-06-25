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
} from './auctionRoom.api'
import { formatPurse } from '../tournaments/tournament.utils'
import TopBar from './components/TopBar'
import CurrentLotCard from './components/CurrentLotCard'
import HostControls from './components/HostControls'
import PaddlesRail from './components/PaddlesRail'
import BidFeed from './components/BidFeed'
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
  const userId = user?.id

  // Seed local state from the snapshot whenever it loads.
  useEffect(() => {
    if (snapshotQuery.data) {
      setActiveLot(snapshotQuery.data.activeLot)
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

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)
    socket.on('lot:activated', onLotActivated)
    socket.on('lot:hammered', onLotHammered)
    socket.on('lot:passed', onLotPassed)

    return () => {
      socket.off('connect', onConnect)
      socket.off('lot:activated', onLotActivated)
      socket.off('lot:hammered', onLotHammered)
      socket.off('lot:passed', onLotPassed)
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
            onActivate={onActivate}
            onHammer={onHammer}
            onPass={onPass}
          />
          <PaddlesRail
            franchises={tournament?.franchises || []}
            active={Boolean(activeLot)}
            onPaddleClick={(franchise) => {
              // v1: no bid placement yet. Show a friendly hint.
              toast.info(
                `Paddle raise for ${franchise.name} arrives in the next update. The auctioneer still calls the hammer.`,
              )
            }}
          />
        </div>
        <aside className="auction-room-right" aria-label="Auction event feed">
          <BidFeed items={feed} currency={tournament?.currency || 'INR'} />
        </aside>
      </motion.section>
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