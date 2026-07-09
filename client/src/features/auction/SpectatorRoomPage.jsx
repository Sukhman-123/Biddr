import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useSocket } from '../../lib/socket'
import { useAuth } from '../auth/useAuth'
import { fetchRoomSnapshotRequest } from './auctionRoom.api'
import CurrentLotCard from './components/CurrentLotCard'
import PaddlesRail from './components/PaddlesRail'
import TeamBudgetSidebar from './components/TeamBudgetSidebar'
import BidFeed from './components/BidFeed'
import './AuctionRoomPage.css'

export default function SpectatorRoomPage() {
  const { id: tournamentId } = useParams()
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()

  // Server-side snapshot — drives the initial render. After mount,
  // the socket is the source of truth and we patch state from broadcasts.
  const snapshotQuery = useQuery({
    queryKey: ['auction-room', tournamentId],
    queryFn: () => fetchRoomSnapshotRequest(tournamentId),
    enabled: Boolean(tournamentId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  // Local state for the spectator view
  const [activeLot, setActiveLot] = useState(null)
  const [feed, setFeed] = useState([])
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Seed local state from the snapshot whenever it loads.
  useEffect(() => {
    if (snapshotQuery.data) {
      setActiveLot(snapshotQuery.data.activeLot)
      setFeed(mapRecentBidsToFeed(snapshotQuery.data.recentBids, snapshotQuery.data.activeLot))
    }
  }, [snapshotQuery.data])

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

  // Socket connection and event handling
  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      console.log('[Spectator] Connected to room')
      socket.emit('room:join', { tournamentId })
    }

    if (connected) {
      handleConnect()
    }

    const handleDisconnect = () => {
      console.log('[Spectator] Disconnected from room')
    }

    const handleLotActivated = ({ lot, at }) => {
      setActiveLot(lot)
      setFeed((current) => [
        {
          id: `activated-${at}`,
          type: 'activated',
          actor: lot?.auctioneer?.fullName || 'Auctioneer',
          lotName: lot?.name,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleLotHammered = ({ lot, franchise, amount, by, at }) => {
      setActiveLot(null)
      setFeed((current) => [
        {
          id: `hammered-${at}`,
          type: 'hammered',
          actor: by?.fullName || franchise?.name || 'Auctioneer',
          lotName: lot?.name,
          amount: amount ?? lot?.soldPrice ?? lot?.currentBid,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleLotPassed = ({ lot, by, at }) => {
      setActiveLot(null)
      setFeed((current) => [
        {
          id: `passed-${at}`,
          type: 'passed',
          actor: by?.fullName || 'Auctioneer',
          lotName: lot?.name,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleBidPlaced = ({ lot, franchise, amount, by, at }) => {
      setActiveLot(lot)
      setFeed((current) => [
        {
          id: `${lot.id}-bid-${at}`,
          type: 'bid',
          actor: by?.fullName || franchise?.name || 'Bidder',
          lotName: lot?.name,
          franchiseName: franchise?.name,
          amount,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleAuctionPaused = ({ lot, by, at }) => {
      setActiveLot(lot)
      setFeed((current) => [
        {
          id: `paused-${at}`,
          type: 'paused',
          actor: by?.fullName || 'Auctioneer',
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleAuctionResumed = ({ lot, by, at }) => {
      setActiveLot(lot)
      setFeed((current) => [
        {
          id: `resumed-${at}`,
          type: 'resumed',
          actor: by?.fullName || 'Auctioneer',
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleLotUndone = ({ action, lot, at }) => {
      setActiveLot(
        lot && ['active', 'paused'].includes(lot.auctionStatus) ? lot : null,
      )
      setFeed((current) => [
        {
          id: `undone-${at}`,
          type: 'undone',
          actor: action.by?.fullName || 'Auctioneer',
          action: action.type,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleLotDeactivated = ({ lot, at }) => {
      setActiveLot(null)
      setFeed((current) => [
        {
          id: `deactivated-${at}`,
          type: 'deactivated',
          actor: 'Auctioneer',
          lotName: lot?.name,
          at,
        },
        ...current,
      ].slice(0, 30))
    }

    const handleSetupUpdated = ({ tournament: updatedTournament }) => {
      if (updatedTournament) {
        queryClient.setQueryData(['tournament', tournamentId], updatedTournament)
        queryClient.setQueryData(['auction-room', tournamentId], (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId] })
      queryClient.invalidateQueries({ queryKey: ['auction-room-probe', tournamentId] })
    }

    // Socket events
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('lot:activated', handleLotActivated)
    socket.on('lot:hammered', handleLotHammered)
    socket.on('lot:passed', handleLotPassed)
    socket.on('bid:placed', handleBidPlaced)
    socket.on('auction:paused', handleAuctionPaused)
    socket.on('auction:resumed', handleAuctionResumed)
    socket.on('lot:undone', handleLotUndone)
    socket.on('lot:deactivated', handleLotDeactivated)
    socket.on('auction:setup-updated', handleSetupUpdated)

    return () => {
      socket.emit('room:leave', { tournamentId })
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('lot:activated', handleLotActivated)
      socket.off('lot:hammered', handleLotHammered)
      socket.off('lot:passed', handleLotPassed)
      socket.off('bid:placed', handleBidPlaced)
      socket.off('auction:paused', handleAuctionPaused)
      socket.off('auction:resumed', handleAuctionResumed)
      socket.off('lot:undone', handleLotUndone)
      socket.off('lot:deactivated', handleLotDeactivated)
      socket.off('auction:setup-updated', handleSetupUpdated)
    }
  }, [socket, connected, tournamentId, queryClient])

  const tournament = snapshotQuery.data?.tournament

  return (
    <main className="auction-room-main">
      {/* Spectator header */}
      <motion.header
        className="auction-room-header"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          to={`/tournaments/${tournamentId}`}
          className="auction-room-back"
        >
          <ArrowLeft size={20} />
          <span>Back to lobby</span>
        </Link>
        <div className="auction-room-status">
          <span className={connected ? 'status-online' : 'status-offline'}>
            {connected ? 'Live' : 'Disconnected'}
          </span>
          <span className="spectator-badge">
            Viewing as spectator
          </span>
        </div>
        <h1 className="auction-room-title">
          {tournament?.name || 'Auction Room'}
        </h1>
      </motion.header>

      {/* Main content */}
      <motion.section
        className="auction-room-grid"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auction-room-left">
          {/* Current lot card - simplified for spectators */}
          <CurrentLotCard
            lot={activeLot}
            isHost={false}
            queuedLots={[]}
            busy={false}
            timerSeconds={timerSeconds}
            franchises={tournament?.franchises || []}
            auctionMode={tournament?.auctionMode || 'remote'}
            currency={tournament?.currency || 'INR'}
            onActivate={() => {}}
            onHammer={() => {}}
            onPass={() => {}}
            onDeactivate={() => {}}
            onPause={() => {}}
            onResume={() => {}}
            onUndo={() => {}}
            onRaisePaddle={() => {}}
            onPlaceBid={() => {}}
            currentUserId={user?.id}
          />
          {/* PaddlesRail for spectators to see who's bidding */}
          <PaddlesRail
            franchises={tournament?.franchises || []}
            activeLot={activeLot}
            auctionMode={tournament?.auctionMode || 'remote'}
            currentUserId={user?.id}
            isHost={false}
            currency={tournament?.currency || 'INR'}
            onPaddleClick={() => {}}
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
    </main>
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
