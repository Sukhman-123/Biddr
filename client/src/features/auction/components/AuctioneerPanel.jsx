import { useEffect, useMemo, useState } from 'react'
import {
  CircleDot,
  Clock3,
  Gavel,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Save,
  SkipForward,
  Users,
  Wallet,
} from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './AuctioneerPanel.css'

export default function AuctioneerPanel({
  tournament,
  activeLot,
  queuedLots,
  undoAvailable,
  connected,
  busy,
  recentEvents,
  onActivateNext,
  onPause,
  onResume,
  onUndo,
  onDeactivate,
  onOpenEndAuction,
  onSaveBidIncrement,
}) {
  const auctionMode = tournament?.auctionMode || 'remote'
  const isPhysical = auctionMode === 'physical'
  const panelEvents = Array.isArray(recentEvents) ? recentEvents.slice(0, 6) : []
  const franchises = tournament?.franchises || []
  const [selectedLotId, setSelectedLotId] = useState('')
  const [incrementDraft, setIncrementDraft] = useState('')

  const selectedLot = useMemo(() => {
    if (!queuedLots?.length) return null
    return queuedLots.find((lot) => lot.id === selectedLotId) || queuedLots[0] || null
  }, [queuedLots, selectedLotId])

  const selectedLotNeedsIncrement = Boolean(selectedLot && selectedLot.bidIncrement == null)
  const currentLeader = activeLot
    ? franchises.find((franchise) => franchise.id === activeLot.currentBidderFranchiseId) ?? null
    : null
  const totalTeams = franchises.length
  const totalPurseRemaining = franchises.reduce((sum, franchise) => {
    const initial = franchise?.wallet?.initial || 0
    const spent = franchise?.wallet?.spent || 0
    return sum + Math.max(0, initial - spent)
  }, 0)
  const liveStatusLabel = activeLot
    ? activeLot.auctionStatus === 'paused'
      ? 'Paused on floor'
      : 'Live on floor'
    : 'Waiting for next lot'

  useEffect(() => {
    if (!queuedLots?.length) {
      setSelectedLotId('')
      setIncrementDraft('')
      return
    }

    const stillExists = queuedLots.some((lot) => lot.id === selectedLotId)
    const nextSelectedLot = stillExists
      ? queuedLots.find((lot) => lot.id === selectedLotId)
      : queuedLots[0]

    setSelectedLotId(nextSelectedLot?.id || '')
    setIncrementDraft(
      nextSelectedLot?.bidIncrement != null ? String(nextSelectedLot.bidIncrement) : '',
    )
  }, [queuedLots, selectedLotId])

  const activateSelectedLot = () => {
    if (!selectedLot || busy || activeLot) return
    onActivateNext?.(selectedLot.id)
  }

  const saveIncrement = async (activateAfterSave = false) => {
    if (!selectedLot || !onSaveBidIncrement || busy) return
    if (activateAfterSave && activeLot) return
    const value = Number(incrementDraft)
    if (!Number.isFinite(value) || value < 0) return
    const saved = await onSaveBidIncrement(selectedLot.id, value)
    if (!saved) return
    if (activateAfterSave) {
      onActivateNext?.(selectedLot.id)
    }
  }

  return (
    <section className="auctioneer-panel" aria-label="Auctioneer control panel">
      <header className="auctioneer-panel-hero">
        <div className="auctioneer-panel-hero-copy">
          <span className="auctioneer-panel-eyebrow">Auctioneer Console</span>
          <h2 className="auctioneer-panel-title">
            {isPhysical ? 'Physical auction command center' : 'Remote auction control tower'}
          </h2>
          <p className="auctioneer-panel-sub">
            Run the floor from one desk. Queue players, tune increments, manage live calls, and
            keep the entire room in sync.
          </p>
        </div>

        <div className="auctioneer-panel-status">
          <span className={`auctioneer-panel-pill ${isPhysical ? 'is-physical' : 'is-remote'}`}>
            {isPhysical ? 'Physical auction' : 'Remote auction'}
          </span>
          <span className={`auctioneer-panel-pill ${connected ? 'is-online' : 'is-offline'}`}>
            {connected ? 'Room synced' : 'Reconnecting'}
          </span>
          <span className={`auctioneer-panel-pill ${activeLot ? 'is-live' : 'is-idle'}`}>
            {liveStatusLabel}
          </span>
        </div>
      </header>

      <section className="auctioneer-panel-metrics" aria-label="Auctioneer room summary">
        <MetricCard
          icon={Radio}
          label="Floor state"
          value={activeLot ? activeLot.name : 'No live lot'}
          hint={
            activeLot
              ? currentLeader
                ? `${currentLeader.name} leads at ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}`
                : `Current bid ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}`
              : 'Bring the next lot up when the room is ready.'
          }
          tone={activeLot ? 'live' : 'idle'}
        />
        <MetricCard
          icon={Clock3}
          label="Queue ready"
          value={`${queuedLots?.length || 0} queued`}
          hint={
            selectedLot
              ? `${selectedLot.name} is selected next`
              : 'No queued lot selected yet'
          }
        />
        <MetricCard
          icon={Users}
          label="Franchises"
          value={`${totalTeams} active teams`}
          hint={
            totalTeams > 0
              ? `${franchises.filter((franchise) => (franchise?.squad?.playerIds || []).length > 0).length} teams already have players`
              : 'Add franchises in the lobby to start bidding.'
          }
        />
        <MetricCard
          icon={Wallet}
          label="Remaining purse"
          value={formatPurse(totalPurseRemaining, tournament?.currency || 'INR')}
          hint="Combined buying power still available in this room."
        />
      </section>

      <div className="auctioneer-panel-layout">
        <section className="auctioneer-panel-card is-queue">
          <div className="auctioneer-panel-card-head">
            <div>
              <span className="auctioneer-panel-label">Queue workbench</span>
              <strong className="auctioneer-panel-card-title">Choose the next lot</strong>
            </div>
            <span className="auctioneer-panel-meta">
              <Clock3 size={14} />
              {queuedLots?.length || 0} queued
            </span>
          </div>

          {selectedLot ? (
            <>
              <div className="auctioneer-panel-selected">
                <div className="auctioneer-panel-selected-main">
                  <strong className="auctioneer-panel-value">{selectedLot.name}</strong>
                  <p className="auctioneer-panel-copy">
                    {selectedLot.style || 'Player'} · base{' '}
                    {formatPurse(selectedLot.basePrice, tournament?.currency || 'INR')} ·{' '}
                    {selectedLot.bidIncrement != null
                      ? `increment ${formatPurse(selectedLot.bidIncrement, tournament?.currency || 'INR', { compact: true })}`
                      : 'bid increment still needed'}
                  </p>
                </div>
                <span
                  className={`auctioneer-panel-tag ${selectedLotNeedsIncrement ? 'is-warning' : 'is-ready'}`}
                >
                  {selectedLotNeedsIncrement ? 'Needs increment' : 'Ready for floor'}
                </span>
              </div>

              <div className="auctioneer-panel-queue-list" role="list" aria-label="Queued lots">
                {queuedLots.map((lot, index) => {
                  const isSelected = lot.id === selectedLot.id
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      className={`auctioneer-panel-queue-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedLotId(lot.id)}
                      disabled={busy}
                      role="listitem"
                    >
                      <span className="auctioneer-panel-queue-order">{index + 1}</span>
                      <span className="auctioneer-panel-queue-body">
                        <strong>{lot.name}</strong>
                        <span>
                          {lot.style} · {formatPurse(lot.basePrice, tournament?.currency || 'INR', { compact: true })}
                          {lot.bidIncrement != null
                            ? ` · +${formatPurse(lot.bidIncrement, tournament?.currency || 'INR', { compact: true })}`
                            : ' · increment needed'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="auctioneer-panel-increment-editor">
                <label className="auctioneer-panel-increment-field">
                  <span>Bid increment</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={incrementDraft}
                    onChange={(event) => setIncrementDraft(event.target.value)}
                    placeholder="500000"
                    disabled={busy}
                  />
                </label>

                <div className="auctioneer-panel-inline-summary">
                  <span className="auctioneer-panel-copy">
                    Save auction settings for this selected lot before bringing it to the floor.
                  </span>
                  <span className="auctioneer-panel-inline-value">
                    {selectedLot.bidIncrement != null || incrementDraft.trim()
                      ? `Floor call ${formatPurse(
                          Number(incrementDraft || selectedLot.bidIncrement || 0),
                          tournament?.currency || 'INR',
                          { compact: true },
                        )}`
                      : 'No increment set'}
                  </span>
                </div>

                <div className="auctioneer-panel-actions">
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-neutral"
                    onClick={() => saveIncrement(false)}
                    disabled={busy || incrementDraft.trim() === ''}
                  >
                    <Save size={15} />
                    Save increment
                  </button>
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-gold"
                    onClick={() => saveIncrement(true)}
                    disabled={busy || incrementDraft.trim() === '' || Boolean(activeLot)}
                  >
                    <Play size={15} />
                    Save and activate
                  </button>
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-gold"
                    onClick={activateSelectedLot}
                    disabled={busy || Boolean(activeLot) || selectedLotNeedsIncrement}
                  >
                    <Gavel size={15} />
                    Bring selected lot
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="auctioneer-panel-copy">
              Queue is empty. Add more lots from the lobby before you continue the room.
            </p>
          )}
        </section>

        <div className="auctioneer-panel-side">
          <section className="auctioneer-panel-card">
            <div className="auctioneer-panel-card-head">
              <div>
                <span className="auctioneer-panel-label">Live controls</span>
                <strong className="auctioneer-panel-card-title">Manage the floor</strong>
              </div>
              <span className={`auctioneer-panel-tag ${activeLot ? 'is-live' : 'is-idle'}`}>
                {activeLot ? 'Live room' : 'Standby'}
              </span>
            </div>

            <strong className="auctioneer-panel-value">
              {activeLot?.name || 'No lot on the floor'}
            </strong>
            <p className="auctioneer-panel-copy">
              {activeLot
                ? currentLeader
                  ? `${currentLeader.name} is leading at ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}.`
                  : `Current bid is ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}.`
                : isPhysical
                  ? 'The floor is clear. Select a queued player and bring them up when the room is ready.'
                  : 'The room is waiting for the next live lot.'}
            </p>

            <div className="auctioneer-panel-actions">
              {activeLot ? (
                <>
                  {activeLot.auctionStatus === 'paused' ? (
                    <button
                      type="button"
                      className="auctioneer-panel-btn is-success"
                      onClick={onResume}
                      disabled={busy}
                    >
                      <Play size={15} />
                      Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="auctioneer-panel-btn is-warning"
                      onClick={onPause}
                      disabled={busy}
                    >
                      <Pause size={15} />
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-neutral"
                    onClick={onDeactivate}
                    disabled={busy}
                  >
                    <SkipForward size={15} />
                    Re-queue lot
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="auctioneer-panel-btn is-gold"
                  onClick={activateSelectedLot}
                  disabled={busy || !selectedLot || selectedLotNeedsIncrement}
                >
                  <Gavel size={15} />
                  {selectedLot ? `Bring ${selectedLot.name}` : 'No queued lot'}
                </button>
              )}
            </div>
          </section>

          <section className="auctioneer-panel-card">
            <div className="auctioneer-panel-card-head">
              <div>
                <span className="auctioneer-panel-label">Room authority</span>
                <strong className="auctioneer-panel-card-title">Critical actions</strong>
              </div>
              <span className="auctioneer-panel-meta">
                <CircleDot size={14} />
                {tournament?.status || 'upcoming'}
              </span>
            </div>

            <p className="auctioneer-panel-copy">
              {isPhysical
                ? 'This room is in auctioneer-led mode. Every pause, winner, pass, and next lot is controlled here.'
                : 'This room supports live franchise bidding, but final room authority remains with the auctioneer.'}
            </p>

            <div className="auctioneer-panel-actions">
              <button
                type="button"
                className="auctioneer-panel-btn is-purple"
                onClick={onUndo}
                disabled={busy || !undoAvailable}
              >
                <RotateCcw size={15} />
                Undo last action
              </button>
              <button
                type="button"
                className="auctioneer-panel-btn is-danger"
                onClick={onOpenEndAuction}
                disabled={busy || Boolean(activeLot)}
              >
                <Gavel size={15} />
                End auction
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="auctioneer-panel-feed">
        <div className="auctioneer-panel-card-head">
          <div>
            <span className="auctioneer-panel-label">Recent floor activity</span>
            <strong className="auctioneer-panel-card-title">Recent room events</strong>
          </div>
          <span className="auctioneer-panel-meta">{panelEvents.length} events</span>
        </div>
        {panelEvents.length > 0 ? (
          <ul className="auctioneer-panel-feed-list">
            {panelEvents.map((item) => (
              <li key={item.id} className="auctioneer-panel-feed-item">
                <span className="auctioneer-panel-feed-type">{item.type}</span>
                <span className="auctioneer-panel-feed-text">
                  {describeFeedItem(item, tournament?.currency || 'INR')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="auctioneer-panel-copy">
            No live activity yet. Once the room starts moving, auction actions will be logged here.
          </p>
        )}
      </section>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  return (
    <article className={`auctioneer-panel-metric is-${tone}`}>
      <div className="auctioneer-panel-metric-icon">
        <Icon size={16} />
      </div>
      <span className="auctioneer-panel-label">{label}</span>
      <strong className="auctioneer-panel-metric-value">{value}</strong>
      <p className="auctioneer-panel-copy">{hint}</p>
    </article>
  )
}

function describeFeedItem(item, currency) {
  switch (item.type) {
    case 'bid':
      return `${item.franchiseName || item.actor} bid ${formatPurse(item.amount, currency)} on ${item.lotName || 'the current lot'}.`
    case 'hammered':
      return `${item.lotName || 'Lot'} sold for ${formatPurse(item.amount, currency)}.`
    case 'activated':
      return `${item.lotName || 'Lot'} was brought to the floor.`
    case 'passed':
      return `${item.lotName || 'Lot'} was marked unsold.`
    case 'paused':
      return 'Auction paused.'
    case 'resumed':
      return 'Auction resumed.'
    case 'undone':
      return `Last action was undone${item.action ? ` (${item.action})` : ''}.`
    case 'deactivated':
      return 'Current lot was returned to the queue.'
    default:
      return item.lotName || 'Room activity updated.'
  }
}
