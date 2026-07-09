import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Filter,
  Plus,
  Save,
  Search,
  Settings2,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import { VALID_CURRENCIES } from '../../tournaments/createTournament.validation'
import { formatPurse } from '../../tournaments/tournament.utils'
import FranchiseMembers from '../../franchise/FranchiseMembers'
import './AuctionSetupDesk.css'

const LOT_STYLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']
const DEFAULT_FRANCHISE_COLOR = '#f5b94a'
const SETUP_TABS = [
  { id: 'settings', label: 'Room', icon: Settings2 },
  { id: 'teams', label: 'Teams', icon: Building2 },
  { id: 'players', label: 'Players', icon: Shield },
]
const PLAYER_FILTERS = ['all', 'queued', 'sold', 'unsold']

const makeFranchiseDraft = (franchise = null, index = 0) => ({
  id: franchise?.id || `draft-franchise-${index}-${Math.random().toString(36).slice(2, 8)}`,
  name: franchise?.name || '',
  city: franchise?.city || '',
  colorHex: franchise?.colorHex || DEFAULT_FRANCHISE_COLOR,
  wallet: {
    initial: String(franchise?.wallet?.initial ?? 0),
    spent: String(franchise?.wallet?.spent ?? 0),
  },
  squad: {
    maxSize: String(franchise?.squad?.maxSize ?? 11),
    playerIds: franchise?.squad?.playerIds || [],
  },
})

const makeLotDraft = (lot = null) => ({
  id: lot?.id || '',
  name: lot?.name || '',
  style: lot?.style || 'Batsman',
  country: lot?.country || '',
  basePrice: String(lot?.basePrice ?? ''),
  photoUrl: lot?.photoUrl || '',
  set: lot?.set || 'Squad',
  bidIncrement: lot?.bidIncrement != null ? String(lot.bidIncrement) : '',
  status: lot?.status || 'queued',
  soldToFranchiseId: lot?.soldToFranchiseId || '',
  soldPrice: lot?.soldPrice != null ? String(lot.soldPrice) : '',
})

const makeNewLotDraft = () => ({
  name: '',
  style: 'Batsman',
  country: '',
  basePrice: '',
  photoUrl: '',
  set: 'Squad',
  bidIncrement: '',
})

export default function AuctionSetupDesk({
  tournamentId,
  tournament,
  lots,
  isHost,
  currentUserId,
  busy,
  onSaveTournament,
  onSaveFranchises,
  onCreateLot,
  onUpdateLot,
  onDeleteLot,
}) {
  const [activeTab, setActiveTab] = useState('settings')
  const [settingsDraft, setSettingsDraft] = useState(() => buildSettingsDraft(tournament))
  const [franchiseDrafts, setFranchiseDrafts] = useState(() =>
    (tournament?.franchises || []).map((franchise, index) => makeFranchiseDraft(franchise, index)),
  )
  const [lotDrafts, setLotDrafts] = useState(() => (lots || []).map((lot) => makeLotDraft(lot)))
  const [newLotDraft, setNewLotDraft] = useState(makeNewLotDraft)
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(null)
  const [selectedLotId, setSelectedLotId] = useState(null)
  const [expandedFranchiseId, setExpandedFranchiseId] = useState(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerStatusFilter, setPlayerStatusFilter] = useState('all')
  const [showNewPlayer, setShowNewPlayer] = useState(false)

  useEffect(() => {
    setSettingsDraft(buildSettingsDraft(tournament))
  }, [tournament])

  useEffect(() => {
    setFranchiseDrafts(
      (tournament?.franchises || []).map((franchise, index) => makeFranchiseDraft(franchise, index)),
    )
  }, [tournament?.franchises])

  useEffect(() => {
    setLotDrafts((lots || []).map((lot) => makeLotDraft(lot)))
  }, [lots])

  useEffect(() => {
    if (!franchiseDrafts.length) {
      setSelectedFranchiseId(null)
      return
    }
    if (!franchiseDrafts.some((franchise) => franchise.id === selectedFranchiseId)) {
      setSelectedFranchiseId(franchiseDrafts[0].id)
    }
  }, [franchiseDrafts, selectedFranchiseId])

  useEffect(() => {
    if (!lotDrafts.length) {
      setSelectedLotId(null)
      return
    }
    if (!lotDrafts.some((lot) => lot.id === selectedLotId)) {
      setSelectedLotId(lotDrafts[0].id)
    }
  }, [lotDrafts, selectedLotId])

  const persistedFranchiseIds = useMemo(
    () => new Set((tournament?.franchises || []).map((franchise) => franchise.id)),
    [tournament?.franchises],
  )

  const counts = useMemo(
    () => ({
      teams: franchiseDrafts.filter((franchise) => franchise.name.trim()).length,
      queued: (lots || []).filter((lot) => lot.status === 'queued').length,
      sold: (lots || []).filter((lot) => lot.status === 'sold').length,
      unsold: (lots || []).filter((lot) => lot.status === 'unsold').length,
    }),
    [franchiseDrafts, lots],
  )

  const selectedFranchise = franchiseDrafts.find((franchise) => franchise.id === selectedFranchiseId)
  const selectedLot = lotDrafts.find((lot) => lot.id === selectedLotId)
  const visibleLots = useMemo(() => {
    const query = playerSearch.trim().toLowerCase()
    return lotDrafts.filter((lot) => {
      const matchesStatus = playerStatusFilter === 'all' || lot.status === playerStatusFilter
      const haystack = `${lot.name} ${lot.country} ${lot.style} ${lot.set}`.toLowerCase()
      return matchesStatus && (!query || haystack.includes(query))
    })
  }, [lotDrafts, playerSearch, playerStatusFilter])

  if (!isHost) {
    return null
  }

  const updateFranchise = (franchiseId, updater) => {
    setFranchiseDrafts((current) =>
      current.map((franchise) => (franchise.id === franchiseId ? updater(franchise) : franchise)),
    )
  }

  const updateLot = (lotId, patch) => {
    setLotDrafts((current) =>
      current.map((lot) => (lot.id === lotId ? { ...lot, ...patch } : lot)),
    )
  }

  return (
    <section className="setup-desk" aria-label="Auction room setup desk">
      <header className="setup-shell">
        <div className="setup-shell-main">
          <span className="setup-desk-eyebrow">Auction Room Setup</span>
          <h2>{tournament?.name || 'Auction setup'}</h2>
          <div className="setup-tabs" role="tablist" aria-label="Auction setup sections">
            {SETUP_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`setup-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="setup-desk-stats" aria-label="Auction setup summary">
          <article>
            <span>Teams</span>
            <strong>{counts.teams}</strong>
          </article>
          <article>
            <span>Queued</span>
            <strong>{counts.queued}</strong>
          </article>
          <article>
            <span>Sold</span>
            <strong>{counts.sold}</strong>
          </article>
        </div>
      </header>

      {activeTab === 'settings' ? (
        <section className="setup-workspace">
          <header className="setup-toolbar">
            <div>
              <span className="setup-card-label">
                <Settings2 size={15} />
                Room configuration
              </span>
              <h3>Settings</h3>
            </div>
            <button
              type="button"
              className="setup-save-btn"
              onClick={() => onSaveTournament?.(buildTournamentPayload(settingsDraft))}
              disabled={busy}
            >
              <Save size={15} />
              Save settings
            </button>
          </header>

          <div className="setup-form-grid is-wide">
            <label className="setup-field setup-field-wide">
              <span>Tournament name</span>
              <input
                type="text"
                value={settingsDraft.name}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, name: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Region</span>
              <input
                type="text"
                value={settingsDraft.region}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, region: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Currency</span>
              <select
                value={settingsDraft.currency}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, currency: event.target.value }))}
                disabled={busy}
              >
                {VALID_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="setup-field">
              <span>Purse per franchise</span>
              <input
                type="number"
                min="0"
                value={settingsDraft.pursePerFranchise}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, pursePerFranchise: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Auction mode</span>
              <select
                value={settingsDraft.auctionMode}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, auctionMode: event.target.value }))}
                disabled={busy}
              >
                <option value="physical">Physical</option>
                <option value="remote">Remote</option>
              </select>
            </label>
            <label className="setup-field">
              <span>Visibility</span>
              <select
                value={settingsDraft.visibility}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, visibility: event.target.value }))}
                disabled={busy}
              >
                <option value="public">Public</option>
                <option value="invite-only">Invite-only</option>
              </select>
            </label>
            <label className="setup-field">
              <span>Start date</span>
              <input
                type="datetime-local"
                value={settingsDraft.startDate}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, startDate: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>End date</span>
              <input
                type="datetime-local"
                value={settingsDraft.endDate}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, endDate: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Min bid increment</span>
              <input
                type="number"
                min="0"
                value={settingsDraft.minBidIncrement}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, minBidIncrement: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Auto extend seconds</span>
              <input
                type="number"
                min="0"
                value={settingsDraft.autoExtendSeconds}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, autoExtendSeconds: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field">
              <span>Default max squad size</span>
              <input
                type="number"
                min="1"
                value={settingsDraft.maxSquadSize}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, maxSquadSize: event.target.value }))}
                disabled={busy}
              />
            </label>
            <label className="setup-field is-checkbox">
              <input
                type="checkbox"
                checked={settingsDraft.allowReAuction}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, allowReAuction: event.target.checked }))}
                disabled={busy}
              />
              <span>Allow re-auction for unsold players</span>
            </label>
          </div>
        </section>
      ) : null}

      {activeTab === 'teams' ? (
        <section className="setup-workspace">
          <header className="setup-toolbar">
            <div>
              <span className="setup-card-label">
                <Building2 size={15} />
                Franchise setup
              </span>
              <h3>Teams and owners</h3>
            </div>
            <div className="setup-card-actions">
              <button
                type="button"
                className="setup-ghost-btn"
                onClick={() => {
                  const newFranchise = makeFranchiseDraft(null, franchiseDrafts.length)
                  setFranchiseDrafts((current) => [...current, newFranchise])
                  setSelectedFranchiseId(newFranchise.id)
                }}
                disabled={busy}
              >
                <Plus size={15} />
                Add team
              </button>
              <button
                type="button"
                className="setup-save-btn"
                onClick={() => onSaveFranchises?.(buildFranchisePayload(franchiseDrafts))}
                disabled={busy}
              >
                <Save size={15} />
                Save teams
              </button>
            </div>
          </header>

          <div className="setup-split">
            <div className="setup-list-panel" role="listbox" aria-label="Franchises">
              {franchiseDrafts.map((franchise, index) => (
                <button
                  key={franchise.id}
                  type="button"
                  className={`setup-list-row ${selectedFranchiseId === franchise.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedFranchiseId(franchise.id)}
                >
                  <span className="setup-franchise-badge" style={{ background: franchise.colorHex }}>
                    {franchise.name?.charAt(0) || index + 1}
                  </span>
                  <span>
                    <strong>{franchise.name || `Franchise ${index + 1}`}</strong>
                    <small>
                      {formatPurse(Number(franchise.wallet.initial || 0), settingsDraft.currency || 'INR', {
                        compact: true,
                      })}{' '}
                      purse
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div className="setup-editor-panel">
              {selectedFranchise ? (
                <>
                  {!persistedFranchiseIds.has(selectedFranchise.id) ? (
                    <p className="setup-card-note">Save this team first, then assign members.</p>
                  ) : null}
                  <div className="setup-editor-head">
                    <div className="setup-franchise-title">
                      <span className="setup-franchise-badge" style={{ background: selectedFranchise.colorHex }}>
                        {selectedFranchise.name?.charAt(0) || 'T'}
                      </span>
                      <div>
                        <strong>{selectedFranchise.name || 'New franchise'}</strong>
                        <span>{selectedFranchise.city || 'No city set'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="setup-icon-btn danger"
                      onClick={() => {
                        setFranchiseDrafts((current) =>
                          current.filter((entry) => entry.id !== selectedFranchise.id),
                        )
                        setExpandedFranchiseId(null)
                      }}
                      disabled={busy || franchiseDrafts.length <= 2}
                      title="Remove franchise"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="setup-form-grid">
                    <label className="setup-field">
                      <span>Team name</span>
                      <input
                        type="text"
                        value={selectedFranchise.name}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            name: event.target.value,
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                    <label className="setup-field">
                      <span>City</span>
                      <input
                        type="text"
                        value={selectedFranchise.city}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            city: event.target.value,
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                    <label className="setup-field">
                      <span>Color</span>
                      <input
                        type="color"
                        value={selectedFranchise.colorHex}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            colorHex: event.target.value,
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                    <label className="setup-field">
                      <span>Wallet initial</span>
                      <input
                        type="number"
                        min="0"
                        value={selectedFranchise.wallet.initial}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            wallet: { ...entry.wallet, initial: event.target.value },
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                    <label className="setup-field">
                      <span>Wallet spent</span>
                      <input
                        type="number"
                        min="0"
                        value={selectedFranchise.wallet.spent}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            wallet: { ...entry.wallet, spent: event.target.value },
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                    <label className="setup-field">
                      <span>Max squad size</span>
                      <input
                        type="number"
                        min="1"
                        value={selectedFranchise.squad.maxSize}
                        onChange={(event) =>
                          updateFranchise(selectedFranchise.id, (entry) => ({
                            ...entry,
                            squad: { ...entry.squad, maxSize: event.target.value },
                          }))
                        }
                        disabled={busy}
                      />
                    </label>
                  </div>

                  {persistedFranchiseIds.has(selectedFranchise.id) ? (
                    <>
                      <button
                        type="button"
                        className="setup-members-toggle"
                        onClick={() =>
                          setExpandedFranchiseId((current) =>
                            current === selectedFranchise.id ? null : selectedFranchise.id,
                          )
                        }
                      >
                        <Users size={15} />
                        {expandedFranchiseId === selectedFranchise.id ? 'Hide members' : 'Manage members'}
                      </button>
                      {expandedFranchiseId === selectedFranchise.id ? (
                        <div className="setup-members-panel">
                          <FranchiseMembers
                            tournamentId={tournamentId}
                            franchise={
                              tournament?.franchises?.find((entry) => entry.id === selectedFranchise.id) ||
                              selectedFranchise
                            }
                            isTournamentHost={isHost}
                            currentUserId={currentUserId}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <p className="setup-empty">Add a team to start editing.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'players' ? (
        <section className="setup-workspace">
          <header className="setup-toolbar">
            <div>
              <span className="setup-card-label">
                <Shield size={15} />
                Player pool
              </span>
              <h3>Players</h3>
            </div>
            <button
              type="button"
              className="setup-ghost-btn"
              onClick={() => setShowNewPlayer((current) => !current)}
              disabled={busy}
            >
              <Plus size={15} />
              {showNewPlayer ? 'Close form' : 'Add player'}
            </button>
          </header>

          {showNewPlayer ? (
            <div className="setup-create-drawer">
              <PlayerForm
                lot={newLotDraft}
                busy={busy}
                currency={settingsDraft.currency}
                franchises={tournament?.franchises || []}
                onChange={(patch) => setNewLotDraft((current) => ({ ...current, ...patch }))}
                showSaleFields={false}
              />
              <button
                type="button"
                className="setup-save-btn"
                onClick={async () => {
                  const created = await onCreateLot?.({
                    ...newLotDraft,
                    basePrice: Number(newLotDraft.basePrice || 0),
                    bidIncrement:
                      newLotDraft.bidIncrement === '' ? null : Number(newLotDraft.bidIncrement),
                  })
                  if (created) {
                    setNewLotDraft(makeNewLotDraft())
                    setShowNewPlayer(false)
                  }
                }}
                disabled={busy || !newLotDraft.name.trim() || !newLotDraft.country.trim() || !newLotDraft.basePrice}
              >
                <Plus size={15} />
                Add player
              </button>
            </div>
          ) : null}

          <div className="setup-player-tools">
            <label className="setup-search">
              <Search size={16} />
              <input
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Search players"
              />
            </label>
            <div className="setup-filter-group" aria-label="Player status filter">
              <Filter size={15} />
              {PLAYER_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={playerStatusFilter === filter ? 'is-active' : ''}
                  onClick={() => setPlayerStatusFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-split">
            <div className="setup-list-panel" role="listbox" aria-label="Players">
              {visibleLots.map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  className={`setup-list-row ${selectedLotId === lot.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedLotId(lot.id)}
                >
                  <span className={`setup-status-dot is-${lot.status}`} />
                  <span>
                    <strong>{lot.name || 'Untitled player'}</strong>
                    <small>
                      {lot.style} · {lot.country || 'Country'} ·{' '}
                      {formatPurse(Number(lot.basePrice || 0), settingsDraft.currency || 'INR', {
                        compact: true,
                      })}
                    </small>
                  </span>
                </button>
              ))}
              {visibleLots.length === 0 ? <p className="setup-empty">No players match this view.</p> : null}
            </div>

            <div className="setup-editor-panel">
              {selectedLot ? (
                <>
                  <div className="setup-editor-head">
                    <div>
                      <strong>{selectedLot.name || 'Untitled player'}</strong>
                      <span>
                        {selectedLot.status} · {selectedLot.set || 'Squad'}
                      </span>
                    </div>
                    <div className="setup-card-actions">
                      <button
                        type="button"
                        className="setup-save-btn"
                        onClick={() =>
                          onUpdateLot?.(selectedLot.id, {
                            name: selectedLot.name,
                            style: selectedLot.style,
                            country: selectedLot.country,
                            basePrice: Number(selectedLot.basePrice || 0),
                            photoUrl: selectedLot.photoUrl,
                            set: selectedLot.set,
                            bidIncrement:
                              selectedLot.bidIncrement === '' ? null : Number(selectedLot.bidIncrement),
                            status: selectedLot.status,
                            soldToFranchiseId: selectedLot.soldToFranchiseId || null,
                            soldPrice: selectedLot.soldPrice === '' ? null : Number(selectedLot.soldPrice),
                          })
                        }
                        disabled={busy}
                      >
                        <Save size={15} />
                        Save
                      </button>
                      <button
                        type="button"
                        className="setup-icon-btn danger"
                        onClick={() => onDeleteLot?.(selectedLot.id)}
                        disabled={busy}
                        title="Delete player"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <PlayerForm
                    lot={selectedLot}
                    busy={busy}
                    currency={settingsDraft.currency}
                    franchises={tournament?.franchises || []}
                    onChange={(patch) => updateLot(selectedLot.id, patch)}
                    showSaleFields
                  />
                </>
              ) : (
                <p className="setup-empty">Select a player to edit.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </section>
  )
}

function PlayerForm({ lot, busy, franchises, onChange, showSaleFields }) {
  return (
    <div className="setup-form-grid">
      <label className="setup-field">
        <span>Name</span>
        <input
          type="text"
          value={lot.name}
          onChange={(event) => onChange({ name: event.target.value })}
          disabled={busy}
        />
      </label>
      <label className="setup-field">
        <span>Style</span>
        <select
          value={lot.style}
          onChange={(event) => onChange({ style: event.target.value })}
          disabled={busy}
        >
          {LOT_STYLES.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </label>
      <label className="setup-field">
        <span>Country</span>
        <input
          type="text"
          value={lot.country}
          onChange={(event) => onChange({ country: event.target.value })}
          disabled={busy}
        />
      </label>
      <label className="setup-field">
        <span>Base price</span>
        <input
          type="number"
          min="0"
          value={lot.basePrice}
          onChange={(event) => onChange({ basePrice: event.target.value })}
          disabled={busy}
        />
      </label>
      <label className="setup-field">
        <span>Set</span>
        <input
          type="text"
          value={lot.set}
          onChange={(event) => onChange({ set: event.target.value })}
          disabled={busy}
        />
      </label>
      <label className="setup-field">
        <span>Bid increment</span>
        <input
          type="number"
          min="0"
          value={lot.bidIncrement}
          onChange={(event) => onChange({ bidIncrement: event.target.value })}
          disabled={busy}
        />
      </label>
      {showSaleFields ? (
        <>
          <label className="setup-field">
            <span>Status</span>
            <select
              value={lot.status}
              onChange={(event) =>
                onChange({
                  status: event.target.value,
                  soldToFranchiseId: event.target.value === 'sold' ? lot.soldToFranchiseId : '',
                  soldPrice: event.target.value === 'sold' ? lot.soldPrice : '',
                })
              }
              disabled={busy}
            >
              <option value="queued">Queued</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
            </select>
          </label>
          <label className="setup-field">
            <span>Assigned team</span>
            <select
              value={lot.soldToFranchiseId}
              onChange={(event) =>
                onChange({
                  soldToFranchiseId: event.target.value,
                  status: event.target.value ? 'sold' : lot.status === 'sold' ? 'queued' : lot.status,
                })
              }
              disabled={busy}
            >
              <option value="">No team assigned</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </label>
          <label className="setup-field">
            <span>Sold price</span>
            <input
              type="number"
              min="0"
              value={lot.soldPrice}
              onChange={(event) => onChange({ soldPrice: event.target.value, status: 'sold' })}
              disabled={busy}
            />
          </label>
        </>
      ) : null}
      <label className="setup-field setup-field-wide">
        <span>Photo URL</span>
        <input
          type="text"
          value={lot.photoUrl}
          onChange={(event) => onChange({ photoUrl: event.target.value })}
          disabled={busy}
        />
      </label>
    </div>
  )
}

function buildSettingsDraft(tournament) {
  return {
    name: tournament?.name || '',
    region: tournament?.region || '',
    currency: tournament?.currency || 'INR',
    pursePerFranchise: String(tournament?.pursePerFranchise ?? 0),
    visibility: tournament?.visibility || 'public',
    auctionMode: tournament?.auctionMode || 'physical',
    startDate: formatDateTimeLocal(tournament?.startDate),
    endDate: formatDateTimeLocal(tournament?.endDate),
    minBidIncrement: String(tournament?.settings?.minBidIncrement ?? 0),
    autoExtendSeconds: String(tournament?.settings?.autoExtendSeconds ?? 0),
    maxSquadSize: String(tournament?.settings?.maxSquadSize ?? 11),
    allowReAuction: Boolean(tournament?.settings?.allowReAuction),
  }
}

function buildTournamentPayload(draft) {
  return {
    name: draft.name.trim(),
    region: draft.region.trim(),
    currency: draft.currency,
    pursePerFranchise: Number(draft.pursePerFranchise || 0),
    visibility: draft.visibility,
    auctionMode: draft.auctionMode,
    startDate: draft.startDate ? new Date(draft.startDate).toISOString() : null,
    endDate: draft.endDate ? new Date(draft.endDate).toISOString() : null,
    settings: {
      minBidIncrement: Number(draft.minBidIncrement || 0),
      autoExtendSeconds: Number(draft.autoExtendSeconds || 0),
      maxSquadSize: Number(draft.maxSquadSize || 11),
      allowReAuction: Boolean(draft.allowReAuction),
    },
  }
}

function buildFranchisePayload(franchises) {
  return {
    franchises: franchises.map((franchise) => ({
      id: franchise.id,
      name: franchise.name.trim(),
      city: franchise.city.trim(),
      colorHex: franchise.colorHex,
      wallet: {
        initial: Number(franchise.wallet.initial || 0),
        spent: Number(franchise.wallet.spent || 0),
      },
      squad: {
        maxSize: Number(franchise.squad.maxSize || 11),
        playerIds: franchise.squad.playerIds || [],
      },
    })),
  }
}

function formatDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
