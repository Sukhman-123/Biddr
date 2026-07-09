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

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const normalizeDate = (value) => (value ? new Date(value).toISOString() : null)

const normalizeTournamentSettings = (tournament) => ({
  name: (tournament?.name || '').trim(),
  region: (tournament?.region || '').trim(),
  currency: tournament?.currency || 'INR',
  pursePerFranchise: Number(tournament?.pursePerFranchise || 0),
  visibility: tournament?.visibility || 'public',
  auctionMode: tournament?.auctionMode || 'physical',
  startDate: normalizeDate(tournament?.startDate),
  endDate: normalizeDate(tournament?.endDate),
  settings: {
    minBidIncrement: Number(tournament?.settings?.minBidIncrement || 0),
    autoExtendSeconds: Number(tournament?.settings?.autoExtendSeconds || 0),
    maxSquadSize: Number(tournament?.settings?.maxSquadSize || 11),
    allowReAuction: Boolean(tournament?.settings?.allowReAuction),
  },
})

const normalizeTournamentPatch = (patch) => ({
  name: (patch?.name || '').trim(),
  region: (patch?.region || '').trim(),
  currency: patch?.currency || 'INR',
  pursePerFranchise: Number(patch?.pursePerFranchise || 0),
  visibility: patch?.visibility || 'public',
  auctionMode: patch?.auctionMode || 'physical',
  startDate: normalizeDate(patch?.startDate),
  endDate: normalizeDate(patch?.endDate),
  settings: {
    minBidIncrement: Number(patch?.settings?.minBidIncrement || 0),
    autoExtendSeconds: Number(patch?.settings?.autoExtendSeconds || 0),
    maxSquadSize: Number(patch?.settings?.maxSquadSize || 11),
    allowReAuction: Boolean(patch?.settings?.allowReAuction),
  },
})

const normalizeFranchiseList = (franchises = []) =>
  franchises
    .filter((franchise) => (franchise?.name || '').trim())
    .map((franchise) => ({
      id: String(franchise?.id || franchise?._id || ''),
      name: (franchise?.name || '').trim(),
      city: (franchise?.city || '').trim(),
      colorHex: franchise?.colorHex || '#f5b94a',
      wallet: {
        initial: Number(franchise?.wallet?.initial || 0),
        spent: Number(franchise?.wallet?.spent || 0),
      },
      squad: {
        maxSize: Number(franchise?.squad?.maxSize || 11),
        playerIds: (franchise?.squad?.playerIds || []).map(String),
      },
    }))

const normalizeLot = (lot) => ({
  name: (lot?.name || '').trim(),
  style: lot?.style || 'Batsman',
  country: (lot?.country || '').trim(),
  basePrice: Number(lot?.basePrice || 0),
  photoUrl: lot?.photoUrl || '',
  set: lot?.set || 'Squad',
  bidIncrement: lot?.bidIncrement == null || lot?.bidIncrement === '' ? null : Number(lot.bidIncrement),
  status: lot?.status || 'queued',
  soldToFranchiseId: lot?.soldToFranchiseId || null,
  soldPrice: lot?.soldPrice == null || lot?.soldPrice === '' ? null : Number(lot.soldPrice),
})

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
    async ({ includeTournament = false, updatedTournament = null } = {}) => {
      if (updatedTournament) {
        queryClient.setQueryData(['tournament', tournamentId], updatedTournament)
        queryClient.setQueriesData({ queryKey: ['auction-room', tournamentId] }, (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
        queryClient.setQueryData(['auction-room-probe', tournamentId], (current) =>
          current ? { ...current, tournament: updatedTournament } : current,
        )
      }

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['auction-room-lots', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-lots', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['auction-room-probe', tournamentId] }),
      ]

      if (includeTournament) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
          queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
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
    if (!isHost) return false
    if (sameValue(normalizeTournamentSettings(tournament), normalizeTournamentPatch(patch))) {
      toast.info('No changes to update')
      return false
    }
    try {
      await withBusy(async () => {
        const updatedTournament = await updateTournamentRequest(tournamentId, patch)
        await refreshRoomQueries({ includeTournament: true, updatedTournament })
        toast.success('Tournament settings updated')
      })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
  }, [isHost, tournament, tournamentId, refreshRoomQueries, toast, withBusy])

  const onSaveFranchises = useCallback(async (patch) => {
    if (!isHost) return false
    if (sameValue(normalizeFranchiseList(tournament?.franchises || []), normalizeFranchiseList(patch?.franchises || []))) {
      toast.info('No changes to update')
      return false
    }
    try {
      await withBusy(async () => {
        const updatedTournament = await updateTournamentRequest(tournamentId, patch)
        await refreshRoomQueries({ includeTournament: true, updatedTournament })
        toast.success('Team setup updated')
      })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
  }, [isHost, tournament?.franchises, tournamentId, refreshRoomQueries, toast, withBusy])

  const onCreateLot = useCallback(async (payload) => {
    if (!isHost) return false
    try {
      await withBusy(async () => {
        await createLotRequest(tournamentId, payload)
        await refreshRoomQueries()
        toast.success('Player added to the room pool')
      })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
  }, [isHost, tournamentId, refreshRoomQueries, toast, withBusy])

  const onUpdateLot = useCallback(async (lotId, patch) => {
    if (!isHost) return false
    const currentLot = (lotsQuery.data || []).find((lot) => lot.id === lotId)
    if (currentLot && sameValue(normalizeLot(currentLot), normalizeLot(patch))) {
      toast.info('No changes to update')
      return false
    }
    try {
      await withBusy(async () => {
        await updateLotRequest(lotId, patch)
        await refreshRoomQueries({ includeTournament: true })
        toast.success('Player updated')
      })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
  }, [isHost, lotsQuery.data, refreshRoomQueries, toast, withBusy])

  const onDeleteLot = useCallback(async (lotId) => {
    if (!isHost) return false
    try {
      await withBusy(async () => {
        await deleteLotRequest(lotId)
        await refreshRoomQueries({ includeTournament: true })
        toast.success('Player removed from the room pool')
      })
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    }
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
