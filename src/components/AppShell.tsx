'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { P, R, homeOf } from '../lib/data'
import { actions, useStore } from '../lib/store'
import { views } from '../views'
import { Pill } from './ui'
import { CommandPalette } from './CommandPalette'

/** Guards a page by sign-in and role, then renders the sidebar + view. */
export function AppPage() {
  const { page = '' } = useParams<{ page?: string }>()
  const { role } = useStore()
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
  return (
    <div className="app">
      <aside className="side">
        <Link className="logo" href="/app/" style={{ display: 'block' }}>SmartPort<i>.</i></Link>
        <span className="pill">{R[role]}</span>
        {groups.map((g) => (
          <div key={g} style={{ display: 'contents' }}>
            <h4>{g}</h4>
            {P.filter((x) => x.group === g && x.roles.includes(role)).map((x) => <Link key={x.id} href={'/app/' + x.id} className={x.id === p.id ? 'on' : ''}>{x.label}</Link>)}
          </div>
        ))}
        <h4>Account</h4>
        <Link href="/app/">Home</Link>
      </aside>
      <main id="main">
        <div className="tb">
          <span className="crumb">SmartPort / {p.group} / {p.label}</span>
          <span>
            <button className="btn" onClick={() => setPalette(true)}>Search  Ctrl+K</button>{' '}
            <button className="btn" onClick={() => setAlerts(!alerts)}>Alerts</button>{' '}
            <button className="btn" onClick={() => { actions.signOut(); router.push('/app/login') }}>Sign out</button>
          </span>
        </div>
        {alerts && (
          <div id="np">
            <b>Notifications</b>
            <p><Pill k="w">Customs hold</Pill> GMT-0019 awaiting clearance</p>
            <p><Pill k="ok">Gate</Pill> Truck T-88 checked in</p>
            <p><Pill k="x">Crane</Pill> Crane 4 in maintenance</p>
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
