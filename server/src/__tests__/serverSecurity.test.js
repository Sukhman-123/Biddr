const request = require('supertest')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
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

describe('server surface area', () => {
  it('does not expose the debug env endpoint', async () => {
    const res = await request(app).get('/api/_debug/env')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Route not found')
  })
})
