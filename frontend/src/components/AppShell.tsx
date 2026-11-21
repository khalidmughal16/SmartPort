'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { P, R, homeOf } from '../lib/data'
import { dwell } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { views } from '../views'
import { Icon, Pill } from './ui'
import { CommandPalette } from './CommandPalette'
import { ThemeToggle } from './ThemeToggle'

/** 24x24 line icons for the sidebar, by page id. */
const NAV: Record<string, string> = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  'yard-map': 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  containers: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5',
  vessels: 'M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0M4 17l-1-5h18l-2 5M12 12V4l5 3',
  'gate-in': 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14',
  appointments: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  placement: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'crane-tasks': 'M4 21V8l8-5 8 5M12 3v8M12 11l6 3M18 14v5',
  'customs-billing': 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  reports: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  profile: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  overview: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  shipments: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5',
  'book-slot': 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'my-billing': 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8',
}
const HOME = 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6'

/** Guards a page by sign-in and role, then renders the sidebar + view. */
export function AppPage() {
  const page = useParams<{ page?: string }>()?.page ?? ''
  const { role, user, C, online } = useStore()
  const router = useRouter()
  const p = P.find((x) => x.id === page)
  const [alerts, setAlerts] = useState(false)
  const [palette, setPalette] = useState(false)

  useEffect(() => {
    if (p && !role) { actions.setNext(p.id); router.replace('/app/login') }
  }, [p, role, router])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && role) { e.preventDefault(); setPalette(true) }
      if (e.key === 'Escape') setPalette(false)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [role])

  if (!p) return (<main id="main"><h2>Page not found</h2><p className="sub">That address does not exist.</p><Link className="btn p" href="/app/">Back to home</Link></main>)
  if (!role) return null
  const ok = p.roles.includes(role)
  const groups = [...new Set(P.filter((x) => x.roles.includes(role)).map((x) => x.group))]
  const View = views[p.id]
  const live = C.filter((c) => c.st !== 'Released')
  const alertList: { k: string; label: string; text: string }[] = []
  const hold = live.filter((c) => c.cus === 'Hold').length, late = live.filter((c) => dwell(c) > 5).length, wait = C.filter((c) => c.st === 'Pending').length
  if (hold) alertList.push({ k: 'w', label: 'Customs hold', text: hold + ' container' + (hold > 1 ? 's' : '') + ' awaiting clearance' })
  if (late) alertList.push({ k: 'x', label: 'Overdue', text: late + ' container' + (late > 1 ? 's' : '') + ' past 5 free days' })
  if (wait) alertList.push({ k: 'ok', label: 'Placement', text: wait + ' container' + (wait > 1 ? 's' : '') + ' waiting for a slot' })
  const initial = (user?.n || R[role]).trim().charAt(0).toUpperCase()
  const today = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="app">
      <aside className="side">
        <Link className="logo" href="/app/" style={{ display: 'block' }}>SmartPort<i>.</i></Link>
        <span className="pill">{R[role]}</span>
        {groups.map((g) => (
          <div key={g} style={{ display: 'contents' }}>
            <h4>{g}</h4>
            {P.filter((x) => x.group === g && x.roles.includes(role)).map((x) => (
              <Link key={x.id} href={'/app/' + x.id} className={x.id === p.id ? 'on' : ''}><Icon d={NAV[x.id] || HOME} cls="ni" />{x.label}</Link>
            ))}
          </div>
        ))}
        <h4>Account</h4>
        <Link href="/app/"><Icon d={HOME} cls="ni" />Home</Link>
      </aside>
      <main id="main">
        {!online && <p className="offline" role="alert">Cannot reach the SmartPort server. Start the backend (<code>uvicorn app.main:app --reload</code> in the backend folder). Retrying automatically.</p>}
        <div className="tb">
          <button className="sbox" onClick={() => setPalette(true)} aria-label="Search pages"><span>Search containers, pages...</span><kbd>Ctrl+K</kbd></button>
          <span className="tbr">
            <span className="crumb">{today}</span>
            <ThemeToggle />
            <button className="btn bell" onClick={() => setAlerts(!alerts)} aria-label="Alerts">Alerts{alertList.length > 0 && <b className="dot">{alertList.length}</b>}</button>
            <span className="av" title={user?.n || R[role]}>{initial}</span>
            <button className="btn" onClick={() => { actions.signOut(); router.push('/app/login') }}>Sign out</button>
          </span>
        </div>
        {alerts && (
          <div id="np">
            <b>Notifications</b>
            {alertList.length ? alertList.map((a) => <p key={a.label}><Pill k={a.k}>{a.label}</Pill> {a.text}</p>) : <p className="sub">Nothing needs your attention.</p>}
          </div>
        )}
        <h2>{ok ? p.label : 'Access denied'}</h2>
        <p className="sub">{ok ? p.desc : `The ${R[role]} role cannot open ${p.label}. Ask an admin for access.`}</p>
        {ok ? <View /> : <Link className="btn p" href={'/app/' + homeOf(role)}>Go to my home</Link>}
      </main>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  )
}
