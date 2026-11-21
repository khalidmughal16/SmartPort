'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { film } from '../lib/film'
import { Features } from './Features'
import { Film } from './Film'
import { How } from './How'
import { Nav } from './Nav'
import { PortHero } from './PortHero'
import { Preview } from './Preview'
import { Roles } from './Roles'

const MODULES = ['Smart Placement', 'Yard Map', 'Gate-In', 'Appointments', 'Crane Dispatch', 'Customs Control', 'Container Tracker', 'Billing', 'Reports']
const FAQ: [string, string][] = [
  ['What is a dry port?', 'An inland container terminal linked to a seaport by rail or road. It clears cargo away from the coast and keeps the seaport moving.'],
  ['What does the optimizer do?', 'It scores every free slot and picks the one that blocks the fewest containers, so later pickups need fewer extra crane moves.'],
  ['Can a container leave without customs clearance?', 'No. Release is blocked until customs is cleared and storage dues are paid.'],
  ['Who can use SmartPort?', 'Clients: shippers and consignees. Create a client account to track your containers, book gate slots and pay dues online. You only see your own containers.'],
  ['Is this real data?', 'Yes, it is your own data. The terminal starts empty and keeps what you enter in this browser. There is no shared server yet.'],
]
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches

export function Home() {
  const pathname = usePathname()
  useEffect(() => {
    const behavior = reduce ? 'auto' : 'smooth'
    if (pathname === '/app/roles' || pathname === '/app/faq') document.getElementById(pathname.slice(5))?.scrollIntoView({ behavior, block: 'start' })
    else if (pathname === '/app/journey') { scrollTo({ top: 0, behavior }); film.go(1) }
    else scrollTo(0, 0)
  }, [pathname])

  const lane = MODULES.map((n) => <span className="lci" key={n}>{n}</span>)
  return (
    <div id="home">
      <a href="#main" style={{ position: 'absolute', left: -999 }} onFocus={(e) => (e.currentTarget.style.left = '8px')}>Skip to content</a>
      <Nav />
      <PortHero />
      <Film />
      <section className="sec">
        <p className="k">Smarter moves, stronger connections</p>
        <h2>Built for the next generation of inland logistics.</h2>
        <div className="gr">
          <div className="tile"><span className="big">68%</span><small>Fewer extra moves in the demo comparison</small></div>
          <div className="tile"><span className="big">4</span><small>Simple pages for clients: overview, track, book, pay</small></div>
          <div className="tile"><span className="big">1</span><small>Portal for every client and every container</small></div>
        </div>
      </section>
      <Features />
      <How />
      <Preview />
      <Roles />
      <section className="sec" id="faq">
        <h2>Questions, <em>answered</em>.</h2>
        <div className="fqs">{FAQ.map(([q, a]) => <details className="fq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
      <section className="sec lc" aria-label="SmartPort modules">
        <h2><span>Built for every move.</span><br /><b>One platform. Every module.</b></h2>
        <div className="lcl" />
        <div className="lcm"><div className="lct" id="lct" aria-hidden="true">{lane}{lane}</div></div>
        <div className="lcl" style={{ maxWidth: 'none', marginTop: 20 }} />
      </section>
      <section className="sec cta">
        <h2>Ready to move <em>smarter</em>?</h2>
        <p className="sub">Open the terminal and follow GMT-0042 yourself.</p>
        <p><Link className="btn p" href="/app/login">Enter Terminal</Link> <Link className="btn" href="/app/signup">Create account</Link></p>
      </section>
      <footer className="ft2">
        <div className="fcols">
          <div><b style={{ color: 'var(--fg)' }}>SmartPort.</b><p>Smarter moves, from start to finish. A dry-port management demo.</p></div>
          <div>
            <b style={{ color: 'var(--fg)' }}>Platform</b>
            <Link href="/app/overview">Overview</Link><Link href="/app/shipments">My Shipments</Link><Link href="/app/book-slot">Book a Slot</Link><Link href="/app/my-billing">My Billing</Link>
          </div>
          <div>
            <b style={{ color: 'var(--fg)' }}>Account</b>
            <Link href="/app/login">Sign in</Link><Link href="/app/signup">Create account</Link><Link href="/app/roles">Client portal</Link><Link href="/app/faq">FAQ</Link>
          </div>
        </div>
        <p style={{ marginTop: 24 }}>&copy; 2026 SmartPort. Demo project.</p>
      </footer>
    </div>
  )
}
