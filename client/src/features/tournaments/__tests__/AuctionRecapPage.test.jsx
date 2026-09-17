import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuctionRecapContent } from '../AuctionRecapPage'

const player = {
  id: 'p1',
  name: 'Aarav Singh',
  style: 'Batsman',
  country: 'India',
  basePrice: 1000000,
  soldPrice: 2500000,
  bidCount: 5,
  uniqueBidders: 3,
  winner: { id: 'f1', name: 'Falcons' },
}

const recap = {
  tournament: {
    id: 't1',
    name: 'Premier Cricket League',
    shortCode: 'PCL',
    currency: 'INR',
    completedAt: '2026-09-17T10:00:00.000Z',
  },
  summary: {
    totalPlayers: 2,
    soldCount: 1,
    unsoldCount: 1,
    unresolvedCount: 0,
    totalSpend: 2500000,
    franchiseCount: 1,
  },
  winners: [player],
  squads: [{
    id: 'f1',
    name: 'Falcons',
    city: 'Delhi',
    colorHex: '#f5b94a',
    wallet: { initial: 10000000, spent: 2500000, remaining: 7500000 },
    maxSquadSize: 11,
    players: [player],
  }],
  highestSale: player,
  mostContested: player,
  unsoldPlayers: [{
    id: 'p2',
    name: 'Kabir Rao',
    style: 'Bowler',
    country: 'India',
    basePrice: 1000000,
  }],
  unresolvedPlayers: [],
  canExport: true,
}

describe('AuctionRecapContent', () => {
  it('shows results, final squads, purses, highlights and unsold players', () => {
    render(<MemoryRouter><AuctionRecapContent recap={recap} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Premier Cricket League' })).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getAllByText('Aarav Singh').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Falcons').length).toBeGreaterThan(0)
    expect(screen.getByText('Kabir Rao')).toBeInTheDocument()
    expect(screen.getAllByText('5 bids')).toHaveLength(2)

    const squad = screen.getByRole('heading', { name: 'Falcons' }).closest('article')
    expect(within(squad).getByText('₹7.5M')).toBeInTheDocument()
  })

  it('offers all CSV downloads to the host', () => {
    const onDownload = vi.fn()
    render(
      <MemoryRouter>
        <AuctionRecapContent recap={recap} onDownload={onDownload} />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('CSV')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: /final squads csv/i }))
    expect(onDownload).toHaveBeenCalledWith('squads')
  })

  it('keeps host-only downloads hidden from viewers', () => {
    render(
      <MemoryRouter>
        <AuctionRecapContent recap={{ ...recap, canExport: false }} />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Download CSV reports')).not.toBeInTheDocument()
  })
})
