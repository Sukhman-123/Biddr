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
import {
  endAuctionRequest,
  getAuctionRecapRequest,
  startAuctionRequest,
} from '../tournament.api'

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

describe('endAuctionRequest', () => {
  it('POSTs to /tournaments/:id/end and returns the updated tournament', async () => {
    api.post.mockResolvedValueOnce({
      data: { tournament: { id: 't1', status: 'completed' } },
    })
    const result = await endAuctionRequest('t1')
    expect(api.post).toHaveBeenCalledWith('/tournaments/t1/end')
    expect(result).toEqual({ id: 't1', status: 'completed' })
  })

  it('throws a wrapped error with the server message', async () => {
    const err = new Error('Network')
    err.response = { data: { message: 'Resolve the current lot before ending the auction' } }
    api.post.mockRejectedValueOnce(err)
    await expect(endAuctionRequest('t1')).rejects.toThrow(
      /resolve the current lot/i,
    )
  })
})

describe('getAuctionRecapRequest', () => {
  it('GETs the completed auction recap', async () => {
    const recap = { tournament: { id: 't1' }, summary: { soldCount: 3 } }
    api.get.mockResolvedValueOnce({ data: { recap } })

    const result = await getAuctionRecapRequest('t1')

    expect(api.get).toHaveBeenCalledWith('/tournaments/t1/recap')
    expect(result).toEqual(recap)
  })

  it('surfaces the server error when the recap is not ready', async () => {
    const error = new Error('Request failed')
    error.response = { data: { message: 'The auction recap is available after the auction ends' } }
    api.get.mockRejectedValueOnce(error)

    await expect(getAuctionRecapRequest('t1')).rejects.toThrow(/after the auction ends/i)
  })
})
