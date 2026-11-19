/* SmartPort auth: talks to server.cjs (/api/*). Falls back to localStorage when
   there is no API (e.g. `npm run dev`). */
export const ROLES: Record<string, string> = { A: "Admin", G: "Gate Officer", Y: "Yard Supervisor", D: "Documentation Clerk", B: "Billing Clerk" };
export const ROLE_DESC: Record<string, string> = {
  A: "The complete picture. Every operation under control.",
  G: "Smooth arrivals. Safe releases. A gate that flows.",
  Y: "The right slot. The right move. Every time.",
  D: "Clear documents. Clear cargo. No loose ends.",
  B: "Accurate charges. Settled dues. Confident releases.",
};
export const DEMO = [
  { n: "Demo Admin", e: "admin@smartport.pk", p: "Admin@123", r: "A" },
  { n: "Demo Gate Officer", e: "gate@smartport.pk", p: "Gate@123", r: "G" },
  { n: "Demo Yard Supervisor", e: "yard@smartport.pk", p: "Yard@123", r: "Y" },
  { n: "Demo Documentation Clerk", e: "docs@smartport.pk", p: "Docs@123", r: "D" },
  { n: "Demo Billing Clerk", e: "billing@smartport.pk", p: "Bill@123", r: "B" },
];
export const ADMIN_CODE = "SMART-ADMIN";
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type User = { n: string; e: string; r: string };
export type Result = { user?: User; error?: string; field?: string };

const sha = async (s: string) => {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("smartport:" + s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return "plain:" + s;
  }
};
type Stored = User & { h: string };
const lsUsers = (): Stored[] => { try { return JSON.parse(localStorage.getItem("sp_users") || "[]"); } catch { return []; } };
const lsSave = (u: Stored[]) => { try { localStorage.setItem("sp_users", JSON.stringify(u)); } catch { /* ignore */ } };

async function call(path: string, body: unknown): Promise<{ ok: boolean; data: any } | null> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch { return null; }
  if ([404, 405, 500, 501, 502, 503, 504].includes(res.status)) return null; // no API (e.g. plain `npm run dev`): use localStorage
  let data: any = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, data };
}

export async function login(email: string, password: string): Promise<Result> {
  const r = await call("/api/login", { email, password });
  if (r) return r.ok ? { user: r.data.user } : { error: r.data.error || "Sign in failed." };
  const d = DEMO.find((x) => x.e === email && x.p === password);
  if (d) return { user: { n: d.n, e: d.e, r: d.r } };
  const h = await sha(password);
  const u = lsUsers().find((x) => x.e === email && x.h === h);
  return u ? { user: { n: u.n, e: u.e, r: u.r } } : { error: "Email or password is incorrect." };
}

export async function signup(f: { name: string; email: string; password: string; role: string; invite: string }): Promise<Result> {
  const r = await call("/api/signup", f);
  if (r) return r.ok ? { user: r.data.user } : { error: r.data.error || "Could not create account." };
  const users = lsUsers();
  if (DEMO.some((x) => x.e === f.email) || users.some((x) => x.e === f.email)) return { error: "That email already has an account.", field: "email" };
  if (f.role === "A" && f.invite !== ADMIN_CODE) return { error: "Admin accounts need the invite code " + ADMIN_CODE + ".", field: "invite" };
  const u: Stored = { n: f.name, e: f.email, r: f.role, h: await sha(f.password) };
  users.push(u); lsSave(users);
  return { user: { n: u.n, e: u.e, r: u.r } };
}

/** Safe "next" page after sign-in: only plain slugs like "yard-map". */
export function nextPath(search: string) {
  const nx = new URLSearchParams(search).get("next");
  return nx && /^[a-z-]+$/.test(nx) ? "/" + nx : "/dashboard";
}
export function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/i.test(p) && /\d/.test(p)) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) && p.length >= 10) s++;
  return p ? Math.max(1, s) : 0;
}
