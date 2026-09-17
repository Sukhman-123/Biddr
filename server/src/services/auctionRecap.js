const getFranchiseId = (franchise) => franchise._id.toString();

const getPlayerSummary = (lot, franchiseById) => ({
  id: lot._id.toString(),
  name: lot.name,
  style: lot.style,
  country: lot.country,
  set: lot.set,
  status: lot.status,
  photoUrl: lot.photoUrl || '',
  basePrice: Number(lot.basePrice || 0),
  soldPrice: lot.soldPrice === null || lot.soldPrice === undefined
    ? null
    : Number(lot.soldPrice),
  winner: lot.soldToFranchiseId
    ? franchiseById.get(String(lot.soldToFranchiseId)) || null
    : null,
  bidCount: Array.isArray(lot.bidHistory) ? lot.bidHistory.length : 0,
  uniqueBidders: new Set(
    (lot.bidHistory || []).map((bid) => String(bid.franchiseId)),
  ).size,
});

function buildAuctionRecap(tournament, lots, user) {
  const franchises = tournament.franchises || [];
  const franchiseById = new Map(franchises.map((franchise) => [
    getFranchiseId(franchise),
    { id: getFranchiseId(franchise), name: franchise.name },
  ]));
  const playerSummaries = lots.map((lot) => getPlayerSummary(lot, franchiseById));
  const winners = playerSummaries
    .filter((player) => player.status === 'sold' && player.soldPrice !== null)
    .sort((left, right) => right.soldPrice - left.soldPrice || left.name.localeCompare(right.name));
  const unsoldPlayers = playerSummaries
    .filter((player) => player.status === 'unsold')
    .sort((left, right) => left.name.localeCompare(right.name));
  const unresolvedPlayers = playerSummaries
    .filter((player) => player.status === 'queued')
    .sort((left, right) => left.name.localeCompare(right.name));

  const playersByFranchise = winners.reduce((map, player) => {
    if (!player.winner) return map;
    const key = player.winner.id;
    map.set(key, [...(map.get(key) || []), player]);
    return map;
  }, new Map());

  const squads = franchises.map((franchise) => {
    const id = getFranchiseId(franchise);
    const initial = Number(franchise.wallet?.initial || 0);
    const spent = Number(franchise.wallet?.spent || 0);
    return {
      id,
      name: franchise.name,
      city: franchise.city || '',
      colorHex: franchise.colorHex || '#f5b94a',
      wallet: {
        initial,
        spent,
        remaining: Math.max(0, initial - spent),
      },
      maxSquadSize: Number(franchise.squad?.maxSize || tournament.settings?.maxSquadSize || 11),
      players: (playersByFranchise.get(id) || [])
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  });

  const highestSale = winners[0] || null;
  const contestedPlayers = playerSummaries
    .filter((player) => player.bidCount > 0)
    .sort((left, right) => (
      right.bidCount - left.bidCount
      || right.uniqueBidders - left.uniqueBidders
      || left.name.localeCompare(right.name)
    ));
  const mostContested = contestedPlayers[0] || null;
  const totalSpend = winners.reduce((sum, player) => sum + player.soldPrice, 0);

  return {
    tournament: {
      id: tournament._id.toString(),
      name: tournament.name,
      shortCode: tournament.shortCode,
      currency: tournament.currency,
      status: tournament.status,
      completedAt: tournament.completedAt,
    },
    summary: {
      totalPlayers: lots.length,
      soldCount: winners.length,
      unsoldCount: unsoldPlayers.length,
      unresolvedCount: unresolvedPlayers.length,
      totalSpend,
      franchiseCount: franchises.length,
    },
    winners,
    squads,
    highestSale,
    mostContested,
    unsoldPlayers,
    unresolvedPlayers,
    canExport: tournament.ownerId.toString() === user._id.toString(),
  };
}

module.exports = { buildAuctionRecap };
