import api from '../../lib/api'

const wrapError = (error, fallback) => {
  if (error.response?.data?.message) return new Error(error.response.data.message)
  if (error.message) return new Error(error.message)
  return new Error(fallback)
}

export async function addFranchiseMemberRequest(tournamentId, franchiseId, userId, role = 'member') {
  try {
    const { data } = await api.post(
      `/franchises/${tournamentId}/franchises/${franchiseId}/members`,
      { userId, role },
    )
    return data
  } catch (error) {
    throw wrapError(error, 'Could not add member to franchise')
  }
}

export async function removeFranchiseMemberRequest(tournamentId, franchiseId, userId) {
  try {
    const { data } = await api.delete(
      `/franchises/${tournamentId}/franchises/${franchiseId}/members/${userId}`,
    )
    return data
  } catch (error) {
    throw wrapError(error, 'Could not remove member from franchise')
  }
}

export async function updateFranchiseMemberRoleRequest(tournamentId, franchiseId, userId, role) {
  try {
    const { data } = await api.put(
      `/franchises/${tournamentId}/franchises/${franchiseId}/members/${userId}`,
      { role },
    )
    return data
  } catch (error) {
    throw wrapError(error, 'Could not update member role')
  }
}

export async function getFranchiseMembersRequest(tournamentId, franchiseId) {
  try {
    const { data } = await api.get(
      `/franchises/${tournamentId}/franchises/${franchiseId}/members`,
    )
    return data.members || []
  } catch (error) {
    throw wrapError(error, 'Could not fetch franchise members')
  }
}
