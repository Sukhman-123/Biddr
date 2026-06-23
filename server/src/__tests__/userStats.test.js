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

async function getToken(email, fullName) {
  await registerUser(app, { fullName, email, password: 'hunter2hunter2' })
  const login = await loginUser(app, { email, password: 'hunter2hunter2' })
  return login.body.token
}

async function createTournament(token, overrides = {}) {
  return request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test League',
      shortCode: 'TL',
      visibility: 'public',
      pursePerFranchise: 100000000,
      franchises: [{ name: 'A' }, { name: 'B' }],
      ...overrides,
    })
}

describe('GET /api/users/me/stats', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/me/stats')
    expect(res.status).toBe(401)
  })

  it('returns empty stats for a user with no tournaments', async () => {
    const token = await getToken('new@example.com', 'New User')
    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.stats.hosted).toBe(0)
    expect(res.body.achievements).toBeDefined()
    expect(res.body.hostedTournaments).toEqual([])
  })

  it('counts hosted tournaments and franchises', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    await createTournament(token, { name: 'League 1', shortCode: 'L1' })
    await createTournament(token, {
      name: 'League 2',
      shortCode: 'L2',
      visibility: 'invite-only',
    })

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.stats.hosted).toBe(2)
    expect(res.body.stats.inviteOnly).toBe(1)
    expect(res.body.stats.totalFranchises).toBe(4)
  })

  it('grants first_tournament achievement on first create', async () => {
    const token = await getToken('first@example.com', 'First')
    await createTournament(token)

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    const first = res.body.achievements.find((a) => a.id === 'first_tournament')
    expect(first.earned).toBe(true)
  })

  it('grants public_host when at least one tournament is public', async () => {
    const token = await getToken('ph@example.com', 'PH')
    await createTournament(token, { visibility: 'public' })

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    const ph = res.body.achievements.find((a) => a.id === 'public_host')
    expect(ph.earned).toBe(true)
  })

  it('grants invite_only_host when at least one tournament is private', async () => {
    const token = await getToken('pv@example.com', 'PV')
    await createTournament(token, { visibility: 'invite-only' })

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    const priv = res.body.achievements.find((a) => a.id === 'invite_only_host')
    expect(priv.earned).toBe(true)
  })

  it('grants veteran achievement at 3+ tournaments', async () => {
    const token = await getToken('vet@example.com', 'Vet')
    await createTournament(token, { name: 'League 1', shortCode: 'V1' })
    await createTournament(token, { name: 'League 2', shortCode: 'V2' })
    await createTournament(token, { name: 'League 3', shortCode: 'V3' })

    const res = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${token}`)
    const vet = res.body.achievements.find((a) => a.id === 'veteran')
    expect(vet.earned).toBe(true)
  })
})
