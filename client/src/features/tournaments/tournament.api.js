import api from '../../lib/api'

const extractError = (error, fallback) => {
  const message = error?.response?.data?.message
  return typeof message === 'string' && message.length > 0
    ? message
    : fallback
}

const wrapError = (error, fallback) => {
  const wrapped = new Error(extractError(error, fallback))
  wrapped.cause = error
  return wrapped
}

export async function createTournamentRequest(payload) {
  try {
    const { data } = await api.post('/tournaments', payload)
    return data?.tournament ?? null
  } catch (error) {
    throw wrapError(error, 'Could not create the tournament')
  }
}

export async function updateTournamentRequest(id, patch) {
  try {
    const { data } = await api.patch(`/tournaments/${id}`, patch)
    return data?.tournament ?? null
  } catch (error) {
    throw wrapError(error, 'Could not update the tournament')
  }
}

export async function listInvitesRequest(id) {
  try {
    const { data } = await api.get(`/tournaments/${id}/invites`)
    return Array.isArray(data?.invites) ? data.invites : []
  } catch (error) {
    throw wrapError(error, 'Could not load invites')
  }
}

export async function createInviteRequest(id, email) {
  try {
    const { data } = await api.post(`/tournaments/${id}/invites`, { email })
    return { invite: data?.invite ?? null, alreadyInvited: Boolean(data?.alreadyInvited) }
  } catch (error) {
    throw wrapError(error, 'Could not send the invite')
  }
}

export async function revokeInviteRequest(id, inviteId) {
  try {
    const { data } = await api.delete(`/tournaments/${id}/invites/${inviteId}`)
    return Boolean(data?.revoked)
  } catch (error) {
    throw wrapError(error, 'Could not revoke the invite')
  }
}

export async function listLotsRequest(id) {
  try {
    const { data } = await api.get(`/tournaments/${id}/lots`)
    return Array.isArray(data?.lots) ? data.lots : []
  } catch (error) {
    throw wrapError(error, 'Could not load the auction pool')
  }
}

export async function createLotRequest(id, payload) {
  try {
    const { data } = await api.post(`/tournaments/${id}/lots`, payload)
    return data?.lot ?? null
  } catch (error) {
    throw wrapError(error, 'Could not add the player')
  }
}

export async function bulkUploadLotsRequest(id, file) {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/tournaments/${id}/lots/bulk`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return {
      created: Number(data?.created) || 0,
      errors: Array.isArray(data?.errors) ? data.errors : [],
    }
  } catch (error) {
    throw wrapError(error, 'Could not upload the file')
  }
}

export async function updateLotRequest(lotId, patch) {
  try {
    const { data } = await api.patch(`/lots/${lotId}`, patch)
    return data?.lot ?? null
  } catch (error) {
    throw wrapError(error, 'Could not save the changes')
  }
}

export async function deleteLotRequest(lotId) {
  try {
    const { data } = await api.delete(`/lots/${lotId}`)
    return Boolean(data?.deleted)
  } catch (error) {
    throw wrapError(error, 'Could not remove the player')
  }
}

export async function downloadTemplateRequest(id, format = 'csv') {
  try {
    const { data, headers } = await api.get(
      `/tournaments/${id}/lots/template.${format}`,
      { responseType: 'blob' },
    )
    const disp = headers?.['content-disposition'] || ''
    const match = disp.match(/filename="?([^";]+)"?/i)
    const filename = match?.[1] || `auction-pool-template.${format}`
    const blob = new Blob([data], {
      type:
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw wrapError(error, 'Could not download the template')
  }
}
