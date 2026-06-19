const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegister(form) {
  const errors = {}

  if (!form.fullName.trim() || form.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name'
  }

  if (form.franchise && form.franchise.length > 80) {
    errors.franchise = 'Franchise name is too long'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address'
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

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  }

  return errors
}
