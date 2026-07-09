const Tournament = require('../models/Tournament');
const Lot = require('../models/Lot');
const { LOT_STYLES } = require('../models/Lot');
const xlsx = require('xlsx');

const TEMPLATE_COLUMNS = [
  'name',
  'style',
  'country',
  'basePrice',
  'photoUrl',
  'set',
  // bidIncrement is optional. The host can set it per-lot or in bulk;
  // if it's missing on a lot, the server refuses to activate that lot
  // until the host sets it. See /Users/onehash/.claude/plans/spicy-greeting-hickey.md
  // (total-host-control invariant #6).
  'bidIncrement',
];

const TEMPLATE_HEADER_ROW = [
  'name',
  'style',
  'country',
  'basePrice',
  'photoUrl',
  'set',
  'bidIncrement',
];

const TEMPLATE_EXAMPLE_ROW = [
  'Virat Kohli',
  'Batsman',
  'India',
  '2000000',
  'https://example.com/photos/virat-kohli.jpg',
  'Marquee',
  '500000',
];

const PHOTO_RE = /^https?:\/\//i;

const isOwner = (tournament, user) =>
  user && tournament.ownerId.toString() === user._id.toString();

const ensureHost = async (req, res, paramsKey = 'id') => {
  const tournament = await Tournament.findById(req.params[paramsKey]);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return null;
  }
  if (!isOwner(tournament, req.user)) {
    res.status(403).json({ message: 'Only the host can manage the auction pool' });
    return null;
  }
  return tournament;
};

const ensureHostForLot = async (req, res) => {
  const lot = await Lot.findById(req.params.lotId);
  if (!lot) {
    res.status(404).json({ message: 'Lot not found' });
    return null;
  }
  const tournament = await Tournament.findById(lot.tournamentId);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return null;
  }
  if (!isOwner(tournament, req.user)) {
    res.status(403).json({ message: 'Only the host can manage lots' });
    return null;
  }
  return { lot, tournament };
};

const normalizeStyle = (raw) => {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const lookup = cleaned.toLowerCase().replace(/[\s_-]+/g, '');
  for (const style of LOT_STYLES) {
    if (style.toLowerCase().replace(/[\s_-]+/g, '') === lookup) return style;
  }
  return null;
};

const parseBasePrice = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
};

const validateRow = (row, rowNumber) => {
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) {
    return { ok: false, message: 'name is required' };
  }
  if (name.length > 120) {
    return { ok: false, message: 'name must be 120 characters or fewer' };
  }

  const style = normalizeStyle(row.style);
  if (!style) {
    return {
      ok: false,
      message: `style must be one of: ${LOT_STYLES.join(', ')}`,
    };
  }

  const country =
    typeof row.country === 'string' ? row.country.trim() : '';
  if (!country) {
    return { ok: false, message: 'country is required' };
  }
  if (country.length > 80) {
    return { ok: false, message: 'country must be 80 characters or fewer' };
  }

  const basePrice = parseBasePrice(row.basePrice);
  if (basePrice === null) {
    return { ok: false, message: 'basePrice must be a non-negative number' };
  }

  let photoUrl = '';
  if (row.photoUrl !== undefined && row.photoUrl !== null && row.photoUrl !== '') {
    photoUrl = String(row.photoUrl).trim();
    if (photoUrl.length > 600) {
      return { ok: false, message: 'photoUrl must be 600 characters or fewer' };
    }
    if (!PHOTO_RE.test(photoUrl)) {
      return { ok: false, message: 'photoUrl must start with http:// or https://' };
    }
  }

  const set =
    typeof row.set === 'string' && row.set.trim() ? row.set.trim() : 'Squad';
  if (set.length > 60) {
    return { ok: false, message: 'set must be 60 characters or fewer' };
  }

  // bidIncrement is optional. Empty / missing means "host hasn't set
  // it" — keep the field null so the activate endpoint refuses to
  // bring the lot to the floor until the host decides a value.
  let bidIncrement = null;
  if (row.bidIncrement !== undefined && row.bidIncrement !== null && row.bidIncrement !== '') {
    const parsed = Number(row.bidIncrement);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, message: 'bidIncrement must be a non-negative number' };
    }
    bidIncrement = parsed;
  }

  return {
    ok: true,
    data: { name, style, country, basePrice, photoUrl, set, bidIncrement },
  };
};

const rowFromHeader = (headerRow, row) => {
  const out = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const key = headerRow[i];
    if (!key) continue;
    const normalized = String(key).trim();
    if (!TEMPLATE_COLUMNS.includes(normalized)) continue;
    out[normalized] = row[i];
  }
  return out;
};

const parseSpreadsheet = (buffer, filename = '') => {
  const lower = filename.toLowerCase();
  // xlsx.read supports both binary xlsx and csv. The presence of "csv" in
  // the filename is a hint but not required.
  const isCsv = lower.endsWith('.csv');
  const data = isCsv ? buffer.toString('utf8') : buffer;
  const workbook = xlsx.read(data, {
    type: isCsv ? 'string' : 'buffer',
    raw: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const matrix = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });
  if (matrix.length === 0) return [];

  const headerRow = matrix[0].map((c) => String(c || '').trim());
  // Drop a leading empty column if present (some exporters put one in).
  const rows = matrix.slice(1).map((r) => rowFromHeader(headerRow, r));
  return rows;
};

const listLots = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    const lots = await Lot.find({ tournamentId: tournament._id })
      .sort({ set: 1, name: 1 })
      .lean();
    return res.json({
      lots: lots.map((lot) => ({
        id: lot._id.toString(),
        tournamentId: lot.tournamentId.toString(),
        name: lot.name,
        style: lot.style,
        country: lot.country,
        basePrice: lot.basePrice,
        photoUrl: lot.photoUrl,
        set: lot.set,
        status: lot.status,
        auctionStatus: lot.auctionStatus,
        currentBid: lot.currentBid,
        currentBidderFranchiseId: lot.currentBidderFranchiseId,
        bidIncrement: lot.bidIncrement,
        soldToFranchiseId: lot.soldToFranchiseId,
        soldPrice: lot.soldPrice,
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const createLot = async (req, res, next) => {
  try {
    const tournament = await ensureHost(req, res);
    if (!tournament) return;
    const { name, style, country, basePrice, photoUrl, set, bidIncrement } = req.body || {};
    const candidate = { name, style, country, basePrice, photoUrl, set, bidIncrement };
    const validation = validateRow(candidate, 1);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }
    const lot = await Lot.create({
      ...validation.data,
      tournamentId: tournament._id,
      createdById: req.user._id,
    });
    return res.status(201).json({ lot: lot.toJSON() });
  } catch (error) {
    return next(error);
  }
};

const bulkUploadLots = async (req, res, next) => {
  try {
    const tournament = await ensureHost(req, res);
    if (!tournament) return;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Upload a CSV or XLSX file' });
    }
    let rows;
    try {
      rows = parseSpreadsheet(req.file.buffer, req.file.originalname || '');
    } catch (parseError) {
      return res
        .status(400)
        .json({ message: `Could not parse the file: ${parseError.message}` });
    }
    if (rows.length === 0) {
      return res
        .status(400)
        .json({ message: 'The file is empty or has no data rows' });
    }
    if (rows.length > 5000) {
      return res
        .status(400)
        .json({ message: 'A single upload can include up to 5000 rows' });
    }

    const errors = [];
    const validDocs = [];
    rows.forEach((row, idx) => {
      const result = validateRow(row, idx + 2); // +2 because row 1 is the header
      if (!result.ok) {
        errors.push({ row: idx + 2, message: result.message });
        return;
      }
      validDocs.push({
        ...result.data,
        tournamentId: tournament._id,
        createdById: req.user._id,
      });
    });

    let inserted = 0;
    if (validDocs.length > 0) {
      const result = await Lot.insertMany(validDocs, { ordered: false });
      inserted = result.length;
    }

    return res.status(201).json({ created: inserted, errors });
  } catch (error) {
    return next(error);
  }
};

const updateLot = async (req, res, next) => {
  try {
    const found = await ensureHostForLot(req, res);
    if (!found) return;
    const { lot, tournament } = found;
    const {
      name,
      style,
      country,
      basePrice,
      photoUrl,
      set,
      bidIncrement,
      status,
      soldToFranchiseId,
      soldPrice,
    } = req.body || {};
    const candidate = {
      name: name !== undefined ? name : lot.name,
      style: style !== undefined ? style : lot.style,
      country: country !== undefined ? country : lot.country,
      basePrice: basePrice !== undefined ? basePrice : lot.basePrice,
      photoUrl: photoUrl !== undefined ? photoUrl : lot.photoUrl,
      set: set !== undefined ? set : lot.set,
      bidIncrement: bidIncrement !== undefined ? bidIncrement : lot.bidIncrement,
    };
    const validation = validateRow(candidate, 1);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }
    const nextStatus = status !== undefined ? status : lot.status;
    if (!['queued', 'sold', 'unsold'].includes(nextStatus)) {
      return res.status(400).json({ message: 'status must be queued, sold, or unsold' });
    }
    const nextSoldToFranchiseId =
      nextStatus === 'sold' ? (soldToFranchiseId ?? lot.soldToFranchiseId ?? null) : null;
    if (nextStatus === 'sold' && !nextSoldToFranchiseId) {
      return res.status(400).json({ message: 'Pick a franchise before marking a player sold' });
    }
    if (
      nextSoldToFranchiseId &&
      !(tournament.franchises || []).some(
        (franchise) => franchise._id.toString() === nextSoldToFranchiseId,
      )
    ) {
      return res.status(400).json({ message: 'Selected franchise no longer exists' });
    }
    const nextSoldPrice =
      nextStatus === 'sold'
        ? soldPrice !== undefined && soldPrice !== null
          ? Number(soldPrice)
          : lot.soldPrice ?? validation.data.basePrice
        : null;
    if (nextStatus === 'sold' && (!Number.isFinite(nextSoldPrice) || nextSoldPrice < 0)) {
      return res.status(400).json({ message: 'soldPrice must be a non-negative number' });
    }

    const previousSoldFranchiseId = lot.status === 'sold' ? lot.soldToFranchiseId : null;
    const previousSoldPrice = lot.status === 'sold' ? lot.soldPrice ?? 0 : 0;

    if (nextStatus === 'sold' && nextSoldToFranchiseId) {
      const nextFranchise = tournament.franchises.id(nextSoldToFranchiseId);
      if (nextFranchise) {
        const currentSpent = nextFranchise.wallet?.spent || 0;
        const refundablePreviousSale =
          previousSoldFranchiseId === nextSoldToFranchiseId ? previousSoldPrice : 0;
        const remainingAfterRefund =
          (nextFranchise.wallet?.initial || 0) - (currentSpent - refundablePreviousSale);
        if (nextSoldPrice > remainingAfterRefund) {
          return res.status(400).json({
            message: `Insufficient funds. ${remainingAfterRefund.toLocaleString('en-IN')} remaining but sold price is ${Math.round(nextSoldPrice).toLocaleString('en-IN')}.`,
          });
        }

        const squadPlayerIds = nextFranchise.squad?.playerIds || [];
        const alreadyAssigned = squadPlayerIds.some(
          (playerId) => playerId.toString() === lot._id.toString(),
        );
        const maxSquadSize = nextFranchise.squad?.maxSize || 11;
        if (!alreadyAssigned && squadPlayerIds.length >= maxSquadSize) {
          return res.status(400).json({
            message: `Squad is full (${squadPlayerIds.length}/${maxSquadSize}). No more players can be added.`,
          });
        }
      }
    }

    Object.assign(lot, validation.data);
    lot.status = nextStatus;
    lot.soldToFranchiseId = nextSoldToFranchiseId;
    lot.soldPrice = nextStatus === 'sold' ? Math.round(nextSoldPrice) : null;

    if (nextStatus === 'sold') {
      lot.auctionStatus = 'hammered';
    } else {
      lot.currentBidderFranchiseId = null;
      lot.currentBidByUserId = null;
      lot.currentBidAt = null;
      lot.currentBid = 0;
      lot.bidHistory = [];
      lot.auctionStatus = nextStatus === 'queued' ? 'idle' : 'unsold';
    }

    if (previousSoldFranchiseId) {
      const previousFranchise = tournament.franchises.id(previousSoldFranchiseId);
      if (previousFranchise) {
        previousFranchise.wallet.spent = Math.max(
          0,
          (previousFranchise.wallet.spent || 0) - previousSoldPrice,
        );
        previousFranchise.squad.playerIds = (previousFranchise.squad.playerIds || []).filter(
          (playerId) => playerId.toString() !== lot._id.toString(),
        );
      }
    }

    if (nextStatus === 'sold' && nextSoldToFranchiseId) {
      const nextFranchise = tournament.franchises.id(nextSoldToFranchiseId);
      if (nextFranchise) {
        nextFranchise.wallet.spent = (nextFranchise.wallet.spent || 0) + Math.round(nextSoldPrice);
        const alreadyAssigned = (nextFranchise.squad.playerIds || []).some(
          (playerId) => playerId.toString() === lot._id.toString(),
        );
        if (!alreadyAssigned) {
          nextFranchise.squad.playerIds.push(lot._id);
        }
      }
    }

    await tournament.save();
    await lot.save();
    return res.json({ lot: lot.toJSON() });
  } catch (error) {
    return next(error);
  }
};

const deleteLot = async (req, res, next) => {
  try {
    const found = await ensureHostForLot(req, res);
    if (!found) return;
    const { lot, tournament } = found;

    if (lot.status === 'sold' && lot.soldToFranchiseId) {
      const franchise = tournament.franchises.id(lot.soldToFranchiseId);
      if (franchise) {
        franchise.wallet.spent = Math.max(
          0,
          (franchise.wallet.spent || 0) - (lot.soldPrice ?? 0),
        );
        franchise.squad.playerIds = (franchise.squad.playerIds || []).filter(
          (playerId) => playerId.toString() !== lot._id.toString(),
        );
        await tournament.save();
      }
    }
    await lot.deleteOne();
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
};

const streamCsvTemplate = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    const csvRows = [TEMPLATE_HEADER_ROW, TEMPLATE_EXAMPLE_ROW]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="auction-pool-template-${tournament.shortCode.toLowerCase()}.csv"`,
    );
    return res.send(csvRows);
  } catch (error) {
    return next(error);
  }
};

const streamXlsxTemplate = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    const sheet = xlsx.utils.aoa_to_sheet([
      TEMPLATE_HEADER_ROW,
      TEMPLATE_EXAMPLE_ROW,
    ]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Players');
    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="auction-pool-template-${tournament.shortCode.toLowerCase()}.xlsx"`,
    );
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listLots,
  createLot,
  bulkUploadLots,
  updateLot,
  deleteLot,
  streamCsvTemplate,
  streamXlsxTemplate,
  // exposed for tests
  parseSpreadsheet,
  validateRow,
  normalizeStyle,
  parseBasePrice,
  TEMPLATE_COLUMNS,
};
