import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HostControls from '../components/HostControls'

// =============================================================
// HostControls — the only UI on the auction page that mutates
// room state. These tests pin the contract:
//
//   - "idle" mode: shows a picker of queued lots + an Activate
//     CTA. Picking a lot + clicking Activate calls onActivate
//     with the right lotId.
//   - "active" mode: shows Hammer + Pass. Each opens a confirm
//     step. The user must confirm before onHammer / onPass fire.
//   - The buttons are disabled while `busy` is true.
// =============================================================

describe('HostControls — idle mode (no active lot)', () => {
  const queuedLots = [
    { id: 'l1', name: 'Virat', style: 'Batsman', country: 'India', basePrice: 2000000, bidIncrement: 500000 },
    { id: 'l2', name: 'Bumrah', style: 'Bowler', country: 'India', basePrice: 1500000, bidIncrement: 250000 },
  ]

  it('renders an Activate CTA when there are queued lots', () => {
    render(<HostControls mode="idle" queuedLots={queuedLots} busy={false} onActivate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /activate a lot/i })).toBeInTheDocument()
  })

  it('opens the picker and calls onActivate with the picked lotId', () => {
    const onActivate = vi.fn()
    render(<HostControls mode="idle" queuedLots={queuedLots} busy={false} onActivate={onActivate} />)

    // Open the picker.
    fireEvent.click(screen.getByRole('button', { name: /activate a lot/i }))

    // Pick the second lot.
    fireEvent.click(screen.getByText('Bumrah'))

    // Confirm — there are two "Bring to the floor" CTAs once the
    // picker is open: the main one at the bottom of the dropdown.
    const bringButtons = screen.getAllByRole('button', { name: /bring to the floor/i })
    fireEvent.click(bringButtons[bringButtons.length - 1])

    expect(onActivate).toHaveBeenCalledWith('l2')
  })

  it('does not render anything when there are no queued lots', () => {
    const { container } = render(
      <HostControls mode="idle" queuedLots={[]} busy={false} onActivate={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('disables the Activate button while busy', () => {
    render(<HostControls mode="idle" queuedLots={queuedLots} busy={true} onActivate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /activate a lot/i })).toBeDisabled()
  })
})

describe('HostControls — active mode (lot on the floor)', () => {
  const lot = {
    id: 'l1',
    name: 'Virat',
    style: 'Batsman',
    country: 'India',
    basePrice: 2000000,
    currentBid: 2500000,
    auctionStatus: 'active',
  }

  it('renders Sold and Unsold buttons', () => {
    render(<HostControls mode="active" lot={lot} busy={false} onHammer={vi.fn()} onPass={vi.fn()} franchises={[]} />)
    expect(screen.getByRole('button', { name: /^sold$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^unsold$/i })).toBeInTheDocument()
  })

  it('requires confirmation before calling onHammer', () => {
    const onHammer = vi.fn()
    render(<HostControls mode="active" lot={lot} busy={false} auctionMode="remote" onHammer={onHammer} onPass={vi.fn()} franchises={[]} />)

    // First click opens the confirm step; does NOT hammer yet.
    fireEvent.click(screen.getByRole('button', { name: /^sold$/i }))
    expect(onHammer).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()

    // Confirm calls onHammer.
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onHammer).toHaveBeenCalledOnce()
  })

  it('lets the auctioneer override the winning franchise before hammering in physical mode', () => {
    const onHammer = vi.fn()
    render(
      <HostControls
        mode="active"
        lot={{ ...lot, currentBidderFranchiseId: 'f1' }}
        busy={false}
        auctionMode="physical"
        onHammer={onHammer}
        onPass={vi.fn()}
        franchises={[
          { id: 'f1', name: 'Team A' },
          { id: 'f2', name: 'Team B' },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^sold$/i }))
    expect(screen.getByLabelText(/winning franchise/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/winning franchise/i), {
      target: { value: 'f2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm sold result/i }))

    expect(onHammer).toHaveBeenCalledWith('f2')
  })

  it('requires confirmation before calling onPass', () => {
    const onPass = vi.fn()
    render(<HostControls mode="active" lot={lot} busy={false} onHammer={vi.fn()} onPass={onPass} franchises={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /^unsold$/i }))
    expect(onPass).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onPass).toHaveBeenCalledOnce()
  })

  it('cancel button on the confirm step does not mutate state', () => {
    const onHammer = vi.fn()
    render(<HostControls mode="active" lot={lot} busy={false} onHammer={onHammer} onPass={vi.fn()} franchises={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /^sold$/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // Back to the regular state — Sold and Unsold visible again, no
    // call to onHammer.
    expect(onHammer).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^sold$/i })).toBeInTheDocument()
  })

  it('disables Sold and Unsold while busy', () => {
    render(<HostControls mode="active" lot={lot} busy={true} onHammer={vi.fn()} onPass={vi.fn()} franchises={[]} />)
    expect(screen.getByRole('button', { name: /^sold$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^unsold$/i })).toBeDisabled()
  })

  it('shows manual bid controls in physical mode', () => {
    render(
      <HostControls
        mode="active"
        lot={lot}
        busy={false}
        auctionMode="physical"
        onHammer={vi.fn()}
        onPass={vi.fn()}
        onPlaceBid={vi.fn()}
        franchises={[
          {
            id: 'f1',
            name: 'Team A',
            wallet: { initial: 10000000, spent: 0 },
            squad: { playerIds: [], maxSize: 11 },
          },
        ]}
      />,
    )
    expect(screen.getByText(/place bid/i)).toBeInTheDocument()
    expect(screen.getByText(/auctioneer entry only/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /next bid/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /record next bid/i })).toBeInTheDocument()
  })

  it('does not show manual bid controls in remote mode', () => {
    render(
      <HostControls
        mode="active"
        lot={lot}
        busy={false}
        auctionMode="remote"
        onHammer={vi.fn()}
        onPass={vi.fn()}
        onPlaceBid={vi.fn()}
        franchises={[
          {
            id: 'f1',
            name: 'Team A',
            wallet: { initial: 10000000, spent: 0 },
            squad: { playerIds: [], maxSize: 11 },
          },
        ]}
      />,
    )
    expect(screen.queryByText(/place bid/i)).toBeNull()
  })
})
