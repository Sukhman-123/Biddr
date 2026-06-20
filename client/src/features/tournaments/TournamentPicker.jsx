import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react'
import clsx from 'clsx'
import api from '../../lib/api'
import { formatDateRange, formatPurse } from './tournament.utils'
import './TournamentPicker.css'

const STEPS = [
  { id: 'tournament', label: 'Tournament' },
  { id: 'franchise', label: 'Franchise' },
  { id: 'review', label: 'Review' },
]

async function fetchTournaments() {
  const { data } = await api.get('/tournaments', {
    params: { status: 'upcoming' },
  })
  return data?.tournaments ?? []
}

async function fetchTournament(id) {
  if (!id) return null
  const { data } = await api.get(`/tournaments/${id}`)
  return data?.tournament ?? null
}

function TournamentPicker({ role, onChange, value, errors = {} }) {
  const needsFranchise = role === 'owner'
  const needsTournament = role === 'owner' || role === 'spectator'

  const [step, setStep] = useState(needsTournament ? 'tournament' : 'review')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tournaments', 'picker', 'upcoming'],
    queryFn: () => fetchTournaments(),
  })

  const { data: detail } = useQuery({
    queryKey: ['tournament', value?.tournamentId],
    queryFn: () => fetchTournament(value?.tournamentId),
    enabled: Boolean(value?.tournamentId),
  })

  const tournaments = useMemo(() => {
    const list = data ?? []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortCode.toLowerCase().includes(q),
    )
  }, [data, search])

  const openFranchises = useMemo(() => {
    if (!detail) return []
    return (detail.franchises || []).filter((f) => !f.taken)
  }, [detail])

  const handleSelectTournament = (tournament) => {
    onChange({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      franchiseId: null,
      franchiseName: null,
    })
    if (needsFranchise) setStep('franchise')
  }

  const handleSelectFranchise = (franchise) => {
    onChange({
      ...value,
      franchiseId: franchise.id,
      franchiseName: franchise.name,
    })
    setStep('review')
  }

  const handleBackToTournament = () => {
    onChange({ ...value, franchiseId: null, franchiseName: null })
    setStep('tournament')
  }

  if (role === 'auctioneer') {
    return (
      <div className="tournament-picker">
        <div className="tournament-picker-summary">
          <Sparkles size={18} />
          <div>
            <strong>Auctioneer signup</strong>
            <p>
              You'll be able to host tournaments and spin up auction rooms
              after you sign in. No franchise to claim.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!needsTournament) return null

  return (
    <div className="tournament-picker">
      <Stepper steps={STEPS} current={step} />

      {step === 'tournament' && (
        <div className="tournament-picker-step">
          <header className="tournament-picker-step-header">
            <div>
              <h3>Pick a tournament</h3>
              <p>
                {role === 'owner'
                  ? 'Choose a tournament whose franchise you want to manage.'
                  : 'Choose a tournament you want to spectate.'}
              </p>
            </div>
            <div className="tournament-picker-search">
              <Search size={14} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or code…"
                aria-label="Search tournaments"
              />
            </div>
          </header>

          {isLoading ? (
            <div className="tournament-picker-list">
              {[0, 1, 2].map((i) => (
                <div key={i} className="tournament-row tournament-row--skeleton">
                  <div className="skeleton-line w-40" />
                  <div className="skeleton-line w-60" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="tournament-picker-empty">
              <Trophy size={20} />
              <p>Couldn't load tournaments. Refresh the page to try again.</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="tournament-picker-empty">
              <Trophy size={20} />
              <p>No upcoming tournaments right now. Check back soon.</p>
            </div>
          ) : (
            <div className="tournament-picker-list">
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={clsx('tournament-row', {
                    selected: value?.tournamentId === t.id,
                  })}
                  onClick={() => handleSelectTournament(t)}
                >
                  <span className="tournament-row-glyph" aria-hidden="true">
                    <Trophy size={18} />
                  </span>
                  <span className="tournament-row-body">
                    <span className="tournament-row-title">
                      {t.name}
                      <span className="tournament-row-code">{t.shortCode}</span>
                    </span>
                    <span className="tournament-row-meta">
                      {formatDateRange(t.startDate, t.endDate)} ·{' '}
                      {t.franchiseCount} franchise
                      {t.franchiseCount === 1 ? '' : 's'} ·{' '}
                      {formatPurse(t.pursePerFranchise, t.currency, {
                        compact: true,
                      })}
                    </span>
                  </span>
                  <ArrowRight size={16} className="tournament-row-arrow" />
                </button>
              ))}
            </div>
          )}

          {errors.tournamentId ? (
            <p className="form-error" role="alert">
              {errors.tournamentId}
            </p>
          ) : null}
        </div>
      )}

      {step === 'franchise' && (
        <div className="tournament-picker-step">
          <header className="tournament-picker-step-header">
            <div>
              <h3>Claim an open franchise</h3>
              <p>
                In <strong>{value?.tournamentName}</strong>, pick the team
                you'll own.
              </p>
            </div>
            <button
              type="button"
              className="tournament-picker-back"
              onClick={handleBackToTournament}
            >
              <ChevronLeft size={14} />
              Change tournament
            </button>
          </header>

          {openFranchises.length === 0 ? (
            <div className="tournament-picker-empty">
              <Building2 size={20} />
              <p>
                All franchises in this tournament are claimed. Pick a different
                tournament.
              </p>
            </div>
          ) : (
            <div className="tournament-picker-list">
              {openFranchises.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={clsx('franchise-row franchise-row--picker', {
                    selected: value?.franchiseId === f.id,
                  })}
                  onClick={() => handleSelectFranchise(f)}
                >
                  <span
                    className="franchise-chip"
                    style={{ background: f.colorHex }}
                    aria-hidden="true"
                  />
                  <span className="tournament-row-body">
                    <span className="tournament-row-title">{f.name}</span>
                    <span className="tournament-row-meta">
                      {f.city || 'City TBA'}
                    </span>
                  </span>
                  <span className="franchise-pill">Open slot</span>
                </button>
              ))}
            </div>
          )}

          {errors.franchiseId ? (
            <p className="form-error" role="alert">
              {errors.franchiseId}
            </p>
          ) : null}
        </div>
      )}

      {step === 'review' && (
        <div className="tournament-picker-step">
          <div className="tournament-picker-summary tournament-picker-summary--review">
            <ShieldCheck size={18} />
            <div>
              <strong>Your tournament pick</strong>
              <ul>
                <li>
                  <Check size={14} /> Tournament: <em>{value?.tournamentName}</em>
                </li>
                {needsFranchise ? (
                  <li>
                    <Check size={14} /> Franchise: <em>{value?.franchiseName}</em>
                  </li>
                ) : null}
              </ul>
              <button
                type="button"
                className="tournament-picker-back"
                onClick={handleBackToTournament}
              >
                <ChevronLeft size={14} />
                Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ steps, current }) {
  const currentIndex = steps.findIndex((s) => s.id === current)
  return (
    <ol className="tournament-picker-stepper" aria-label="Tournament steps">
      {steps.map((s, index) => {
        const status =
          index < currentIndex
            ? 'done'
            : index === currentIndex
            ? 'active'
            : 'pending'
        return (
          <li key={s.id} className={clsx('step', `is-${status}`)}>
            <span className="step-dot">
              {status === 'done' ? <Check size={12} /> : index + 1}
            </span>
            <span className="step-label">{s.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default TournamentPicker
