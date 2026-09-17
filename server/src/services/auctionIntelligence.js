const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const roundDownToIncrement = (value, increment) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const safeIncrement = Number.isFinite(increment) && increment > 0 ? increment : 1;
  return Math.floor(value / safeIncrement) * safeIncrement;
};

const getRoleTargets = (maxSquadSize = 11) => {
  const size = Math.max(1, Math.round(maxSquadSize));
  if (size === 1) {
    return { Batsman: 1, Bowler: 0, 'All-rounder': 0, 'Wicket-keeper': 0 };
  }

  const keeper = size >= 4 ? 1 : 0;
  const allRounders = size >= 6 ? Math.max(1, Math.round((size * 2) / 11)) : 0;
  const specialistSlots = Math.max(0, size - keeper - allRounders);
  const batters = Math.ceil(specialistSlots / 2);
  const bowlers = specialistSlots - batters;

  return {
    Batsman: batters,
    Bowler: bowlers,
    'All-rounder': allRounders,
    'Wicket-keeper': keeper,
  };
};

const getSquadRoleCounts = (franchise, lotsById) => {
  const counts = Object.fromEntries(ROLES.map((role) => [role, 0]));
  (franchise.squad?.playerIds || []).forEach((playerId) => {
    const player = lotsById.get(playerId.toString());
    if (player && counts[player.style] !== undefined) counts[player.style] += 1;
  });
  return counts;
};

const getProjectedBalanceScore = ({ counts, targets, role, maxSquadSize }) => {
  const projected = { ...counts, [role]: (counts[role] || 0) + 1 };
  const projectedSize = Object.values(projected).reduce((sum, count) => sum + count, 0);
  if (projectedSize > maxSquadSize) return 0;

  const distributionDifference = ROLES.reduce((sum, item) => {
    const actualShare = projected[item] / Math.max(1, projectedSize);
    const targetShare = targets[item] / Math.max(1, maxSquadSize);
    return sum + Math.abs(actualShare - targetShare);
  }, 0);
  const distributionScore = clamp(100 - distributionDifference * 50, 0, 100);
  const targetForRole = Math.max(1, targets[role] || 0);
  const roleDeficit = Math.max(0, targetForRole - (counts[role] || 0));
  const needScore = clamp((roleDeficit / targetForRole) * 100, 0, 100);

  return Math.round(needScore * 0.65 + distributionScore * 0.35);
};

function calculateAuctionIntelligence({ tournament, lot, lots, franchise }) {
  const lotsById = new Map(lots.map((item) => [item._id.toString(), item]));
  const maxSquadSize = franchise.squad?.maxSize || tournament.settings?.maxSquadSize || 11;
  const squadSize = franchise.squad?.playerIds?.length || 0;
  const remainingSlots = Math.max(0, maxSquadSize - squadSize);
  const roleTargets = getRoleTargets(maxSquadSize);
  const roleCounts = getSquadRoleCounts(franchise, lotsById);
  const roleDeficit = Math.max(0, (roleTargets[lot.style] || 0) - (roleCounts[lot.style] || 0));

  const availableLots = lots.filter(
    (item) => item.status === 'queued' && !['hammered', 'unsold'].includes(item.auctionStatus),
  );
  const sameRoleAvailable = availableLots.filter((item) => item.style === lot.style).length;
  const totalRoleDeficit = tournament.franchises.reduce((sum, item) => {
    const itemMaxSize = item.squad?.maxSize || tournament.settings?.maxSquadSize || 11;
    const itemTargets = getRoleTargets(itemMaxSize);
    const itemCounts = getSquadRoleCounts(item, lotsById);
    return sum + Math.max(0, (itemTargets[lot.style] || 0) - (itemCounts[lot.style] || 0));
  }, 0);
  const scarcityRatio = totalRoleDeficit / Math.max(1, sameRoleAvailable);
  const scarcityLevel = scarcityRatio >= 1.5 ? 'high' : scarcityRatio >= 0.75 ? 'medium' : 'low';

  const soldRolePrices = lots
    .filter((item) => item.status === 'sold' && item.style === lot.style)
    .map((item) => Number(item.soldPrice || 0))
    .filter((price) => price > 0);
  const sameRoleMedian = median(soldRolePrices);
  const basePrice = Number(lot.basePrice || 0);
  const referenceValue = sameRoleMedian === null
    ? basePrice
    : basePrice * 0.6 + sameRoleMedian * 0.4;

  const bidHistory = Array.isArray(lot.bidHistory) ? lot.bidHistory : [];
  const uniqueBidders = new Set(bidHistory.map((bid) => String(bid.franchiseId))).size;
  const demandMultiplier = 1 + Math.min(0.15, bidHistory.length * 0.02 + Math.max(0, uniqueBidders - 1) * 0.03);
  const scarcityMultiplier = scarcityLevel === 'high' ? 1.2 : scarcityLevel === 'medium' ? 1.1 : 1;
  const roleNeedMultiplier = roleDeficit > 0
    ? 1 + Math.min(0.18, (roleDeficit / Math.max(1, roleTargets[lot.style])) * 0.18)
    : 0.85;
  const contextualCeiling = referenceValue
    * demandMultiplier
    * scarcityMultiplier
    * roleNeedMultiplier;

  const remainingPurse = Math.max(
    0,
    Number(franchise.wallet?.initial || 0) - Number(franchise.wallet?.spent || 0),
  );
  const futureSlotsAfterWin = Math.max(0, remainingSlots - 1);
  const futureLots = availableLots.filter((item) => item._id.toString() !== lot._id.toString());
  const minimumFutureBasePrice = futureLots.length > 0
    ? Math.min(...futureLots.map((item) => Number(item.basePrice || 0)))
    : 0;
  const requiredReserve = futureSlotsAfterWin * minimumFutureBasePrice;
  const spendablePurse = Math.max(0, remainingPurse - requiredReserve);
  const increment = lot.bidIncrement || tournament.settings?.minBidIncrement || 1;
  const recommendedMaximumBid = roundDownToIncrement(
    Math.min(contextualCeiling, spendablePurse),
    increment,
  );
  const currentBid = Number(lot.currentBid || basePrice);
  const nextBid = currentBid + increment;
  const projectedPurseAfterNextBid = Math.max(0, remainingPurse - nextBid);
  const roleBalanceScore = getProjectedBalanceScore({
    counts: roleCounts,
    targets: roleTargets,
    role: lot.style,
    maxSquadSize,
  });

  const warnings = [];
  if (remainingSlots === 0) {
    warnings.push({
      code: 'SQUAD_FULL',
      severity: 'danger',
      message: `Squad is full at ${squadSize}/${maxSquadSize}.`,
    });
  }
  if (nextBid > remainingPurse) {
    warnings.push({
      code: 'INSUFFICIENT_PURSE',
      severity: 'danger',
      message: 'The next bid is above this franchise’s remaining purse.',
    });
  } else if (projectedPurseAfterNextBid < requiredReserve) {
    warnings.push({
      code: 'PURSE_RESERVE_RISK',
      severity: 'danger',
      message: `The next bid would leave less than the estimated reserve for ${futureSlotsAfterWin} open slot${futureSlotsAfterWin === 1 ? '' : 's'}.`,
    });
  } else if (requiredReserve > 0 && projectedPurseAfterNextBid < requiredReserve * 1.15) {
    warnings.push({
      code: 'PURSE_RESERVE_TIGHT',
      severity: 'warning',
      message: 'The next bid leaves only a narrow purse buffer for the remaining squad.',
    });
  }
  if (roleDeficit === 0) {
    warnings.push({
      code: 'ROLE_COVERED',
      severity: 'warning',
      message: `${lot.style} is already at the default role target for this squad.`,
    });
  }
  if (scarcityLevel === 'high') {
    warnings.push({
      code: 'ROLE_SCARCE',
      severity: 'info',
      message: `High scarcity: ${sameRoleAvailable} ${lot.style.toLowerCase()} lot${sameRoleAvailable === 1 ? '' : 's'} remain for ${totalRoleDeficit} projected team needs.`,
    });
  }
  if (currentBid > contextualCeiling) {
    warnings.push({
      code: 'ABOVE_CONTEXT_VALUE',
      severity: 'warning',
      message: 'The current price is above the contextual value ceiling.',
    });
  }

  let advice = 'BID';
  if (
    remainingSlots === 0
    || nextBid > remainingPurse
    || nextBid > recommendedMaximumBid
  ) {
    advice = 'PASS';
  } else if (
    String(lot.currentBidderFranchiseId || '') === franchise._id.toString()
    || lot.auctionStatus === 'paused'
    || roleDeficit === 0
    || nextBid >= recommendedMaximumBid * 0.9
  ) {
    advice = 'CAUTION';
  }

  const reasons = [];
  if (roleDeficit > 0) {
    reasons.push(`This squad is ${roleDeficit} ${lot.style.toLowerCase()} slot${roleDeficit === 1 ? '' : 's'} short of the default balance target.`);
  } else {
    reasons.push(`This squad has met its default ${lot.style.toLowerCase()} target.`);
  }
  reasons.push(
    scarcityLevel === 'high'
      ? `Demand pressure is high with only ${sameRoleAvailable} comparable lot${sameRoleAvailable === 1 ? '' : 's'} available.`
      : `${sameRoleAvailable} comparable lot${sameRoleAvailable === 1 ? '' : 's'} remain in the pool.`,
  );
  if (String(lot.currentBidderFranchiseId || '') === franchise._id.toString()) {
    reasons.push('This franchise is already leading, so no additional bid is needed now.');
  }

  return {
    advice,
    franchise: {
      id: franchise._id.toString(),
      name: franchise.name,
    },
    lot: {
      id: lot._id.toString(),
      name: lot.name,
      style: lot.style,
    },
    nextBid,
    recommendedMaximumBid,
    contextualValue: roundDownToIncrement(contextualCeiling, increment),
    roleBalanceScore,
    purse: {
      remaining: remainingPurse,
      requiredReserve,
      spendable: spendablePurse,
      projectedAfterNextBid: projectedPurseAfterNextBid,
      remainingSlots,
    },
    role: {
      currentCount: roleCounts[lot.style] || 0,
      target: roleTargets[lot.style] || 0,
      available: sameRoleAvailable,
      totalProjectedNeed: totalRoleDeficit,
      scarcityLevel,
      scarcityRatio: Number(scarcityRatio.toFixed(2)),
    },
    warnings,
    reasons,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  calculateAuctionIntelligence,
  getRoleTargets,
};
