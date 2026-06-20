/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const Tournament = require('../models/Tournament');
const User = require('../models/User');

dotenv.config({ path: path.resolve(__dirname, '../../config.env') });

const DEMO_TOURNAMENTS = [
  {
    name: 'Indian Premier Showdown',
    shortCode: 'IPL-2026',
    description:
      'The flagship T20 franchise league. Ten teams, ten cities, one trophy.',
    currency: 'INR',
    pursePerFranchise: 9500000000,
    startDate: new Date('2026-03-14T14:30:00.000Z'),
    endDate: new Date('2026-05-28T14:30:00.000Z'),
    status: 'live',
    visibility: 'public',
    hostName: 'BCCI Studio',
    region: '10 cities in India',
    cover: {
      gradientFrom: '#ff2d6b',
      gradientVia: '#8a1c4a',
      gradientTo: '#3a0a2a',
      accentHex: '#ffd166',
      liveRoomCount: 3,
    },
    franchises: [
      { name: 'Mumbai Indians', city: 'Mumbai', colorHex: '#0a4dbb' },
      { name: 'Delhi Capitals', city: 'Delhi', colorHex: '#d11616' },
      { name: 'Kolkata Knight Riders', city: 'Kolkata', colorHex: '#5a2a82' },
      { name: 'Chennai Super Kings', city: 'Chennai', colorHex: '#f5c518' },
      { name: 'Royal Challengers Bengaluru', city: 'Bengaluru', colorHex: '#e23b9b' },
      { name: 'Sunrisers Hyderabad', city: 'Hyderabad', colorHex: '#f57c1f' },
      { name: 'Rajasthan Royals', city: 'Jaipur', colorHex: '#e63990' },
      { name: 'Punjab Kings', city: 'Mohali', colorHex: '#c1272d' },
    ],
  },
  {
    name: 'Big Bash Summer Cup',
    shortCode: 'BBL-26',
    description:
      'Eight Australian franchises. Sunset fixtures, six-and-out bidding rules, beach-side haggling.',
    currency: 'AUD',
    pursePerFranchise: 24000000,
    startDate: new Date('2026-12-10T08:00:00.000Z'),
    endDate: new Date('2027-01-28T12:00:00.000Z'),
    status: 'upcoming',
    visibility: 'public',
    hostName: 'Cricket Australia',
    region: '8 cities in Australia',
    cover: {
      gradientFrom: '#ff8a3c',
      gradientVia: '#cf4a1f',
      gradientTo: '#1c1b46',
      accentHex: '#ffd166',
      liveRoomCount: 0,
    },
    franchises: [
      { name: 'Sydney Sixers', city: 'Sydney', colorHex: '#d71920' },
      { name: 'Melbourne Stars', city: 'Melbourne', colorHex: '#0a3a82' },
      { name: 'Perth Scorchers', city: 'Perth', colorHex: '#f5b94a' },
      { name: 'Brisbane Heat', city: 'Brisbane', colorHex: '#52e88e' },
    ],
  },
  {
    name: 'Pakistan Super Pro',
    shortCode: 'PSL-2026',
    description:
      'Six franchise owners. Closed-door draft, no public livestream. Invite-only.',
    currency: 'PKR',
    pursePerFranchise: 1200000000,
    startDate: new Date('2026-02-02T14:00:00.000Z'),
    endDate: new Date('2026-03-18T18:00:00.000Z'),
    status: 'live',
    visibility: 'invite-only',
    hostName: 'PCB Live',
    region: '6 cities in Pakistan',
    cover: {
      gradientFrom: '#0a4d2a',
      gradientVia: '#053a1c',
      gradientTo: '#02110a',
      accentHex: '#f5b94a',
      liveRoomCount: 1,
    },
    franchises: [
      { name: 'Karachi Kings', city: 'Karachi', colorHex: '#1f7a8c' },
      { name: 'Lahore Qalandars', city: 'Lahore', colorHex: '#52e88e' },
      { name: 'Islamabad United', city: 'Islamabad', colorHex: '#ff7a5a' },
    ],
  },
  {
    name: 'Caribbean Island League',
    shortCode: 'CPL-25',
    description:
      'Squads locked. Browse the recap of the 2025 season and finalised franchises.',
    currency: 'USD',
    pursePerFranchise: 8000000,
    startDate: new Date('2025-08-14T13:00:00.000Z'),
    endDate: new Date('2025-09-28T22:00:00.000Z'),
    status: 'completed',
    visibility: 'public',
    hostName: 'CPL Studios',
    region: '6 islands in the Caribbean',
    cover: {
      gradientFrom: '#1ec8ff',
      gradientVia: '#1a4ad8',
      gradientTo: '#2a0a4a',
      accentHex: '#ffd166',
      liveRoomCount: 0,
    },
    franchises: [
      { name: 'Trinbago Knight Riders', city: 'Trinidad', colorHex: '#d11616' },
      { name: 'Barbados Royals', city: 'Barbados', colorHex: '#5a2a82' },
      { name: 'Jamaica Tallawahs', city: 'Jamaica', colorHex: '#52e88e' },
    ],
  },
  {
    name: 'Biddr Champions Trophy',
    shortCode: 'BCT-2026',
    description:
      'A live demo auction running right now. Jump in as a spectator to watch the gavel.',
    currency: 'INR',
    pursePerFranchise: 600000000,
    startDate: new Date('2026-06-15T10:00:00.000Z'),
    endDate: new Date('2026-06-21T18:00:00.000Z'),
    status: 'upcoming',
    visibility: 'public',
    hostName: 'Biddr Demo',
    region: '4 cities in India',
    cover: {
      gradientFrom: '#3a0a2a',
      gradientVia: '#1d2436',
      gradientTo: '#0a0d16',
      accentHex: '#f5b94a',
      liveRoomCount: 0,
    },
    franchises: [
      { name: 'North Storm', city: 'Chandigarh', colorHex: '#1f7a8c' },
      { name: 'South Surge', city: 'Kochi', colorHex: '#bf4342' },
      { name: 'East Empire', city: 'Bhubaneswar', colorHex: '#2a9d8f' },
      { name: 'West Warriors', city: 'Goa', colorHex: '#e76f51' },
    ],
  },
];

const findOrCreateAuctioneer = async () => {
  const existing = await User.findOne({ role: 'auctioneer' });
  if (existing) return existing;

  return User.create({
    fullName: 'Demo Auctioneer',
    email: 'auctioneer@biddr.test',
    password: 'Demo-Auction-2026',
    role: 'auctioneer',
  });
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const auctioneer = await findOrCreateAuctioneer();

    const results = [];
    for (const data of DEMO_TOURNAMENTS) {
      const update = { ...data, ownerId: auctioneer._id };
      const tournament = await Tournament.findOneAndUpdate(
        { shortCode: data.shortCode },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      results.push(tournament.toSummaryJSON());
    }

    console.log(`Seeded ${results.length} tournaments:`);
    results.forEach((t) =>
      console.log(`  - ${t.shortCode.padEnd(10)} ${t.status.padEnd(10)} ${t.name}`),
    );
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
