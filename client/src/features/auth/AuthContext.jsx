import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
} from './auth.api'
import { tokenStorage } from '../../lib/api'
import { AUTH_STATUS, AuthContext } from './authContextObject'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(AUTH_STATUS.LOADING)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const rehydrate = async () => {
      const token = tokenStorage.get()
      if (!token) {
        if (!cancelled) setStatus(AUTH_STATUS.UNAUTHENTICATED)
        return
      }
      try {
        const fresh = await fetchMeRequest()
        if (cancelled) return
        setUser(fresh)
        setStatus(AUTH_STATUS.AUTHENTICATED)
      } catch {
        if (cancelled) return
        setUser(null)
        setStatus(AUTH_STATUS.UNAUTHENTICATED)
      }
    }

    rehydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const register = useCallback(async (payload) => {
    setError(null)
    setStatus(AUTH_STATUS.LOADING)
    try {
      const data = await registerRequest(payload)
      setUser(data.user)
      setStatus(AUTH_STATUS.AUTHENTICATED)
      return data.user
    } catch (err) {
      setStatus(AUTH_STATUS.UNAUTHENTICATED)
      setError(err.message)
      throw err
    }
  }, [])

  const login = useCallback(async (payload) => {
    setError(null)
    setStatus(AUTH_STATUS.LOADING)
    try {
      const data = await loginRequest(payload)
      setUser(data.user)
      setStatus(AUTH_STATUS.AUTHENTICATED)
      return data.user
    } catch (err) {
      setStatus(AUTH_STATUS.UNAUTHENTICATED)
      setError(err.message)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    await logoutRequest()
    setUser(null)
    setStatus(AUTH_STATUS.UNAUTHENTICATED)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
      isLoading: status === AUTH_STATUS.LOADING,
      error,
      register,
      login,
      logout,
      clearError,
    }),
    [user, status, error, register, login, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
