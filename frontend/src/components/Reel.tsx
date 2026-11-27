'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

// These are the same two clips as the last slides of the landing slider (public/video/s6, s7), so nothing extra to download.
const CARDS = [
  { src: '/video/s6', k: 'Control room', h: 'Every move, visible live.', p: 'Operators see arrivals, holds and yard moves on one wall of screens.', href: '/app/login' },
  { src: '/video/s7', k: 'Client portal', h: 'Track, book and pay online.', p: 'Clients follow their containers and settle dues without a phone call.', href: '/app/login' },
]

/** "See the terminal at work": two muted looping clips (only play while on screen). Each whole card is a link to sign in. */
export function Reel() {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const vids = [...el.querySelectorAll('video')] as HTMLVideoElement[]
    const io = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target as HTMLVideoElement; if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }), { threshold: 0.25 })
    vids.forEach((v) => io.observe(v))
    return () => io.disconnect()
  }, [])
  return (
    <section className="sec reel" ref={root} aria-label="SmartPort in motion">
      <p className="k">In motion</p>
      <h2>See the terminal <em>at work</em>.</h2>
      <div className="rl2">
        {CARDS.map((c) => (
          <Link className="rv" href={c.href} key={c.src} aria-label={`${c.k}: ${c.h} Sign in`}>
            <video src={`${c.src}.mp4`} poster={`${c.src}.jpg`} muted loop playsInline preload="none" aria-hidden="true" />
            <span className="cap">
              <b>{c.k}</b>
              <span className="hd">{c.h}</span>
              <small>{c.p}</small>
              <em className="go">Sign in →</em>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
