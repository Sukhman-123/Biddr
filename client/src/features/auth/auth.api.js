import api, { tokenStorage } from '../../lib/api'

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

export async function registerRequest({ fullName, franchise, email, password, role }) {
  try {
    const { data } = await api.post('/auth/register', {
      fullName,
      franchise,
      email,
      password,
      role,
    })
    if (data?.token) tokenStorage.set(data.token)
    return data
  } catch (error) {
    throw wrapError(error, 'Unable to create your account')
  }
}

export async function loginRequest({ email, password }) {
  try {
    const { data } = await api.post('/auth/login', { email, password })
    if (data?.token) tokenStorage.set(data.token)
    return data
  } catch (error) {
    throw wrapError(error, 'Invalid email or password')
  }
}

export async function googleLoginRequest(idToken, role) {
  try {
    const { data } = await api.post('/auth/google', { idToken, role })
    if (data?.token) tokenStorage.set(data.token)
    return data
  } catch (error) {
    throw wrapError(error, 'Google sign-in failed')
  }
}

export async function fetchMeRequest() {
  try {
    const { data } = await api.get('/auth/me')
    return data?.user ?? null
  } catch (error) {
    tokenStorage.clear()
    throw wrapError(error, 'Session expired')
  }
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    /* logout is best-effort client-side; keep the cause for debugging */
    void error
  } finally {
    tokenStorage.clear()
  }
}
