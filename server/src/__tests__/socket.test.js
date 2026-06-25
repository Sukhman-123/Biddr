const { assertCanSubscribe } = require('../socket/index')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
  loginUser,
} = require('../test/testServer')
const Tournament = require('../models/Tournament')
const Invitation = require('../models/Invitation')
const jwt = require('jsonwebtoken')

let app
let testUser

beforeAll(async () => {
  app = await startTestEnv()
  await registerUser(app, {
    fullName: 'Tester',
    email: 'tester@example.com',
    password: 'hunter2hunter2',
  })
  const login = await loginUser(app, {
    email: 'tester@example.com',
    password: 'hunter2hunter2',
  })
  const User = require('../models/User')
  testUser = await User.findById(login.body.user.id)
})

afterAll(async () => {
  await stopTestEnv()
})

beforeEach(async () => {
  await clearDatabase()
  // Re-create the test user after each clear.
  await registerUser(app, {
    fullName: 'Tester',
    email: 'tester@example.com',
    password: 'hunter2hunter2',
  })
  const login = await loginUser(app, {
    email: 'tester@example.com',
    password: 'hunter2hunter2',
  })
  const User = require('../models/User')
  testUser = await User.findById(login.body.user.id)
})

async function makeTournament(overrides = {}) {
  return Tournament.create({
    name: 'Socket Test League',
    shortCode: 'STL',
    currency: 'INR',
    ownerId: testUser._id,
    ...overrides,
  })
}

describe('assertCanSubscribe (socket room:join access check)', () => {
  it('lets the host subscribe to their own tournament', async () => {
    const t = await makeTournament()
    const result = await assertCanSubscribe(t._id.toString(), testUser)
    expect(result._id.toString()).toBe(t._id.toString())
  })

  it('lets an authenticated user subscribe to a public tournament', async () => {
    const t = await makeTournament({ visibility: 'public' })
    const other = await registerUser(app, {
      fullName: 'Other',
      email: 'other@example.com',
      password: 'hunter2hunter2',
    })
    const User = require('../models/User')
    const otherUser = await User.findById(other.body.user.id)
    const result = await assertCanSubscribe(t._id.toString(), otherUser)
    expect(result._id.toString()).toBe(t._id.toString())
  })

  it('rejects a non-invited user on an invite-only tournament', async () => {
    const t = await makeTournament({ visibility: 'invite-only' })
    const other = await registerUser(app, {
      fullName: 'Stranger',
      email: 'stranger@example.com',
      password: 'hunter2hunter2',
    })
    const User = require('../models/User')
    const otherUser = await User.findById(other.body.user.id)

    await expect(
      assertCanSubscribe(t._id.toString(), otherUser),
    ).rejects.toMatchObject({ data: { status: 403 } })
  })

  it('lets an invited user subscribe to an invite-only tournament', async () => {
    const other = await registerUser(app, {
      fullName: 'Invited',
      email: 'invited@example.com',
      password: 'hunter2hunter2',
    })
    const User = require('../models/User')
    const otherUser = await User.findById(other.body.user.id)
    const t = await makeTournament({ visibility: 'invite-only' })
    await Invitation.create({
      tournamentId: t._id,
      email: 'invited@example.com',
      invitedById: testUser._id,
      status: 'pending',
    })

    const result = await assertCanSubscribe(t._id.toString(), otherUser)
    expect(result._id.toString()).toBe(t._id.toString())
  })

  it('throws 404 when the tournament does not exist', async () => {
    const fakeId = '60a0a0a0a0a0a0a0a0a0a0a0'
    await expect(
      assertCanSubscribe(fakeId, testUser),
    ).rejects.toMatchObject({ data: { status: 404 } })
  })
})

describe('JWT secret handling', () => {
  it('signs and verifies a token with the configured secret', () => {
    // The middleware reads JWT_SECRET; in tests it's set to a known
    // value. Confirm we're using the same secret to sign in tests so
    // the middleware would accept a hand-crafted token.
    const token = jwt.sign({ id: testUser._id.toString() }, process.env.JWT_SECRET)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    expect(decoded.id).toBe(testUser._id.toString())
  })
})