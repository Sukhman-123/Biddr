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

export async function fetchUserStatsRequest() {
  try {
    const { data } = await api.get('/users/me/stats')
    return {
      stats: data?.stats ?? {},
      achievements: data?.achievements ?? [],
      activity: data?.activity ?? [],
      hostedTournaments: data?.hostedTournaments ?? [],
    }
  } catch (error) {
    throw wrapError(error, 'Could not load your profile')
  }
}
