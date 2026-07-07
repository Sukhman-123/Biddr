const request = require('supertest')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer')

let app
let hostUser
let hostToken
let ownerUser
let ownerToken
let memberUser
let outsiderUser
let outsiderToken
let tournament
let franchise

async function createTournament() {
  const res = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${hostToken}`)
    .send({
      name: 'Franchise Access Test',
      shortCode: `FAT${Date.now()}`,
      visibility: 'public',
      franchises: [{ name: 'Falcons', colorHex: '#112233' }],
    })

  tournament = res.body.tournament
  franchise = tournament.franchises[0]
}

beforeAll(async () => {
  app = await startTestEnv()
})

afterAll(async () => {
  await stopTestEnv()
})

beforeEach(async () => {
  await clearDatabase()

  const hostRegister = await registerUser(app, {
    fullName: 'Host User',
    email: 'host@example.com',
    password: 'hunter2hunter2',
  })
  hostUser = hostRegister.body.user
  const hostLogin = await loginUser(app, {
    email: 'host@example.com',
    password: 'hunter2hunter2',
  })
  hostToken = hostLogin.body.token

  const ownerRegister = await registerUser(app, {
    fullName: 'Owner User',
    email: 'owner@example.com',
    password: 'hunter2hunter2',
  })
  ownerUser = ownerRegister.body.user
  const ownerLogin = await loginUser(app, {
    email: 'owner@example.com',
    password: 'hunter2hunter2',
  })
  ownerToken = ownerLogin.body.token

  const memberRegister = await registerUser(app, {
    fullName: 'Member User',
    email: 'member@example.com',
    password: 'hunter2hunter2',
  })
  memberUser = memberRegister.body.user

  const outsiderRegister = await registerUser(app, {
    fullName: 'Outsider User',
    email: 'outsider@example.com',
    password: 'hunter2hunter2',
  })
  outsiderUser = outsiderRegister.body.user
  const outsiderLogin = await loginUser(app, {
    email: 'outsider@example.com',
    password: 'hunter2hunter2',
  })
  outsiderToken = outsiderLogin.body.token

  await createTournament()

  await request(app)
    .post(`/api/franchises/${tournament.id}/${franchise.id}/members`)
    .set('Authorization', `Bearer ${hostToken}`)
    .send({ userId: ownerUser.id, role: 'owner' })
})

describe('franchise member authorization', () => {
  it('forbids unrelated users from viewing the member list', async () => {
    const res = await request(app)
      .get(`/api/franchises/${tournament.id}/${franchise.id}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`)

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/franchise members can view/i)
  })

  it('forbids unrelated users from adding members', async () => {
    const res = await request(app)
      .post(`/api/franchises/${tournament.id}/${franchise.id}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ userId: memberUser.id, role: 'member' })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/franchise owner can manage members/i)
  })

  it('allows a franchise owner to add a regular member', async () => {
    const addRes = await request(app)
      .post(`/api/franchises/${tournament.id}/${franchise.id}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberUser.id, role: 'member' })

    expect(addRes.status).toBe(201)

    const listRes = await request(app)
      .get(`/api/franchises/${tournament.id}/${franchise.id}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: ownerUser.id, role: 'owner' }),
        expect.objectContaining({ userId: memberUser.id, role: 'member' }),
      ]),
    )
  })

  it('prevents demoting the last owner of a franchise', async () => {
    const res = await request(app)
      .put(`/api/franchises/${tournament.id}/${franchise.id}/members/${ownerUser.id}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ role: 'member' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/last owner/i)
  })
})
