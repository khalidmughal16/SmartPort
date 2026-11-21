/** Thin client for the SmartPort backend (FastAPI). Set NEXT_PUBLIC_API_URL if the API is not on localhost:8000. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const TOKEN_KEY = 'sp_token'
const browser = typeof window !== 'undefined'

export const getToken = (): string | null => {
  if (!browser) return null
  try { return window.sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t: string | null) => {
  if (!browser) return
  try { t ? window.sessionStorage.setItem(TOKEN_KEY, t) : window.sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

/** FastAPI sends {detail: "text"} for our own errors and {detail: [{msg}]} for validation errors. */
const messageOf = (status: number, body: unknown): string => {
  const d = (body as { detail?: unknown } | null)?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error, /, '')
  return status === 401 ? 'Please sign in again.' : status === 403 ? 'You do not have access to that.' : 'Something went wrong (' + status + ').'
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the SmartPort server. Start the backend (uvicorn app.main:app --reload) and try again.')
  }
  if (res.status === 204) return undefined as T
  let data: unknown = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, messageOf(res.status, data))
  return data as T
}
