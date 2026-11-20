'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { P } from '../lib/data'
import { useStore } from '../lib/store'

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { role } = useStore()
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const list = P.filter((p) => role && p.roles.includes(role) && (p.label + p.desc).toLowerCase().includes(q.toLowerCase()))
  return (
    <div id="cp" onClick={(e) => (e.target === e.currentTarget || (e.target as HTMLElement).closest('a')) && onClose()}>
      <div className="cpb" role="dialog" aria-label="Command palette">
        <input id="cpi" ref={input} placeholder="Jump to a page" aria-label="Search pages" value={q} onChange={(e) => setQ(e.target.value)} />
        <div id="cpl">
          {list.length ? list.map((p) => <Link key={p.id} href={'/app/' + p.id}>{p.label}<small>{p.desc}</small></Link>) : <p className="sub">No match</p>}
        </div>
      </div>
    </div>
  )
}
