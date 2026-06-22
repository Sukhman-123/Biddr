/* eslint-disable no-console */

/**
 * Demo seed script — intentionally a no-op.
 *
 * Biddr no longer ships with pre-populated demo tournaments or demo users.
 * Auctioneers create their own tournaments; everyone else is a viewer.
 */

const seed = async () => {
  console.log('No demo data to seed. Create an account to get started.');
};

if (require.main === module) {
  seed();
}

module.exports = seed;
