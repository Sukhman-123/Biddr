import api from '../../lib/api'

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

export async function createTournamentRequest(payload) {
  try {
    const { data } = await api.post('/tournaments', payload)
    return data?.tournament ?? null
  } catch (error) {
    throw wrapError(error, 'Could not create the tournament')
  }
}

export async function updateTournamentRequest(id, patch) {
  try {
    const { data } = await api.patch(`/tournaments/${id}`, patch)
    return data?.tournament ?? null
  } catch (error) {
    throw wrapError(error, 'Could not update the tournament')
  }
}

export async function listInvitesRequest(id) {
  try {
    const { data } = await api.get(`/tournaments/${id}/invites`)
    return Array.isArray(data?.invites) ? data.invites : []
  } catch (error) {
    throw wrapError(error, 'Could not load invites')
  }
}

export async function createInviteRequest(id, email) {
  try {
    const { data } = await api.post(`/tournaments/${id}/invites`, { email })
    return { invite: data?.invite ?? null, alreadyInvited: Boolean(data?.alreadyInvited) }
  } catch (error) {
    throw wrapError(error, 'Could not send the invite')
  }
}

export async function revokeInviteRequest(id, inviteId) {
  try {
    const { data } = await api.delete(`/tournaments/${id}/invites/${inviteId}`)
    return Boolean(data?.revoked)
  } catch (error) {
    throw wrapError(error, 'Could not revoke the invite')
  }
}
