'use client'
import { ReactNode } from 'react'

export const Pill = ({ k = '', children }: { k?: string; children: ReactNode }) => <span className={`pill ${k}`}>{children}</span>

export const Kp = ({ items }: { items: [ReactNode, string][] }) => (
  <div className="kp">
    {items.map(([v, l], i) => (
      <div className="tile" key={i}><b>{v}</b><span>{l}</span></div>
    ))}
  </div>
)

export function Table({ head, rows, id }: { head: string[]; rows: ReactNode[][]; id?: string }) {
  return (
    <div className="tw" id={id}>
      <table>
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length
            ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)
            : <tr><td colSpan={head.length}>Nothing here yet. Add a record to get started.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

/** Horizontal bars. rows: [label, value, highlighted?] */
export const Bars = ({ rows, max }: { rows: [string, number, boolean?][]; max: number }) => (
  <>
    {rows.map((r, i) => (
      <div className="bar" key={i}>
        <span>{r[0]}</span><i className={r[2] ? 'l' : ''} style={{ width: `${(r[1] / max) * 60}%` }} />{r[1]}
      </div>
    ))}
  </>
)

export const Icon = ({ d, cls = 'ic' }: { d: string; cls?: string }) => (
  <svg className={cls} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
)
