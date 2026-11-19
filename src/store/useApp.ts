import { create } from "zustand";
import {
  createRnd, due, initialContainers, INITIAL_PENDING, INITIAL_SLOTS, INITIAL_TASKS, INITIAL_YARD, DAYS7,
  type Container,
} from "@/lib/data";

type SessionUser = { n: string; e: string } | null;
const SESSION_KEY = "sp";

function readSession(): { role: string | null; user: SessionUser } {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (s?.role) return { role: s.role, user: s.user || null };
  } catch { /* ignore */ }
  return { role: null, user: null };
}

const rnd = createRnd(11);
const seedContainers = initialContainers(rnd);
// Appointments: Monday uses the base slots, other days get seeded fill levels.
const seedSlots = Array.from({ length: 7 }, (_, d) =>
  d === 0 ? INITIAL_SLOTS.map((s) => [...s] as [string, number]) : INITIAL_SLOTS.map((s) => [s[0], Math.floor(rnd() * 4)] as [string, number]));

type Toast = { msg: string; bad: boolean; on: boolean };
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export interface AppState {
  role: string | null;
  user: SessionUser;
  containers: Container[];
  yard: number[][];
  tasks: [string, number][];
  slotsByDay: [string, number][][];
  pending: string[];
  toast: Toast;

  signIn: (role: string, user: SessionUser) => void;
  signOut: () => void;
  showToast: (msg: string, bad?: boolean) => void;
  addContainer: (c: Container) => void;
  place: (p: { id: string; col: number; hazard: boolean; fromPending?: number }) => void;
  clearCustoms: (ids: number[]) => void;
  pay: (i: number) => void;
  release: (i: number) => void;
  escalate: (i: number) => void;
  book: (day: number, slot: number) => void;
}

export const useApp = create<AppState>((set, get) => ({
  ...readSession(),
  containers: seedContainers,
  yard: INITIAL_YARD.map((s) => [...s]),
  tasks: INITIAL_TASKS.map((t) => [...t] as [string, number]),
  slotsByDay: seedSlots,
  pending: [...INITIAL_PENDING],
  toast: { msg: "", bad: false, on: false },

  signIn: (role, user) => set({ role, user }),
  signOut: () => set({ role: null, user: null }),

  showToast: (msg, bad = false) => {
    set({ toast: { msg, bad, on: true } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set((s) => ({ toast: { ...s.toast, on: false } })), 2600);
  },

  addContainer: (c) => set((s) => ({ containers: [...s.containers, c] })),

  place: ({ id, col, hazard, fromPending }) => {
    const { yard, containers, pending, showToast } = get();
    const tier = yard[col].length;
    const c: Container = { id, d: 0, cus: "Hold", paid: false, zone: hazard ? "Hazard" : "Standard", st: "In yard", slot: `B${col + 1}-T${tier + 1}` };
    set({
      containers: [...containers, c],
      yard: yard.map((s, i) => (i === col ? [...s, 5] : s)),
      pending: fromPending == null ? pending : pending.filter((_, i) => i !== fromPending),
    });
    showToast(`Placed at bay ${col + 1}, tier ${tier + 1}`);
  },

  clearCustoms: (ids) => {
    set((s) => ({ containers: s.containers.map((c, i) => (ids.includes(i) ? { ...c, cus: "Cleared" } : c)) }));
    get().showToast(ids.length > 1 ? `${ids.length} customs cleared` : "Customs cleared");
  },
  pay: (i) => {
    set((s) => ({ containers: s.containers.map((c, k) => (k === i ? { ...c, paid: true } : c)) }));
    get().showToast("Invoice paid");
  },
  release: (i) => {
    const c = get().containers[i];
    if (c.cus !== "Cleared" || (due(c) > 0 && !c.paid)) return get().showToast("Release blocked: clear customs and pay dues first.", true);
    set((s) => ({ containers: s.containers.map((x, k) => (k === i ? { ...x, st: "Released" } : x)) }));
    get().showToast(c.id + " released");
  },
  escalate: (i) => set((s) => ({ tasks: s.tasks.map((t, k) => (k === i ? [t[0], t[1] + 2] : t)) })),
  book: (day, slot) => {
    const s = get().slotsByDay[day][slot];
    if (s[1] >= 3) return get().showToast("Slot full: three trucks per slot.", true);
    set((st) => ({ slotsByDay: st.slotsByDay.map((d, di) => (di === day ? d.map((x, xi) => (xi === slot ? ([x[0], x[1] + 1] as [string, number]) : x)) : d)) }));
    get().showToast(`Booked ${s[0]} on ${DAYS7[day]}`);
  },
}));

// Keep the session in sessionStorage so a refresh does not sign you out.
useApp.subscribe((s) => {
  try {
    if (s.role) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: s.role, user: s.user }));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
});
