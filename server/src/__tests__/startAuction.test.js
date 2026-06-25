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
      name: 'IPL Test',
      shortCode: 'IPLT',
      currency: 'INR',
      pursePerFranchise: 100000,
      startDate: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      endDate: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      ...overrides,
    })
}

describe('POST /api/tournaments/:id/start', () => {
  it('flips status from upcoming to live when startDate has arrived', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    expect(create.body.tournament.status).toBe('upcoming')

    const res = await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.tournament.status).toBe('live')
  })

  it('is idempotent — calling twice does not error and stays live', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id

    await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
    const second = await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
    expect(second.status).toBe(200)
    expect(second.body.tournament.status).toBe('live')
  })

  it('returns 400 when the start date has not arrived', async () => {
    const token = await getToken('host@example.com', 'Host')
    const future = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
    const farFuture = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString()
    const create = await createTournament(token, {
      startDate: future,
      endDate: farFuture,
    })
    expect(create.status).toBe(201)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/start date/i)
    expect(res.body.startDate).toBe(future)
  })

  it('returns 403 when the caller is not the host', async () => {
    const hostToken = await getToken('host@example.com', 'Host')
    const otherToken = await getToken('other@example.com', 'Other')
    const create = await createTournament(hostToken)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 401 for unauthenticated calls', async () => {
    const res = await request(app).post('/api/tournaments/abc/start')
    expect(res.status).toBe(401)
  })

  it('returns 400 when the tournament is already completed', async () => {
    const token = await getToken('host@example.com', 'Host')
    const User = require('../models/User')
    const host = await User.findOne({ email: 'host@example.com' })
    const Tournament = require('../models/Tournament')
    const t = await Tournament.create({
      name: 'Already done',
      shortCode: 'DONE',
      currency: 'INR',
      ownerId: host._id,
      status: 'completed',
      startDate: new Date(Date.now() - 24 * 60 * 60_000),
    })

    const res = await request(app)
      .post(`/api/tournaments/${t._id.toString()}/start`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('returns 404 when the tournament does not exist', async () => {
    const token = await getToken('host@example.com', 'Host')
    const fakeId = '60a0a0a0a0a0a0a0a0a0a0a0'
    const res = await request(app)
      .post(`/api/tournaments/${fakeId}/start`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('persists status=live so a follow-up GET reflects it', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id

    await request(app)
      .post(`/api/tournaments/${id}/start`)
      .set('Authorization', `Bearer ${token}`)

    const refetch = await request(app)
      .get(`/api/tournaments/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(refetch.body.tournament.status).toBe('live')
  })
})