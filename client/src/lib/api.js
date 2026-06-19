import axios from 'axios'

const TOKEN_STORAGE_KEY = 'biddr:token'

export const tokenStorage = {
  get: () => {
    try {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  },
  set: (token) => {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      /* storage disabled */
    }
  },
  clear: () => {
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      /* storage disabled */
    }
  },
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      tokenStorage.clear()
    }
    return Promise.reject(error)
  },
)

export default api
