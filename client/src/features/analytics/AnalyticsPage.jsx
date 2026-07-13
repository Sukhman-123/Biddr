import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Gavel,
  ListChecks,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '../../components/ToastProvider'
import {
  downloadTournamentExportRequest,
  getTournamentRequest,
  listLotsRequest,
  listTournamentsRequest,
} from '../tournaments/tournament.api'
import { formatPurse } from '../tournaments/tournament.utils'
import { useAuth } from '../auth/useAuth'
import './AnalyticsPage.css'

const EXPORTS = [
  {
    id: 'summary',
    title: 'Auction summary',
    description: 'Tournament totals, completion, spend, average sale, and highest sale.',
    icon: BarChart3,
  },
  {
    id: 'squads',
    title: 'Final squads',
    description: 'Every franchise with bought players, prices, purse, and squad size.',
    icon: Users,
  },
  {
    id: 'players',
    title: 'Player results',
    description: 'Complete lot list with status, winner, current bid, and sold price.',
    icon: ListChecks,
  },
  {
    id: 'bid-history',
    title: 'Bid history',
    description: 'Every recorded bid by player, team, amount, auctioneer, and time.',
    icon: Gavel,
  },
]

function AnalyticsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState('')
  const [downloading, setDownloading] = useState('')

  const tournamentsQuery = useQuery({
    queryKey: ['analytics', 'tournaments'],
    queryFn: () => listTournamentsRequest(),
  })

  const tournaments = tournamentsQuery.data ?? []

  useEffect(() => {
    if (!selectedId && tournaments.length > 0) {
      setSelectedId(tournaments[0].id)
    }
  }, [selectedId, tournaments])

  const tournamentQuery = useQuery({
    queryKey: ['analytics', 'tournament', selectedId],
    queryFn: () => getTournamentRequest(selectedId),
    enabled: Boolean(selectedId),
  })

  const lotsQuery = useQuery({
    queryKey: ['analytics', 'lots', selectedId],
    queryFn: () => listLotsRequest(selectedId),
    enabled: Boolean(selectedId),
  })

  const tournament = tournamentQuery.data
  const lots = lotsQuery.data ?? []
  const userId = user?.id || user?._id
  const canExport = Boolean(tournament && (!tournament.ownerId || tournament.ownerId === userId))

  const stats = useMemo(() => {
    const sold = lots.filter((lot) => lot.status === 'sold')
    const unsold = lots.filter((lot) => lot.status === 'unsold')
    const totalSpend = sold.reduce((sum, lot) => sum + Number(lot.soldPrice || 0), 0)
    const highestSale = sold.reduce((max, lot) => Math.max(max, Number(lot.soldPrice || 0)), 0)
    const completion = lots.length > 0 ? Math.round(((sold.length + unsold.length) / lots.length) * 100) : 0

    return {
      sold: sold.length,
      unsold: unsold.length,
      queued: lots.filter((lot) => lot.status === 'queued').length,
      total: lots.length,
      totalSpend,
      highestSale,
      completion,
    }
  }, [lots])

  const handleDownload = async (kind) => {
    if (!selectedId || !canExport) return
    setDownloading(kind)
    try {
      await downloadTournamentExportRequest(selectedId, kind)
      toast.success('Export downloaded')
    } catch (error) {
      toast.error(error?.message || 'Could not download export')
    } finally {
      setDownloading('')
    }
  }

  const loading = tournamentsQuery.isLoading || tournamentQuery.isLoading || lotsQuery.isLoading

  return (
    <main className="analytics-main">
      <section className="analytics-hero">
        <div>
          <p className="analytics-eyebrow">
            <FileSpreadsheet size={16} />
            Analytics · Export center
          </p>
          <h1>Download auction reports without touching the live room.</h1>
          <p>
            Export clean CSV files for post-auction review, team sharing, and
            spreadsheet analysis.
          </p>
        </div>

        <div className="analytics-selector">
          <label htmlFor="analytics-tournament">Tournament</label>
          <select
            id="analytics-tournament"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={tournamentsQuery.isLoading || tournaments.length === 0}
          >
            {tournaments.length === 0 ? (
              <option value="">No tournaments available</option>
            ) : null}
            {tournaments.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · {entry.shortCode}
              </option>
            ))}
          </select>
          {canExport ? (
            <span className="analytics-access is-ready">
              <ShieldCheck size={14} />
              Host export access
            </span>
          ) : (
            <span className="analytics-access">
              Reports are exportable by the tournament host only.
            </span>
          )}
        </div>
      </section>

      {tournamentsQuery.isError ? (
        <section className="analytics-empty">
          <Trophy size={30} />
          <h2>Could not load tournaments</h2>
          <p>{tournamentsQuery.error?.message || 'Please try again in a moment.'}</p>
        </section>
      ) : (
        <>
          <section className="analytics-snapshot" aria-busy={loading}>
            <SnapshotCard label="Players sold" value={stats.sold} detail={`${stats.total} total lots`} />
            <SnapshotCard label="Unsold" value={stats.unsold} detail={`${stats.queued} still queued`} />
            <SnapshotCard
              label="Total spend"
              value={formatPurse(stats.totalSpend, tournament?.currency || 'INR', { compact: true })}
              detail={`${stats.completion}% completed`}
            />
            <SnapshotCard
              label="Highest sale"
              value={formatPurse(stats.highestSale, tournament?.currency || 'INR', { compact: true })}
              detail={tournament?.status ? `${tournament.status} tournament` : 'Waiting for data'}
            />
          </section>

          <section className="analytics-export-grid">
            {EXPORTS.map((report) => {
              const Icon = report.icon
              const isBusy = downloading === report.id
              return (
                <article key={report.id} className="analytics-export-card">
                  <span className="analytics-export-icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h2>{report.title}</h2>
                    <p>{report.description}</p>
                  </div>
                  <button
                    type="button"
                    className={clsx('analytics-export-button', { 'is-busy': isBusy })}
                    onClick={() => handleDownload(report.id)}
                    disabled={!canExport || isBusy || loading || !selectedId}
                  >
                    <Download size={16} />
                    {isBusy ? 'Preparing...' : 'Download CSV'}
                  </button>
                </article>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}

function SnapshotCard({ label, value, detail }) {
  return (
    <article className="analytics-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

export default AnalyticsPage
