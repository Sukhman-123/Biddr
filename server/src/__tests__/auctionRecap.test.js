const request = require('supertest');
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer');

let app;

beforeAll(async () => {
  app = await startTestEnv();
});

afterAll(async () => {
  await stopTestEnv();
});

beforeEach(async () => {
  await clearDatabase();
  if (app.locals?.mockIo) app.locals.mockIo.reset();
});

async function getToken(email, fullName) {
  await registerUser(app, { fullName, email, password: 'hunter2hunter2' });
  const login = await loginUser(app, { email, password: 'hunter2hunter2' });
  return login.body.token;
}

const authorized = (method, path, token) => request(app)[method](path)
  .set('Authorization', `Bearer ${token}`);

describe('GET /api/tournaments/:id/recap', () => {
  it('returns winners, squads, purses, auction highlights and unsold players', async () => {
    const hostToken = await getToken('recap-host@example.com', 'Recap Host');
    const viewerToken = await getToken('recap-viewer@example.com', 'Recap Viewer');
    const created = await authorized('post', '/api/tournaments', hostToken).send({
      name: 'Recap League',
      shortCode: 'RCP',
      currency: 'INR',
      pursePerFranchise: 10000000,
      visibility: 'public',
      auctionMode: 'physical',
      settings: { minBidIncrement: 500000, maxSquadSize: 2 },
      franchises: [{ name: 'Falcons' }, { name: 'Titans' }],
    });
    const tournament = created.body.tournament;
    const [falcons, titans] = tournament.franchises;

    const createLot = (name, style) => authorized(
      'post',
      `/api/tournaments/${tournament.id}/lots`,
      hostToken,
    ).send({ name, style, country: 'India', basePrice: 1000000, bidIncrement: 500000 });

    const soldLot = await createLot('Aarav Singh', 'Batsman');
    const unsoldLot = await createLot('Kabir Rao', 'Bowler');
    await createLot('Dev Patel', 'All-rounder');

    const start = await authorized('post', `/api/tournaments/${tournament.id}/start`, hostToken);
    expect(start.status).toBe(200);
    const activateSold = await authorized(
      'post',
      `/api/tournaments/${tournament.id}/lots/${soldLot.body.lot.id}/activate`,
      hostToken,
    );
    expect(activateSold.status).toBe(200);
    const firstBid = await authorized('post', `/api/lots/${soldLot.body.lot.id}/place-bid`, hostToken)
      .send({ franchiseId: falcons.id, amount: 1500000 });
    expect(firstBid.status).toBe(200);
    const secondBid = await authorized('post', `/api/lots/${soldLot.body.lot.id}/place-bid`, hostToken)
      .send({ franchiseId: titans.id, amount: 2000000 });
    expect(secondBid.status).toBe(200);
    const hammer = await authorized('post', `/api/lots/${soldLot.body.lot.id}/hammer`, hostToken);
    expect(hammer.status).toBe(200);

    const activateUnsold = await authorized(
      'post',
      `/api/tournaments/${tournament.id}/lots/${unsoldLot.body.lot.id}/activate`,
      hostToken,
    );
    expect(activateUnsold.status).toBe(200);
    const pass = await authorized('post', `/api/lots/${unsoldLot.body.lot.id}/pass`, hostToken);
    expect(pass.status).toBe(200);
    const end = await authorized('post', `/api/tournaments/${tournament.id}/end`, hostToken);
    expect(end.status).toBe(200);

    const viewerResponse = await authorized(
      'get',
      `/api/tournaments/${tournament.id}/recap`,
      viewerToken,
    );

    expect(viewerResponse.status).toBe(200);
    expect(viewerResponse.body.recap.canExport).toBe(false);
    expect(viewerResponse.body.recap.summary).toMatchObject({
      totalPlayers: 3,
      soldCount: 1,
      unsoldCount: 1,
      unresolvedCount: 1,
      totalSpend: 2000000,
    });
    expect(viewerResponse.body.recap.highestSale).toMatchObject({
      name: 'Aarav Singh',
      soldPrice: 2000000,
      winner: { id: titans.id, name: 'Titans' },
    });
    expect(viewerResponse.body.recap.mostContested).toMatchObject({
      name: 'Aarav Singh',
      bidCount: 2,
      uniqueBidders: 2,
    });
    expect(viewerResponse.body.recap.unsoldPlayers[0].name).toBe('Kabir Rao');
    expect(viewerResponse.body.recap.squads.find((squad) => squad.id === titans.id))
      .toMatchObject({ wallet: { spent: 2000000, remaining: 8000000 } });

    const hostResponse = await authorized(
      'get',
      `/api/tournaments/${tournament.id}/recap`,
      hostToken,
    );
    expect(hostResponse.status).toBe(200);
    expect(hostResponse.body.recap.canExport).toBe(true);
  });

  it('waits until the auction is completed', async () => {
    const token = await getToken('pending-recap@example.com', 'Pending Host');
    const created = await authorized('post', '/api/tournaments', token).send({
      name: 'Pending League',
      shortCode: 'PND',
      franchises: [{ name: 'Falcons' }],
    });

    const response = await authorized(
      'get',
      `/api/tournaments/${created.body.tournament.id}/recap`,
      token,
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/after the auction ends/i);
  });
});
