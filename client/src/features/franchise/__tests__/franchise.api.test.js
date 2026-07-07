import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '../../../lib/api'
import {
  addFranchiseMemberRequest,
  getFranchiseMembersRequest,
  removeFranchiseMemberRequest,
  updateFranchiseMemberRoleRequest,
} from '../franchise.api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('franchise.api', () => {
  it('GETs the mounted franchise members route', async () => {
    api.get.mockResolvedValueOnce({ data: { members: [{ userId: 'u1' }] } })

    const result = await getFranchiseMembersRequest('t1', 'f1')

    expect(api.get).toHaveBeenCalledWith('/franchises/t1/f1/members')
    expect(result).toEqual([{ userId: 'u1' }])
  })

  it('POSTs to the mounted add-member route', async () => {
    api.post.mockResolvedValueOnce({ data: { ok: true } })

    const result = await addFranchiseMemberRequest('t1', 'f1', 'u1', 'owner')

    expect(api.post).toHaveBeenCalledWith('/franchises/t1/f1/members', {
      userId: 'u1',
      role: 'owner',
    })
    expect(result).toEqual({ ok: true })
  })

  it('PUTs to the mounted role-update route', async () => {
    api.put.mockResolvedValueOnce({ data: { ok: true } })

    const result = await updateFranchiseMemberRoleRequest('t1', 'f1', 'u1', 'member')

    expect(api.put).toHaveBeenCalledWith('/franchises/t1/f1/members/u1', {
      role: 'member',
    })
    expect(result).toEqual({ ok: true })
  })

  it('DELETEs to the mounted remove-member route', async () => {
    api.delete.mockResolvedValueOnce({ data: { ok: true } })

    const result = await removeFranchiseMemberRequest('t1', 'f1', 'u1')

    expect(api.delete).toHaveBeenCalledWith('/franchises/t1/f1/members/u1')
    expect(result).toEqual({ ok: true })
  })
})
