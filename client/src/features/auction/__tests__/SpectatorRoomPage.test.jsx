import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const handlers = new Map()
const socket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn((event, cb) => {
    handlers.set(event, cb)
  }),
  off: vi.fn((event) => {
    handlers.delete(event)
  }),
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
      tournament: {
        id: 't1',
        name: 'League',
        currency: 'INR',
        auctionMode: 'remote',
        franchises: [],
      },
      activeLot: {
        id: 'l1',
        name: 'Virat Kohli',
        style: 'Batsman',
        country: 'India',
        basePrice: 2000000,
        currentBid: 2500000,
        bidIncrement: 500000,
        auctionStatus: 'active',
        set: 'Marquee',
      },
      recentBids: [],
    },
    isLoading: false,
  })),
}))

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Viewer' } }),
}))

vi.mock('../../../lib/socket', () => ({
  useSocket: () => ({ socket, connected: true }),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    header: ({ children, initial, animate, exit, transition, ...props }) => (
      <header {...props}>{children}</header>
    ),
    section: ({ children, initial, animate, exit, transition, ...props }) => (
      <section {...props}>{children}</section>
    ),
    div: ({ children, initial, animate, exit, transition, ...props }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, initial, animate, exit, transition, ...props }) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => true,
}))

vi.mock('../components/PaddlesRail', () => ({
  default: () => <div data-testid="paddles-rail" />,
}))

vi.mock('../components/TeamBudgetSidebar', () => ({
  default: () => <div data-testid="team-budget-sidebar" />,
}))

vi.mock('../components/BidFeed', () => ({
  default: () => <div data-testid="bid-feed" />,
}))

vi.mock('../components/CurrentLotCard', () => ({
  default: ({ lot }) => (
    <div data-testid="current-lot-card">
      {lot ? lot.name : 'Waiting for the next lot'}
    </div>
  ),
}))

import SpectatorRoomPage from '../SpectatorRoomPage'

describe('SpectatorRoomPage', () => {
  beforeEach(() => {
    handlers.clear()
    socket.emit.mockClear()
    socket.on.mockClear()
    socket.off.mockClear()
  })

  it('clears the current lot after a terminal room event', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/tournaments/t1/watch']}>
        <Routes>
          <Route path="/tournaments/:id/watch" element={<SpectatorRoomPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Virat Kohli')).toBeInTheDocument()

    act(() => {
      handlers.get('lot:hammered')?.({
        lot: { id: 'l1', name: 'Virat Kohli' },
        by: { fullName: 'Auctioneer' },
        amount: 3000000,
        at: new Date().toISOString(),
      })
    })

    expect(screen.queryByText('Virat Kohli')).toBeNull()
    expect(screen.getByText(/waiting for the next lot/i)).toBeInTheDocument()

    unmount()
  })

  it('restores the current lot when an undo reopens bidding', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/tournaments/t1/watch']}>
        <Routes>
          <Route path="/tournaments/:id/watch" element={<SpectatorRoomPage />} />
        </Routes>
      </MemoryRouter>,
    )

    act(() => {
      handlers.get('lot:hammered')?.({
        lot: { id: 'l1', name: 'Virat Kohli' },
        by: { fullName: 'Auctioneer' },
        amount: 3000000,
        at: new Date().toISOString(),
      })
    })

    expect(screen.getByText(/waiting for the next lot/i)).toBeInTheDocument()

    act(() => {
      handlers.get('lot:undone')?.({
        action: { type: 'LOT_HAMMERED', by: { fullName: 'Auctioneer' } },
        lot: {
          id: 'l1',
          name: 'Virat Kohli',
          style: 'Batsman',
          country: 'India',
          basePrice: 2000000,
          currentBid: 2500000,
          bidIncrement: 500000,
          auctionStatus: 'active',
          set: 'Marquee',
        },
        at: new Date().toISOString(),
      })
    })

    expect(screen.getByText('Virat Kohli')).toBeInTheDocument()

    unmount()
  })
})
