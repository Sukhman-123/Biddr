const Tournament = require('../models/Tournament');
const Lot = require('../models/Lot');

const EXPORT_TYPES = new Set(['summary', 'squads', 'players', 'bid-history']);

const isOwner = (tournament, user) =>
  user && tournament.ownerId.toString() === user._id.toString();

const safeCell = (value) => {
  if (value === null || value === undefined) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const toCsv = (rows) => rows.map((row) => row.map(safeCell).join(',')).join('\n');

const slugify = (value) =>
  String(value || 'tournament')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'tournament';

const findFranchiseName = (franchiseById, id) =>
  id ? franchiseById.get(String(id))?.name || '' : '';

const buildSummaryRows = (tournament, lots) => {
  const soldLots = lots.filter((lot) => lot.status === 'sold');
  const unsoldLots = lots.filter((lot) => lot.status === 'unsold');
  const queuedLots = lots.filter((lot) => lot.status === 'queued');
  const totalSpend = soldLots.reduce((sum, lot) => sum + Number(lot.soldPrice || 0), 0);
  const highestSale = soldLots.reduce((max, lot) => Math.max(max, Number(lot.soldPrice || 0)), 0);
  const totalBids = lots.reduce((sum, lot) => sum + (lot.bidHistory || []).length, 0);
  const completion = lots.length > 0 ? Math.round(((soldLots.length + unsoldLots.length) / lots.length) * 100) : 0;

  return [
    ['Metric', 'Value'],
    ['Tournament', tournament.name],
    ['Short code', tournament.shortCode],
    ['Status', tournament.status],
    ['Auction mode', tournament.auctionMode || 'remote'],
    ['Currency', tournament.currency],
    ['Teams', tournament.franchises?.length || 0],
    ['Players total', lots.length],
    ['Players sold', soldLots.length],
    ['Players unsold', unsoldLots.length],
    ['Players queued', queuedLots.length],
    ['Completion %', completion],
    ['Total spend', totalSpend],
    ['Average sold price', soldLots.length ? Math.round(totalSpend / soldLots.length) : 0],
    ['Highest sale', highestSale],
    ['Total bids recorded', totalBids],
    ['Exported at', new Date().toISOString()],
  ];
};

const buildSquadRows = (tournament, lots) => {
  const rows = [
    [
      'Team',
      'City',
      'Player',
      'Role',
      'Country',
      'Set',
      'Base price',
      'Sold price',
      'Squad size',
      'Max squad',
      'Initial purse',
      'Spent',
      'Remaining purse',
    ],
  ];

  const soldByFranchise = lots
    .filter((lot) => lot.status === 'sold' && lot.soldToFranchiseId)
    .reduce((map, lot) => {
      const key = String(lot.soldToFranchiseId);
      map.set(key, [...(map.get(key) || []), lot]);
      return map;
    }, new Map());

  (tournament.franchises || []).forEach((franchise) => {
    const franchiseId = franchise._id.toString();
    const teamLots = soldByFranchise.get(franchiseId) || [];
    const wallet = franchise.wallet || {};
    const squad = franchise.squad || {};
    const baseColumns = [
      franchise.name,
      franchise.city || '',
      null,
      null,
      null,
      null,
      null,
      null,
      squad.playerIds?.length || 0,
      squad.maxSize || 11,
      wallet.initial || 0,
      wallet.spent || 0,
      (wallet.initial || 0) - (wallet.spent || 0),
    ];

    if (teamLots.length === 0) {
      rows.push(baseColumns);
      return;
    }

    teamLots
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((lot) => {
        rows.push([
          franchise.name,
          franchise.city || '',
          lot.name,
          lot.style,
          lot.country,
          lot.set,
          lot.basePrice,
          lot.soldPrice || 0,
          squad.playerIds?.length || teamLots.length,
          squad.maxSize || 11,
          wallet.initial || 0,
          wallet.spent || 0,
          (wallet.initial || 0) - (wallet.spent || 0),
        ]);
      });
  });

  return rows;
};

const buildPlayerRows = (tournament, lots) => {
  const franchiseById = new Map((tournament.franchises || []).map((franchise) => [
    franchise._id.toString(),
    { name: franchise.name },
  ]));

  return [
    [
      'Player',
      'Role',
      'Country',
      'Set',
      'Status',
      'Auction status',
      'Base price',
      'Bid increment',
      'Current bid',
      'Winner',
      'Sold price',
      'Bids recorded',
      'Updated at',
    ],
    ...lots.map((lot) => [
      lot.name,
      lot.style,
      lot.country,
      lot.set,
      lot.status,
      lot.auctionStatus,
      lot.basePrice,
      lot.bidIncrement ?? '',
      lot.currentBid || 0,
      findFranchiseName(franchiseById, lot.soldToFranchiseId),
      lot.soldPrice ?? '',
      lot.bidHistory?.length || 0,
      lot.updatedAt,
    ]),
  ];
};

const buildBidHistoryRows = (tournament, lots) => {
  const rows = [
    [
      'Player',
      'Set',
      'Role',
      'Bid #',
      'Franchise',
      'Amount',
      'Entered by',
      'Entered by user id',
      'Bid time',
    ],
  ];

  lots.forEach((lot) => {
    (lot.bidHistory || []).forEach((bid, index) => {
      rows.push([
        lot.name,
        lot.set,
        lot.style,
        index + 1,
        bid.franchiseName,
        bid.amount,
        bid.userFullName || '',
        bid.userId?.toString?.() || '',
        bid.at,
      ]);
    });
  });

  return rows;
};

const buildRowsForType = (type, tournament, lots) => {
  if (type === 'summary') return buildSummaryRows(tournament, lots);
  if (type === 'squads') return buildSquadRows(tournament, lots);
  if (type === 'players') return buildPlayerRows(tournament, lots);
  return buildBidHistoryRows(tournament, lots);
};

const exportTournamentCsv = async (req, res, next) => {
  try {
    const { id, kind } = req.params;
    if (!EXPORT_TYPES.has(kind)) {
      return res.status(404).json({ message: 'Export type not found' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (!isOwner(tournament, req.user)) {
      return res.status(403).json({ message: 'Only the host can export analytics reports' });
    }

    const lots = await Lot.find({ tournamentId: tournament._id })
      .sort({ set: 1, name: 1 })
      .lean();
    const csv = `${toCsv(buildRowsForType(kind, tournament, lots))}\n`;
    const filename = `${slugify(tournament.shortCode || tournament.name)}-${kind}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  exportTournamentCsv,
};
