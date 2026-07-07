import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AuctioneerPanel from '../components/AuctioneerPanel'

describe('AuctioneerPanel', () => {
  const tournament = {
    status: 'live',
    auctionMode: 'physical',
    currency: 'INR',
    franchises: [
      { id: 'f1', name: 'Team A' },
      { id: 'f2', name: 'Team B' },
    ],
  }

  it('shows queue actions when there is no active lot', () => {
    const onActivateNext = vi.fn()
    render(
      <AuctioneerPanel
        tournament={tournament}
        activeLot={null}
        queuedLots={[{ id: 'l1', name: 'Virat', style: 'Batsman', basePrice: 2000000 }]}
        undoAvailable={false}
        connected
        busy={false}
        recentEvents={[]}
        onActivateNext={onActivateNext}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onUndo={vi.fn()}
        onDeactivate={vi.fn()}
        onOpenEndAuction={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bring virat/i }))
    expect(onActivateNext).toHaveBeenCalledWith('l1')
  })

  it('shows active-lot controls and recent events when a lot is live', () => {
    render(
      <AuctioneerPanel
        tournament={tournament}
        activeLot={{
          id: 'l1',
          name: 'Virat',
          auctionStatus: 'active',
          currentBid: 2500000,
          currentBidderFranchiseId: 'f2',
        }}
        queuedLots={[]}
        undoAvailable
        connected
        busy={false}
        recentEvents={[
          {
            id: 'e1',
            type: 'bid',
            franchiseName: 'Team B',
            lotName: 'Virat',
            amount: 2500000,
          },
        ]}
        onActivateNext={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onUndo={vi.fn()}
        onDeactivate={vi.fn()}
        onOpenEndAuction={vi.fn()}
      />,
    )

    expect(screen.getByText(/team b is leading/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    expect(screen.getByText(/recent floor activity/i)).toBeInTheDocument()
  })
})
