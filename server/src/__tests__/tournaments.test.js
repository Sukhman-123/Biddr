const request = require('supertest')
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
