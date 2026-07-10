const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s-]{7,20}$/

export const PHONE_REGEX = PHONE_RE

export function isEmailIdentifier(value) {
  return typeof value === 'string' && value.includes('@')
}

export function isPhone(value) {
  return typeof value === 'string' && PHONE_RE.test(value.trim())
}

export function validateRegister(form) {
  const errors = {}

  if (!form.fullName.trim() || form.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (!form.phone || !form.phone.trim()) {
    errors.phone = 'Phone number is required'
  } else if (!PHONE_RE.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters'
  }

  return errors
}

export function validateLogin(form) {
  const errors = {}
  const identifier = (form.identifier ?? form.email ?? '').trim()

  if (!identifier) {
    errors.identifier = 'Email or phone is required'
  } else if (isEmailIdentifier(identifier)) {
    if (!EMAIL_RE.test(identifier)) {
      errors.identifier = 'Enter a valid email address'
    }
  } else if (!isPhone(identifier)) {
    errors.identifier = 'Enter a valid email or phone'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  }

  return errors
}

export function validateForgotPassword(form) {
  const errors = {}
  const email = (form.email ?? '').trim()

  if (!email) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address'
  }

  return errors
}

export function validateResetPassword(form) {
  const errors = {}

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}
