import { ROLES } from "@/lib/auth";

export const ROLE_KEYS = Object.keys(ROLES);

export type PageDef = { path: string; title: string; group: string; roles: string; desc: string };
/** All 13 app pages: route, title, sidebar group, which roles may open it, one-line description. */
export const PAGES: PageDef[] = [
  { path: "dashboard", title: "Dashboard", group: "Operations", roles: "AGYDB", desc: "Your terminal, at a glance" },
  { path: "yard-map", title: "Yard Map", group: "Operations", roles: "AY", desc: "A live view of every stack" },
  { path: "containers", title: "Containers", group: "Operations", roles: "AGY", desc: "Track inventory and movements" },
  { path: "vessels", title: "Inbound Vessels", group: "Operations", roles: "AGY", desc: "Arrivals, schedules and manifests" },
  { path: "gate-in", title: "Gate-In", group: "Gate", roles: "AG", desc: "Check in trucks and cargo" },
  { path: "appointments", title: "Appointments", group: "Gate", roles: "AG", desc: "Keep the gate moving" },
  { path: "placement", title: "Placement", group: "Yard", roles: "AY", desc: "Put every container in its place" },
  { path: "crane-tasks", title: "Crane Tasks", group: "Yard", roles: "AY", desc: "Prioritise your next move" },
  { path: "router", title: "A* Router", group: "Yard", roles: "AY", desc: "Find the shortest clear path" },
  { path: "customs-billing", title: "Customs and Billing", group: "Finance", roles: "ADB", desc: "Clear documents, dues and release" },
  { path: "reports", title: "Reports", group: "Finance", roles: "AB", desc: "Turn terminal data into decisions" },
  { path: "users", title: "Users and Settings", group: "Admin", roles: "A", desc: "People, permissions and preferences" },
  { path: "profile", title: "Profile", group: "Admin", roles: "AGYDB", desc: "Your terminal identity" },
];
export const GROUPS = [...new Set(PAGES.map((p) => p.group))];

export type Container = {
  id: string; d: number; cus: "Hold" | "Cleared"; paid: boolean;
  zone: "Hazard" | "Standard"; st: "In yard" | "Released"; slot: string;
};

/** Small deterministic generator so the demo data is the same on every load. */
export const createRnd = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function initialContainers(rnd: () => number): Container[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = 1 + Math.floor(rnd() * 9);
    return {
      id: "GMT-" + String(i + 17).padStart(4, "0"), d,
      cus: rnd() > 0.6 ? "Hold" : "Cleared", paid: false,
      zone: i % 7 === 0 ? "Hazard" : "Standard", st: "In yard",
      slot: "B" + (1 + (i % 4)) + "-R" + (1 + (i % 3)) + "-T" + (1 + (i % 4)),
    } as Container;
  });
}

export const INITIAL_YARD = [[9, 5, 3], [7, 2], [8, 6, 4, 2], [3], [9, 7, 6], [5, 4], [8], [6, 3, 2]];
export const INITIAL_TASKS: [string, number][] = [
  ["Lift GMT-0017 to truck T-88", 3], ["Restack bay 3 (blockers)", 5],
  ["Move reefer GMT-0021 to cold zone", 4], ["Load GMT-0031", 2],
];
export const INITIAL_SLOTS: [string, number][] = [
  ["08:00", 3], ["09:00", 3], ["10:00", 1], ["11:00", 3], ["12:00", 2], ["13:00", 0], ["14:00", 3], ["15:00", 1],
];
export const INITIAL_PENDING = ["GMT-0050", "GMT-0051", "GMT-0052"];
export const DAYS7 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Storage dues: 5 free days, then $45 per day. */
export const due = (c: Container) => Math.max(0, c.d - 5) * 45;

export type Suggestion = { col: number; tier: number; e: number; zone: string; p?: number };
/** Smart placement: the stack where the fewest containers leave earlier than this one (ties: shortest stack). Max height 4. */
export function suggest(yard: number[][], t: number, hz = false): Suggestion | null {
  let best = -1, bestE = 0;
  for (let i = 0; i < yard.length; i++) {
    const s = yard[i];
    if (s.length >= 4) continue;
    const e = s.filter((x) => x < t).length;
    if (best < 0 || e < bestE || (e === bestE && s.length < yard[best].length)) { best = i; bestE = e; }
  }
  return best < 0 ? null : { col: best, tier: yard[best].length, e: bestE, zone: hz ? "Hazard zone" : "Standard zone" };
}

/** A* on a 10 x 6 grid from the top-left to the bottom-right corner. */
export function astar(ob: boolean[]) {
  const W = 10, H = 6, g = new Array<number>(60).fill(1e9), from: Record<number, number> = {}, open: [number, number][] = [[0, 0]];
  g[0] = 0;
  const h = (i: number) => Math.abs((i % W) - 9) + Math.abs(Math.floor(i / W) - 5);
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [, i] = open.shift()!;
    if (i === 59) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = (i % W) + dx, y = Math.floor(i / W) + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const j = y * W + x;
      if (ob[j] || g[i] + 1 >= g[j]) continue;
      g[j] = g[i] + 1; from[j] = i; open.push([g[j] + h(j), j]);
    }
  }
  const path = new Set<number>();
  if (g[59] < 1e9) { let c: number | undefined = 59; while (c !== undefined) { path.add(c); c = from[c]; } }
  return { path, steps: g[59] };
}
export const randomObstacles = () => {
  const ob = Array.from({ length: 60 }, (_, i) => i > 0 && i < 59 && Math.random() < 0.22);
  ob[0] = ob[59] = false;
  return ob;
};

/** Reports: random vs smart placement over 40 containers. Returns [randomExtraMoves, smartExtraMoves]. */
export function simulate(): [number, number] {
  const N = 40, rs: number[][] = Array.from({ length: 8 }, () => []), ss: number[][] = Array.from({ length: 8 }, () => []);
  let re = 0, se = 0;
  for (let k = 0; k < N; k++) {
    const t = 1 + Math.floor(Math.random() * 20);
    let c = Math.floor(Math.random() * 8), n = 0;
    while (rs[c].length >= 4 && n++ < 8) c = (c + 1) % 8;
    re += rs[c].filter((x) => x < t).length; rs[c].push(t);
    const b = suggest(ss, t);
    if (b) { se += b.e; ss[b.col].push(t); }
  }
  return [re, se];
}
