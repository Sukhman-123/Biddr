const mongoose = require('mongoose')
const {
  calculateAuctionIntelligence,
  getRoleTargets,
} = require('../services/auctionIntelligence')

const id = () => new mongoose.Types.ObjectId()

function makeContext({
  wallet = 10000000,
  maxSize = 3,
  squadLots = [],
  lotStyle = 'Bowler',
  futureBasePrices = [1000000, 1000000],
} = {}) {
  const tournamentId = id()
  const activeLot = {
    _id: id(),
    tournamentId,
    name: 'Current player',
    style: lotStyle,
    basePrice: 2000000,
    currentBid: 2000000,
    bidIncrement: 500000,
    bidHistory: [],
    currentBidderFranchiseId: null,
    status: 'queued',
    auctionStatus: 'active',
  }
  const squadPlayers = squadLots.map((style) => ({
    _id: id(),
    tournamentId,
    name: `${style} player`,
    style,
    basePrice: 1000000,
    soldPrice: 1000000,
    status: 'sold',
    auctionStatus: 'hammered',
  }))
  const futureLots = futureBasePrices.map((basePrice, index) => ({
    _id: id(),
    tournamentId,
    name: `Future player ${index}`,
    style: index % 2 === 0 ? 'Batsman' : 'All-rounder',
    basePrice,
    status: 'queued',
    auctionStatus: 'idle',
  }))
  const franchise = {
    _id: id(),
    name: 'Team A',
    wallet: { initial: wallet, spent: 0 },
    squad: { playerIds: squadPlayers.map((player) => player._id), maxSize },
  }
  const otherFranchise = {
    _id: id(),
    name: 'Team B',
    wallet: { initial: wallet, spent: 0 },
    squad: { playerIds: [], maxSize },
  }
  const tournament = {
    _id: tournamentId,
    settings: { minBidIncrement: 500000, maxSquadSize: maxSize },
    franchises: [franchise, otherFranchise],
  }

  return {
    tournament,
    lot: activeLot,
    lots: [activeLot, ...squadPlayers, ...futureLots],
    franchise,
  }
}

describe('auction intelligence engine', () => {
  it('creates role targets that exactly fill the configured squad size', () => {
    for (const size of [1, 3, 5, 11, 18]) {
      const targets = getRoleTargets(size)
      expect(Object.values(targets).reduce((sum, value) => sum + value, 0)).toBe(size)
    }
  })

  it('reports scarcity and produces a bounded maximum bid', () => {
    const context = makeContext()
    const result = calculateAuctionIntelligence(context)

    expect(result.role.scarcityLevel).toBe('high')
    expect(result.warnings.map((warning) => warning.code)).toContain('ROLE_SCARCE')
    expect(result.recommendedMaximumBid).toBeLessThanOrEqual(result.purse.spendable)
    expect(result.recommendedMaximumBid % context.lot.bidIncrement).toBe(0)
    expect(['BID', 'CAUTION', 'PASS']).toContain(result.advice)
  })

  it('recommends passing when the next bid would consume the squad reserve', () => {
    const context = makeContext({ wallet: 3000000 })
    const result = calculateAuctionIntelligence(context)

    expect(result.advice).toBe('PASS')
    expect(result.purse.requiredReserve).toBe(2000000)
    expect(result.warnings.map((warning) => warning.code)).toContain('PURSE_RESERVE_RISK')
  })

  it('warns when the franchise has already met the role target', () => {
    const context = makeContext({
      maxSize: 2,
      squadLots: ['Batsman'],
      lotStyle: 'Batsman',
      futureBasePrices: [],
    })
    const result = calculateAuctionIntelligence(context)

    expect(result.role.currentCount).toBe(1)
    expect(result.role.target).toBe(1)
    expect(result.warnings.map((warning) => warning.code)).toContain('ROLE_COVERED')
    expect(result.advice).not.toBe('BID')
  })

  it('does not recommend another bid while the franchise already leads', () => {
    const context = makeContext()
    context.lot.currentBidderFranchiseId = context.franchise._id.toString()

    const result = calculateAuctionIntelligence(context)

    expect(result.advice).toBe('CAUTION')
    expect(result.reasons).toContain(
      'This franchise is already leading, so no additional bid is needed now.',
    )
  })
})
