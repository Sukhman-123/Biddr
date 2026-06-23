const request = require('supertest')
const {
  startTestEnv,
  stopTestEnv,
  clearDatabase,
  registerUser,
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

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await registerUser(app, {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.role).toBe('viewer')
    expect(res.body.token).toBeTruthy()
  })

  it('rejects duplicate emails', async () => {
    await registerUser(app, {
      fullName: 'Original',
      email: 'dup@example.com',
      password: 'hunter2hunter2',
    })
    const res = await registerUser(app, {
      fullName: 'Other Person',
      email: 'dup@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(409)
  })

  it('rejects weak passwords (under 8 chars)', async () => {
    const res = await registerUser(app, {
      fullName: 'Short',
      email: 'short@example.com',
      password: 'abc',
    })
    expect(res.status).toBe(400)
  })

  it('rejects invalid email format', async () => {
    const res = await registerUser(app, {
      fullName: 'Bad',
      email: 'not-an-email',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(400)
  })

  it('rejects short fullName', async () => {
    const res = await registerUser(app, {
      fullName: 'A',
      email: 'short-name@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser(app, {
      fullName: 'Login User',
      email: 'login@example.com',
      password: 'hunter2hunter2',
    })
  })

  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'hunter2hunter2' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' })
    expect(res.status).toBe(401)
  })

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'hunter2hunter2' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the user with a valid token', async () => {
    const reg = await registerUser(app, {
      fullName: 'Me User',
      email: 'me@example.com',
      password: 'hunter2hunter2',
    })
    const token = reg.body.token

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('me@example.com')
  })

  it('rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/auth/me', () => {
  let token
  beforeEach(async () => {
    const reg = await registerUser(app, {
      fullName: 'Original',
      email: 'me2@example.com',
      password: 'hunter2hunter2',
    })
    token = reg.body.token
  })

  it('updates the fullName', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Name' })
    expect(res.status).toBe(200)
    expect(res.body.user.fullName).toBe('Updated Name')
  })

  it('rejects too-short fullName', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'A' })
    expect(res.status).toBe(400)
  })

  it('rejects too-short password', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'short' })
    expect(res.status).toBe(400)
  })

  it('updates the password and allows login with new password', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'newlongerpassword' })
    expect(res.status).toBe(200)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'me2@example.com', password: 'newlongerpassword' })
    expect(login.status).toBe(200)
  })

  it('requires authentication', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .send({ fullName: 'Hacker' })
    expect(res.status).toBe(401)
  })
})
