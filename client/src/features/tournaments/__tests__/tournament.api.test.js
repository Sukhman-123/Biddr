import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '../../../lib/api'
import { startAuctionRequest } from '../tournament.api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('startAuctionRequest', () => {
  it('POSTs to /tournaments/:id/start and returns the updated tournament', async () => {
    api.post.mockResolvedValueOnce({
      data: { tournament: { id: 't1', status: 'live' } },
    })
    const result = await startAuctionRequest('t1')
    expect(api.post).toHaveBeenCalledWith('/tournaments/t1/start')
    expect(result).toEqual({ id: 't1', status: 'live' })
  })

  it('throws a wrapped error with the server message', async () => {
    const err = new Error('Network')
    err.response = { data: { message: 'The auction start date has not arrived yet' } }
    api.post.mockRejectedValueOnce(err)
    await expect(startAuctionRequest('t1')).rejects.toThrow(
      /start date has not arrived/,
    )
  })

  it('falls back to a generic message when the server does not provide one', async () => {
    api.post.mockRejectedValueOnce(new Error('Network'))
    await expect(startAuctionRequest('t1')).rejects.toThrow(
      'Could not start the auction',
    )
  })
})