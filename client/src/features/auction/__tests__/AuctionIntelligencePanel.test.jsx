import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AuctionIntelligencePanel from '../components/AuctionIntelligencePanel'

const intelligence = {
  advice: 'CAUTION',
  franchise: { id: 'f1', name: 'Team A' },
  nextBid: 2500000,
  recommendedMaximumBid: 3000000,
  contextualValue: 3200000,
  roleBalanceScore: 78,
  purse: {
    remaining: 10000000,
    requiredReserve: 4000000,
    remainingSlots: 4,
  },
  role: {
    scarcityLevel: 'high',
    available: 2,
    totalProjectedNeed: 5,
  },
  warnings: [
    {
      code: 'PURSE_RESERVE_TIGHT',
      severity: 'warning',
      message: 'The purse buffer is getting tight.',
    },
  ],
  reasons: ['This squad still needs one bowler.'],
}

describe('AuctionIntelligencePanel', () => {
  it('renders the advice, maximum bid, role score, reserve and scarcity', () => {
    render(
      <AuctionIntelligencePanel
        intelligence={intelligence}
        franchises={[{ id: 'f1', name: 'Team A' }]}
        selectedFranchiseId="f1"
        currency="INR"
      />,
    )

    expect(screen.getByText('CAUTION')).toBeInTheDocument()
    expect(screen.getByText('₹3,000,000')).toBeInTheDocument()
    expect(screen.getByLabelText('Role balance score 78 out of 100')).toBeInTheDocument()
    expect(screen.getByText('₹4,000,000')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText(/purse buffer is getting tight/i)).toBeInTheDocument()
  })

  it('lets the host choose a franchise', () => {
    const onSelectFranchise = vi.fn()
    render(
      <AuctionIntelligencePanel
        intelligence={intelligence}
        franchises={[
          { id: 'f1', name: 'Team A' },
          { id: 'f2', name: 'Team B' },
        ]}
        selectedFranchiseId="f1"
        onSelectFranchise={onSelectFranchise}
        canSelectFranchise
      />,
    )

    fireEvent.change(screen.getByLabelText(/intelligence franchise/i), {
      target: { value: 'f2' },
    })
    expect(onSelectFranchise).toHaveBeenCalledWith('f2')
  })
})
