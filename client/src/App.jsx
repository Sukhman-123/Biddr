import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import './App.css'

const API_URL = 'http://127.0.0.1:5001'

const player = {
  name: 'Arjun Mehta',
  role: 'All-rounder',
  batting: 'Right hand bat',
  bowling: 'Right arm pace',
  basePrice: 50,
}

const teams = ['Mumbai Mavericks', 'Chennai Kings', 'Delhi Dynamos', 'Kolkata Knights']

function App() {
  const [apiStatus, setApiStatus] = useState('checking')
  const [socketStatus, setSocketStatus] = useState('connecting')
  const [currentBid, setCurrentBid] = useState(player.basePrice)
  const [selectedTeam, setSelectedTeam] = useState(teams[0])
  const [bidLog, setBidLog] = useState([])
  const socketRef = useRef(null)

  const nextBid = useMemo(() => currentBid + 10, [currentBid])

  useEffect(() => {
    axios
      .get(`${API_URL}/api/health`)
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'))
  }, [])

  useEffect(() => {
    const socketClient = io(API_URL)

    socketClient.on('connect', () => {
      setSocketStatus('online')
    })

    socketClient.on('disconnect', () => {
      setSocketStatus('offline')
    })

    socketClient.on('auction:connected', (payload) => {
      setBidLog((logs) => [
        {
          team: 'System',
          amount: 0,
          time: new Date().toLocaleTimeString(),
          note: payload.message,
        },
        ...logs,
      ])
    })

    socketClient.on('bid:placed', (bid) => {
      setCurrentBid(bid.amount)
      setBidLog((logs) => [
        {
          team: bid.team,
          amount: bid.amount,
          time: new Date(bid.placedAt).toLocaleTimeString(),
        },
        ...logs,
      ])
    })

    socketRef.current = socketClient

    return () => {
      socketClient.disconnect()
      socketRef.current = null
    }
  }, [])

  const placeBid = () => {
    const bid = {
      player: player.name,
      team: selectedTeam,
      amount: nextBid,
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('bid:place', bid)
      return
    }

    setCurrentBid(bid.amount)
    setBidLog((logs) => [
      {
        team: bid.team,
        amount: bid.amount,
        time: new Date().toLocaleTimeString(),
        note: 'Local bid, socket offline',
      },
      ...logs,
    ])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Biddr Live Auction</p>
          <h1>Cricket auction room</h1>
        </div>
        <div className="status-row" aria-label="System status">
          <span className={`status-dot ${apiStatus}`}></span>
          API {apiStatus}
          <span className={`status-dot ${socketStatus}`}></span>
          Socket {socketStatus}
        </div>
      </header>

      <section className="auction-grid">
        <div className="player-panel">
          <div className="player-photo" aria-hidden="true">
            AM
          </div>
          <div className="player-copy">
            <p className="eyebrow">Current player</p>
            <h2>{player.name}</h2>
            <div className="tags">
              <span>{player.role}</span>
              <span>{player.batting}</span>
              <span>{player.bowling}</span>
            </div>
          </div>
        </div>

        <div className="bid-panel">
          <p className="eyebrow">Highest bid</p>
          <div className="bid-amount">₹{currentBid}L</div>
          <p>Base price ₹{player.basePrice}L</p>
          <label htmlFor="team">Bidding team</label>
          <select
            id="team"
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team}>{team}</option>
            ))}
          </select>
          <button type="button" onClick={placeBid}>
            Bid ₹{nextBid}L
          </button>
        </div>
      </section>

      <section className="room-strip">
        {teams.map((team, index) => (
          <article key={team} className="team-tile">
            <span>Team {index + 1}</span>
            <strong>{team}</strong>
            <p>Budget ₹{120 - index * 8}Cr</p>
          </article>
        ))}
      </section>

      <section className="bid-log">
        <div className="section-head">
          <p className="eyebrow">Real-time feed</p>
          <h2>Bid log</h2>
        </div>
        {bidLog.length === 0 ? (
          <p className="empty-state">Waiting for the first bid.</p>
        ) : (
          <ul>
            {bidLog.map((log, index) => (
              <li key={`${log.team}-${log.time}-${index}`}>
                <div>
                  <strong>{log.team}</strong>
                  <span>{log.note || `placed ₹${log.amount}L`}</span>
                </div>
                <time>{log.time}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
