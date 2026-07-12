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

describe('POST /api/auth/forgot-password and reset-password', () => {
  beforeEach(async () => {
    await registerUser(app, {
      fullName: 'Reset User',
      email: 'reset@example.com',
      password: 'oldpassword123',
      phone: '+91 98765 12345',
    })
  })

  it('issues a development reset token for an existing email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset instructions/i)
    expect(res.body.resetToken).toBeTruthy()
    expect(res.body.resetUrl).toContain('/reset-password?token=')
  })

  it('sends a password reset email through Resend when configured', async () => {
    const originalApiKey = process.env.RESEND_API_KEY
    const originalFrom = process.env.RESEND_FROM_EMAIL
    const originalFetch = global.fetch
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_FROM_EMAIL = 'Biddr <noreply@example.com>'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_test_123' }),
    })

    try {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' })

      expect(res.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key',
            'Content-Type': 'application/json',
            'User-Agent': 'biddr-api/1.0',
          }),
        }),
      )

      const payload = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(payload.from).toBe('Biddr <noreply@example.com>')
      expect(payload.to).toEqual(['reset@example.com'])
      expect(payload.subject).toMatch(/reset/i)
      expect(payload.text).toContain('/reset-password?token=')
      expect(payload.html).toContain('/reset-password?token=')
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.RESEND_API_KEY
      } else {
        process.env.RESEND_API_KEY = originalApiKey
      }
      if (originalFrom === undefined) {
        delete process.env.RESEND_FROM_EMAIL
      } else {
        process.env.RESEND_FROM_EMAIL = originalFrom
      }
      global.fetch = originalFetch
    }
  })

  it('does not fail the request when Resend rejects delivery', async () => {
    const originalApiKey = process.env.RESEND_API_KEY
    const originalFetch = global.fetch
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    process.env.RESEND_API_KEY = 're_test_key'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Domain is not verified',
    })

    try {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.message).toMatch(/reset instructions/i)
      expect(warnSpy).toHaveBeenCalledWith(
        '[auth] password reset email failed:',
        expect.objectContaining({
          email: 'reset@example.com',
          message: expect.stringContaining('Resend email failed'),
        }),
      )
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.RESEND_API_KEY
      } else {
        process.env.RESEND_API_KEY = originalApiKey
      }
      global.fetch = originalFetch
      warnSpy.mockRestore()
    }
  })

  it('does not reveal unknown email addresses', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/reset instructions/i)
    expect(res.body.resetToken).toBeUndefined()
  })

  it('resets the password with a valid token and clears old credentials', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' })

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: forgot.body.resetToken,
        password: 'newpassword123',
      })

    expect(reset.status).toBe(200)

    const oldLogin = await loginUser(app, {
      identifier: 'reset@example.com',
      password: 'oldpassword123',
    })
    expect(oldLogin.status).toBe(401)

    const newLogin = await loginUser(app, {
      identifier: 'reset@example.com',
      password: 'newpassword123',
    })
    expect(newLogin.status).toBe(200)
    expect(newLogin.body.token).toBeTruthy()
  })

  it('rejects invalid reset tokens', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'newpassword123' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/invalid|expired/i)
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

  it('promotes a viewer to auctioneer', async () => {
    const reg = await registerUser(app, {
      fullName: 'Role Flip',
      email: 'roleflip@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 99999',
    })
    expect(reg.body.user.role).toBe('viewer')
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ role: 'auctioneer' })
    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('auctioneer')
  })

  it('rejects an invalid role', async () => {
    const reg = await registerUser(app, {
      fullName: 'Role Bad',
      email: 'rolebad@example.com',
      password: 'hunter2hunter2',
      phone: '+91 98765 99998',
    })
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ role: 'admin' })
    expect(res.status).toBe(400)
  })
})

// ============================================================
// Google OAuth (POST /api/auth/google)
// ============================================================
//
// These tests stub out the real Google token verifier because we
// can't reach Google's servers in CI / offline. The stub returns a
// payload shaped like Google's, so the controller logic is exercised
// end-to-end (validation, user creation, user lookup, token sign).

jest.mock('../services/googleAuth', () => ({
  verifyGoogleIdToken: jest.fn(),
}))

const { verifyGoogleIdToken } = require('../services/googleAuth')

const googlePayload = (overrides = {}) => ({
  sub: 'google-sub-123',
  email: 'googleuser@example.com',
  email_verified: true,
  name: 'Google User',
  ...overrides,
})

describe('POST /api/auth/google', () => {
  beforeEach(() => {
    verifyGoogleIdToken.mockReset()
  })

  it('rejects missing idToken', async () => {
    const res = await request(app).post('/api/auth/google').send({})
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/idToken is required/)
  })

  it('creates a new user from a verified Google token (no password)', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(googlePayload())

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'fake-token' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('googleuser@example.com')
    expect(res.body.user.authProvider).toBe('google')
    // The signup didn't send a phone — Google users can add one later.
    expect(res.body.user.phone).toBeFalsy()
  })

  it('signs in an existing Google user without duplicating', async () => {
    // First call creates the user.
    verifyGoogleIdToken.mockResolvedValueOnce(googlePayload())
    const first = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'fake-token-1' })
    expect(first.status).toBe(200)

    // Second call with the same sub should find the existing user.
    verifyGoogleIdToken.mockResolvedValueOnce(googlePayload())
    const second = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'fake-token-2' })
    expect(second.status).toBe(200)
    expect(second.body.user.email).toBe('googleuser@example.com')
  })

  it('rejects when the Google token is invalid', async () => {
    verifyGoogleIdToken.mockRejectedValueOnce(new Error('bad token'))
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'bad-token' })
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/Google sign-in failed/)
  })

  it('rejects unverified Google emails on first signup', async () => {
    verifyGoogleIdToken.mockResolvedValueOnce(
      googlePayload({ email_verified: false }),
    )
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'fake-token' })
    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/not verified/)
  })
})
