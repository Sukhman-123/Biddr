import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  }
})

import api from '../../../lib/api'
import {
  fetchRoomSnapshotRequest,
  listTournamentLotsRequest,
  activateLotRequest,
  hammerLotRequest,
  passLotRequest,
} from '../auctionRoom.api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auctionRoom.api', () => {
  describe('fetchRoomSnapshotRequest', () => {
    it('returns the parsed room snapshot', async () => {
      const snapshot = {
        tournament: { id: 't1', name: 'League' },
        activeLot: null,
        recentBids: [],
      }
      api.get.mockResolvedValueOnce({ data: snapshot })
      const result = await fetchRoomSnapshotRequest('t1')
      expect(api.get).toHaveBeenCalledWith('/tournaments/t1/room')
      expect(result).toEqual(snapshot)
    })

    it('returns safe defaults when fields are missing', async () => {
      api.get.mockResolvedValueOnce({ data: {} })
      const result = await fetchRoomSnapshotRequest('t1')
      expect(result).toEqual({
        tournament: null,
        activeLot: null,
        recentBids: [],
      })
    })

    it('throws a plain Error with the server message on failure', async () => {
      const err = new Error('Network')
      err.response = { data: { message: 'You do not have access' } }
      api.get.mockRejectedValueOnce(err)
      await expect(fetchRoomSnapshotRequest('t1')).rejects.toThrow(
        'You do not have access',
      )
    })

    it('falls back to a generic message when the server does not provide one', async () => {
      api.get.mockRejectedValueOnce(new Error('Network'))
      await expect(fetchRoomSnapshotRequest('t1')).rejects.toThrow(
        'Could not load the auction room',
      )
    })
  })

  describe('listTournamentLotsRequest', () => {
    it('returns the lot list', async () => {
      api.get.mockResolvedValueOnce({ data: { lots: [{ id: 'l1' }] } })
      const result = await listTournamentLotsRequest('t1')
      expect(result).toEqual([{ id: 'l1' }])
    })
    it('returns an empty array when the field is missing', async () => {
      api.get.mockResolvedValueOnce({ data: {} })
      const result = await listTournamentLotsRequest('t1')
      expect(result).toEqual([])
    })
  })

  describe('activateLotRequest', () => {
    it('posts to the activate endpoint and returns the updated lot', async () => {
      api.post.mockResolvedValueOnce({ data: { lot: { id: 'l1', auctionStatus: 'active' } } })
      const lot = await activateLotRequest('t1', 'l1')
      expect(api.post).toHaveBeenCalledWith('/tournaments/t1/lots/l1/activate')
      expect(lot).toEqual({ id: 'l1', auctionStatus: 'active' })
    })

    it('throws with the server message on failure', async () => {
      const err = new Error('bad')
      err.response = { data: { message: 'Auctioneer must set bidIncrement before activating it' } }
      api.post.mockRejectedValueOnce(err)
      await expect(activateLotRequest('t1', 'l1')).rejects.toThrow(
        /bidIncrement/,
      )
    })
  })

  describe('hammerLotRequest', () => {
    it('sends an empty body when no franchiseId is provided', async () => {
      api.post.mockResolvedValueOnce({ data: { lot: { id: 'l1', status: 'sold' } } })
      const lot = await hammerLotRequest('l1')
      expect(api.post).toHaveBeenCalledWith('/lots/l1/hammer', {})
      expect(lot.status).toBe('sold')
    })

    it('sends the franchiseId when provided', async () => {
      api.post.mockResolvedValueOnce({ data: { lot: { id: 'l1' } } })
      await hammerLotRequest('l1', { franchiseId: 'f1' })
      expect(api.post).toHaveBeenCalledWith('/lots/l1/hammer', { franchiseId: 'f1' })
    })
  })

  describe('passLotRequest', () => {
    it('posts to /pass and returns the lot', async () => {
      api.post.mockResolvedValueOnce({ data: { lot: { id: 'l1', status: 'unsold' } } })
      const lot = await passLotRequest('l1')
      expect(api.post).toHaveBeenCalledWith('/lots/l1/pass')
      expect(lot.status).toBe('unsold')
    })
  })
})