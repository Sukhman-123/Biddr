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

async function createPrivateTournament(token) {
  const res = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Private Cup',
      shortCode: 'PRIV',
      visibility: 'invite-only',
      pursePerFranchise: 100000000,
      franchises: [{ name: 'A' }, { name: 'B' }],
    })
  expect(res.status).toBe(201)
  return res.body.tournament.id
}

async function createPublicTournament(token) {
  const res = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Open League',
      shortCode: 'OPEN',
      visibility: 'public',
      pursePerFranchise: 100000000,
      franchises: [{ name: 'A' }, { name: 'B' }],
    })
  expect(res.status).toBe(201)
  return res.body.tournament.id
}

describe('POST /api/tournaments/:id/invites', () => {
  it('requires authentication', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(401)
  })

  it('requires host role', async () => {
    const ownerToken = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(ownerToken)
    const otherToken = await getToken('other@example.com', 'Other')
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(403)
  })

  it('rejects invites on public tournaments', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPublicTournament(token)
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
  })

  it('creates an invite for an invite-only tournament', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'bidder@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.invite.email).toBe('bidder@example.com')
    expect(res.body.alreadyInvited).toBeUndefined()
  })

  it('rejects invalid emails', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('blocks self-invites', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    // We need to look up the owner email. Login first.
    const login = await loginUser(app, {
      email: 'owner@example.com',
      password: 'hunter2hunter2',
    })
    // Re-call getToken (already registered) — find email via /me
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
    const ownerEmail = me.body.user.email
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ email: ownerEmail })
    expect(res.status).toBe(400)
  })

  it('is idempotent for duplicates', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'bidder@example.com' })
    const res = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'bidder@example.com' })
    expect([200, 201]).toContain(res.status)
    expect(res.body.invite.email).toBe('bidder@example.com')
  })
})

describe('GET /api/tournaments/:id/invites', () => {
  it('returns the list for the host', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'a@b.com' })
    await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'c@d.com' })
    const res = await request(app)
      .get(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.invites).toHaveLength(2)
  })

  it('forbids non-hosts from listing', async () => {
    const ownerToken = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(ownerToken)
    const otherToken = await getToken('other@example.com', 'Other')
    const res = await request(app)
      .get(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/tournaments/:id/invites/:inviteId', () => {
  it('revokes an invite', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    const created = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'a@b.com' })
    const inviteId = created.body.invite._id || created.body.invite.id
    const res = await request(app)
      .delete(`/api/tournaments/${id}/invites/${inviteId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.revoked).toBe(true)

    const list = await request(app)
      .get(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${token}`)
    expect(list.body.invites).toHaveLength(0)
  })

  it('404s on unknown invite id', async () => {
    const token = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(token)
    const fakeId = '507f1f77bcf86cd799439011'
    const res = await request(app)
      .delete(`/api/tournaments/${id}/invites/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('forbids non-hosts from revoking', async () => {
    const ownerToken = await getToken('owner@example.com', 'Owner')
    const id = await createPrivateTournament(ownerToken)
    const created = await request(app)
      .post(`/api/tournaments/${id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'a@b.com' })
    const inviteId = created.body.invite._id || created.body.invite.id
    const otherToken = await getToken('other@example.com', 'Other')
    const res = await request(app)
      .delete(`/api/tournaments/${id}/invites/${inviteId}`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })
})