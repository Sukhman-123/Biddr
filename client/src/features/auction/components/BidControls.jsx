import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, Plus } from 'lucide-react'
import { useToast } from '../../../components/ToastProvider'
import { formatPurse } from '../../tournaments/tournament.utils'
import './BidControls.css'

export default function BidControls({
  lot,
  franchises,
  onPlaceBid,
  busy,
  isHost,
}) {
  const toast = useToast()
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('')
  const [bidAmount, setBidAmount] = useState(lot?.currentBid || lot?.basePrice || 0)
  const [customAmount, setCustomAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Validate if a bid can be placed
  const canPlaceBid = (amount) => {
    if (!selectedFranchiseId || amount < (lot?.currentBid || 0)) return false
    const franchise = franchises?.find(f => f.id === selectedFranchiseId)
    if (!franchise) return false

    // Check wallet (simplified - backend will validate strictly)
    if (franchise?.wallet?.spent >= franchise?.wallet?.initial) {
      toast.error('Franchise has insufficient funds')
      return false
    }

    return true
  }

  // Place a bid
  const handleBid = (amount) => {
    if (!canPlaceBid(amount)) return

    onPlaceBid(selectedFranchiseId, amount)
    setCustomAmount('')
    setShowCustom(false)
  }

  // Get available increment presets
  const incrementOptions = [
    { label: '+10L', amount: lot?.currentBid + 10000000 },
    { label: '+25L', amount: lot?.currentBid + 25000000 },
    { label: '+50L', amount: lot?.currentBid + 50000000 },
  ]

  if (!isHost || !lot || !franchises) return null

  const currentBid = lot?.currentBid || lot?.basePrice || 0
  const minBid = lot?.currentBid + (lot?.bidIncrement || 0)

  return (
    <div className="bid-controls">
      <div className="bid-controls-header">
        <h3 className="bid-controls-title">Place Bid</h3>
        <p className="bid-controls-sub">Choose franchise and amount</p>
      </div>

      {/* Franchise Picker */}
      <div className="bid-controls-section">
        <label className="bid-controls-label">Franchise</label>
        <div className="bid-controls-franchises">
          {franchises?.map(franchise => {
            const isSelected = selectedFranchiseId === franchise.id
            const isCurrent = lot?.currentBidderFranchiseId === franchise.id
            const remaining = (franchise?.wallet?.initial || 0) - (franchise?.wallet?.spent || 0)
            const squadSize = (franchise?.squad?.playerIds || []).length
            const maxSquad = franchise?.squad?.maxSize || 11

            return (
              <button
                key={franchise.id}
                className={`bid-controls-franchise ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-current' : ''}`}
                onClick={() => setSelectedFranchiseId(franchise.id)}
                disabled={busy || remaining <= 0 || squadSize >= maxSquad}
              >
                <div className="bid-controls-franchise-header">
                  <span className="bid-controls-franchise-name">{franchise.name}</span>
                  {isCurrent && <span className="bid-controls-franchise-badge">Current</span>}
                </div>
                <div className="bid-controls-franchise-details">
                  <span className="bid-controls-franchise-purse">
                    {formatPurse(remaining, 'INR')} remaining
                  </span>
                  <span className="bid-controls-franchise-squad">
                    {squadSize}/{maxSquad} squad
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bid Amount Selection */}
      <div className="bid-controls-section">
        <label className="bid-controls-label">Bid Amount</label>
        <div className="bid-controls-amount">
          <div className="bid-controls-presets">
            {incrementOptions.map((option, index) => (
              <button
                key={index}
                className="bid-controls-preset"
                onClick={() => handleBid(option.amount)}
                disabled={busy || option.amount < minBid || !selectedFranchiseId}
              >
                <ArrowUp size={14} />
                {option.label}
              </button>
            ))}
          </div>

          <div className="bid-controls-input-group">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Enter amount (min: ${formatPurse(minBid, 'INR')})`}
              className="bid-controls-input"
              min={minBid}
              disabled={busy || !selectedFranchiseId}
            />
            <button
              className={`bid-controls-custom-btn ${showCustom ? 'is-active' : ''}`}
              onClick={() => setShowCustom(!showCustom)}
              disabled={busy || !selectedFranchiseId}
            >
              <Plus size={16} />
              Custom
            </button>
          </div>

          {showCustom && (
            <div className="bid-controls-actions">
              <button
                className="cta-btn bid-controls-confirm"
                onClick={() => {
                  const amount = parseInt(customAmount)
                  if (amount >= minBid) {
                    handleBid(amount)
                  } else {
                    toast.error(`Minimum bid is ${formatPurse(minBid, 'INR')}`)
                  }
                }}
                disabled={busy || !selectedFranchiseId || !customAmount}
              >
                Place Bid
              </button>
              <button
                className="cta-btn bid-controls-cancel"
                onClick={() => setShowCustom(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Bid Display */}
      <div className="bid-controls-status">
        <p className="bid-controls-status-text">
          Current bid: {formatPurse(currentBid, 'INR')}
          {lot?.bidIncrement && ` (Min: ${formatPurse(minBid, 'INR')})`}
        </p>
        {selectedFranchiseId && !showCustom && (
          <button
            className="cta-btn bid-controls-quick-bid"
            onClick={() => handleBid(minBid)}
            disabled={busy || minBid < lot?.currentBid + (lot?.bidIncrement || 0)}
          >
            Place Minimum Bid
          </button>
        )}
      </div>
    </div>
  )
}