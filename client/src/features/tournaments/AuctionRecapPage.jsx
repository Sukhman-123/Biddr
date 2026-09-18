import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Crown,
  Download,
  FileSpreadsheet,
  Gavel,
  Medal,
  Shield,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '../../components/ToastProvider'
import PlayerImage from '../../components/PlayerImage'
import {
  downloadTournamentExportRequest,
  getAuctionRecapRequest,
} from './tournament.api'
import { formatPurse } from './tournament.utils'
import './AuctionRecapPage.css'

const EXPORTS = [
  { id: 'summary', label: 'Summary' },
  { id: 'squads', label: 'Final squads' },
  { id: 'players', label: 'Player results' },
  { id: 'bid-history', label: 'Bid history' },
]

const formatCompletedAt = (value) => {
  if (!value) return 'Auction completed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Auction completed'
  return `Completed ${date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function AuctionRecapPage() {
  const { id } = useParams()
  const toast = useToast()
  const [downloading, setDownloading] = useState('')
  const recapQuery = useQuery({
    queryKey: ['auction-recap', id],
    queryFn: () => getAuctionRecapRequest(id),
    enabled: Boolean(id),
  })

  const handleDownload = async (kind) => {
    if (downloading) return
    setDownloading(kind)
    try {
      await downloadTournamentExportRequest(id, kind)
      toast.success('CSV downloaded')
    } catch (error) {
      toast.error(error.message || 'Could not download CSV')
    } finally {
      setDownloading('')
    }
  }

  if (recapQuery.isLoading) return <RecapSkeleton />

  if (recapQuery.isError || !recapQuery.data) {
    return (
      <main className="recap-main">
        <Link to={`/tournaments/${id}`} className="recap-back">
          <ArrowLeft size={15} /> Back to tournament
        </Link>
        <section className="recap-error">
          <Trophy size={34} />
          <h1>Recap unavailable</h1>
          <p>{recapQuery.error?.message || 'The auction recap could not be loaded.'}</p>
        </section>
      </main>
    )
  }

  return (
    <AuctionRecapContent
      recap={recapQuery.data}
      downloading={downloading}
      onDownload={handleDownload}
    />
  )
}

export function AuctionRecapContent({ recap, downloading = '', onDownload }) {
  const { tournament, summary, highestSale, mostContested } = recap
  const currency = tournament.currency || 'INR'

  return (
    <main className="recap-main">
      <Link to={`/tournaments/${tournament.id}`} className="recap-back">
        <ArrowLeft size={15} /> Back to tournament
      </Link>

      <section className="recap-hero">
        <div className="recap-hero-copy">
          <span className="recap-eyebrow"><Trophy size={15} /> Auction recap</span>
          <h1>{tournament.name}</h1>
          <p>Final results, squads, purses, and bidding highlights from the completed auction.</p>
          <span className="recap-completed">{formatCompletedAt(tournament.completedAt)}</span>
        </div>
        <div className="recap-hero-mark" aria-hidden="true">
          <Crown size={54} />
          <strong>{tournament.shortCode}</strong>
        </div>
      </section>

      <section className="recap-stats" aria-label="Auction summary">
        <RecapStat
          icon={Users}
          label="Players sold"
          value={`${summary.soldCount}/${summary.totalPlayers}`}
          detail={`${summary.unsoldCount} unsold`}
        />
        <RecapStat
          icon={Wallet}
          label="Total spent"
          value={formatPurse(summary.totalSpend, currency, { compact: true })}
          detail={`Across ${summary.franchiseCount} teams`}
        />
        <RecapStat
          icon={Medal}
          label="Highest sale"
          value={highestSale ? formatPurse(highestSale.soldPrice, currency, { compact: true }) : '—'}
          detail={highestSale?.name || 'No players sold'}
        />
        <RecapStat
          icon={Gavel}
          label="Most contested"
          value={mostContested ? `${mostContested.bidCount} bids` : '—'}
          detail={mostContested?.name || 'No bids recorded'}
        />
      </section>

      <section className="recap-section">
        <SectionHeading
          icon={Trophy}
          title="Winners and sold prices"
          meta={`${recap.winners.length} player${recap.winners.length === 1 ? '' : 's'} sold`}
        />
        {recap.winners.length > 0 ? (
          <div className="recap-winners-table-wrap">
            <table className="recap-winners-table">
              <thead>
                <tr><th>Player</th><th>Role</th><th>Winner</th><th>Sold price</th><th>Bids</th></tr>
              </thead>
              <tbody>
                {recap.winners.map((player) => (
                  <tr key={player.id}>
                    <td><PlayerIdentity player={player} /></td>
                    <td><span className="recap-role">{player.style}</span></td>
                    <td>{player.winner?.name || 'Unassigned'}</td>
                    <td><strong>{formatPurse(player.soldPrice, currency)}</strong></td>
                    <td>{player.bidCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyRecap message="No players were sold in this auction." />}
      </section>

      <section className="recap-section">
        <SectionHeading
          icon={Shield}
          title="Final squads and purses"
          meta={`${recap.squads.length} team${recap.squads.length === 1 ? '' : 's'}`}
        />
        <div className="recap-squad-grid">
          {recap.squads.map((squad) => (
            <article className="recap-squad" key={squad.id}>
              <header>
                <span className="recap-team-color" style={{ background: squad.colorHex }} />
                <div><h3>{squad.name}</h3><p>{squad.city || 'Franchise'}</p></div>
                <span>{squad.players.length}/{squad.maxSquadSize}</span>
              </header>
              <div className="recap-purse-row">
                <div><span>Spent</span><strong>{formatPurse(squad.wallet.spent, currency, { compact: true })}</strong></div>
                <div><span>Remaining</span><strong>{formatPurse(squad.wallet.remaining, currency, { compact: true })}</strong></div>
              </div>
              {squad.players.length > 0 ? (
                <ul className="recap-squad-players">
                  {squad.players.map((player) => (
                    <li key={player.id}>
                      <span><strong>{player.name}</strong><small>{player.style}</small></span>
                      <b>{formatPurse(player.soldPrice, currency, { compact: true })}</b>
                    </li>
                  ))}
                </ul>
              ) : <p className="recap-no-players">No players bought</p>}
            </article>
          ))}
        </div>
      </section>

      <div className="recap-lower-grid">
        <section className="recap-section recap-highlight-section">
          <SectionHeading icon={Gavel} title="Auction highlights" />
          <div className="recap-highlight-list">
            <HighlightCard
              title="Highest sale"
              player={highestSale}
              value={highestSale ? formatPurse(highestSale.soldPrice, currency) : 'No sale'}
              detail={highestSale?.winner ? `Won by ${highestSale.winner.name}` : highestSale ? 'Sold without a team assignment' : 'No players sold'}
            />
            <HighlightCard
              title="Most contested player"
              player={mostContested}
              value={mostContested ? `${mostContested.bidCount} bids` : 'No bids'}
              detail={mostContested ? `${mostContested.uniqueBidders} teams joined the bidding` : 'No bidding history recorded'}
            />
          </div>
        </section>

        <section className="recap-section">
          <SectionHeading
            icon={Users}
            title="Unsold players"
            meta={`${recap.unsoldPlayers.length}`}
          />
          {recap.unsoldPlayers.length > 0 ? (
            <ul className="recap-unsold-list">
              {recap.unsoldPlayers.map((player) => (
                <li key={player.id}>
                  <PlayerIdentity player={player} />
                  <span>{formatPurse(player.basePrice, currency)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyRecap message="Every resolved player was sold." />}
          {recap.unresolvedPlayers?.length > 0 ? (
            <p className="recap-unresolved">
              {recap.unresolvedPlayers.length} player{recap.unresolvedPlayers.length === 1 ? ' was' : 's were'} still in the queue when the auction ended.
            </p>
          ) : null}
        </section>
      </div>

      {recap.canExport ? (
        <section className="recap-section recap-exports">
          <SectionHeading icon={FileSpreadsheet} title="Download CSV reports" meta="Host access" />
          <div className="recap-export-grid">
            {EXPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onDownload?.(item.id)}
                disabled={Boolean(downloading)}
                className={clsx({ 'is-busy': downloading === item.id })}
              >
                <Download size={16} />
                <span>{downloading === item.id ? 'Preparing…' : item.label}</span>
                <small>CSV</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function RecapStat({ icon: Icon, label, value, detail }) {
  return <article><Icon size={18} /><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function SectionHeading({ icon: Icon, title, meta }) {
  return <header className="recap-section-heading"><h2><Icon size={18} />{title}</h2>{meta ? <span>{meta}</span> : null}</header>
}

function PlayerIdentity({ player }) {
  return (
    <span className="recap-player">
      <PlayerImage src={player.photoUrl} name={player.name} />
      <span><strong>{player.name}</strong><small>{player.country}</small></span>
    </span>
  )
}

function HighlightCard({ title, player, value, detail }) {
  return (
    <article className="recap-highlight">
      <span>{title}</span>
      <h3>{player?.name || 'No player'}</h3>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function EmptyRecap({ message }) {
  return <div className="recap-empty"><Trophy size={22} /><p>{message}</p></div>
}

function RecapSkeleton() {
  return <main className="recap-main" aria-label="Loading auction recap"><div className="recap-skeleton is-hero" /><div className="recap-skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="recap-skeleton" key={item} />)}</div></main>
}

export default AuctionRecapPage
