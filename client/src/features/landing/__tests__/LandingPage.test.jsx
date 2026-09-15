import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LandingPage from '../LandingPage'

const fillContactForm = async (user) => {
  await user.type(screen.getByLabelText('Name'), 'Priya Sharma')
  await user.type(screen.getByLabelText('Email'), 'priya@example.com')
  await user.type(screen.getByLabelText('Mobile number'), '+91 98765 43210')
  await user.type(screen.getByLabelText('Place / Address'), 'Chandigarh')
  await user.type(
    screen.getByLabelText('Message'),
    'We need help hosting a college auction.',
  )
}

const renderLandingPage = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )

describe('landing-page contact form', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows confirmed success and clears the form after the API stores it', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Thanks — your message has been received.',
        data: { notificationStatus: 'sent' },
      }),
    })
    const user = userEvent.setup()
    renderLandingPage()
    await fillContactForm(user)

    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thanks — your message has been received.',
    )
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(fetch).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows the API error and preserves the entered details', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: 'The contact service is temporarily unavailable.',
      }),
    })
    const user = userEvent.setup()
    renderLandingPage()
    await fillContactForm(user)

    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The contact service is temporarily unavailable.',
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Priya Sharma')
    expect(screen.queryByText(/message has been received/i)).not.toBeInTheDocument()
  })

  it('validates locally before making a request', async () => {
    const user = userEvent.setup()
    renderLandingPage()

    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please fill every field with a valid value.',
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
