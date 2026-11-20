import { Container, rnd } from './data'

/** Storage dues: 5 free days, then $45 per day. */
export const due = (c: Container) => Math.max(0, c.d - 5) * 45
export const settled = (c: Container) => !due(c) || c.paid
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export interface Suggestion { col: number; tier: number; e: number; zone: string; p?: number }

/** Smart placement: pick the stack where the fewest containers leave earlier than this one. */
export function suggest(yard: number[][], leaveDay: number, hazard = false): Suggestion | null {
  let best: { i: number; e: number } | null = null
  for (let i = 0; i < yard.length; i++) {
    const s = yard[i]
    if (s.length >= 4) continue
    const e = s.filter((x) => x < leaveDay).length
    if (!best || e < best.e || (e === best.e && s.length < yard[best.i].length)) best = { i, e }
  }
  return best && { col: best.i, tier: yard[best.i].length, e: best.e, zone: hazard ? 'Hazard zone' : 'Standard zone' }
}

export const newObstacles = () => {
  const ob = Array.from({ length: 60 }, (_, i) => i > 0 && i < 59 && rnd() < 0.22)
  ob[0] = ob[59] = false
  return ob
}

/** A* on a 10x6 grid from the top-left to the bottom-right cell. */
export function astar(ob: boolean[]) {
  const W = 10, H = 6
  const g = new Array<number>(60).fill(1e9)
  const from: Record<number, number> = {}
  const open: [number, number][] = [[0, 0]]
  g[0] = 0
  const h = (i: number) => Math.abs((i % W) - 9) + Math.abs(Math.floor(i / W) - 5)
  while (open.length) {
    open.sort((a, b) => a[0] - b[0])
    const [, i] = open.shift() as [number, number]
    if (i === 59) break
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = (i % W) + dx, y = Math.floor(i / W) + dy
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const j = y * W + x
      if (ob[j] || g[i] + 1 >= g[j]) continue
      g[j] = g[i] + 1
      from[j] = i
      open.push([g[j] + h(j), j])
    }
  }
  const path = new Set<number>()
  if (g[59] < 1e9) { let c: number | undefined = 59; while (c !== undefined) { path.add(c); c = from[c] } }
  return { path, steps: g[59] }
}

/** Random vs smart placement over 40 containers. Returns [randomExtraMoves, smartExtraMoves]. */
export function simulate(): [number, number] {
  const rs: number[][] = Array.from({ length: 8 }, () => [])
  const ss: number[][] = Array.from({ length: 8 }, () => [])
  let re = 0, se = 0
  for (let k = 0; k < 40; k++) {
    const t = 1 + Math.floor(rnd() * 20)
    let c = Math.floor(rnd() * 8), n = 0
    while (rs[c].length >= 4 && n++ < 8) c = (c + 1) % 8
    re += rs[c].filter((x) => x < t).length
    rs[c].push(t)
    const b = suggest(ss, t)
    if (b) { se += b.e; ss[b.col].push(t) }
  }
  return [re, se]
}
