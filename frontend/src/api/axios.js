import axios from 'axios'

const QUEUE_KEY = 'silvergym_offline_queue'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth header ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: handle 401 + offline queue ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (offline) on a mutation → queue it
    if (
      !error.response &&
      error.config &&
      ['post', 'put', 'patch', 'delete'].includes((error.config.method || '').toLowerCase())
    ) {
      const queue = getOfflineQueue()
      queue.push({
        id:        Date.now(),
        method:    error.config.method,
        url:       error.config.url,
        data:      error.config.data,       // already JSON string
        timestamp: new Date().toISOString(),
      })
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
      // Resolve so the UI doesn't crash — callers can check res.data.offline
      return Promise.resolve({ data: { offline: true, queued: true } })
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Offline queue helpers ────────────────────────────────────
export const getOfflineQueue  = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
export const clearOfflineQueue = () => localStorage.removeItem(QUEUE_KEY)

export const syncOfflineQueue = async () => {
  const queue = getOfflineQueue()
  if (!queue.length) return { synced: 0, failed: 0 }

  let synced = 0
  const remaining = []

  for (const item of queue) {
    try {
      await api.request({
        method: item.method,
        url:    item.url,
        data:   item.data ? JSON.parse(item.data) : undefined,
      })
      synced++
    } catch {
      remaining.push(item)
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  return { synced, failed: remaining.length }
}

export default api
