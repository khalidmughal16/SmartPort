import { BAYS, Container, DAY, MAX_TIER, YARD_BLOCKS, Zone, rnd } from './data'
/** Whole days a container has been in the terminal (until release, if released). */
export const dwell = (c: Container, now = Date.now()) => Math.max(0, Math.floor(((c.rel ?? now) - c.at) / DAY))
/** Storage dues: 5 free days, then $45 per day. */
export const due = (c: Container) => Math.max(0, dwell(c) - 5) * 45
export const settled = (c: Container) => !due(c) || c.paid
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export const inYard = (C: Container[]) => C.filter((c) => c.st === 'In yard')
/** Containers in one stack, bottom first. */
export const stackAt = (C: Container[], block: string, bay: number) =>
  C.filter((c) => c.st === 'In yard' && c.block === block && c.bay === bay).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))

export interface Suggestion { block: string; bay: number; tier: number; e: number; zone: Zone }

/** Smart placement: in the matching zone, pick the stack where the fewest containers leave earlier than this one. */
export function suggest(C: Container[], leave: number | undefined, zone: Zone): Suggestion | null {
  const lv = leave ?? Infinity
  let best: (Suggestion & { len: number }) | null = null
  for (const b of YARD_BLOCKS) {
    if (b.zone !== zone) continue
    for (let bay = 0; bay < BAYS; bay++) {
      const s = stackAt(C, b.id, bay)
      if (s.length >= MAX_TIER) continue
      const e = s.filter((x) => (x.leave ?? Infinity) < lv).length
      if (!best || e < best.e || (e === best.e && s.length < best.len)) best = { block: b.id, bay, tier: s.length, e, len: s.length, zone }
    }
  }
  return best && { block: best.block, bay: best.bay, tier: best.tier, e: best.e, zone }
}

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
