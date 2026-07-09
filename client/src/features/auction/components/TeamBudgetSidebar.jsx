import { motion } from 'framer-motion'
import clsx from 'clsx'
import { BadgeIndianRupee, Trophy, Wallet, Users, TrendingUp } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './TeamBudgetSidebar.css'

export default function TeamBudgetSidebar({ franchises, activeLot, lots = [], currency = 'INR' }) {
  if (!franchises?.length) return null

  const soldLots = (lots || []).filter((lot) => lot.status === 'sold' && lot.soldToFranchiseId)
  const unsoldLots = (lots || []).filter((lot) => lot.status === 'unsold')
  const soldLotsByFranchise = soldLots.reduce((map, lot) => {
    const list = map.get(lot.soldToFranchiseId) || []
    list.push(lot)
    map.set(lot.soldToFranchiseId, list)
    return map
  }, new Map())
  const franchiseNamesById = new Map(franchises.map((franchise) => [franchise.id, franchise.name]))
  const recentResults = getRecentSoldLots(soldLots).slice(0, 5)
  const totalSpent = franchises.reduce((sum, franchise) => sum + (franchise?.wallet?.spent || 0), 0)
  const totalSold = soldLots.length
  const totalSquadSlots = franchises.reduce((sum, franchise) => sum + (franchise?.squad?.maxSize || 11), 0)

  // Sort franchises by remaining purse descending
  const sorted = [...franchises].sort((a, b) => {
    const aRemaining = getRemainingPurse(a)
    const bRemaining = getRemainingPurse(b)
    return bRemaining - aRemaining
  })

  return (
    <div className="budget-sidebar">
      <div className="budget-sidebar-head">
        <div>
          <h3 className="budget-sidebar-title">Auction overview</h3>
          <span className="budget-sidebar-subtitle">Live team spend, squads, and buys</span>
        </div>
        <span className="budget-sidebar-count">{franchises.length} teams</span>
      </div>

      <div className="budget-summary-grid" aria-label="Auction summary">
        <article>
          <Trophy size={14} />
          <span>Sold</span>
          <strong>{totalSold}</strong>
        </article>
        <article>
          <Trophy size={14} />
          <span>Unsold</span>
          <strong>{unsoldLots.length}</strong>
        </article>
        <article>
          <BadgeIndianRupee size={14} />
          <span>Spent</span>
          <strong>{formatPurse(totalSpent, currency, { compact: true })}</strong>
        </article>
        <article>
          <Users size={14} />
          <span>Squads</span>
          <strong>{totalSold}/{totalSquadSlots}</strong>
        </article>
      </div>

      <div className="budget-sidebar-list">
        {sorted.map((franchise, index) => {
          const remaining = getRemainingPurse(franchise)
          const teamSoldLots = soldLotsByFranchise.get(franchise.id) || []
          const squadSize = Math.max((franchise?.squad?.playerIds || []).length, teamSoldLots.length)
          const maxSquad = franchise?.squad?.maxSize || 11
          const isLeading = activeLot?.currentBidderFranchiseId === franchise.id
          const spent = franchise?.wallet?.spent || 0
          const initial = franchise?.wallet?.initial || 0
          const spentPercent = initial > 0 ? (spent / initial) * 100 : 0
          const latestBuy = getLatestBuy(teamSoldLots)

          return (
            <motion.div
              key={franchise.id}
              className={clsx(
                'budget-sidebar-row',
                isLeading && 'budget-sidebar-row--leading'
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Rank number */}
              <span className="budget-sidebar-rank">{index + 1}</span>

              {/* Franchise name + color accent */}
              <div className="budget-sidebar-info">
                <span className="budget-sidebar-name">{franchise.name}</span>
                {isLeading && (
                  <span className="budget-sidebar-lead-badge">
                    <TrendingUp size={10} />
                    Leading
                  </span>
                )}
              </div>

              <div className="budget-sidebar-metrics">
                <span>
                  <Users size={12} />
                  {squadSize}/{maxSquad}
                </span>
                <span>
                  <BadgeIndianRupee size={12} />
                  {formatPurse(spent, currency, { compact: true })} spent
                </span>
                <span className={remaining <= 0 ? 'budget-sidebar-purse--exhausted' : ''}>
                  <Wallet size={12} />
                  {formatPurse(remaining, currency, { compact: true })} left
                </span>
              </div>

              {latestBuy ? (
                <div className="budget-sidebar-latest">
                  <span>Latest buy</span>
                  <strong>{latestBuy.name}</strong>
                  <small>{formatPurse(latestBuy.soldPrice || latestBuy.currentBid || latestBuy.basePrice, currency, { compact: true })}</small>
                </div>
              ) : (
                <div className="budget-sidebar-latest is-empty">
                  <span>No players bought yet</span>
                </div>
              )}

              {/* Spent progress bar */}
              <div className="budget-sidebar-bar-track">
                <div
                  className="budget-sidebar-bar-fill"
                  style={{
                    width: `${Math.min(100, spentPercent)}%`,
                    backgroundColor: franchise.colorHex || undefined,
                  }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="budget-history" aria-label="Recent auction results">
        <div className="budget-history-head">
          <span>Recent results</span>
          <strong>{recentResults.length ? `${recentResults.length} latest` : 'No sales yet'}</strong>
        </div>
        {recentResults.length ? (
          <div className="budget-history-list">
            {recentResults.map((lot) => (
              <div className="budget-history-item" key={lot.id}>
                <span className="budget-history-player">{lot.name}</span>
                <span className="budget-history-team">{franchiseNamesById.get(lot.soldToFranchiseId) || 'Unknown team'}</span>
                <strong>{formatPurse(lot.soldPrice || lot.currentBid || lot.basePrice, currency, { compact: true })}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="budget-history-empty">Sold players will appear here as the auction progresses.</p>
        )}
      </div>
    </div>
  )
}

function getRemainingPurse(franchise) {
  if (Number.isFinite(franchise?.wallet?.remaining)) {
    return franchise.wallet.remaining
  }
  return (franchise?.wallet?.initial || 0) - (franchise?.wallet?.spent || 0)
}

function getLatestBuy(lots) {
  return getRecentSoldLots(lots)[0]
}

function getRecentSoldLots(lots) {
  return [...lots].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
}
