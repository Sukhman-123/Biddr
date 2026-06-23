import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'biddr:profile-preferences'

const DEFAULT_PREFERENCES = {
  accentColor: '#f5b94a',
  compactCards: false,
  notifyOnBid: true,
  notifyOnNewRoom: true,
  emailDigest: 'weekly',
  language: 'en',
  timeFormat: '24h',
}

const readStored = () => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

const writeStored = (prefs) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(readStored)

  useEffect(() => {
    writeStored(preferences)
  }, [preferences])

  useEffect(() => {
    function onChange() {
      setPreferences(readStored())
    }
    window.addEventListener('storage', onChange)
    window.addEventListener('biddr:preferences-changed', onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('biddr:preferences-changed', onChange)
    }
  }, [])

  const update = useCallback((patch) => {
    setPreferences((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  return { preferences, update, reset }
}
