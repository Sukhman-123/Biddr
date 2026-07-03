import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Wallet, Users, TrendingUp } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './TeamBudgetSidebar.css'

export default function TeamBudgetSidebar({ franchises, activeLot, currency = 'INR' }) {
  if (!franchises?.length) return null

  // Sort franchises by remaining purse descending
  const sorted = [...franchises].sort((a, b) => {
    const aRemaining = (a?.wallet?.initial || 0) - (a?.wallet?.spent || 0)
    const bRemaining = (b?.wallet?.initial || 0) - (b?.wallet?.spent || 0)
    return bRemaining - aRemaining
  })

  return (
    <div className="budget-sidebar">
      <div className="budget-sidebar-head">
        <h3 className="budget-sidebar-title">Team budgets</h3>
        <span className="budget-sidebar-count">{franchises.length}</span>
      </div>

      <div className="budget-sidebar-list">
        {sorted.map((franchise, index) => {
          const remaining = (franchise?.wallet?.initial || 0) - (franchise?.wallet?.spent || 0)
          const squadSize = (franchise?.squad?.playerIds || []).length
          const maxSquad = franchise?.squad?.maxSize || 11
          const isLeading = activeLot?.currentBidderFranchiseId === franchise.id
          const spent = franchise?.wallet?.spent || 0
          const initial = franchise?.wallet?.initial || 0
          const spentPercent = initial > 0 ? (spent / initial) * 100 : 0

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

              {/* Squad size */}
              <div className="budget-sidebar-squad">
                <Users size={12} />
                <span>{squadSize}/{maxSquad}</span>
              </div>

              {/* Remaining purse */}
              <div className="budget-sidebar-purse">
                <Wallet size={12} />
                <span className={remaining <= 0 ? 'budget-sidebar-purse--exhausted' : ''}>
                  {formatPurse(remaining, currency, { compact: true })}
                </span>
              </div>

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
    </div>
  )
}
