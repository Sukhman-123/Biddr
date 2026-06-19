import { useContext } from 'react'
import { AUTH_STATUS, AuthContext } from './authContextObject'

export { AUTH_STATUS }

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}