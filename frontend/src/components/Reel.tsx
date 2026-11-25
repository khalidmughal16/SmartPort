'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

// These are the same two clips as the last slides of the landing slider (public/video/s6, s7), so nothing extra to download.
const CARDS = [
  { src: '/video/s6', to: '/app/login?as=control-room', k: 'Control room', h: 'Every move, visible live.', p: 'Operators see arrivals, holds and yard moves on one wall of screens.' },
  { src: '/video/s7', to: '/app/login?as=client-portal', k: 'Client portal', h: 'Track, book and pay online.', p: 'Clients follow their containers and settle dues without a phone call.' },
]

/** "See the terminal at work": two muted looping clips that only play while on screen. */
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
          <figure className="rv" key={c.src}>
            <Link href={c.to} className="rv-link" aria-label={`${c.k}: sign in`} />
            <video src={`${c.src}.mp4`} poster={`${c.src}.jpg`} muted loop playsInline preload="none" aria-label={c.k} />
            <figcaption><b>{c.k}</b><span>{c.h}</span><small>{c.p}</small><em className="rv-cta">Sign in &rarr;</em></figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
