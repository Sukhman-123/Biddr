import { describe, it, expect } from 'vitest'
import {
  validateLogin,
  validateRegister,
  isEmailIdentifier,
  isPhone,
  PHONE_REGEX,
} from '../auth.validation'

describe('auth.validation helpers', () => {
  it('detects email identifiers', () => {
    expect(isEmailIdentifier('foo@bar.com')).toBe(true)
    expect(isEmailIdentifier('  +91 98765 43210  ')).toBe(false)
    expect(isEmailIdentifier('plaintext')).toBe(false)
  })

  it('validates phone format', () => {
    expect(isPhone('+91 98765 43210')).toBe(true)
    expect(isPhone('9876543210')).toBe(true)
    expect(isPhone('+1-415-555-0123')).toBe(true)
    expect(isPhone('abc')).toBe(false)
    expect(isPhone('+1 (415) 555-0123')).toBe(false) // parens not allowed
  })

  it('exposes the phone regex for reuse', () => {
    expect(PHONE_REGEX).toBeInstanceOf(RegExp)
  })
})

describe('validateRegister', () => {
  const makeValid = (overrides = {}) => ({
    fullName: 'Virat Kohli',
    email: 'virat@example.com',
    phone: '+91 98765 43210',
    password: 'hunter2hunter2',
    ...overrides,
  })

  it('accepts a fully valid form', () => {
    expect(validateRegister(makeValid())).toEqual({})
  })

  it('rejects missing phone', () => {
    const errors = validateRegister(makeValid({ phone: '' }))
    expect(errors.phone).toMatch(/required/i)
  })

  it('rejects invalid phone', () => {
    const errors = validateRegister(makeValid({ phone: 'abc' }))
    expect(errors.phone).toMatch(/valid phone/i)
  })

  it('keeps existing fullName + email + password checks', () => {
    expect(validateRegister(makeValid({ fullName: 'A' }))).toHaveProperty(
      'fullName',
    )
    expect(validateRegister(makeValid({ email: 'not-an-email' }))).toHaveProperty(
      'email',
    )
    expect(validateRegister(makeValid({ password: 'short' }))).toHaveProperty(
      'password',
    )
  })
})

describe('validateLogin', () => {
  it('accepts an email identifier', () => {
    expect(
      validateLogin({
        identifier: 'user@example.com',
        password: 'hunter2hunter2',
      }),
    ).toEqual({})
  })

  it('accepts a phone identifier', () => {
    expect(
      validateLogin({
        identifier: '+91 98765 43210',
        password: 'hunter2hunter2',
      }),
    ).toEqual({})
  })

  it('falls back to the legacy email field if identifier missing', () => {
    expect(
      validateLogin({
        email: 'legacy@example.com',
        password: 'hunter2hunter2',
      }),
    ).toEqual({})
  })

  it('rejects an invalid email identifier', () => {
    const errors = validateLogin({
      identifier: 'not-an-email',
      password: 'hunter2hunter2',
    })
    expect(errors.identifier).toMatch(/valid email/i)
  })

  it('rejects an invalid phone identifier', () => {
    const errors = validateLogin({
      identifier: 'abc',
      password: 'hunter2hunter2',
    })
    expect(errors.identifier).toMatch(/valid email or phone/i)
  })

  it('rejects an empty identifier', () => {
    const errors = validateLogin({ identifier: '', password: 'secret1234' })
    expect(errors.identifier).toMatch(/required/i)
  })

  it('rejects a missing password', () => {
    const errors = validateLogin({ identifier: 'user@example.com' })
    expect(errors.password).toMatch(/required/i)
  })
})