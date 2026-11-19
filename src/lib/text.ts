/** Escape for plain text; React already escapes JSX text, this is only for rare string building. */
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const rndInt = (n: number) => Math.floor(Math.random() * n);
