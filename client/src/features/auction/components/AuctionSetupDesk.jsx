import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Plus,
  Save,
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
  members: franchise?.members || [],
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
  const [settingsDraft, setSettingsDraft] = useState(() => buildSettingsDraft(tournament))
  const [franchiseDrafts, setFranchiseDrafts] = useState(() =>
    (tournament?.franchises || []).map((franchise, index) => makeFranchiseDraft(franchise, index)),
  )
  const [lotDrafts, setLotDrafts] = useState(() =>
    (lots || []).map((lot) => makeLotDraft(lot)),
  )
  const [newLotDraft, setNewLotDraft] = useState(makeNewLotDraft)
  const [expandedFranchiseId, setExpandedFranchiseId] = useState(null)

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

  const franchiseCount = franchiseDrafts.filter((franchise) => franchise.name.trim()).length
  const queuedCount = useMemo(
    () => (lots || []).filter((lot) => lot.status === 'queued').length,
    [lots],
  )
  const soldCount = useMemo(
    () => (lots || []).filter((lot) => lot.status === 'sold').length,
    [lots],
  )
  const persistedFranchiseIds = useMemo(
    () => new Set((tournament?.franchises || []).map((franchise) => franchise.id)),
    [tournament?.franchises],
  )

  if (!isHost) {
    return null
  }

  return (
    <section className="setup-desk" aria-label="Auction room setup desk">
      <header className="setup-desk-hero">
        <div>
          <span className="setup-desk-eyebrow">Auction Room Setup</span>
          <h2>Admin workspace for tournament, teams, and player pool</h2>
          <p>
            Changes saved here update the auction room source of truth and flow back to the
            tournament page as well.
          </p>
        </div>
        <div className="setup-desk-stats">
          <article>
            <span>Teams</span>
            <strong>{franchiseCount}</strong>
          </article>
          <article>
            <span>Queued players</span>
            <strong>{queuedCount}</strong>
          </article>
          <article>
            <span>Sold players</span>
            <strong>{soldCount}</strong>
          </article>
        </div>
      </header>

      <div className="setup-desk-grid">
        <section className="setup-card">
          <header className="setup-card-head">
            <div>
              <span className="setup-card-label">
                <Settings2 size={15} />
                Tournament settings
              </span>
              <h3>Room configuration</h3>
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

          <div className="setup-form-grid">
            <label className="setup-field">
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

        <section className="setup-card">
          <header className="setup-card-head">
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
                onClick={() =>
                  setFranchiseDrafts((current) => [...current, makeFranchiseDraft(null, current.length)])
                }
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

          <div className="setup-franchise-list">
            {franchiseDrafts.map((franchise, index) => (
              <article key={franchise.id} className="setup-franchise-card">
                {persistedFranchiseIds.has(franchise.id) ? null : (
                  <p className="setup-card-note">
                    Save this team first, then you can assign members to it.
                  </p>
                )}
                <div className="setup-franchise-head">
                  <div className="setup-franchise-title">
                    <span className="setup-franchise-badge" style={{ background: franchise.colorHex }}>
                      {franchise.name?.charAt(0) || index + 1}
                    </span>
                    <div>
                      <strong>{franchise.name || `Franchise ${index + 1}`}</strong>
                      <span>
                        {formatPurse(Number(franchise.wallet.initial || 0), settingsDraft.currency || 'INR', {
                          compact: true,
                        })}{' '}
                        purse
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="setup-icon-btn danger"
                    onClick={() =>
                      setFranchiseDrafts((current) => current.filter((entry) => entry.id !== franchise.id))
                    }
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
                      value={franchise.name}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="setup-field">
                    <span>City</span>
                    <input
                      type="text"
                      value={franchise.city}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id ? { ...entry, city: event.target.value } : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Color</span>
                    <input
                      type="color"
                      value={franchise.colorHex}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id ? { ...entry, colorHex: event.target.value } : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Wallet initial</span>
                    <input
                      type="number"
                      min="0"
                      value={franchise.wallet.initial}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id
                              ? {
                                  ...entry,
                                  wallet: { ...entry.wallet, initial: event.target.value },
                                }
                              : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Wallet spent</span>
                    <input
                      type="number"
                      min="0"
                      value={franchise.wallet.spent}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id
                              ? {
                                  ...entry,
                                  wallet: { ...entry.wallet, spent: event.target.value },
                                }
                              : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="setup-field">
                    <span>Max squad size</span>
                    <input
                      type="number"
                      min="1"
                      value={franchise.squad.maxSize}
                      onChange={(event) =>
                        setFranchiseDrafts((current) =>
                          current.map((entry) =>
                            entry.id === franchise.id
                              ? {
                                  ...entry,
                                  squad: { ...entry.squad, maxSize: event.target.value },
                                }
                              : entry,
                          ),
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                </div>

                {persistedFranchiseIds.has(franchise.id) ? (
                  <button
                    type="button"
                    className="setup-members-toggle"
                    onClick={() =>
                      setExpandedFranchiseId((current) =>
                        current === franchise.id ? null : franchise.id,
                      )
                    }
                  >
                    <Users size={15} />
                    {expandedFranchiseId === franchise.id ? 'Hide members' : 'Manage members'}
                  </button>
                ) : null}

                {persistedFranchiseIds.has(franchise.id) && expandedFranchiseId === franchise.id ? (
                  <div className="setup-members-panel">
                    <FranchiseMembers
                      tournamentId={tournamentId}
                      franchise={tournament?.franchises?.find((entry) => entry.id === franchise.id) || franchise}
                      isTournamentHost={isHost}
                      currentUserId={currentUserId}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="setup-card">
        <header className="setup-card-head">
          <div>
            <span className="setup-card-label">
              <Shield size={15} />
              Player pool
            </span>
            <h3>Players available in this room</h3>
          </div>
        </header>

        <div className="setup-player-create">
          <label className="setup-field">
            <span>Name</span>
            <input
              type="text"
              value={newLotDraft.name}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, name: event.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="setup-field">
            <span>Style</span>
            <select
              value={newLotDraft.style}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, style: event.target.value }))}
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
              value={newLotDraft.country}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, country: event.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="setup-field">
            <span>Base price</span>
            <input
              type="number"
              min="0"
              value={newLotDraft.basePrice}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, basePrice: event.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="setup-field">
            <span>Set</span>
            <input
              type="text"
              value={newLotDraft.set}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, set: event.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="setup-field">
            <span>Bid increment</span>
            <input
              type="number"
              min="0"
              value={newLotDraft.bidIncrement}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, bidIncrement: event.target.value }))}
              disabled={busy}
            />
          </label>
          <label className="setup-field setup-field-wide">
            <span>Photo URL</span>
            <input
              type="text"
              value={newLotDraft.photoUrl}
              onChange={(event) => setNewLotDraft((current) => ({ ...current, photoUrl: event.target.value }))}
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="setup-save-btn"
            onClick={async () => {
              const created = await onCreateLot?.({
                ...newLotDraft,
                basePrice: Number(newLotDraft.basePrice || 0),
                bidIncrement: newLotDraft.bidIncrement === '' ? null : Number(newLotDraft.bidIncrement),
              })
              if (created) {
                setNewLotDraft(makeNewLotDraft())
              }
            }}
            disabled={busy || !newLotDraft.name.trim() || !newLotDraft.country.trim() || !newLotDraft.basePrice}
          >
            <Plus size={15} />
            Add player
          </button>
        </div>

        <div className="setup-player-list">
          {lotDrafts.map((lot) => (
            <article key={lot.id} className="setup-player-card">
              <div className="setup-player-head">
                <div>
                  <strong>{lot.name || 'Untitled player'}</strong>
                  <span>
                    {lot.status} · {lot.set}
                  </span>
                </div>
                <div className="setup-card-actions">
                  <button
                    type="button"
                    className="setup-save-btn"
                    onClick={() =>
                      onUpdateLot?.(lot.id, {
                        name: lot.name,
                        style: lot.style,
                        country: lot.country,
                        basePrice: Number(lot.basePrice || 0),
                        photoUrl: lot.photoUrl,
                        set: lot.set,
                        bidIncrement: lot.bidIncrement === '' ? null : Number(lot.bidIncrement),
                        status: lot.status,
                        soldToFranchiseId: lot.soldToFranchiseId || null,
                        soldPrice: lot.soldPrice === '' ? null : Number(lot.soldPrice),
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
                    onClick={() => onDeleteLot?.(lot.id)}
                    disabled={busy}
                    title="Delete player"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="setup-form-grid">
                <label className="setup-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={lot.name}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field">
                  <span>Style</span>
                  <select
                    value={lot.style}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, style: event.target.value } : entry,
                        ),
                      )
                    }
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
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, country: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field">
                  <span>Base price</span>
                  <input
                    type="number"
                    min="0"
                    value={lot.basePrice}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, basePrice: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field">
                  <span>Set</span>
                  <input
                    type="text"
                    value={lot.set}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, set: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field">
                  <span>Status</span>
                  <select
                    value={lot.status}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id
                            ? {
                                ...entry,
                                status: event.target.value,
                                soldToFranchiseId:
                                  event.target.value === 'sold' ? entry.soldToFranchiseId : '',
                                soldPrice:
                                  event.target.value === 'sold' ? entry.soldPrice : '',
                              }
                            : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  >
                    <option value="queued">Queued</option>
                    <option value="sold">Sold</option>
                    <option value="unsold">Unsold</option>
                  </select>
                </label>
                <label className="setup-field">
                  <span>Bid increment</span>
                  <input
                    type="number"
                    min="0"
                    value={lot.bidIncrement}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, bidIncrement: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field">
                  <span>Assigned team</span>
                  <select
                    value={lot.soldToFranchiseId}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id
                            ? {
                                ...entry,
                                soldToFranchiseId: event.target.value,
                                status: event.target.value
                                  ? 'sold'
                                  : entry.status === 'sold'
                                    ? 'queued'
                                    : entry.status,
                              }
                            : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  >
                    <option value="">No team assigned</option>
                    {(tournament?.franchises || []).map((franchise) => (
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
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id
                            ? { ...entry, soldPrice: event.target.value, status: 'sold' }
                            : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
                <label className="setup-field setup-field-wide">
                  <span>Photo URL</span>
                  <input
                    type="text"
                    value={lot.photoUrl}
                    onChange={(event) =>
                      setLotDrafts((current) =>
                        current.map((entry) =>
                          entry.id === lot.id ? { ...entry, photoUrl: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
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
