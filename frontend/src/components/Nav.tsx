'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pagesFor } from '../lib/data'
import { film } from '../lib/film'
import { ThemeToggle } from './ThemeToggle'

export function Nav() {
  const [open, setOpen] = useState(false)
  const pinned = useRef(false)
  const timer = useRef(0)
  const pathname = usePathname()
  const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover:hover)').matches
  const set = (o: boolean) => { setOpen(o); if (!o) pinned.current = false }

  useEffect(() => set(false), [pathname])
  useEffect(() => {
    const click = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.dd')) set(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && set(false)
    document.addEventListener('click', click); addEventListener('keydown', key)
    return () => { document.removeEventListener('click', click); removeEventListener('keydown', key) }
  }, [])

  const journey = () => { set(false); scrollTo({ top: 0, behavior: 'smooth' }); film.go(1) }
  return (
    <nav className="top" id="nav">
      <Link className="logo" href="/app/" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}>SmartPort<i>.</i></Link>
      <div className="nl">
        <Link className="btn h" href="/app/journey" style={{ border: 0 }} onClick={journey}>Journey</Link>
        <div className={`dd h${open ? ' open' : ''}`}
          onMouseEnter={() => { if (canHover) { clearTimeout(timer.current); set(true) } }}
          onMouseLeave={() => { if (canHover && !pinned.current) { clearTimeout(timer.current); timer.current = window.setTimeout(() => set(false), 300) } }}>
          <button aria-haspopup="true" aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation(); clearTimeout(timer.current)
              if (open) { if (canHover && !pinned.current) pinned.current = true; else set(false) } else { pinned.current = true; set(true) }
            }}>Platform</button>
          <div className="menu" id="menu">
            {pagesFor('C').filter((p) => p.id !== 'profile').map((p) => <Link key={p.id} href={'/app/' + p.id}>{p.label}<small>{p.desc}</small></Link>)}
          </div>
        </div>
        <Link className="btn h" href="/app/roles" style={{ border: 0 }}>Client portal</Link>
        <ThemeToggle />
        <Link className="btn h" href="/app/login">Sign in</Link>
        <Link className="btn h" href="/app/signup">Sign up</Link>
        <Link className="btn p" href="/app/login">Enter Terminal</Link>
      </div>
    </nav>
  )
}
