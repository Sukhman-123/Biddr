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

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await registerUser(app, {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.phone).toBeTruthy()
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

  it('rejects missing phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'No Phone',
        email: 'nophone@example.com',
        password: 'hunter2hunter2',
      })
    expect(res.status).toBe(400)
  })

  it('rejects invalid phone format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Bad Phone',
        email: 'badphone@example.com',
        password: 'hunter2hunter2',
        phone: 'abc',
      })
    expect(res.status).toBe(400)
  })

  it('rejects duplicate phone numbers', async () => {
    await registerUser(app, {
      fullName: 'Phone Owner',
      email: 'one@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 43210',
    })
    const res = await registerUser(app, {
      fullName: 'Phone Other',
      email: 'two@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 43210',
    })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser(app, {
      fullName: 'Login User',
      email: 'login@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 11111',
    })
  })

  it('returns a token for valid email credentials', async () => {
    const res = await loginUser(app, {
      identifier: 'login@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('returns a token for valid phone credentials', async () => {
    const res = await loginUser(app, {
      identifier: '+91 98765 11111',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('trims surrounding whitespace before lookup', async () => {
    const res = await loginUser(app, {
      identifier: '   +91 98765 11111   ',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(200)
  })

  it('rejects wrong password', async () => {
    const res = await loginUser(app, {
      identifier: 'login@example.com',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })

  it('rejects unknown email', async () => {
    const res = await loginUser(app, {
      identifier: 'nobody@example.com',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(401)
  })

  it('rejects unknown phone', async () => {
    const res = await loginUser(app, {
      identifier: '+91 99999 99999',
      password: 'hunter2hunter2',
    })
    expect(res.status).toBe(401)
  })

  it('rejects missing identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'hunter2hunter2' })
    expect(res.status).toBe(400)
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
    expect(res.body.user.phone).toBeTruthy()
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
      phone: '+91 98765 22222',
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

    const login = await loginUser(app, {
      identifier: 'me2@example.com',
      password: 'newlongerpassword',
    })
    expect(login.status).toBe(200)
  })

  it('updates the phone number', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1 415 555 0001' })
    expect(res.status).toBe(200)
    expect(res.body.user.phone).toBe('+1 415 555 0001')
  })

  it('rejects invalid phone format', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'nope' })
    expect(res.status).toBe(400)
  })

  it('rejects duplicate phone on update', async () => {
    await registerUser(app, {
      fullName: 'Other',
      email: 'other@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 33333',
    })
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+91 98765 33333' })
    expect(res.status).toBe(409)
  })

  it('requires authentication', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .send({ fullName: 'Hacker' })
    expect(res.status).toBe(401)
  })
})