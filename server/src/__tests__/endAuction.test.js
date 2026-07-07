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

async function createLiveTournament(token, overrides = {}) {
  const create = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'End Test League',
      shortCode: `END${Date.now()}`,
      currency: 'INR',
      startDate: new Date(Date.now() - 60_000).toISOString(),
      franchises: [
        { name: 'Team A', colorHex: '#112233' },
        { name: 'Team B', colorHex: '#445566' },
      ],
      ...overrides,
    })
  const id = create.body.tournament.id
  await request(app)
    .post(`/api/tournaments/${id}/start`)
    .set('Authorization', `Bearer ${token}`)
  return create.body.tournament
}

describe('POST /api/tournaments/:id/end', () => {
  it('marks a live tournament completed when no lot is on the floor', async () => {
    const token = await getToken('host@example.com', 'Host')
    const tournament = await createLiveTournament(token)

    const res = await request(app)
      .post(`/api/tournaments/${tournament.id}/end`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.tournament.status).toBe('completed')
  })

  it('rejects ending while a lot is active', async () => {
    const token = await getToken('host@example.com', 'Host')
    const tournament = await createLiveTournament(token)
    const lotRes = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Virat Kohli',
        style: 'Batsman',
        country: 'India',
        basePrice: 2000000,
        bidIncrement: 500000,
      })

    await request(app)
      .post(`/api/tournaments/${tournament.id}/lots/${lotRes.body.lot.id}/activate`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .post(`/api/tournaments/${tournament.id}/end`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/resolve the current lot/i)
  })

  it('rejects ending while a lot is paused', async () => {
    const token = await getToken('host@example.com', 'Host')
    const tournament = await createLiveTournament(token)
    const lotRes = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Virat Kohli',
        style: 'Batsman',
        country: 'India',
        basePrice: 2000000,
        bidIncrement: 500000,
      })

    await request(app)
      .post(`/api/tournaments/${tournament.id}/lots/${lotRes.body.lot.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
    await request(app)
      .post(`/api/lots/${lotRes.body.lot.id}/pause`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .post(`/api/tournaments/${tournament.id}/end`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/resolve the current lot/i)
  })
})
