import { Container, DAY, Zone } from './data'
/** Whole days a container has been in the terminal (until release, if released). */
export const dwell = (c: Container, now = Date.now()) => Math.max(0, Math.floor(((c.rel ?? now) - c.at) / DAY))
/** Storage dues in PKR. Calculated by the server: 3 free days, then chargeable days x the tariff for the container size and cargo type. */
export const due = (c: Container) => c.dues ?? 0
export const settled = (c: Container) => !due(c) || c.paid
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export const inYard = (C: Container[]) => C.filter((c) => c.st === 'In yard')
/** Containers in one stack, bottom first. */
export const stackAt = (C: Container[], block: string, bay: number) =>
  C.filter((c) => c.st === 'In yard' && c.block === block && c.bay === bay).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))

export interface Suggestion { block: string; bay: number; tier: number; e: number; zone: Zone; slot?: string; reason?: string }

/** Start of the current week (Monday 00:00, local time) in ms. */
export const weekStart = (now = Date.now()) => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}
/** Counts of timestamps per weekday (Mon..Sun) for the current week. */
export const perWeekday = (ts: number[], now = Date.now()) => {
  const w0 = weekStart(now), out = [0, 0, 0, 0, 0, 0, 0]
  for (const t of ts) { const i = Math.floor((t - w0) / DAY); if (i >= 0 && i < 7) out[i]++ }
  return out
}
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
export const ago = (t: number, now = Date.now()) => {
  const m = Math.floor((now - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  const h = Math.floor(m / 60)
  return h < 24 ? h + ' h ago' : Math.floor(h / 24) + ' d ago'
}
