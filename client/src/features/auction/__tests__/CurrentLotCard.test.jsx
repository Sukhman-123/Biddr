import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CurrentLotCard from '../components/CurrentLotCard'

// =============================================================
// CurrentLotCard — total-host-control enforcement at the UI level.
//
// Rule: only the host sees HostControls (the only mutating UI on
// the page). Viewers see the read-only view, even when a lot is
// on the floor.
// =============================================================

const activeLot = {
  id: 'l1',
  name: 'Virat Kohli',
  style: 'Batsman',
  country: 'India',
  basePrice: 2000000,
  currentBid: 2500000,
  bidIncrement: 500000,
  auctionStatus: 'active',
  photoUrl: '',
  set: 'Marquee',
}

describe('CurrentLotCard — host vs viewer', () => {
  it('host sees Activate / Hammer / Pass controls when a lot is active', () => {
    render(
      <CurrentLotCard
        lot={activeLot}
        isHost={true}
        queuedLots={[]}
        busy={false}
        onActivate={vi.fn()}
        onHammer={vi.fn()}
        onPass={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /^hammer$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^pass$/i })).toBeInTheDocument()
  })

  it('viewer does NOT see host controls when a lot is active', () => {
    render(
      <CurrentLotCard
        lot={activeLot}
        isHost={false}
        queuedLots={[]}
        busy={false}
        onActivate={vi.fn()}
        onHammer={vi.fn()}
        onPass={vi.fn()}
      />,
    )
    // The read-only hint is shown; the Hammer/Pass buttons are not.
    expect(screen.queryByRole('button', { name: /^hammer$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull()
    expect(screen.getByText(/bidding is live/i)).toBeInTheDocument()
  })

  it('viewer on an empty room sees the waiting message', () => {
    render(
      <CurrentLotCard
        lot={null}
        isHost={false}
        queuedLots={[]}
        busy={false}
        onActivate={vi.fn()}
        onHammer={vi.fn()}
        onPass={vi.fn()}
      />,
    )
    expect(screen.getByText(/waiting for the next lot/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /activate/i })).toBeNull()
  })

  it('host on an empty room with queued lots sees the picker', () => {
    render(
      <CurrentLotCard
        lot={null}
        isHost={true}
        queuedLots={[
          { id: 'l1', name: 'Virat', style: 'Batsman', country: 'India', basePrice: 2000000, bidIncrement: 500000 },
        ]}
        busy={false}
        onActivate={vi.fn()}
        onHammer={vi.fn()}
        onPass={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /activate a lot/i })).toBeInTheDocument()
  })

  it('host on an empty room with no queued lots sees the "add more" hint', () => {
    render(
      <CurrentLotCard
        lot={null}
        isHost={true}
        queuedLots={[]}
        busy={false}
        onActivate={vi.fn()}
        onHammer={vi.fn()}
        onPass={vi.fn()}
      />,
    )
    expect(screen.getByText(/no queued lots remain/i)).toBeInTheDocument()
    // No activate button when there's nothing to activate.
    expect(screen.queryByRole('button', { name: /activate/i })).toBeNull()
  })
})