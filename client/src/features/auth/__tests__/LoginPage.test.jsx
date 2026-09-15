import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthPage from '../AuthPage'
import { AuthProvider } from '../AuthContext'
import { tokenStorage } from '../../../lib/api'
import { forgotPasswordRequest, loginRequest } from '../auth.api'

vi.mock('../auth.api', () => ({
  fetchMeRequest: vi.fn(),
  loginRequest: vi.fn(),
  googleLoginRequest: vi.fn(),
  registerRequest: vi.fn(),
  logoutRequest: vi.fn(),
  forgotPasswordRequest: vi.fn(),
  resetPasswordRequest: vi.fn(),
}))

vi.mock('../../../lib/config', () => ({ config: { googleClientId: '' } }))

function Destination() {
  const { state } = useLocation()
  return <p>Return destination: {state?.next}</p>
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { next: '/tournaments/invited-room' } }]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<Destination />} />
          <Route path="/forgot-password" element={<Destination />} />
          <Route path="/tournaments/invited-room" element={<p>Your invited auction</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/forgot-password', state: { next: '/tournaments/invited-room' } }]}>
      <AuthProvider>
        <Routes>
          <Route path="/forgot-password" element={<AuthPage />} />
          <Route path="/login" element={<Destination />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clear()
  })

  it('focuses the first invalid field and keeps errors associated with inputs', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(await screen.findByRole('button', { name: 'Sign in', exact: true }))
    const identifier = screen.getByLabelText('Email or phone')
    expect(identifier).toHaveFocus()
    expect(identifier).toHaveAccessibleDescription('Email or phone is required')
    await user.type(identifier, 'owner@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
    expect(screen.getByLabelText('Password', { exact: true })).toHaveFocus()
    expect(loginRequest).not.toHaveBeenCalled()
  })

  it('keeps the form and values visible during sign-in and allows retry after failure', async () => {
    let rejectLogin
    loginRequest.mockImplementationOnce(() => new Promise((_, reject) => { rejectLogin = reject }))
    const user = userEvent.setup()
    renderLogin()
    await user.type(await screen.findByLabelText('Email or phone'), 'Owner@Example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    expect(screen.getByLabelText('Email or phone')).toHaveValue('Owner@Example.com')
    expect(screen.getByLabelText('Email or phone')).toHaveAttribute('readonly')
    expect(loginRequest).toHaveBeenCalledWith({ identifier: 'owner@example.com', password: 'password123' })
    await act(async () => rejectLogin(new Error('Email or password is incorrect.')))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('password123')
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()

    loginRequest.mockResolvedValueOnce({ user: { id: 'owner', fullName: 'Team Owner' } })
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
    expect(await screen.findByText('Your invited auction')).toBeInTheDocument()
  })

  it.each(['Create an account', 'Forgot password?'])('preserves the invited destination through %s', async (button) => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(await screen.findByRole('button', { name: button }))
    await waitFor(() => expect(screen.getByText('Return destination: /tournaments/invited-room')).toBeInTheDocument())
  })

  it('supports password visibility and omits an unconfigured Google option', async () => {
    const user = userEvent.setup()
    renderLogin()
    const password = await screen.findByLabelText('Password', { exact: true })
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Google/i)).not.toBeInTheDocument()
  })

  it('focuses an invalid recovery email', async () => {
    const user = userEvent.setup()
    renderForgotPassword()
    await user.click(await screen.findByRole('button', { name: 'Send reset link' }))
    const email = screen.getByLabelText('Account email')
    expect(email).toHaveFocus()
    expect(email).toHaveAccessibleDescription('Email is required')
    expect(forgotPasswordRequest).not.toHaveBeenCalled()
  })

  it('keeps recovery context visible while requesting and shows a safe confirmation', async () => {
    let finishRequest
    forgotPasswordRequest.mockImplementationOnce(
      () => new Promise((resolve) => { finishRequest = resolve }),
    )
    const user = userEvent.setup()
    renderForgotPassword()
    const email = await screen.findByLabelText('Account email')
    await user.type(email, 'Owner@Example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(screen.getByRole('button', { name: 'Requesting reset link…' })).toBeDisabled()
    expect(email).toHaveValue('Owner@Example.com')
    expect(email).toHaveAttribute('readonly')
    expect(forgotPasswordRequest).toHaveBeenCalledWith('owner@example.com')

    await act(async () => finishRequest({
      message: 'If that email is linked to a Biddr account, reset instructions are ready.',
      resetUrl: '/reset-password?token=local-test-token',
    }))

    const confirmation = await screen.findByRole('status')
    expect(confirmation).toHaveTextContent('owner@example.com')
    expect(confirmation).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Try again or use another email' }))
    expect(await screen.findByLabelText('Account email')).toHaveFocus()
  })

  it('preserves the destination when returning from recovery', async () => {
    const user = userEvent.setup()
    renderForgotPassword()
    await user.click(await screen.findByRole('button', { name: 'Back to sign in' }))
    expect(await screen.findByText('Return destination: /tournaments/invited-room')).toBeInTheDocument()
  })

  it('keeps the email available when requesting a reset link fails', async () => {
    forgotPasswordRequest.mockRejectedValueOnce(new Error('Could not connect. Check your connection and try again.'))
    const user = userEvent.setup()
    renderForgotPassword()
    const email = await screen.findByLabelText('Account email')
    await user.type(email, 'owner@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not connect. Check your connection and try again.',
    )
    expect(email).toHaveValue('owner@example.com')
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled()
  })
})
