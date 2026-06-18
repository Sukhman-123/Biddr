import { PASSWORD_RULES } from './auth.constants'

export function getPasswordStrength(password) {
  if (!password) return 0

  return PASSWORD_RULES.filter((rule) => rule(password)).length
}
