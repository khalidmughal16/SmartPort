import { useSyncExternalStore } from 'react'
import {
  Booking, Container, DEMO_USERS, P, Role, User, homeOf, initialContainers, initialSlots, initialTasks, initialYard, rnd,
} from './data'
import { due, settled, Suggestion } from './logic'

export type Drawer = { kind: 'detail'; i: number } | { kind: 'ticket'; i: number } | { kind: 'add' } | null
export interface State {
  role: Role | null; user: User | null; next: string | null; users: User[]
  C: Container[]; Y: number[][]; tasks: [string, number][]; pend: string[]
  slots: [string, number][]; days: [string, number][][] | null; AD: number
  toast: { msg: string; bad: boolean; k: number } | null
  drawer: Drawer
}

const browser = typeof window !== 'undefined'
const read = <T,>(store: 'sessionStorage' | 'localStorage', key: string, fallback: T): T => {
  if (!browser) return fallback
  try { return JSON.parse(window[store].getItem(key) || 'null') ?? fallback } catch { return fallback }
}
const session = read<{ role?: Role; user?: User } | null>('sessionStorage', 'sp', null)
const saved = read<User[]>('localStorage', 'sp_users', [])
const users = [...DEMO_USERS]
saved.forEach((u) => { if (!users.some((x) => x.e === u.e)) users.push(u) })

let state: State = {
  role: session?.role ?? null, user: session?.user ?? null, next: null, users,
  C: initialContainers(), Y: initialYard(), tasks: initialTasks(), pend: ['GMT-0050', 'GMT-0051', 'GMT-0052'],
  slots: initialSlots(), days: null, AD: 0, toast: null, drawer: null,
}
const subs = new Set<() => void>()
const persist = () => {
  try { sessionStorage.setItem('sp', JSON.stringify({ role: state.role, user: state.user })) } catch { /* ignore */ }
}
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; persist(); subs.forEach((f) => f()) }
const saveUsers = (list: User[]) => {
  try { localStorage.setItem('sp_users', JSON.stringify(list.filter((u) => u.sg))) } catch { /* ignore */ }
}
const serverState: State = { ...state, role: null, user: null }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state, () => serverState)
export const getState = () => state

let toastTimer = 0
export const toast = (msg: string, bad = false) => {
  set({ toast: { msg, bad, k: Date.now() } })
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
/** The signed-in person, as stored in the user list. */
export const currentUser = (s = state) => s.users.find((x) => s.user && x.e === s.user.e) || s.users.find((x) => x.r === 'C') as User
const updateUser = (fn: (u: User) => User) => {
  const cu = currentUser()
  const users = state.users.map((u) => (u === cu ? fn(u) : u))
  saveUsers(users)
  set({ users })
}
const nextFor = (r: Role) => {
  const p = P.find((x) => x.id === state.next)
  return p && p.roles.includes(r) ? p.id : homeOf(r)
}

export const actions = {
  /** Returns an error message, or the page to open after signing in. */
  signIn(email: string, pw: string): { error?: string; to?: string } {
    const em = email.trim().toLowerCase()
    if (!EMAIL.test(em)) return { error: 'Enter a valid email address.' }
    if (!pw) return { error: 'Enter your password.' }
    const u = state.users.find((x) => x.e === em && x.p === pw)
    if (!u) return { error: 'Email or password is incorrect.' }
    const to = nextFor(u.r)
    set({ role: u.r, user: u, next: null })
    toast('Welcome, ' + u.n)
    return { to }
  },
  signUp(f: { n: string; e: string; p: string; p2: string; r: Role; invite: string; co: string }): { error?: string; to?: string } {
    const n = f.n.trim(), em = f.e.trim().toLowerCase()
    if (n.length < 2) return { error: 'Enter your full name.' }
    if (!EMAIL.test(em)) return { error: 'Enter a valid email address.' }
    if (state.users.some((x) => x.e === em)) return { error: 'That email already has an account.' }
    if (f.p.length < 8 || !/[a-z]/i.test(f.p) || !/\d/.test(f.p)) return { error: 'Use 8+ characters with a letter and a number.' }
    if (f.p !== f.p2) return { error: 'Passwords do not match.' }
    if (f.r === 'A' && f.invite.trim() !== 'SMART-ADMIN') return { error: 'Admin accounts need the invite code SMART-ADMIN.' }
    const u: User = { n, e: em, p: f.p, r: f.r, sg: 1, watch: [], slots: [], co: f.r === 'C' ? f.co.trim() : '' }
    const users = [...state.users, u]
    saveUsers(users)
    const to = state.next || homeOf(f.r)
    set({ users, role: f.r, user: u, next: null })
    toast('Account created. Welcome, ' + n)
    return { to }
  },
  signOut() { set({ role: null, user: null }) },
  setNext(next: string | null) { set({ next }) },
  openDrawer(d: Drawer) { set({ drawer: d }) },
  closeDrawer() { set({ drawer: null }) },

  placeContainer(name: string, s: Suggestion) {
    const Y = state.Y.map((c, i) => (i === s.col ? [...c, 5] : c))
    const C = [...state.C, { id: name || 'GMT-0060', d: 0, cus: 'Hold' as const, paid: false, zone: 'Standard', st: 'In yard', slot: 'B' + (s.col + 1) + '-T' + (s.tier + 1) }]
    set({ Y, C })
    toast('Placed at bay ' + (s.col + 1) + ', tier ' + (s.tier + 1))
  },
  addContainer(id: string, hazard: boolean) {
    set({ C: [...state.C, { id, d: 0, cus: 'Hold', paid: false, zone: hazard ? 'Hazard' : 'Standard', st: 'In yard', slot: 'B1-R1-T1' }], drawer: null })
    toast(id + ' added')
  },
  escalate(i: number) { set({ tasks: state.tasks.map((t, k) => (k === i ? [t[0], t[1] + 2] : t)) }) },
  bookGateSlot(i: number) {
    const s = state.slots[i]
    if (s[1] >= 3) return toast('Slot full: three trucks per slot.', true)
    const slots = state.slots.map((x, k) => (k === i ? ([x[0], x[1] + 1] as [string, number]) : x))
    const days = state.days && state.days.map((d, k) => (k === state.AD ? slots : d))
    set({ slots, days })
    toast('Booked ' + s[0])
  },
  setDay(i: number) {
    const days = state.days || Array.from({ length: 7 }, (_, d) => (d === 0 ? state.slots : state.slots.map((s) => [s[0], Math.floor(rnd() * 4)] as [string, number])))
    set({ days, AD: i, slots: days[i] })
  },
  clearCustoms(i: number) { set({ C: state.C.map((c, k) => (k === i ? { ...c, cus: 'Cleared' } : c)) }); toast('Customs cleared') },
  clearMany(idx: number[]) {
    if (!idx.length) return toast('Select containers first.', true)
    set({ C: state.C.map((c, k) => (idx.includes(k) ? { ...c, cus: 'Cleared' } : c)) })
    toast(idx.length + ' customs cleared')
  },
  pay(i: number) { set({ C: state.C.map((c, k) => (k === i ? { ...c, paid: true } : c)) }); toast('Invoice paid') },
  release(i: number) {
    const c = state.C[i]
    if (c.cus !== 'Cleared' || (due(c) > 0 && !c.paid)) return toast('Release blocked: clear customs and pay dues first.', true)
    set({ C: state.C.map((x, k) => (k === i ? { ...x, st: 'Released' } : x)) })
    toast(c.id + ' released')
  },

  /* client portal */
  addShipment(raw: string) {
    const v = raw.trim().toUpperCase(), u = currentUser()
    if (!v) return toast('Enter a container number.', true)
    if (!state.C.find((x) => x.id === v)) return toast('Container not found. Try GMT-0017.', true)
    if ((u.watch || []).includes(v)) return toast(v + ' is already in your list.', true)
    updateUser((x) => ({ ...x, watch: [...(x.watch || []), v] }))
    toast(v + ' added')
  },
  removeShipment(id: string) { updateUser((u) => ({ ...u, watch: (u.watch || []).filter((x) => x !== id) })) },
  bookClientSlot(b: Booking): string | null {
    const c = state.C.find((x) => x.id === b.id)
    if (!b.d) return 'Choose a date.'
    if (b.t === 'Pickup' && c && (c.cus !== 'Cleared' || (due(c) && !c.paid))) return 'Pickup needs customs cleared and dues paid.'
    updateUser((u) => ({ ...u, slots: [...(u.slots || []), b] }))
    if (c && b.t === 'Pickup') set({ C: state.C.map((x) => (x === c ? { ...x, bk: true } : x)) })
    toast('Slot booked for ' + b.id)
    return null
  },
  cancelBooking(i: number) { updateUser((u) => ({ ...u, slots: (u.slots || []).filter((_, k) => k !== i) })) },
  payClient(id: string) {
    set({ C: state.C.map((c) => (c.id === id ? { ...c, paid: true } : c)) })
    toast('Payment received for ' + id)
  },
}
export { settled }
