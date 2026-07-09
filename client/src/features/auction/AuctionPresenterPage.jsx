import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CircleDot, Clock3, Gavel, Trophy, Users, Wallet, Wifi, WifiOff } from 'lucide-react'
import { useSocket } from '../../lib/socket'
import { fetchRoomSnapshotRequest } from './auctionRoom.api'
import { formatPurse } from '../tournaments/tournament.utils'
import './AuctionPresenterPage.css'

export default function AuctionPresenterPage() {
  const { id: tournamentId } = useParams()
  const queryClient = useQueryClient()
  const { socket, connected } = useSocket()
  const reduceMotion = useReducedMotion()
  const [activeLot, setActiveLot] = useState(null)
  const [feed, setFeed] = useState([])
  const [timerSeconds, setTimerSeconds] = useState(0)

  const snapshotQuery = useQuery({
    queryKey: ['auction-room', tournamentId, 'presenter'],
    queryFn: () => fetchRoomSnapshotRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  useEffect(() => {
    if (!snapshotQuery.data) return
    setActiveLot(snapshotQuery.data.activeLot)
    setFeed(mapRecentBidsToFeed(snapshotQuery.data.recentBids, snapshotQuery.data.activeLot))
  }, [snapshotQuery.data])

  useEffect(() => {
    if (!activeLot?.currentBidAt) {
      setTimerSeconds(0)
      return
    }

    const started = new Date(activeLot.currentBidAt).getTime()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setTimerSeconds(Math.max(0, 60 - elapsed))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeLot?.currentBidAt])

  useEffect(() => {
    if (!socket || !tournamentId) return

    const joinRoom = () => {
      socket.emit('room:join', { tournamentId })
    }

    if (connected) joinRoom()

    const onLotActivated = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      setFeed((current) =>
        [
          {
            id: `activated-${lot.id}-${at}`,
            type: 'activated',
            actor: by?.fullName || 'Auctioneer',
            lotName: lot.name,
            at,
          },
          ...current,
        ].slice(0, 12),
      )
    }

    const onBidPlaced = ({ lot, franchise, amount, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      setFeed((current) =>
        [
          {
            id: `bid-${lot.id}-${at}`,
            type: 'bid',
            actor: by?.fullName || franchise?.name || 'Bidder',
            franchiseName: franchise?.name,
            lotName: lot.name,
            amount,
            at,
          },
          ...current,
        ].slice(0, 12),
      )
    }

    const onLotHammered = ({ lot, franchise, amount, by, at }) => {
      setActiveLot(null)
      setFeed((current) =>
        [
          {
            id: `hammered-${lot?.id || 'lot'}-${at}`,
            type: 'hammered',
            actor: by?.fullName || franchise?.name || 'Auctioneer',
            franchiseName: franchise?.name,
            lotName: lot?.name,
            amount: amount ?? lot?.soldPrice ?? lot?.currentBid,
            at,
          },
          ...current,
        ].slice(0, 12),
      )
      queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId, 'presenter'] })
    }

    const onLotPassed = ({ lot, by, at }) => {
      setActiveLot(null)
      setFeed((current) =>
        [
          {
            id: `passed-${lot?.id || 'lot'}-${at}`,
            type: 'passed',
            actor: by?.fullName || 'Auctioneer',
            lotName: lot?.name,
            at,
          },
          ...current,
        ].slice(0, 12),
      )
    }

    const onAuctionPaused = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      setFeed((current) =>
        [
          { id: `paused-${at}`, type: 'paused', actor: by?.fullName || 'Auctioneer', at },
          ...current,
        ].slice(0, 12),
      )
    }

    const onAuctionResumed = ({ lot, by, at }) => {
      if (!lot) return
      setActiveLot(lot)
      setFeed((current) =>
        [
          { id: `resumed-${at}`, type: 'resumed', actor: by?.fullName || 'Auctioneer', at },
          ...current,
        ].slice(0, 12),
      )
    }

    const onLotUndone = ({ action, lot, at }) => {
      setActiveLot(lot && ['active', 'paused'].includes(lot.auctionStatus) ? lot : null)
      setFeed((current) =>
        [
          {
            id: `undone-${at}`,
            type: 'undone',
            actor: action?.by?.fullName || 'Auctioneer',
            action: action?.type,
            at,
          },
          ...current,
        ].slice(0, 12),
      )
      queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId, 'presenter'] })
    }

    const onLotDeactivated = ({ lot, at }) => {
      setActiveLot(null)
      setFeed((current) =>
        [
          { id: `deactivated-${lot?.id || 'lot'}-${at}`, type: 'deactivated', actor: 'Auctioneer', lotName: lot?.name, at },
          ...current,
        ].slice(0, 12),
      )
    }

    socket.on('connect', joinRoom)
    socket.on('lot:activated', onLotActivated)
    socket.on('bid:placed', onBidPlaced)
    socket.on('lot:hammered', onLotHammered)
    socket.on('lot:passed', onLotPassed)
    socket.on('auction:paused', onAuctionPaused)
    socket.on('auction:resumed', onAuctionResumed)
    socket.on('lot:undone', onLotUndone)
    socket.on('lot:deactivated', onLotDeactivated)

    return () => {
      socket.emit('room:leave', { tournamentId })
      socket.off('connect', joinRoom)
      socket.off('lot:activated', onLotActivated)
      socket.off('bid:placed', onBidPlaced)
      socket.off('lot:hammered', onLotHammered)
      socket.off('lot:passed', onLotPassed)
      socket.off('auction:paused', onAuctionPaused)
      socket.off('auction:resumed', onAuctionResumed)
      socket.off('lot:undone', onLotUndone)
      socket.off('lot:deactivated', onLotDeactivated)
    }
  }, [socket, connected, tournamentId, queryClient])

  const tournament = snapshotQuery.data?.tournament
  const currency = tournament?.currency || 'INR'
  const franchises = tournament?.franchises || []
  const leader = activeLot
    ? franchises.find((franchise) => franchise.id === activeLot.currentBidderFranchiseId)
    : null
  const sortedFranchises = useMemo(
    () =>
      [...franchises].sort((a, b) => {
        const aRemaining = (a?.wallet?.initial || 0) - (a?.wallet?.spent || 0)
        const bRemaining = (b?.wallet?.initial || 0) - (b?.wallet?.spent || 0)
        return bRemaining - aRemaining
      }),
    [franchises],
  )

  if (snapshotQuery.isLoading) {
    return (
      <main className="presenter-stage">
        <div className="presenter-loading">Loading presenter view</div>
      </main>
    )
  }

  if (snapshotQuery.isError) {
    return (
      <main className="presenter-stage">
        <div className="presenter-error">
          <h1>Could not open presenter view</h1>
          <Link to={`/tournaments/${tournamentId}`}>Back to lobby</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="presenter-stage">
      <header className="presenter-topbar">
        <Link to={`/tournaments/${tournamentId}`} className="presenter-back" aria-label="Back to lobby">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="presenter-code">{tournament?.shortCode ? `#${tournament.shortCode}` : 'Live auction'}</span>
          <h1>{tournament?.name || 'Auction Presenter'}</h1>
        </div>
        <div className={`presenter-live ${connected ? 'is-live' : 'is-offline'}`}>
          {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{connected ? 'Live' : 'Reconnecting'}</span>
        </div>
      </header>

      <motion.section
        className="presenter-main"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <section className="presenter-lot">
          {activeLot ? (
            <>
              <div className="presenter-player">
                <div className="presenter-photo">
                  {activeLot.photoUrl ? (
                    <img src={activeLot.photoUrl} alt="" />
                  ) : (
                    <span>{(activeLot.name || '?').slice(0, 1)}</span>
                  )}
                </div>
                <div className="presenter-player-copy">
                  <span className="presenter-status">
                    <CircleDot size={16} />
                    {activeLot.auctionStatus === 'paused' ? 'Paused on floor' : 'On the floor'}
                  </span>
                  <h2>{activeLot.name}</h2>
                  <p>
                    {activeLot.style} · {activeLot.country} · {activeLot.set}
                  </p>
                </div>
              </div>

              <div className="presenter-bid-board">
                <div className="presenter-bid-card is-current">
                  <span>Current bid</span>
                  <strong>{formatPurse(activeLot.currentBid || activeLot.basePrice, currency, { compact: true })}</strong>
                </div>
                <div className="presenter-bid-card">
                  <span>Base price</span>
                  <strong>{formatPurse(activeLot.basePrice, currency, { compact: true })}</strong>
                </div>
                <div className="presenter-bid-card">
                  <span>Increment</span>
                  <strong>
                    {activeLot.bidIncrement
                      ? formatPurse(activeLot.bidIncrement, currency, { compact: true })
                      : 'Set by host'}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="presenter-waiting">
              <Gavel size={52} />
              <h2>Waiting for the next player</h2>
              <p>The auctioneer will bring the next lot to the floor shortly.</p>
            </div>
          )}
        </section>

        <aside className="presenter-side">
          <div className="presenter-timer">
            <Clock3 size={24} />
            <span>{activeLot ? `${timerSeconds}s` : '--'}</span>
          </div>
          <div className="presenter-leader">
            <span className="presenter-panel-label">Leading team</span>
            {leader ? (
              <>
                <Trophy size={28} />
                <strong>{leader.name}</strong>
                <span>{formatPurse((leader.wallet?.initial || 0) - (leader.wallet?.spent || 0), currency, { compact: true })} left</span>
              </>
            ) : (
              <>
                <Trophy size={28} />
                <strong>Opening call</strong>
                <span>No leading bid yet</span>
              </>
            )}
          </div>
          <div className="presenter-feed">
            <span className="presenter-panel-label">Latest calls</span>
            {feed.length > 0 ? (
              feed.slice(0, 5).map((item) => (
                <div key={item.id} className={`presenter-feed-item is-${item.type}`}>
                  <strong>{item.franchiseName || item.actor}</strong>
                  <span>{describeFeedItem(item, currency)}</span>
                </div>
              ))
            ) : (
              <p>Waiting for the first call.</p>
            )}
          </div>
        </aside>
      </motion.section>

      <section className="presenter-teams" aria-label="Team budget strip">
        {sortedFranchises.map((franchise) => {
          const remaining = (franchise.wallet?.initial || 0) - (franchise.wallet?.spent || 0)
          const squadSize = franchise.squad?.playerIds?.length || 0
          const maxSquad = franchise.squad?.maxSize || 11
          const isLeading = activeLot?.currentBidderFranchiseId === franchise.id
          return (
            <article key={franchise.id} className={`presenter-team ${isLeading ? 'is-leading' : ''}`}>
              <span className="presenter-team-swatch" style={{ background: franchise.colorHex || '#f5b94a' }} />
              <strong>{franchise.name}</strong>
              <span>
                <Wallet size={14} />
                {formatPurse(remaining, currency, { compact: true })}
              </span>
              <span>
                <Users size={14} />
                {squadSize}/{maxSquad}
              </span>
            </article>
          )
        })}
      </section>
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
      franchiseName: bid.franchiseName,
      lotName: activeLot?.name || 'Current lot',
      amount: bid.amount,
      at: bid.at,
    }))
}

function describeFeedItem(item, currency) {
  if (item.type === 'bid') return `bid ${formatPurse(item.amount, currency, { compact: true })}`
  if (item.type === 'hammered') return `sold ${item.lotName || 'player'} for ${formatPurse(item.amount, currency, { compact: true })}`
  if (item.type === 'passed') return `passed ${item.lotName || 'player'}`
  if (item.type === 'activated') return `brought ${item.lotName || 'player'} to floor`
  if (item.type === 'paused') return 'paused the room'
  if (item.type === 'resumed') return 'resumed the room'
  if (item.type === 'undone') return `undid ${item.action || 'last action'}`
  if (item.type === 'deactivated') return `re-queued ${item.lotName || 'player'}`
  return item.lotName || 'Room update'
}
