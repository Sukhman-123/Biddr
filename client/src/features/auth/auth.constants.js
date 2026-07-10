export const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot-password',
  RESET_PASSWORD: 'reset-password',
}

export const PASSWORD_RULES = [
  (password) => password.length >= 8,
  (password) => /[A-Z]/.test(password) && /[a-z]/.test(password),
  (password) => /\d/.test(password),
  (password) => /[^A-Za-z0-9]/.test(password),
]

export const STRENGTH_LABELS = ['weak', 'fair', 'good', 'strong']
