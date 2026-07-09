import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaddlesRail from '../components/PaddlesRail'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, whileHover, whileTap, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}))

const franchises = [
  { id: 'f1', name: 'Mumbai', colorHex: '#004ba0', members: [{ userId: 'u1', role: 'owner' }] },
  { id: 'f2', name: 'Chennai', colorHex: '#f7c200', members: [{ userId: 'u2', role: 'owner' }] },
]

describe('PaddlesRail', () => {
  it('renders safely when there is no active lot', () => {
    render(
      <PaddlesRail
        franchises={franchises}
        activeLot={null}
        auctionMode="remote"
        onPaddleClick={vi.fn()}
      />,
    )

    expect(screen.getByText(/inactive until a lot is on the floor/i)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('lets a non-leading franchise place the next bid when a lot is active', async () => {
    const user = userEvent.setup()
    const onPaddleClick = vi.fn()

    render(
      <PaddlesRail
        franchises={franchises}
        activeLot={{
          currentBid: 2500000,
          bidIncrement: 500000,
          currentBidderFranchiseId: 'f1',
          auctionStatus: 'active',
        }}
        auctionMode="remote"
        currentUserId="u2"
        onPaddleClick={onPaddleClick}
      />,
    )

    await user.click(screen.getByRole('listitem', { name: /bid next amount for chennai/i }))

    expect(onPaddleClick).toHaveBeenCalledWith(franchises[1], 3000000)
  })

  it('uses the provided currency for bid copy', () => {
    render(
      <PaddlesRail
        franchises={franchises}
        activeLot={{
          currentBid: 2500000,
          bidIncrement: 500000,
          currentBidderFranchiseId: 'f1',
          auctionStatus: 'active',
        }}
        auctionMode="remote"
        currentUserId="u2"
        currency="USD"
        onPaddleClick={vi.fn()}
      />,
    )

    expect(screen.getByText(/\$2,500,000/)).toBeInTheDocument()
    expect(screen.getByText(/\$3\.0m/i)).toBeInTheDocument()
  })

  it('does not let non-owners bid for another franchise', async () => {
    const user = userEvent.setup()
    const onPaddleClick = vi.fn()

    render(
      <PaddlesRail
        franchises={franchises}
        activeLot={{
          currentBid: 2500000,
          bidIncrement: 500000,
          currentBidderFranchiseId: 'f1',
          auctionStatus: 'active',
        }}
        auctionMode="remote"
        currentUserId="u3"
        onPaddleClick={onPaddleClick}
      />,
    )

    const chennaiPaddle = screen.getByRole('listitem', { name: /bid next amount for chennai/i })
    expect(chennaiPaddle).toBeDisabled()
    expect(screen.getAllByText(/owner only/i).length).toBeGreaterThan(0)

    await user.click(chennaiPaddle)
    expect(onPaddleClick).not.toHaveBeenCalled()
  })

  it('blocks bidding while the auctioneer has paused the lot', async () => {
    const user = userEvent.setup()
    const onPaddleClick = vi.fn()

    render(
      <PaddlesRail
        franchises={franchises}
        activeLot={{
          currentBid: 2500000,
          bidIncrement: 500000,
          currentBidderFranchiseId: 'f1',
          auctionStatus: 'paused',
        }}
        auctionMode="remote"
        currentUserId="u2"
        onPaddleClick={onPaddleClick}
      />,
    )

    expect(screen.getByText(/bidding is paused/i)).toBeInTheDocument()
    const chennaiPaddle = screen.getByRole('listitem', { name: /bid next amount for chennai/i })
    expect(chennaiPaddle).toBeDisabled()

    await user.click(chennaiPaddle)
    expect(onPaddleClick).not.toHaveBeenCalled()
  })
})
