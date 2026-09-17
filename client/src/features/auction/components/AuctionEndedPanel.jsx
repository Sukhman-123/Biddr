import { Link } from 'react-router-dom'
import { BarChart3, Trophy } from 'lucide-react'

const formatCompletedAt = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AuctionEndedPanel({ tournament }) {
  const completedAt = formatCompletedAt(tournament?.completedAt)

  return (
    <section className="auction-ended-panel" role="status" aria-live="polite">
      <span className="auction-ended-icon" aria-hidden="true">
        <Trophy size={32} />
      </span>
      <span className="auction-ended-eyebrow">Room closed</span>
      <h1>The auction has ended.</h1>
      <p>
        <strong>{tournament?.name || 'This tournament'}</strong> is now complete.
        Bidding and player-pool changes are locked.
      </p>
      {completedAt ? <span className="auction-ended-time">Completed {completedAt}</span> : null}
      <Link to={`/tournaments/${tournament?.id}/recap`} className="cta-btn auction-ended-action">
        <span className="cta-btn-content">
          <BarChart3 size={16} />
          View auction recap
        </span>
      </Link>
    </section>
  )
}
