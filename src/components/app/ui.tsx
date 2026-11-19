import React, { useEffect } from "react";

/** Small presentational pieces shared by the app pages. They reuse the legacy stylesheet class names. */

export const Pill = ({ kind = "", children }: { kind?: "" | "ok" | "w" | "x"; children: React.ReactNode }) => (
  <span className={"pill " + kind}>{children}</span>
);

export const Kpis = ({ items }: { items: [React.ReactNode, string][] }) => (
  <div className="kp">{items.map((x, i) => <div className="tile" key={i}><b>{x[0]}</b><span>{x[1]}</span></div>)}</div>
);

/** Horizontal bars. rows: [label, value, highlighted?]. Width is value / max * 60%. */
export const Bars = ({ rows, max }: { rows: [string, number, boolean?][]; max: number }) => (
  <>{rows.map((r, i) => (
    <div className="bar" key={i}><span>{r[0]}</span><i className={r[2] ? "l" : ""} style={{ width: (r[1] / max) * 60 + "%" }} />{r[1]}</div>
  ))}</>
);

export const Table = ({ head, rows, empty = "Nothing here yet. Add a record to get started." }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) => (
  <div className="tw"><table>
    <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
    <tbody>
      {rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>) : <tr><td colSpan={head.length}>{empty}</td></tr>}
    </tbody>
  </table></div>
);

/** Slide-in drawer (or centred modal with mode="md"). Closes on backdrop click and Escape. */
export function Overlay({ open, mode = "", onClose, children }: { open: boolean; mode?: "" | "md"; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <div id="ov" className={mode} hidden={!open} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dr" role="dialog" aria-modal="true" aria-label="Details">
        <button className="btn x" onClick={onClose}>Close</button>
        <div id="ovc">{open && children}</div>
      </div>
    </div>
  );
}

export const Steps = ({ names, cur, numbered }: { names: string[]; cur: number; numbered?: boolean }) => (
  <ol className="stp">{names.map((n, i) => <li key={n} className={i < cur ? "d" : i === cur ? "n" : ""}>{numbered ? `${i + 1}. ` : ""}{n}</li>)}</ol>
);
