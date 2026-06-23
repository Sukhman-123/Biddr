const DEFAULT_COLOR = '#f5b94a'

const newFranchise = (color = DEFAULT_COLOR) => ({
  id: `f-${Math.random().toString(36).slice(2, 9)}`,
  name: '',
  city: '',
  colorHex: color,
})

export function validateCreateTournament(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Tournament name is required'
  } else if (form.name.trim().length < 3) {
    errors.name = 'Use at least 3 characters'
  } else if (form.name.trim().length > 120) {
    errors.name = 'Keep it under 120 characters'
  }

  if (!form.shortCode.trim()) {
    errors.shortCode = 'Short code is required'
  } else if (form.shortCode.trim().length < 2) {
    errors.shortCode = 'At least 2 characters'
  }

  if (form.startDate && form.endDate) {
    if (form.endDate < form.startDate) {
      errors.endDate = 'End date must be after the start date'
    }
  }

  const purse = Number(form.pursePerFranchise)
  if (!form.pursePerFranchise || Number.isNaN(purse) || purse <= 0) {
    errors.pursePerFranchise = 'Enter a positive purse'
  }

  const validFranchises = form.franchises.filter((f) => f.name.trim())
  if (validFranchises.length < 2) {
    errors.franchises = 'Add at least two franchise teams'
  } else {
    const seen = new Set()
    for (const f of validFranchises) {
      const key = f.name.trim().toLowerCase()
      if (seen.has(key)) {
        errors.franchises = 'Franchise names must be unique'
        break
      }
      seen.add(key)
    }
  }

  return errors
}

export function buildInitialFranchiseState(count = 6) {
  return Array.from({ length: count }, () => newFranchise())
}

export const VALID_CURRENCIES = ['INR', 'USD', 'GBP', 'AUD', 'AED', 'ZAR', 'PKR']
