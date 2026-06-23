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

export async function registerRequest({ fullName, email, phone, password }) {
  try {
    const { data } = await api.post('/auth/register', {
      fullName,
      email,
      phone,
      password,
    })
    if (data?.token) tokenStorage.set(data.token)
    return data
  } catch (error) {
    throw wrapError(error, 'Unable to create your account')
  }
}

export async function loginRequest({ identifier, password }) {
  try {
    const { data } = await api.post('/auth/login', { identifier, password })
    if (data?.token) tokenStorage.set(data.token)
    return data
  } catch (error) {
    throw wrapError(error, 'Invalid email/phone or password')
  }
}

export async function googleLoginRequest(idToken) {
  try {
    const { data } = await api.post('/auth/google', { idToken })
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

export async function updateMeRequest(patch) {
  try {
    const { data } = await api.patch('/auth/me', patch)
    return data?.user ?? null
  } catch (error) {
    throw wrapError(error, 'Could not save your changes')
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
