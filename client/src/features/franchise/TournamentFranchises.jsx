import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTournamentRequest } from '../tournaments/tournament.api'
import FranchiseMembers from './FranchiseMembers'
import './TournamentFranchises.css'

export default function TournamentFranchises({ tournamentId, isHost, currentUserId }) {
  const [expandedFranchise, setExpandedFranchise] = useState(null)

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournamentRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  if (isLoading) {
    return <div className="tournament-franchises-loading">Loading franchises...</div>
  }

  if (!tournament?.franchises?.length) {
    return null
  }

  return (
    <div className="tournament-franchises">
      <div className="tournament-franchises-header">
        <h3>Franchises</h3>
        <p>Manage team owners and members who can bid for each franchise</p>
      </div>

      <div className="tournament-franchises-list">
        {tournament.franchises.map((franchise) => (
          <div key={franchise.id} className="tournament-franchise-card">
            <button
              className="tournament-franchise-header"
              onClick={() => setExpandedFranchise(
                expandedFranchise === franchise.id ? null : franchise.id
              )}
              style={{ '--franchise-color': franchise.colorHex }}
            >
              <div className="tournament-franchise-badge">
                {franchise.name.charAt(0)}
              </div>
              <div className="tournament-franchise-info">
                <span className="tournament-franchise-name">{franchise.name}</span>
                <span className="tournament-franchise-meta">
                  {franchise.wallet?.remaining?.toLocaleString('en-IN') || 0} remaining
                  {franchise.members?.length ? ` · ${franchise.members.length} member${franchise.members.length !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
              <span className={`tournament-franchise-expand ${
                expandedFranchise === franchise.id ? 'is-expanded' : ''
              }`}>
                {expandedFranchise === franchise.id ? '▲' : '▼'}
              </span>
            </button>

            {expandedFranchise === franchise.id && (
              <div className="tournament-franchise-content">
                <FranchiseMembers
                  tournamentId={tournamentId}
                  franchise={franchise}
                  isTournamentHost={isHost}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
