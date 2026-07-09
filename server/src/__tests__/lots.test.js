const request = require('supertest')
const xlsx = require('xlsx')
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

async function getOwnerToken(email = 'host@example.com', fullName = 'Host') {
  await registerUser(app, { fullName, email, password: 'hunter2hunter2' })
  const login = await loginUser(app, { email, password: 'hunter2hunter2' })
  return login.body.token
}

async function getOtherToken(email = 'other@example.com', fullName = 'Other') {
  await registerUser(app, { fullName, email, password: 'hunter2hunter2' })
  const login = await loginUser(app, { email, password: 'hunter2hunter2' })
  return login.body.token
}

async function createTournament(token, overrides = {}) {
  return request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Pool Test League',
      shortCode: 'PTL',
      currency: 'INR',
      pursePerFranchise: 100000000,
      franchises: [{ name: 'A' }, { name: 'B' }],
      ...overrides,
    })
}

describe('GET /api/tournaments/:id/lots', () => {
  it('returns an empty array when no lots exist', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lots).toEqual([])
  })

  it('returns the inserted lots', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Virat Kohli',
        style: 'Batsman',
        country: 'India',
        basePrice: 2000000,
      })
    const res = await request(app)
      .get(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lots).toHaveLength(1)
    expect(res.body.lots[0].name).toBe('Virat Kohli')
    expect(res.body.lots[0].set).toBe('Squad')
  })

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/tournaments/abc/lots')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/tournaments/:id/lots', () => {
  it('lets the host create a lot', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jasprit Bumrah',
        style: 'Bowler',
        country: 'India',
        basePrice: 1500000,
      })
    expect(res.status).toBe(201)
    expect(res.body.lot.style).toBe('Bowler')
    expect(res.body.lot.set).toBe('Squad')
  })

  it('rejects a non-host', async () => {
    const token = await getOwnerToken()
    const otherToken = await getOtherToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        name: 'Sneaky',
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    expect(res.status).toBe(403)
  })

  it('rejects invalid style', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad',
        style: 'Goalkeeper',
        country: 'India',
        basePrice: 1,
      })
    expect(res.status).toBe(400)
  })

  it('rejects missing name', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated', async () => {
    const res = await request(app)
      .post('/api/tournaments/abc/lots')
      .send({})
    expect(res.status).toBe(401)
  })
})

describe('POST /api/tournaments/:id/lots/bulk', () => {
  it('accepts a CSV upload with mixed valid/invalid rows', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const csv = [
      'name,style,country,basePrice,photoUrl,set',
      'Virat Kohli,Batsman,India,2000000,,Marquee',
      'Jasprit Bumrah,Bowler,India,1500000,,Marquee',
      'Ben Stokes,All-rounder,England,1800000,https://x.com/b.jpg,Marquee',
      ',Bowler,India,1,,Marquee', // missing name → row 4 in the file (header is row 1)
    ].join('\n')

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv, 'utf8'), 'players.csv')

    expect(res.status).toBe(201)
    expect(res.body.created).toBe(3)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].row).toBe(5)
    expect(res.body.errors[0].message).toMatch(/name is required/i)

    const list = await request(app)
      .get(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
    expect(list.body.lots).toHaveLength(3)
  })

  it('accepts an XLSX upload', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const sheet = xlsx.utils.aoa_to_sheet([
      ['name', 'style', 'country', 'basePrice', 'photoUrl', 'set'],
      ['Steve Smith', 'Batsman', 'Australia', '1700000', '', 'Squad'],
      ['Kane Williamson', 'Batsman', 'New Zealand', '1600000', '', 'Squad'],
    ])
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, sheet, 'Players')
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const res = await request(app)
      .post(`/api/tournaments/${id}/lots/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'players.xlsx')
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(2)
    expect(res.body.errors).toEqual([])
  })

  it('rejects a file-less upload', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const res = await request(app)
      .post(`/api/tournaments/${id}/lots/bulk`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('rejects a non-host upload', async () => {
    const ownerToken = await getOwnerToken()
    const otherToken = await getOtherToken()
    const create = await createTournament(ownerToken)
    const id = create.body.tournament.id

    const csv = 'name,style,country,basePrice,photoUrl,set\nA,Batsman,India,1,,Squad\n'
    const res = await request(app)
      .post(`/api/tournaments/${id}/lots/bulk`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('file', Buffer.from(csv, 'utf8'), 'players.csv')
    expect(res.status).toBe(403)
  })

  it('rejects a non-CSV/XLSX file', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const res = await request(app)
      .post(`/api/tournaments/${id}/lots/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello world'), 'players.txt')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/lots/:lotId', () => {
  it('updates fields', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lot = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Original Name',
        style: 'Batsman',
        country: 'India',
        basePrice: 100,
      })
    expect(lot.status).toBe(201)

    const patch = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', basePrice: 200 })
    expect(patch.status).toBe(200)
    expect(patch.body.lot.name).toBe('New Name')
    expect(patch.body.lot.basePrice).toBe(200)
  })

  it('rejects invalid patch', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lot = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'X',
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    const patch = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ style: 'Not-a-style' })
    expect(patch.status).toBe(400)
  })

  it('rejects non-host', async () => {
    const token = await getOwnerToken()
    const otherToken = await getOtherToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lot = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'X',
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    const patch = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hacker' })
    expect(patch.status).toBe(403)
  })

  it('assigns a sold player to a franchise and syncs wallet and squad', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
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

    const patch = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: franchise.id,
        soldPrice: 250,
      })
    expect(patch.status).toBe(200)
    expect(patch.body.lot.status).toBe('sold')
    expect(patch.body.lot.auctionStatus).toBe('hammered')

    const detail = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
    const updatedFranchise = detail.body.tournament.franchises[0]
    expect(updatedFranchise.wallet.spent).toBe(250)
    expect(updatedFranchise.squad.playerIds.map(String)).toContain(lot.body.lot.id)
  })

  it('rejects assigning a sold player above the franchise purse', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token, { pursePerFranchise: 100 })
    const tournament = create.body.tournament
    const franchise = tournament.franchises[0]
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Too Expensive',
        style: 'Batsman',
        country: 'India',
        basePrice: 100,
      })

    const patch = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: franchise.id,
        soldPrice: 250,
      })
    expect(patch.status).toBe(400)
    expect(patch.body.message).toMatch(/insufficient funds/i)

    const detail = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(detail.body.tournament.franchises[0].wallet.spent).toBe(0)
  })

  it('reassigns a sold player between franchises without double-counting wallet spend', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const tournament = create.body.tournament
    const [firstFranchise, secondFranchise] = tournament.franchises
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Transfer Player',
        style: 'Bowler',
        country: 'India',
        basePrice: 100,
      })

    await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: firstFranchise.id,
        soldPrice: 250,
      })

    const reassign = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: secondFranchise.id,
        soldPrice: 300,
      })
    expect(reassign.status).toBe(200)

    const detail = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
    const [updatedFirst, updatedSecond] = detail.body.tournament.franchises
    expect(updatedFirst.wallet.spent).toBe(0)
    expect(updatedFirst.squad.playerIds.map(String)).not.toContain(lot.body.lot.id)
    expect(updatedSecond.wallet.spent).toBe(300)
    expect(updatedSecond.squad.playerIds.map(String)).toContain(lot.body.lot.id)
  })

  it('unassigns a sold player when the status is changed back to queued', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const tournament = create.body.tournament
    const franchise = tournament.franchises[0]
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Reset Player',
        style: 'All-rounder',
        country: 'India',
        basePrice: 100,
      })

    await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'sold',
        soldToFranchiseId: franchise.id,
        soldPrice: 250,
      })

    const reset = await request(app)
      .patch(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'queued' })
    expect(reset.status).toBe(200)
    expect(reset.body.lot.status).toBe('queued')
    expect(reset.body.lot.auctionStatus).toBe('idle')
    expect(reset.body.lot.soldToFranchiseId).toBeNull()

    const detail = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
    const updatedFranchise = detail.body.tournament.franchises[0]
    expect(updatedFranchise.wallet.spent).toBe(0)
    expect(updatedFranchise.squad.playerIds.map(String)).not.toContain(lot.body.lot.id)
  })
})

  describe('POST /api/lots/:lotId/deactivate (skip/requeue)', () => {
    it('returns an active lot back to idle/queued', async () => {
      const token = await getOwnerToken()
      const create = await createTournament(token)
      const id = create.body.tournament.id
      const lot = await request(app)
        .post(`/api/tournaments/${id}/lots`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          style: 'Batsman',
          country: 'India',
          basePrice: 1,
          bidIncrement: 1,
        })
      // Activate first
      await request(app)
        .post(`/api/tournaments/${id}/lots/${lot.body.lot.id}/activate`)
        .set('Authorization', `Bearer ${token}`)
      // Deactivate
      const deactivate = await request(app)
        .post(`/api/lots/${lot.body.lot.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`)
      expect(deactivate.status).toBe(200)
      expect(deactivate.body.lot.auctionStatus).toBe('idle')
      expect(deactivate.body.lot.status).toBe('queued')
    })

    it('rejects non-host', async () => {
      const token = await getOwnerToken()
      const otherToken = await getOtherToken()
      const create = await createTournament(token)
      const id = create.body.tournament.id
      const lot = await request(app)
        .post(`/api/tournaments/${id}/lots`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          style: 'Batsman',
          country: 'India',
          basePrice: 1,
          bidIncrement: 1,
        })
      const deactivate = await request(app)
        .post(`/api/lots/${lot.body.lot.id}/deactivate`)
        .set('Authorization', `Bearer ${otherToken}`)
      expect(deactivate.status).toBe(403)
    })

    it('rejects already idle lot', async () => {
      const token = await getOwnerToken()
      const create = await createTournament(token)
      const id = create.body.tournament.id
      const lot = await request(app)
        .post(`/api/tournaments/${id}/lots`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          style: 'Batsman',
          country: 'India',
          basePrice: 1,
          bidIncrement: 1,
        })
      const deactivate = await request(app)
        .post(`/api/lots/${lot.body.lot.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`)
      expect(deactivate.status).toBe(400)
      expect(deactivate.body.message).toBe('Lot is already idle')
    })

    it('404s on unknown lot', async () => {
      const token = await getOwnerToken()
      const fakeId = '64b0c0a0a0a0a0a0a0a0a0a0'
      const deactivate = await request(app)
        .post(`/api/lots/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${token}`)
      expect(deactivate.status).toBe(404)
    })
  })

describe('DELETE /api/lots/:lotId', () => {
  it('removes the lot', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lot = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bye',
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    const del = await request(app)
      .delete(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(200)
    expect(del.body.deleted).toBe(true)
  })

  it('404s on unknown lot', async () => {
    const token = await getOwnerToken()
    const fakeId = '64b0c0a0a0a0a0a0a0a0a0a0'
    const del = await request(app)
      .delete(`/api/lots/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(404)
  })

  it('rejects non-host', async () => {
    const token = await getOwnerToken()
    const otherToken = await getOtherToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id
    const lot = await request(app)
      .post(`/api/tournaments/${id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'X',
        style: 'Batsman',
        country: 'India',
        basePrice: 1,
      })
    const del = await request(app)
      .delete(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(del.status).toBe(403)
  })

  it('removes a sold lot from franchise wallet and squad', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const tournament = create.body.tournament
    const franchise = tournament.franchises[0]
    const lot = await request(app)
      .post(`/api/tournaments/${tournament.id}/lots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Delete Sold',
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
        soldPrice: 250,
      })

    const del = await request(app)
      .delete(`/api/lots/${lot.body.lot.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(200)

    const detail = await request(app)
      .get(`/api/tournaments/${tournament.id}`)
      .set('Authorization', `Bearer ${token}`)
    const updatedFranchise = detail.body.tournament.franchises[0]
    expect(updatedFranchise.wallet.spent).toBe(0)
    expect(updatedFranchise.squad.playerIds.map(String)).not.toContain(lot.body.lot.id)
  })
})

describe('GET /api/tournaments/:id/lots/template.{csv,xlsx}', () => {
  it('streams a CSV template with the column header', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/lots/template.csv`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.text.split('\n')[0]).toBe(
      'name,style,country,basePrice,photoUrl,set,bidIncrement',
    )
  })

  it('streams an XLSX template', async () => {
    const token = await getOwnerToken()
    const create = await createTournament(token)
    const id = create.body.tournament.id

    const res = await request(app)
      .get(`/api/tournaments/${id}/lots/template.xlsx`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, cb) => {
        const chunks = []
        response.on('data', (c) => chunks.push(c))
        response.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)

    // It should parse as a valid workbook
    const wb = xlsx.read(res.body, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 })
    expect(rows[0]).toEqual(['name', 'style', 'country', 'basePrice', 'photoUrl', 'set', 'bidIncrement'])
  })
})
