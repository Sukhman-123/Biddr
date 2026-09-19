const request = require('supertest')
const User = require('../models/User')
const Tournament = require('../models/Tournament')
const Lot = require('../models/Lot')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer')

let app

beforeAll(async () => {
  app = await startTestEnv()
})

afterAll(async () => {
  await stopTestEnv()
})

beforeEach(async () => {
  await clearDatabase()
})

afterEach(() => {
  app.set('io', undefined)
})

async function getToken(app, { email = 'owner@example.com', fullName = 'Owner' } = {}) {
  await registerUser(app, { fullName, email, password: 'hunter2hunter2' })
  const login = await loginUser(app, { email, password: 'hunter2hunter2' })
  return login.body.token
}

describe('POST /api/tournaments', () => {
  it('lets any authenticated user create a tournament', async () => {
    const token = await getToken(app)
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bengaluru Premier League',
        shortCode: 'BPL',
        currency: 'INR',
        pursePerFranchise: 100000000,
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(res.status).toBe(201)
    expect(res.body.tournament.ownerId).toBeTruthy()
    expect(res.body.tournament.shortCode).toBe('BPL')
    expect(res.body.tournament.franchises).toHaveLength(2)
  })

  it('rejects unauthenticated creation', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .send({ name: 'No Auth', shortCode: 'NA' })
    expect(res.status).toBe(401)
  })

  it('rejects missing name', async () => {
    const token = await getToken(app)
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({ shortCode: 'NA' })
    expect(res.status).toBe(400)
  })

  it('rejects short name (<3 chars)', async () => {
    const token = await getToken(app)
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AB', shortCode: 'NA' })
    expect(res.status).toBe(400)
  })

  it('suggests an alternate short code on collision', async () => {
    const token = await getToken(app)
    const first = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'League One',
        shortCode: 'L1',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(first.status).toBe(201)
    expect(first.body.tournament.shortCode).toBe('L1')

    const second = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'League Two',
        shortCode: 'L1',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(second.status).toBe(201)
    expect(second.body.tournament.shortCode).not.toBe('L1')
  })

  it('rejects endDate before startDate', async () => {
    const token = await getToken(app)
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Dates',
        shortCode: 'BD',
        startDate: '2026-06-20',
        endDate: '2026-06-10',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/tournaments (visibility)', () => {
  it('shows public tournaments to all users', async () => {
    const ownerToken = await getToken(app, {
      email: 'owner@example.com',
      fullName: 'Owner',
    })
    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Open League',
        shortCode: 'OPEN',
        visibility: 'public',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })

    const viewerToken = await getToken(app, {
      email: 'viewer@example.com',
      fullName: 'Viewer',
    })
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tournaments).toHaveLength(1)
    expect(res.body.tournaments[0].shortCode).toBe('OPEN')
  })

  it('hides invite-only tournaments from non-owners', async () => {
    const ownerToken = await getToken(app, {
      email: 'owner@example.com',
      fullName: 'Owner',
    })
    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Private Cup',
        shortCode: 'PRIV',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })

    const viewerToken = await getToken(app, {
      email: 'viewer@example.com',
      fullName: 'Viewer',
    })
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tournaments).toHaveLength(0)
  })

  it('does not expose private tournaments through the visibility filter', async () => {
    const ownerToken = await getToken(app, { email: 'owner@example.com' })
    const otherToken = await getToken(app, { email: 'other@example.com' })
    const viewerToken = await getToken(app, { email: 'viewer@example.com' })

    const owned = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Invited Cup',
        shortCode: 'INVT',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    const unrelated = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        name: 'Secret Cup',
        shortCode: 'SECR',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(owned.status).toBe(201)
    expect(unrelated.status).toBe(201)

    const hidden = await request(app)
      .get('/api/tournaments?visibility=invite-only')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(hidden.status).toBe(200)
    expect(hidden.body.tournaments).toEqual([])

    const invite = await request(app)
      .post(`/api/tournaments/${owned.body.tournament.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'viewer@example.com' })
    expect(invite.status).toBe(201)

    const visible = await request(app)
      .get('/api/tournaments?visibility=invite-only')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(visible.status).toBe(200)
    expect(visible.body.tournaments.map((t) => t.shortCode)).toEqual(['INVT'])

    const ownerListing = await request(app)
      .get('/api/tournaments?visibility=invite-only')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(ownerListing.body.tournaments.map((t) => t.shortCode)).toEqual(['INVT'])

    const viewer = await User.findOne({ email: 'viewer@example.com' })
    const viewerSocket = {
      data: { user: viewer },
      leave: jest.fn(),
    }
    app.set('io', {
      in: () => ({ fetchSockets: async () => [viewerSocket] }),
    })

    const inviteId = invite.body.invite._id || invite.body.invite.id
    const revoked = await request(app)
      .delete(`/api/tournaments/${owned.body.tournament.id}/invites/${inviteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(revoked.status).toBe(200)
    expect(viewerSocket.leave).toHaveBeenCalledWith(`tournament:${owned.body.tournament.id}`)

    const afterRevocation = await request(app)
      .get('/api/tournaments?visibility=invite-only')
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(afterRevocation.body.tournaments).toEqual([])
  })

  it('removes public subscribers before announcing an invite-only switch', async () => {
    const ownerToken = await getToken(app, { email: 'owner@example.com' })
    await getToken(app, { email: 'viewer@example.com' })
    const created = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Changing Cup',
        shortCode: 'CHNG',
        visibility: 'public',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(created.status).toBe(201)

    const viewer = await User.findOne({ email: 'viewer@example.com' })
    const owner = await User.findOne({ email: 'owner@example.com' })
    const events = []
    const viewerSocket = {
      data: { user: viewer },
      leave: jest.fn(async () => { events.push('leave') }),
    }
    const ownerSocket = { data: { user: owner }, leave: jest.fn() }
    app.set('io', {
      in: () => ({ fetchSockets: async () => [viewerSocket, ownerSocket] }),
      to: () => ({ emit: () => { events.push('broadcast') } }),
    })

    const updated = await request(app)
      .patch(`/api/tournaments/${created.body.tournament.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ visibility: 'invite-only' })

    expect(updated.status).toBe(200)
    expect(viewerSocket.leave).toHaveBeenCalledWith(`tournament:${created.body.tournament.id}`)
    expect(ownerSocket.leave).not.toHaveBeenCalled()
    expect(events).toEqual(['leave', 'broadcast'])
  })

  it('protects player-pool reads and template downloads for private tournaments', async () => {
    const ownerToken = await getToken(app, { email: 'owner@example.com' })
    const viewerToken = await getToken(app, { email: 'viewer@example.com' })
    const created = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Private Pool',
        shortCode: 'POOL',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    expect(created.status).toBe(201)
    const id = created.body.tournament.id

    const player = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Private Player', style: 'Batsman', country: 'India', basePrice: 100 })
    expect(player.status).toBe(201)

    for (const path of [
      `/api/tournaments/${id}/lots`,
      `/api/tournaments/${id}/lots/template.csv`,
      `/api/tournaments/${id}/lots/template.xlsx`,
    ]) {
      const hidden = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${viewerToken}`)
      expect(hidden.status).toBe(403)
    }

    // A team-owner role alone must not grant access to private bid advice.
    const viewer = await User.findOne({ email: 'viewer@example.com' })
    const tournament = await Tournament.findById(id)
    tournament.franchises[0].members.push({ userId: viewer._id, role: 'owner' })
    await tournament.save()
    await Lot.updateOne({ _id: player.body.lot.id }, { auctionStatus: 'active' })

    const advice = await request(app)
      .get(`/api/lots/${player.body.lot.id}/intelligence`)
      .query({ franchiseId: tournament.franchises[0]._id.toString() })
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(advice.status).toBe(403)

    const invite = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'viewer@example.com' })
    expect(invite.status).toBe(201)

    const visible = await request(app)
      .get(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(visible.status).toBe(200)
    expect(visible.body.lots.map((lot) => lot.name)).toEqual(['Private Player'])
  })

  it('shows invite-only tournaments to their owner', async () => {
    const ownerToken = await getToken(app, {
      email: 'owner@example.com',
      fullName: 'Owner',
    })
    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Private Cup',
        shortCode: 'PRIV',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })

    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tournaments).toHaveLength(1)
  })

  it('403s on direct fetch of an invite-only tournament by non-owner', async () => {
    const ownerToken = await getToken(app, {
      email: 'owner@example.com',
      fullName: 'Owner',
    })
    const create = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Private Cup',
        shortCode: 'PRIV',
        visibility: 'invite-only',
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    const id = create.body.tournament.id

    const viewerToken = await getToken(app, {
      email: 'viewer@example.com',
      fullName: 'Viewer',
    })
    const res = await request(app)
      .get(`/api/tournaments/${id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/tournaments/:id', () => {
  it('syncs franchise wallet initials when purse per franchise changes', async () => {
    const token = await getToken(app)
    const create = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Purse Sync League',
        shortCode: 'PSL',
        currency: 'INR',
        pursePerFranchise: 1000,
        franchises: [{ name: 'A' }, { name: 'B' }],
      })

    const res = await request(app)
      .patch(`/api/tournaments/${create.body.tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pursePerFranchise: 2000 })

    expect(res.status).toBe(200)
    expect(res.body.tournament.pursePerFranchise).toBe(2000)
    expect(res.body.tournament.franchises).toHaveLength(2)
    expect(res.body.tournament.franchises.every((franchise) => franchise.wallet.initial === 2000)).toBe(true)
  })

  it('rejects purse changes below already spent team wallet', async () => {
    const token = await getToken(app)
    const create = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Spent Purse League',
        shortCode: 'SPL',
        currency: 'INR',
        pursePerFranchise: 1000,
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    const tournament = create.body.tournament
    const franchise = tournament.franchises[0]
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sold Player',
        style: 'Batsman',
        country: 'India',
        basePrice: 100,
      })

    await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: franchise.id,
        soldPrice: 500,
      })

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pursePerFranchise: 250 })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/already spent more than the new purse/i)
  })

  it('prevents removing a franchise that still has sold players assigned', async () => {
    const token = await getToken(app)
    const create = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Franchise Guard League',
        shortCode: 'FGL',
        currency: 'INR',
        pursePerFranchise: 100000000,
        franchises: [{ name: 'A' }, { name: 'B' }],
      })
    const tournament = create.body.tournament
    const [assignedFranchise, remainingFranchise] = tournament.franchises
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Assigned Player',
        style: 'Batsman',
        country: 'India',
        basePrice: 100,
      })

    await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: assignedFranchise.id,
        soldPrice: 250,
      })

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        franchises: [
          {
            id: remainingFranchise.id,
            name: remainingFranchise.name,
            city: remainingFranchise.city,
            colorHex: remainingFranchise.colorHex,
            wallet: remainingFranchise.wallet,
            squad: remainingFranchise.squad,
          },
        ],
      })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/move or unassign sold players/i)
  })
})
