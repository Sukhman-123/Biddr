import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StartAuctionModal from '../StartAuctionModal'

// =============================================================
// StartAuctionModal — the auctioneer's "are you sure" gate.
//
// Pinning the contract:
//   - Renders the tournament name
//   - "Start the auction" calls onConfirm
//   - "Not yet" / close button / backdrop click / Escape calls onCancel
//   - Busy state disables the confirm button and the close paths
//   - Error message surfaces when provided
// =============================================================

const TOURNAMENT = { id: 't1', name: 'Indore Premier League', status: 'upcoming' }

describe('StartAuctionModal', () => {
  it('renders nothing when closed', () => {
    render(
      <StartAuctionModal
        open={false}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the tournament name and confirm CTA when open', () => {
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Indore Premier League/)).toBeInTheDocument()
    expect(screen.getByTestId('start-auction-confirm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not yet/i })).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('start-auction-confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when "Not yet" is clicked', () => {
    const onCancel = vi.fn()
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /not yet/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when the close button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables confirm and the close paths while busy', () => {
    const onCancel = vi.fn()
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={true}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByTestId('start-auction-confirm')).toBeDisabled()
    expect(screen.getByRole('button', { name: /not yet/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /close/i })).toBeDisabled()
  })

  it('shows "Starting…" label while busy', () => {
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={true}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/starting/i)).toBeInTheDocument()
  })

  it('surfaces the server error message', () => {
    render(
      <StartAuctionModal
        open={true}
        tournament={TOURNAMENT}
        busy={false}
        errorMessage="The auction start date has not arrived yet"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/the auction start date has not arrived yet/i),
    ).toBeInTheDocument()
  })

  it('renders a sane fallback name when tournament is null', () => {
    render(
      <StartAuctionModal
        open={true}
        tournament={null}
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/this tournament/i)).toBeInTheDocument()
  })
})