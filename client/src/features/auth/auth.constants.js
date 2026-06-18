import { Gavel, TrendingUp, Users } from 'lucide-react'

export const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
}

export const ROLES = [
  {
    id: 'auctioneer',
    label: 'Auctioneer',
    description: 'Run and control the auction room.',
    Icon: Gavel,
  },
  {
    id: 'owner',
    label: 'Team Owner',
    description: 'Bid on players and build your squad.',
    Icon: Users,
  },
  {
    id: 'spectator',
    label: 'Spectator',
    description: 'Watch the live auction in real time.',
    Icon: TrendingUp,
  },
]

export const PASSWORD_RULES = [
  (password) => password.length >= 8,
  (password) => /[A-Z]/.test(password) && /[a-z]/.test(password),
  (password) => /\d/.test(password),
  (password) => /[^A-Za-z0-9]/.test(password),
]

export const STRENGTH_LABELS = ['weak', 'fair', 'good', 'strong']
