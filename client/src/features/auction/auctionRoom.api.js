import api from '../../lib/api'

// =============================================================
// Auction-room REST client.
//
// Each function returns the parsed body, or throws an Error whose
// `.message` is the server-supplied error string (with `cause`
// set to the original axios error for debugging). This matches
// the `wrapError` convention used by auth.api.js and
// tournament.api.js so the calling page can do:
//   try { await activateLotRequest(id, lotId) }
//   catch (err) { toast.error(err.message) }
// =============================================================

const extractError = (error, fallback) => {
  const message = error?.response?.data?.message
  return typeof message === 'string' && message.length > 0
    ? message
    : fallback
}

const wrapError = (error, fallback) => {
  const wrapped = new Error(extractError(error, fallback))
  wrapped.cause = error
  return wrapped
}

export async function fetchRoomSnapshotRequest(tournamentId) {
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/room`)
    return {
      tournament: data?.tournament ?? null,
      activeLot: data?.activeLot ?? null,
      recentBids: Array.isArray(data?.recentBids) ? data.recentBids : [],
    }
  } catch (error) {
    throw wrapError(error, 'Could not load the auction room')
  }
}

export async function listTournamentLotsRequest(tournamentId) {
  try {
    const { data } = await api.get(`/tournaments/${tournamentId}/lots`)
    return Array.isArray(data?.lots) ? data.lots : []
  } catch (error) {
    throw wrapError(error, 'Could not load the auction pool')
  }
}

export async function activateLotRequest(tournamentId, lotId) {
  try {
    const { data } = await api.post(
      `/tournaments/${tournamentId}/lots/${lotId}/activate`,
    )
    return data?.lot ?? null
  } catch (error) {
    throw wrapError(error, 'Could not activate the lot')
  }
}

export async function hammerLotRequest(lotId, { franchiseId } = {}) {
  try {
    const body = franchiseId ? { franchiseId } : {}
    const { data } = await api.post(`/lots/${lotId}/hammer`, body)
    return data?.lot ?? null
  } catch (error) {
    throw wrapError(error, 'Could not hammer the lot')
  }
}

export async function passLotRequest(lotId) {
  try {
    const { data } = await api.post(`/lots/${lotId}/pass`)
    return data?.lot ?? null
  } catch (error) {
    throw wrapError(error, 'Could not pass the lot')
  }
}