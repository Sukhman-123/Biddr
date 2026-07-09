import { useCallback, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../../components/ToastProvider'
import {
  createLotRequest,
  deleteLotRequest,
  endAuctionRequest,
  getTournamentRequest,
  listLotsRequest,
  updateLotRequest,
  updateTournamentRequest,
} from '../tournaments/tournament.api'
import TopBar from './components/TopBar'
import AuctionSetupDesk from './components/AuctionSetupDesk'
import EndAuctionModal from '../tournaments/EndAuctionModal'
import './AuctionRoomPage.css'

const isHostFor = (tournament, user) =>
  Boolean(tournament?.ownerId && user?.id && tournament.ownerId === user.id)

export default function AuctionControlPage() {
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const toast = useToast()

  const tournamentQuery = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournamentRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  const lotsQuery = useQuery({
    queryKey: ['auction-room-lots', tournamentId],
    queryFn: () => listLotsRequest(tournamentId),
    enabled: Boolean(tournamentId),
  })

  const [endOpen, setEndOpen] = useState(false)
  const [endBusy, setEndBusy] = useState(false)
  const [endError, setEndError] = useState(null)
  const [busy, setBusy] = useState(false)

  const refreshRoomQueries = useCallback(
    async ({ includeTournament = false } = {}) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId] }),
      ]

      if (includeTournament) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
        )
      }

      await Promise.all(invalidations)
    },
    [queryClient, tournamentId],
  )

  const tournament = tournamentQuery.data
  const isHost = isHostFor(tournament, user)

  const withBusy = useCallback(async (work) => {
    setBusy(true)
    try {
      await work()
    } finally {
      setBusy(false)
    }
  }, [])

  const onSaveTournament = useCallback(async (patch) => {
    if (!isHost) return
    await withBusy(async () => {
      await updateTournamentRequest(tournamentId, patch)
      await refreshRoomQueries({ includeTournament: true })
      toast.success('Tournament settings updated')
    }).catch((err) => {
      toast.error(err.message)
    })
  }, [isHost, tournamentId, refreshRoomQueries, toast, withBusy])

  const onSaveFranchises = useCallback(async (patch) => {
    if (!isHost) return
    await withBusy(async () => {
      await updateTournamentRequest(tournamentId, patch)
      await refreshRoomQueries({ includeTournament: true })
      toast.success('Team setup updated')
    }).catch((err) => {
      toast.error(err.message)
    })
  }, [isHost, tournamentId, refreshRoomQueries, toast, withBusy])

  const onCreateLot = useCallback(async (payload) => {
    if (!isHost) return
    await withBusy(async () => {
      await createLotRequest(tournamentId, payload)
      await refreshRoomQueries()
      toast.success('Player added to the room pool')
    }).catch((err) => {
      toast.error(err.message)
    })
  }, [isHost, tournamentId, refreshRoomQueries, toast, withBusy])

  const onUpdateLot = useCallback(async (lotId, patch) => {
    if (!isHost) return
    await withBusy(async () => {
      await updateLotRequest(lotId, patch)
      await refreshRoomQueries({ includeTournament: true })
      toast.success('Player updated')
    }).catch((err) => {
      toast.error(err.message)
    })
  }, [isHost, refreshRoomQueries, toast, withBusy])

  const onDeleteLot = useCallback(async (lotId) => {
    if (!isHost) return
    await withBusy(async () => {
      await deleteLotRequest(lotId)
      await refreshRoomQueries({ includeTournament: true })
      toast.success('Player removed from the room pool')
    }).catch((err) => {
      toast.error(err.message)
    })
  }, [isHost, refreshRoomQueries, toast, withBusy])

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

  if (tournamentQuery.isLoading) {
    return (
      <main className="auction-room-main">
        <RoomSkeleton />
      </main>
    )
  }

  if (tournamentQuery.isError) {
    return (
      <main className="auction-room-main">
        <div className="auction-room-error">
          <h2>Could not open the admin setup room</h2>
          <p>{tournamentQuery.error?.message || 'Try again in a moment.'}</p>
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
        connected
        showConnection={false}
        onLeave={() => navigate(`/tournaments/${tournamentId}`)}
        auxActionLabel="Open auction floor"
        auxActionTone="gold"
        onAuxAction={() => navigate(`/tournaments/${tournamentId}/room`)}
        showEndAuction={isHost && tournament?.status === 'live'}
        endDisabled={endBusy}
        onEndAuction={() => {
          setEndError(null)
          setEndOpen(true)
        }}
      />

      {isHost ? (
        <AuctionSetupDesk
          tournamentId={tournamentId}
          tournament={tournament}
          lots={lotsQuery.data || []}
          isHost={isHost}
          currentUserId={user?.id}
          busy={busy || endBusy || lotsQuery.isLoading}
          onSaveTournament={onSaveTournament}
          onSaveFranchises={onSaveFranchises}
          onCreateLot={onCreateLot}
          onUpdateLot={onUpdateLot}
          onDeleteLot={onDeleteLot}
        />
      ) : (
        <div className="auction-room-error">
          <h2>Only the auctioneer can open this setup room</h2>
          <p>Use the auction floor for live bidding, and keep setup changes restricted to the host.</p>
        </div>
      )}

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
