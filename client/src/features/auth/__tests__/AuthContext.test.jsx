import { render, screen, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'
import { AUTH_EXPIRED_EVENT, tokenStorage } from '../../../lib/api'

vi.mock('../auth.api', () => ({
  fetchMeRequest: vi.fn(),
  googleLoginRequest: vi.fn(),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  registerRequest: vi.fn(),
}))

import { fetchMeRequest } from '../auth.api'

function Probe() {
  const { status, user, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.fullName || 'none'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clear()
  })

  it('drops back to unauthenticated when the auth-expired event fires', async () => {
    tokenStorage.set('valid-token')
    fetchMeRequest.mockResolvedValueOnce({
      id: 'u1',
      fullName: 'Casey User',
      email: 'casey@example.com',
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('Casey User')

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})
