import { useSyncExternalStore } from 'react'
import { Booking, Container, LogEntry, P, Role, User, Vessel, Zone, homeOf, initialSlots } from './data'
import { ApiError, api, getToken, setToken } from './api'
import { Suggestion, settled } from './logic'

export type Drawer = { kind: 'detail'; i: number } | { kind: 'ticket'; i: number } | { kind: 'add' } | null

/** Everything the terminal shows. The SERVER is the source of truth: this is a cache of GET /api/state. */
export interface TerminalData {
  C: Container[]; appointments: Appointment[]; vessels: Vessel[]; log: LogEntry[]
  slots: [string, number][]; AD: number
}
export interface State extends TerminalData {
  role: Role | null; user: User | null; next: string | null; users: User[]
  online: boolean
  toast: { msg: string; bad: boolean; k: number } | null
  drawer: Drawer
}

const browser = typeof window !== 'undefined'
const read = <T,>(key: string, fallback: T): T => {
  if (!browser) return fallback
  try { return JSON.parse(window.sessionStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
const session = read<{ role?: Role; user?: User } | null>('sp', null)

const emptyData = (): TerminalData => ({ C: [], appointments: [], vessels: [], log: [], slots: initialSlots(), AD: 0 })

let state: State = {
  role: getToken() ? session?.role ?? null : null, user: getToken() ? session?.user ?? null : null, next: null, users: [],
  ...emptyData(), online: true, toast: null, drawer: null,
}
const subs = new Set<() => void>()
const persist = () => {
  try { sessionStorage.setItem('sp', JSON.stringify({ role: state.role, user: state.user })) } catch { /* ignore */ }
}
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; persist(); subs.forEach((f) => f()) }
const serverState: State = { ...state, role: null, user: null }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state, () => serverState)
export const getState = () => state

let toastTimer = 0
export const toast = (msg: string, bad = false) => {
  set({ toast: { msg, bad, k: Date.now() } })
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
}

/* ------------------------------------------------------------------ server mapping */
interface ApiUser { id: number; name: string; email: string; role: Role; company?: string; watch?: string[] }
interface ApiBooking { bid: number; id: string; t: string; d: string; s: string }
/** An upcoming appointment, in time order (earliest first), from the server's min-heap. */
export interface Appointment extends ApiBooking { client?: string }
interface ApiState {
  role: Role; containers: Container[]; bookings?: ApiBooking[]; appointments?: Appointment[]; vessels?: Vessel[]; log?: LogEntry[]
  slots?: [string, number][]; day?: number; users?: ApiUser[]
}
const toUser = (u: ApiUser, slots: Booking[] = []): User => ({ n: u.name, e: u.email, p: '', r: u.role, co: u.company || '', watch: u.watch || [], slots })
/** The API sends null for "not set"; the views expect the field to be missing. */
const clean = (c: Container): Container => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== null)) as unknown as Container

let lastSync = ''
/** Pulls the latest terminal data for the signed-in role. Cheap to call; only re-renders when something changed. */
export async function refresh(): Promise<void> {
  if (!getToken() || !state.role) return
  try {
    const s = await api<ApiState>('/api/state?day=' + state.AD)
    if (!getToken()) return
    const sig = JSON.stringify(s)
    if (sig === lastSync && state.online) return
    lastSync = sig
    const bookings: Booking[] = (s.bookings || []).map((b) => ({ id: b.id, t: b.t, d: b.d, s: b.s, bid: b.bid }))
    const watch = s.role === 'C' ? s.containers.map((c) => c.id) : undefined
    set({
      C: s.containers.map(clean), appointments: s.appointments || [], vessels: s.vessels || [], log: s.log || [],
      slots: s.slots && s.slots.length ? s.slots : initialSlots(), users: (s.users || []).map((u) => toUser(u)),
      user: state.user && s.role === 'C' ? { ...state.user, slots: bookings, watch: watch ?? state.user.watch } : state.user, online: true,
    })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { actions.signOut(); toast('Your session ended. Please sign in again.', true); return }
    if (e instanceof ApiError && e.status === 0 && state.online) set({ online: false })
  }
}

let timer = 0
const startSync = () => {
  if (!browser) return
  stopSync()
  void refresh()
  timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 8000)
}
const stopSync = () => { clearInterval(timer); timer = 0 }
if (browser) {
  window.addEventListener('focus', () => { if (state.role) void refresh() })
  if (state.role && getToken()) startSync()
}

/** Runs one API call, refreshes the cache and shows errors as toasts. Returns the response, or null when it failed. */
async function call<T>(path: string, opts?: { method?: string; body?: unknown }, ok?: string): Promise<T | null> {
  try {
    const r = await api<T>(path, opts)
    lastSync = ''
    await refresh()
    if (ok) toast(ok)
    return r
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { actions.signOut(); toast('Your session ended. Please sign in again.', true); return null }
    toast(e instanceof Error ? e.message : 'Something went wrong.', true)
    return null
  }
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
/** The signed-in person (clients carry their followed containers and bookings). */
export const currentUser = (s = state) => (s.user || toUser({ id: 0, name: '', email: '', role: 'C' })) as User
const nextFor = (r: Role) => {
  const p = P.find((x) => x.id === state.next)
  return p && p.roles.includes(r) ? p.id : homeOf(r)
}
const norm = (v: string) => v.trim().toUpperCase()
const idOf = (i: number) => state.C[i]?.id

export interface NewContainer { id: string; size: string; zone: Zone; consignee?: string; leave?: number; weight?: number }
const body = (f: NewContainer) => ({ id: norm(f.id), size: f.size, zone: f.zone, consignee: f.consignee?.trim() || null, leave: f.leave ?? null, weight: f.weight ?? null })

export const actions = {
  /** Resolves to an error message, or the page to open after signing in. */
  async signIn(email: string, pw: string): Promise<{ error?: string; to?: string }> {
    const em = email.trim().toLowerCase()
    if (!EMAIL.test(em)) return { error: 'Enter a valid email address.' }
    if (!pw) return { error: 'Enter your password.' }
    try {
      const r = await api<{ token: string; user: ApiUser }>('/api/auth/login', { body: { email: em, password: pw } })
      return finishAuth(r.token, r.user)
    } catch (e) { return { error: e instanceof Error ? e.message : 'Could not sign in.' } }
  },
  async signUp(f: { n: string; e: string; p: string; p2: string; r: Role; invite: string; co: string }): Promise<{ error?: string; to?: string }> {
    const n = f.n.trim(), em = f.e.trim().toLowerCase()
    if (n.length < 2) return { error: 'Enter your full name.' }
    if (!EMAIL.test(em)) return { error: 'Enter a valid email address.' }
    if (f.p.length < 8 || !/[a-z]/i.test(f.p) || !/\d/.test(f.p)) return { error: 'Use 8+ characters with a letter and a number.' }
    if (f.p !== f.p2) return { error: 'Passwords do not match.' }
    try {
      const r = await api<{ token: string; user: ApiUser }>('/api/auth/signup', { body: { name: n, email: em, password: f.p, role: f.r, invite: f.invite, company: f.co } })
      return finishAuth(r.token, r.user, 'Account created. Welcome, ' + n)
    } catch (e) { return { error: e instanceof Error ? e.message : 'Could not create the account.' } }
  },
  signOut() {
    stopSync(); setToken(null); lastSync = ''
    set({ role: null, user: null, ...emptyData(), users: [], drawer: null, online: true })
  },
  setNext(next: string | null) { set({ next }) },
  openDrawer(d: Drawer) { set({ drawer: d }) },
  closeDrawer() { set({ drawer: null }) },

  /* containers */
  /** Registers a container that has arrived but is not placed yet (shows up in Placement). */
  async addContainer(f: NewContainer): Promise<boolean> {
    if (!norm(f.id)) { toast('Enter a container number.', true); return false }
    const r = await call('/api/containers', { body: body(f) }, norm(f.id) + ' added')
    if (r) set({ drawer: null })
    return !!r
  },
  /** Bulk-registers containers from a manifest. Returns how many were added. */
  async importContainers(list: NewContainer[]): Promise<number> {
    const items = list.filter((f) => norm(f.id)).map(body)
    if (!items.length) { toast('No new containers to import.', true); return 0 }
    const r = await call<{ added: number }>('/api/containers/import', { body: { items } })
    if (!r) return 0
    if (!r.added) { toast('No new containers to import.', true); return 0 }
    toast(r.added + ' containers imported')
    return r.added
  },
  /** Asks the server for the best slot (nothing is changed). Resolves to null when no valid stack is free or the call failed. */
  async suggestSlot(zone: Zone, leave?: number, size = '40 ft', weight?: number): Promise<Suggestion | null> {
    try {
      return await api<Suggestion>('/api/yard/suggest', { body: { zone, leave: leave ?? null, size, weight: weight ?? null } })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return null
      if (e instanceof ApiError && e.status === 401) { actions.signOut(); toast('Your session ended. Please sign in again.', true); return null }
      toast(e instanceof Error ? e.message : 'Something went wrong.', true)
      return null
    }
  },
  /** The server re-runs the optimizer and puts the container into the best slot (creating it first if needed). */
  async placeContainer(f: NewContainer, _s?: Suggestion): Promise<boolean> {
    if (!norm(f.id)) { toast('Enter a container number.', true); return false }
    const r = await call<{ placement: { slot: string } }>('/api/containers/place', { body: body(f) })
    if (r) toast('Placed at ' + r.placement.slot)
    return !!r
  },
  async deleteContainer(i: number) {
    const id = idOf(i)
    if (id) await call('/api/containers/' + encodeURIComponent(id), { method: 'DELETE' }, id + ' removed')
  },
  async clearCustoms(i: number) {
    const id = idOf(i)
    if (id) await call('/api/containers/' + encodeURIComponent(id) + '/customs/clear', { method: 'POST', body: {} }, 'Customs cleared')
  },
  async clearMany(idx: number[]) {
    if (!idx.length) return toast('Select containers first.', true)
    const ids = idx.map(idOf).filter(Boolean)
    await call('/api/containers/customs/clear-many', { body: { ids } }, ids.length + ' customs cleared')
  },
  async pay(i: number) {
    const id = idOf(i)
    if (id) await call('/api/containers/' + encodeURIComponent(id) + '/pay', { method: 'POST', body: {} }, 'Invoice paid')
  },
  async release(i: number) {
    const id = idOf(i)
    if (id) await call('/api/containers/' + encodeURIComponent(id) + '/release', { method: 'POST', body: {} }, id + ' released')
  },


  /* vessels */
  async addVessel(v: Omit<Vessel, 'id'>): Promise<boolean> {
    if (!v.name.trim()) { toast('Enter the vessel name.', true); return false }
    if (!v.eta) { toast('Choose an arrival time.', true); return false }
    const r = await call('/api/vessels', { body: { name: v.name.trim(), eta: v.eta, boxes: v.boxes, berth: v.berth } }, v.name.trim() + ' added')
    return !!r
  },
  async removeVessel(id: string) { await call('/api/vessels/' + encodeURIComponent(id), { method: 'DELETE' }) },

  /* gate appointments */
  async bookGateSlot(i: number) {
    const s = state.slots[i]
    if (s[1] >= 3) return toast('Slot full: three trucks per slot.', true)
    await call('/api/gate/slots/' + state.AD + '/' + s[0] + '/book', { method: 'POST', body: {} }, 'Booked ' + s[0])
  },
  /** Takes the earliest upcoming appointment off the server's min-heap (it has been handled at the gate). */
  async handleNextAppointment() { await call<Appointment>('/api/appointments/next', { method: 'POST', body: {} }, 'Next appointment handled') },
  async setDay(i: number) { set({ AD: i }); lastSync = ''; await refresh() },

  /* client portal */
  async addShipment(raw: string) {
    const v = norm(raw)
    if (!v) return toast('Enter a container number.', true)
    if ((currentUser().watch || []).includes(v)) return toast(v + ' is already in your list.', true)
    await call('/api/me/shipments', { body: { container_id: v } }, v + ' added')
  },
  async removeShipment(id: string) { await call('/api/me/shipments/' + encodeURIComponent(id), { method: 'DELETE' }) },
  /** Resolves to an error message, or null when the slot was booked. */
  async bookClientSlot(b: Booking): Promise<string | null> {
    if (!b.d) return 'Choose a date.'
    try {
      await api('/api/me/bookings', { body: { container_id: b.id, purpose: b.t, date: b.d, time_range: b.s } })
      lastSync = ''; await refresh(); toast('Slot booked for ' + b.id)
      return null
    } catch (e) { return e instanceof Error ? e.message : 'Could not book the slot.' }
  },
  async cancelBooking(i: number) {
    const bid = currentUser().slots?.[i]?.bid
    if (bid) await call('/api/me/bookings/' + bid, { method: 'DELETE' })
  },
  async payClient(id: string) { await call('/api/me/shipments/' + encodeURIComponent(id) + '/pay', { method: 'POST', body: {} }, 'Payment received for ' + id) },
}

function finishAuth(token: string, u: ApiUser, msg?: string): { to: string } {
  setToken(token); lastSync = ''
  const user = toUser(u)
  const to = nextFor(u.role)
  set({ role: u.role, user, next: null, ...emptyData(), online: true })
  startSync()
  toast(msg || 'Welcome, ' + u.name)
  return { to }
}
export { settled }
