import { useEffect, useMemo, useState } from 'react'
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
  currency = 'INR',
}) {
  const toast = useToast()
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const currentBid = lot?.currentBid || lot?.basePrice || 0
  const bidIncrement = lot?.bidIncrement || 0
  const minBid = currentBid + bidIncrement
  const selectableFranchises = useMemo(
    () =>
      (franchises || []).filter((franchise) => {
        const remaining =
          (franchise?.wallet?.initial || 0) - (franchise?.wallet?.spent || 0)
        const squadSize = (franchise?.squad?.playerIds || []).length
        const maxSquad = franchise?.squad?.maxSize || 11
        return remaining >= minBid && squadSize < maxSquad
      }),
    [franchises, minBid],
  )

  useEffect(() => {
    if (!lot || selectableFranchises.length === 0) {
      setSelectedFranchiseId('')
      return
    }

    const stillValid = selectableFranchises.some(
      (franchise) => franchise.id === selectedFranchiseId,
    )
    if (stillValid) return

    const preferred =
      selectableFranchises.find(
        (franchise) => franchise.id === lot.currentBidderFranchiseId,
      ) || selectableFranchises[0]

    setSelectedFranchiseId(preferred?.id || '')
  }, [lot, selectableFranchises, selectedFranchiseId])

  useEffect(() => {
    setCustomAmount('')
    setShowCustom(false)
  }, [lot?.id, currentBid, bidIncrement])

  // Validate if a bid can be placed
  const canPlaceBid = (amount) => {
    if (!selectedFranchiseId || amount < minBid) return false
    const franchise = franchises?.find(f => f.id === selectedFranchiseId)
    if (!franchise) return false

    const remaining = (franchise?.wallet?.initial || 0) - (franchise?.wallet?.spent || 0)
    if (amount > remaining) {
      toast.error(`Insufficient purse. ${formatPurse(remaining, currency)} remaining.`)
      return false
    }

    const squadSize = (franchise?.squad?.playerIds || []).length
    const maxSquad = franchise?.squad?.maxSize || 11
    if (squadSize >= maxSquad) {
      toast.error(`Squad is full (${squadSize}/${maxSquad})`)
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
    { step: 1, amount: minBid },
    { step: 2, amount: currentBid + bidIncrement * 2 },
    { step: 5, amount: currentBid + bidIncrement * 5 },
  ].filter((option, index, list) => list.findIndex((item) => item.amount === option.amount) === index)

  if (!isHost || !lot || !franchises) return null

  const selectedFranchise = franchises.find((franchise) => franchise.id === selectedFranchiseId)
  const selectedRemaining = selectedFranchise
    ? (selectedFranchise.wallet?.initial || 0) - (selectedFranchise.wallet?.spent || 0)
    : null

  return (
    <div className="bid-controls">
      <div className="bid-controls-header">
        <h3 className="bid-controls-title">Place Bid</h3>
        <p className="bid-controls-sub">Auctioneer entry only</p>
      </div>

      <div className="bid-controls-brief">
        <div className="bid-controls-brief-card">
          <span className="bid-controls-brief-label">Current</span>
          <strong>{formatPurse(currentBid, currency)}</strong>
        </div>
        <div className="bid-controls-brief-card">
          <span className="bid-controls-brief-label">Next valid bid</span>
          <strong>{formatPurse(minBid, currency)}</strong>
        </div>
        <div className="bid-controls-brief-card">
          <span className="bid-controls-brief-label">Leader</span>
          <strong>
            {franchises.find((franchise) => franchise.id === lot.currentBidderFranchiseId)?.name || 'Opening call'}
          </strong>
        </div>
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
            const disabledReason =
              remaining < minBid
                ? `Needs ${formatPurse(minBid, currency)} to bid`
                : squadSize >= maxSquad
                  ? 'Squad full'
                  : ''

            return (
              <button
                key={franchise.id}
                type="button"
                className={`bid-controls-franchise ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-current' : ''}`}
                onClick={() => setSelectedFranchiseId(franchise.id)}
                disabled={busy || Boolean(disabledReason)}
                title={disabledReason}
              >
                <div className="bid-controls-franchise-header">
                  <span className="bid-controls-franchise-name">{franchise.name}</span>
                  {isCurrent && <span className="bid-controls-franchise-badge">Current</span>}
                </div>
                <div className="bid-controls-franchise-details">
                  <span className="bid-controls-franchise-purse">
                    {formatPurse(remaining, currency)} remaining
                  </span>
                  <span className="bid-controls-franchise-squad">
                    {disabledReason || `${squadSize}/${maxSquad} squad`}
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
            {incrementOptions.map((option) => (
              <button
                key={option.amount}
                type="button"
                className="bid-controls-preset"
                onClick={() => handleBid(option.amount)}
                disabled={busy || !selectedFranchiseId || option.amount > (selectedRemaining ?? 0)}
                title={
                  selectedRemaining != null && option.amount > selectedRemaining
                    ? `Insufficient purse: ${formatPurse(selectedRemaining, currency)} remaining`
                    : undefined
                }
              >
                <ArrowUp size={14} />
                {option.step === 1 ? 'Next bid' : `+${option.step - 1} steps`}
                <span className="bid-controls-preset-amount">
                  {formatPurse(option.amount, currency, { compact: true })}
                </span>
              </button>
            ))}
          </div>

          <div className="bid-controls-input-group">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Enter amount (min: ${formatPurse(minBid, currency)})`}
              className="bid-controls-input"
              min={minBid}
              max={selectedRemaining ?? undefined}
              disabled={busy || !selectedFranchiseId}
            />
            <button
              type="button"
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
                type="button"
                className="cta-btn bid-controls-confirm"
                onClick={() => {
                  const amount = parseInt(customAmount)
                  if (amount >= minBid) {
                    handleBid(amount)
                  } else {
                    toast.error(`Minimum bid is ${formatPurse(minBid, currency)}`)
                  }
                }}
                disabled={
                  busy ||
                  !selectedFranchiseId ||
                  !customAmount ||
                  Number(customAmount) > (selectedRemaining ?? 0)
                }
              >
                Place Bid
              </button>
              <button
                type="button"
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
          {selectedFranchise
            ? `${selectedFranchise.name} selected${selectedRemaining != null ? ` · ${formatPurse(selectedRemaining, currency)} left` : ''}`
            : 'Choose a franchise to record the next floor bid'}
        </p>
        {selectedFranchiseId && !showCustom && (
          <button
            type="button"
            className="cta-btn bid-controls-quick-bid"
            onClick={() => handleBid(minBid)}
            disabled={busy || minBid > (selectedRemaining ?? 0)}
            title={
              selectedRemaining != null && minBid > selectedRemaining
                ? `Insufficient purse: ${formatPurse(selectedRemaining, currency)} remaining`
                : undefined
            }
          >
            Record next bid
          </button>
        )}
      </div>
    </div>
  )
}
