import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EndAuctionModal from '../EndAuctionModal'

const TOURNAMENT = {
  id: 't1',
  name: 'Chandigarh Premier League',
  status: 'live',
}

describe('EndAuctionModal', () => {
  it('confirms ending a live auction', () => {
    const onConfirm = vi.fn()
    render(
      <EndAuctionModal
        open
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        blockedReason={null}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /end the auction/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('blocks completion until the current lot is resolved', () => {
    render(
      <EndAuctionModal
        open
        tournament={TOURNAMENT}
        busy={false}
        errorMessage={null}
        blockedReason="Resolve the current lot before ending the auction."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/resolve the current lot/i)
    expect(screen.getByRole('button', { name: /end the auction/i })).toBeDisabled()
  })

  it('shows a server error without closing the confirmation', () => {
    render(
      <EndAuctionModal
        open
        tournament={TOURNAMENT}
        busy={false}
        errorMessage="Could not end the auction"
        blockedReason={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not end the auction')
  })
})
