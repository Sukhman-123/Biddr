const request = require('supertest')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer')
const Invitation = require('../models/Invitation')

let app

beforeAll(async () => {
  app = await startTestEnv()
})

afterAll(async () => {
  await stopTestEnv()
})

beforeEach(async () => {
  await clearDatabase()
  if (app.locals?.mockIo) app.locals.mockIo.reset()
})

// --- helpers ---

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
      name: 'Auction Test League',
      shortCode: 'ATL',
      currency: 'INR',
      pursePerFranchise: 100000000,
      franchises: [
        { name: 'Mumbai Indians', colorHex: '#004ba0' },
        { name: 'Chennai Super Kings', colorHex: '#f7c200' },
      ],
      ...overrides,
    })
}

async function createLot(token, tournamentId, overrides = {}) {
  return request(app)
    .post(`/api/tournaments/${tournamentId}/lots`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Virat Kohli',
      style: 'Batsman',
      country: 'India',
      basePrice: 2000000,
      ...overrides,
    })
}

// =============================================================
// Auction room — total host control tests.
//
// Every write endpoint in this file must return 403 to anyone who
// is not the tournament's owner. This is the "total host control"
// invariant from the plan: the only entity that can mutate room
// state is the host. The server is a dumb relay.
// =============================================================

describe('GET /api/tournaments/:id/room', () => {
  it('returns the room snapshot for the host', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.tournament.id).toBe(id)
    expect(res.body.activeLot).toBeNull()
    expect(res.body.recentBids).toEqual([])
  })

  it('returns the active lot in the snapshot', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id

    // Set bidIncrement so activate is allowed, then activate.
    await request(app)
      .patch(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bidIncrement: 500000 })
    await request(app)
      .post(`/api/tournaments/${id}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.activeLot).toBeTruthy()
    expect(res.body.activeLot.id).toBe(lotId)
    expect(res.body.activeLot.auctionStatus).toBe('active')
  })

  it('lets a public-tournament viewer fetch the snapshot', async () => {
    const hostToken = await getToken('host@example.com', 'Host')
    const otherToken = await getToken('other@example.com', 'Other')
    const create = await createTournament(hostToken) // visibility defaults to public
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(200)
  })

  it('lets an invite-only invitee fetch the snapshot', async () => {
    const hostToken = await getToken('host@example.com', 'Host')
    const guestEmail = 'guest@example.com'
    const guestToken = await getToken(guestEmail, 'Guest')

    const create = await createTournament(hostToken, {
      visibility: 'invite-only',
    })
    const id = create.body.tournament.id
    await Invitation.create({
      tournamentId: id,
      email: guestEmail,
      invitedById: create.body.tournament.ownerId,
      status: 'pending',
    })

    const res = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${guestToken}`)
    expect(res.status).toBe(200)
  })

  it('rejects an invite-only tournament for a non-invited user', async () => {
    const hostToken = await getToken('host@example.com', 'Host')
    const otherToken = await getToken('stranger@example.com', 'Stranger')
    const create = await createTournament(hostToken, {
      visibility: 'invite-only',
    })
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/tournaments/abc/room')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/tournaments/:id/lots/:lotId/activate', () => {
  async function freshHostAndLot(bidIncrement = 500000) {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id
    if (bidIncrement != null) {
      await request(app)
        .patch(`/api/lots/${lotId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bidIncrement })
    }
    return { token, tournamentId: id, lotId }
  }

  it('host can activate a queued lot', async () => {
    const { token, tournamentId, lotId } = await freshHostAndLot()
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.lot.auctionStatus).toBe('active')
    expect(res.body.lot.currentBid).toBeGreaterThan(0) // seeded with basePrice

    // Broadcast hit the room.
    const broadcast = app.locals.mockIo.emits.find(
      (e) => e.event === 'lot:activated',
    )
    expect(broadcast).toBeTruthy()
    expect(broadcast.room).toBe(`tournament:${tournamentId}`)
  })

  it('returns 403 when the caller is not the host', async () => {
    const { tournamentId, lotId } = await freshHostAndLot()
    const otherToken = await getToken('other@example.com', 'Other')

    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/auctioneer/i)
  })

  it('returns 400 when bidIncrement is not set (host must decide)', async () => {
    const { token, tournamentId, lotId } = await freshHostAndLot(null)
    const res = await request(app)
      .post(`/api/tournaments/${tournamentId}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/bidIncrement/)
  })

  it('returns 400 when the lot is already active', async () => {
    const { token, tournamentId, lotId } = await freshHostAndLot()
    await request(app)
      .post(`/api/tournaments/${tournamentId}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)
    const second = await request(app)
      .post(`/api/tournaments/${tournamentId}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)
    expect(second.status).toBe(400)
  })

  it('returns 403 when the caller is host of one tournament but the route is for another', async () => {
    const hostToken = await getToken('host@example.com', 'Host')
    const otherToken = await getToken('other@example.com', 'Other')
    const t1 = await createTournament(hostToken)
    const t2 = await createTournament(otherToken, { shortCode: 'OTL' })
    const lotRes = await createLot(hostToken, t1.body.tournament.id)
    const lotId = lotRes.body.lot.id

    // Host of T1 trying to activate a lot on T2 — the host check
    // fails before the lot lookup, so 403 is the right answer.
    const res = await request(app)
      .post(`/api/tournaments/${t2.body.tournament.id}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${hostToken}`)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/lots/:lotId/hammer', () => {
  async function activeLot() {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id
    await request(app)
      .patch(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bidIncrement: 500000 })
    await request(app)
      .post(`/api/tournaments/${id}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)
    return { token, tournamentId: id, lotId, franchises: create.body.tournament.franchises }
  }

  it('host can hammer the active lot and the room goes back to empty', async () => {
    const { token, tournamentId, lotId } = await activeLot()
    const res = await request(app)
      .post(`/api/lots/${lotId}/hammer`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lot.status).toBe('sold')
    expect(res.body.lot.auctionStatus).toBe('hammered')

    // The room is now empty — no active lot.
    const room = await request(app)
      .get(`/api/tournaments/${tournamentId}/room`)
      .set('Authorization', `Bearer ${token}`)
    expect(room.body.activeLot).toBeNull()
  })

  it('records the winning franchise when one is provided', async () => {
    const { token, lotId, franchises } = await activeLot()
    const res = await request(app)
      .post(`/api/lots/${lotId}/hammer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ franchiseId: franchises[0].id })
    expect(res.status).toBe(200)
    expect(res.body.lot.soldToFranchiseId).toBe(franchises[0].id)
  })

  it('returns 400 when the franchiseId does not match any franchise on the tournament', async () => {
    const { token, lotId } = await activeLot()
    const res = await request(app)
      .post(`/api/lots/${lotId}/hammer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ franchiseId: 'not-a-real-franchise' })
    expect(res.status).toBe(400)
  })

  it('returns 403 to a non-host', async () => {
    const { lotId } = await activeLot()
    const otherToken = await getToken('other@example.com', 'Other')
    const res = await request(app)
      .post(`/api/lots/${lotId}/hammer`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 when the lot is not active', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id
    // Don't activate.
    const res = await request(app)
      .post(`/api/lots/${lotId}/hammer`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/lots/:lotId/pass', () => {
  it('host can pass a queued lot directly (no need to activate first)', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id

    const res = await request(app)
      .post(`/api/lots/${lotId}/pass`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lot.status).toBe('unsold')
    expect(res.body.lot.auctionStatus).toBe('unsold')
  })

  it('host can pass an active lot', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id
    await request(app)
      .patch(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bidIncrement: 500000 })
    await request(app)
      .post(`/api/tournaments/${id}/lots/${lotId}/activate`)
      .set('Authorization', `Bearer ${token}`)

    const res = await request(app)
      .post(`/api/lots/${lotId}/pass`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lot.status).toBe('unsold')
  })

  it('returns 403 to a non-host', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id
    const otherToken = await getToken('other@example.com', 'Other')

    const res = await request(app)
      .post(`/api/lots/${lotId}/pass`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 when the lot is already passed', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lotRes = await createLot(token, id)
    const lotId = lotRes.body.lot.id

    await request(app)
      .post(`/api/lots/${lotId}/pass`)
      .set('Authorization', `Bearer ${token}`)
    const second = await request(app)
      .post(`/api/lots/${lotId}/pass`)
      .set('Authorization', `Bearer ${token}`)
    expect(second.status).toBe(400)
  })
})

// =============================================================
// Total-host-control invariant: after the host hammers, the room
// MUST be empty. There is no "next queued lot auto-loads" — that
// would violate the invariant and is explicitly excluded from v1.
// =============================================================

describe('Room lifecycle — total host control', () => {
  it('after hammer, the room is empty (no auto-advance)', async () => {
    const token = await getToken('host@example.com', 'Host')
    const create = await createTournament(token)
    const id = create.body.tournament.id

    // Add 3 lots.
    const lotIds = []
    for (const name of ['Player A', 'Player B', 'Player C']) {
      const r = await createLot(token, id, { name })
      lotIds.push(r.body.lot.id)
    }
    for (const lotId of lotIds) {
      await request(app)
        .patch(`/api/lots/${lotId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bidIncrement: 500000 })
    }

    // Activate lot A and hammer it.
    await request(app)
      .post(`/api/tournaments/${id}/lots/${lotIds[0]}/activate`)
      .set('Authorization', `Bearer ${token}`)
    await request(app)
      .post(`/api/lots/${lotIds[0]}/hammer`)
      .set('Authorization', `Bearer ${token}`)

    // The room MUST be empty — no auto-advance to Player B.
    const room = await request(app)
      .get(`/api/tournaments/${id}/room`)
      .set('Authorization', `Bearer ${token}`)
    expect(room.body.activeLot).toBeNull()

    // Lots B and C are still queued and untouched.
    const lots = await request(app)
      .get(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
    const untouched = lots.body.lots.filter((l) =>
      lotIds.slice(1).includes(l.id),
    )
    expect(untouched.every((l) => l.status === 'queued' && l.auctionStatus === 'idle')).toBe(true)
  })
})