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
