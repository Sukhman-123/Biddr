import {
  AlertTriangle,
  BrainCircuit,
  Gauge,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './AuctionIntelligencePanel.css'

const ADVICE_COPY = {
  BID: 'You can place the next bid.',
  CAUTION: 'Bid carefully. Your budget or squad balance may be affected.',
  PASS: 'Skip this bid. It may hurt your budget or squad balance.',
}

export default function AuctionIntelligencePanel({
  intelligence,
  franchises,
  selectedFranchiseId,
  onSelectFranchise,
  canSelectFranchise,
  currency = 'INR',
  loading = false,
  error = null,
  onRetry,
}) {
  return (
    <section className="auction-intelligence" aria-label="Auction intelligence">
      <header className="auction-intelligence-head">
        <div className="auction-intelligence-title-wrap">
          <span className="auction-intelligence-icon" aria-hidden="true">
            <BrainCircuit size={19} />
          </span>
          <div>
            <span className="auction-intelligence-eyebrow">Live decision support</span>
            <h2>Auction intelligence</h2>
          </div>
        </div>

        {canSelectFranchise ? (
          <label className="auction-intelligence-team">
            <span>Team</span>
            <select
              value={selectedFranchiseId}
              onChange={(event) => onSelectFranchise?.(event.target.value)}
              aria-label="Intelligence franchise"
            >
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="auction-intelligence-franchise">
            {intelligence?.franchise?.name || franchises[0]?.name || 'Your franchise'}
          </span>
        )}
      </header>

      {loading ? (
        <div className="auction-intelligence-loading" role="status">
          <span />
          <span />
          <span />
          Calculating live context…
        </div>
      ) : error ? (
        <div className="auction-intelligence-error">
          <AlertTriangle size={18} />
          <p>{error.message || 'Could not calculate auction intelligence.'}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : intelligence ? (
        <IntelligenceResult intelligence={intelligence} currency={currency} />
      ) : null}
    </section>
  )
}

function IntelligenceResult({ intelligence, currency }) {
  const advice = intelligence.advice || 'CAUTION'
  const score = Math.max(0, Math.min(100, intelligence.roleBalanceScore || 0))
  const scarcity = intelligence.role?.scarcityLevel || 'low'

  return (
    <div className="auction-intelligence-body">
      <div className="auction-intelligence-verdict">
        <div>
          <span className={`auction-advice is-${advice.toLowerCase()}`}>{advice}</span>
          <p>{ADVICE_COPY[advice]}</p>
        </div>
        <div className="auction-max-bid">
          <span>Recommended maximum</span>
          <strong>{formatPurse(intelligence.recommendedMaximumBid, currency)}</strong>
          <small>Next bid {formatPurse(intelligence.nextBid, currency)}</small>
        </div>
      </div>

      <div className="auction-intelligence-metrics">
        <article>
          <Gauge size={16} />
          <span>Role balance</span>
          <strong>{score}/100</strong>
          <div className="auction-score-track" aria-label={`Role balance score ${score} out of 100`}>
            <span style={{ width: `${score}%` }} />
          </div>
        </article>
        <article>
          <ShieldCheck size={16} />
          <span>Required reserve</span>
          <strong>{formatPurse(intelligence.purse?.requiredReserve || 0, currency)}</strong>
          <small>{intelligence.purse?.remainingSlots || 0} squad slots open</small>
        </article>
        <article>
          <TrendingUp size={16} />
          <span>Contextual ceiling</span>
          <strong>{formatPurse(intelligence.contextualValue || 0, currency)}</strong>
          <small>{formatPurse(intelligence.purse?.remaining || 0, currency)} purse left</small>
        </article>
        <article>
          <Users size={16} />
          <span>Role scarcity</span>
          <strong className={`scarcity-${scarcity}`}>{scarcity}</strong>
          <small>
            {intelligence.role?.available || 0} available · {intelligence.role?.totalProjectedNeed || 0} projected needs
          </small>
        </article>
      </div>

      {intelligence.warnings?.length > 0 ? (
        <div className="auction-intelligence-warnings" aria-label="Auction warnings">
          {intelligence.warnings.map((warning) => (
            <div key={warning.code} className={`auction-warning is-${warning.severity}`}>
              <AlertTriangle size={15} />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="auction-intelligence-reasons">
        {(intelligence.reasons || []).map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <p className="auction-intelligence-note">
        Based on auction context, default role balance, and current purse data.
      </p>
    </div>
  )
}
