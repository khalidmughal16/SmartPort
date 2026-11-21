import { useSyncExternalStore } from 'react'
import {
  Booking, Container, DEMO_USERS, LogEntry, P, Role, Task, User, Vessel, Zone, homeOf, initialSlots,
} from './data'
import { due, settled, Suggestion } from './logic'

export type Drawer = { kind: 'detail'; i: number } | { kind: 'ticket'; i: number } | { kind: 'add' } | null

/** Everything the terminal stores. Starts empty and is saved in this browser (localStorage). */
export interface TerminalData {
  C: Container[]; tasks: Task[]; vessels: Vessel[]; log: LogEntry[]
  slots: [string, number][]; days: [string, number][][] | null; AD: number
}
export interface State extends TerminalData {
  role: Role | null; user: User | null; next: string | null; users: User[]
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

const emptyData = (): TerminalData => ({ C: [], tasks: [], vessels: [], log: [], slots: initialSlots(), days: null, AD: 0 })
const arr = <T,>(v: unknown, f: T[]): T[] => (Array.isArray(v) ? (v as T[]) : f)
const loadData = (): TerminalData => {
  const d = emptyData(), s = read<Partial<TerminalData> | null>('localStorage', 'sp_data', null)
  if (!s) return d
  return { C: arr(s.C, d.C), tasks: arr(s.tasks, d.tasks), vessels: arr(s.vessels, d.vessels), log: arr(s.log, d.log), slots: arr(s.slots, d.slots), days: s.days ?? null, AD: s.AD ?? 0 }
}

let state: State = {
  role: session?.role ?? null, user: session?.user ?? null, next: null, users,
  ...loadData(), toast: null, drawer: null,
}
const subs = new Set<() => void>()
const persist = () => {
  try { sessionStorage.setItem('sp', JSON.stringify({ role: state.role, user: state.user })) } catch { /* ignore */ }
  const { C, tasks, vessels, log, slots, days, AD } = state
  try { localStorage.setItem('sp_data', JSON.stringify({ C, tasks, vessels, log, slots, days, AD })) } catch { /* ignore */ }
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

/** Newest first, capped so localStorage stays small. */
const withLog = (kind: string, m: string, id?: string): LogEntry[] => [{ t: Date.now(), kind, id, m }, ...state.log].slice(0, 100)
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

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
const norm = (v: string) => v.trim().toUpperCase()
const patchC = (i: number, patch: Partial<Container>) => state.C.map((c, k) => (k === i ? { ...c, ...patch } : c))

export interface NewContainer { id: string; size: string; zone: Zone; consignee?: string; leave?: number }

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
  /** Wipes every container, vessel, task and log entry. Accounts are kept. */
  resetData() { set({ ...emptyData() }); toast('All terminal data cleared') },

  /* containers */
  /** Registers a container that has arrived but is not placed yet (shows up in Placement). */
  addContainer(f: NewContainer): boolean {
    const id = norm(f.id)
    if (!id) { toast('Enter a container number.', true); return false }
    if (state.C.some((c) => c.id === id && c.st !== 'Released')) { toast(id + ' is already in the terminal.', true); return false }
    const c: Container = { id, size: f.size, zone: f.zone, cus: 'Hold', paid: false, st: 'Pending', slot: 'Not placed', at: Date.now(), consignee: f.consignee?.trim() || undefined, leave: f.leave }
    set({ C: [...state.C, c], drawer: null, log: withLog('Gate-in', id + ' checked in (' + f.size + ', ' + f.zone + ')', id) })
    toast(id + ' added')
    return true
  },
  /** Bulk-registers containers from a manifest. Skips numbers already in the terminal. Returns how many were added. */
  importContainers(list: NewContainer[]): number {
    const have = new Set(state.C.filter((c) => c.st !== 'Released').map((c) => c.id))
    const now = Date.now(), add: Container[] = []
    for (const f of list) {
      const id = norm(f.id)
      if (!id || have.has(id)) continue
      have.add(id)
      add.push({ id, size: f.size, zone: f.zone, cus: 'Hold', paid: false, st: 'Pending', slot: 'Not placed', at: now, consignee: f.consignee?.trim() || undefined, leave: f.leave })
    }
    if (!add.length) { toast('No new containers to import.', true); return 0 }
    set({ C: [...state.C, ...add], log: withLog('Manifest', add.length + ' containers imported from manifest') })
    toast(add.length + ' containers imported')
    return add.length
  },
  /** Puts a container into the suggested slot. Creates it first if it was not registered yet (Gate-In flow). */
  placeContainer(f: NewContainer, s: Suggestion): boolean {
    const id = norm(f.id)
    if (!id) { toast('Enter a container number.', true); return false }
    const slot = s.block + '-B' + (s.bay + 1) + '-T' + (s.tier + 1)
    const at = state.C.findIndex((c) => c.id === id && c.st !== 'Released')
    let C: Container[]
    let log: LogEntry[]
    if (at >= 0) {
      if (state.C[at].st === 'In yard') { toast(id + ' is already placed at ' + state.C[at].slot + '.', true); return false }
      C = patchC(at, { st: 'In yard', block: s.block, bay: s.bay, tier: s.tier, slot })
      log = withLog('Placed', id + ' placed at ' + slot, id)
    } else {
      C = [...state.C, { id, size: f.size, zone: f.zone, cus: 'Hold', paid: false, st: 'In yard', block: s.block, bay: s.bay, tier: s.tier, slot, at: Date.now(), consignee: f.consignee?.trim() || undefined, leave: f.leave }]
      log = [{ t: Date.now(), kind: 'Placed', id, m: id + ' checked in and placed at ' + slot }, ...state.log].slice(0, 100)
    }
    set({ C, log })
    toast('Placed at ' + slot)
    return true
  },
  deleteContainer(i: number) {
    const c = state.C[i]
    if (!c) return
    let C = state.C.filter((_, k) => k !== i)
    if (c.st === 'In yard') C = C.map((x) => (x.st === 'In yard' && x.block === c.block && x.bay === c.bay && (x.tier ?? 0) > (c.tier ?? 0) ? { ...x, tier: (x.tier ?? 1) - 1, slot: x.block + '-B' + ((x.bay ?? 0) + 1) + '-T' + (x.tier ?? 1) } : x))
    set({ C, log: withLog('Removed', c.id + ' removed from records', c.id) })
    toast(c.id + ' removed')
  },
  clearCustoms(i: number) {
    const c = state.C[i]
    set({ C: patchC(i, { cus: 'Cleared' }), log: withLog('Customs', c.id + ' customs cleared', c.id) })
    toast('Customs cleared')
  },
  clearMany(idx: number[]) {
    if (!idx.length) return toast('Select containers first.', true)
    set({ C: state.C.map((c, k) => (idx.includes(k) ? { ...c, cus: 'Cleared' } : c)), log: withLog('Customs', idx.length + ' containers cleared by customs') })
    toast(idx.length + ' customs cleared')
  },
  pay(i: number) {
    const c = state.C[i]
    set({ C: patchC(i, { paid: true }), log: withLog('Payment', 'Payment received for ' + c.id, c.id) })
    toast('Invoice paid')
  },
  release(i: number) {
    const c = state.C[i]
    if (c.st !== 'In yard') return toast('Only containers placed in the yard can be released.', true)
    if (c.cus !== 'Cleared' || (due(c) > 0 && !c.paid)) return toast('Release blocked: clear customs and pay dues first.', true)
    const C = state.C.map((x, k) => {
      if (k === i) return { ...x, st: 'Released' as const, rel: Date.now() }
      if (x.st === 'In yard' && x.block === c.block && x.bay === c.bay && (x.tier ?? 0) > (c.tier ?? 0)) return { ...x, tier: (x.tier ?? 1) - 1, slot: x.block + '-B' + ((x.bay ?? 0) + 1) + '-T' + (x.tier ?? 1) }
      return x
    })
    set({ C, log: withLog('Gate-out', c.id + ' released', c.id) })
    toast(c.id + ' released')
  },

  /* crane tasks */
  addTask(text: string, p: number) {
    if (!text.trim()) return toast('Describe the task.', true)
    set({ tasks: [...state.tasks, { id: uid(), text: text.trim(), p }], log: withLog('Task', 'Crane task added: ' + text.trim()) })
  },
  escalate(id: string) { set({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, p: Math.min(9, t.p + 1) } : t)) }) },
  finishTask(id: string) {
    const t = state.tasks.find((x) => x.id === id)
    set({ tasks: state.tasks.filter((x) => x.id !== id), log: t ? withLog('Task', 'Crane task done: ' + t.text) : state.log })
  },

  /* vessels */
  addVessel(v: Omit<Vessel, 'id'>): boolean {
    if (!v.name.trim()) { toast('Enter the vessel name.', true); return false }
    if (!v.eta) { toast('Choose an arrival time.', true); return false }
    set({ vessels: [...state.vessels, { ...v, name: v.name.trim(), id: uid() }].sort((a, b) => a.eta - b.eta), log: withLog('Vessel', v.name.trim() + ' scheduled for berth ' + v.berth) })
    toast(v.name.trim() + ' added')
    return true
  },
  removeVessel(id: string) { set({ vessels: state.vessels.filter((v) => v.id !== id) }) },

  /* gate appointments */
  bookGateSlot(i: number) {
    const s = state.slots[i]
    if (s[1] >= 3) return toast('Slot full: three trucks per slot.', true)
    const slots = state.slots.map((x, k) => (k === i ? ([x[0], x[1] + 1] as [string, number]) : x))
    const days = state.days && state.days.map((d, k) => (k === state.AD ? slots : d))
    set({ slots, days, log: withLog('Gate', 'Gate slot ' + s[0] + ' booked') })
    toast('Booked ' + s[0])
  },
  setDay(i: number) {
    const days = state.days || Array.from({ length: 7 }, (_, d) => (d === state.AD ? state.slots : initialSlots()))
    set({ days: days.map((d, k) => (k === state.AD ? state.slots : d)), AD: i, slots: days[i] })
  },

  /* client portal */
  addShipment(raw: string) {
    const v = norm(raw), u = currentUser()
    if (!v) return toast('Enter a container number.', true)
    if (!state.C.find((x) => x.id === v)) return toast('Container not found. Check the number.', true)
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
    set({ C: state.C.map((c) => (c.id === id ? { ...c, paid: true } : c)), log: withLog('Payment', 'Payment received for ' + id, id) })
    toast('Payment received for ' + id)
  },
}
export { settled }
