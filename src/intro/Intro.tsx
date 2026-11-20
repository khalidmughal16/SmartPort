'use client'
import { useEffect, useRef } from 'react'
import shot from '../assets/laptop-shot.jpg'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1)
const ease = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Scroll-driven 3D laptop: it zooms in, opens, then the real app (app.html) fills the screen. */
export function Intro() {
  const r = { track: useRef<HTMLDivElement>(null), laptop: useRef<HTMLDivElement>(null), lid: useRef<HTMLDivElement>(null), mouse: useRef<HTMLDivElement>(null), copy: useRef<HTMLDivElement>(null), cue: useRef<HTMLDivElement>(null), fs: useRef<HTMLDivElement>(null), nv: useRef<HTMLElement>(null), frame: useRef<HTMLIFrameElement>(null) }

  useEffect(() => {
    const root = document.documentElement
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const track = r.track.current as HTMLDivElement, laptop = r.laptop.current as HTMLDivElement, lid = r.lid.current as HTMLDivElement
    const mouse = r.mouse.current as HTMLDivElement, copy = r.copy.current as HTMLDivElement, cue = r.cue.current as HTMLDivElement
    const fs = r.fs.current as HTMLDivElement, nv = r.nv.current as HTMLElement
    let W = 640, H = 400, ticking = false, released: boolean | null = null

    const size = () => {
      const vw = innerWidth
      W = Math.min(640, vw * (vw < 700 ? 0.8 : vw < 1100 ? 0.6 : 0.46)); H = W * 0.625
      root.style.setProperty('--w', W + 'px'); root.style.setProperty('--h', H + 'px')
    }
    const render = () => {
      ticking = false
      const vw = innerWidth, vh = innerHeight
      const max = track.offsetHeight - vh
      const p = reduce ? 1 : clamp((scrollY - track.offsetTop) / Math.max(1, max), 0, 1)
      const zoom = ease(seg(p, 0, 0.16)), open = ease(seg(p, 0.16, 0.44)), ex = ease(seg(p, 0.44, 0.84)), fade = seg(p, 0.72, 0.84)
      const sEnd = Math.max(vw / (W * 0.96), vh / (H * 0.94))
      const s = lerp(lerp(0.92, 1.3, zoom), sEnd, ex)
      const rx = lerp(lerp(-30, -12, zoom), 0, ex), ry = lerp(lerp(-26, -10, zoom), 0, ex)
      const ty = ex * ((H * s) / 2 - vh * 0.06)
      laptop.style.transform = `translate3d(0,${ty}px,0) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg)`
      lid.style.transform = `rotateX(${lerp(-90, -3, open) * (1 - ex)}deg)`
      root.style.setProperty('--glow', (0.35 * open).toFixed(3))
      root.style.setProperty('--lit', clamp((open - 0.35) / 0.65, 0, 1).toFixed(3))
      const m = 1 - seg(p, 0.04, 0.2)
      mouse.style.opacity = String(m)
      mouse.style.filter = innerWidth < 700 ? 'none' : `blur(${((1 - m) * 10).toFixed(1)}px)`
      const c = 1 - seg(p, 0, 0.1)
      copy.style.opacity = String(c); copy.style.transform = `translateY(${-30 * (1 - c)}px)`
      cue.style.opacity = String(1 - seg(p, 0, 0.04))
      fs.style.opacity = String(fade); fs.style.visibility = fade > 0 ? 'visible' : 'hidden'; fs.classList.toggle('on', fade > 0.3)
      nv.style.opacity = String(c); nv.style.pointerEvents = c < 0.5 ? 'none' : 'auto'
      // tell the embedded app when it is on screen, so its film only plays once the laptop has opened
      const rl = fade > 0.99
      if (rl !== released) { released = rl; r.frame.current?.contentWindow?.postMessage({ type: 'sp-hold', hold: !rl, restart: rl }, '*') }
    }
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(render) } }
    const onResize = () => { size(); req() }
    const onLoad = () => { released = null; req() }
    size(); render()
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', onResize)
    r.frame.current?.addEventListener('load', onLoad)
    const frameEl = r.frame.current
    return () => { removeEventListener('scroll', req); removeEventListener('resize', onResize); frameEl?.removeEventListener('load', onLoad) }
  }, [])

  const jump = () => {
    const t = r.track.current as HTMLDivElement
    scrollTo({ top: t.offsetTop + t.offsetHeight - innerHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return (
    <>
      <nav id="nv" ref={r.nv}><span className="brand">Smart<b>Port</b></span></nav>
      <div className="track" id="track" ref={r.track}>
        <div className="sticky">
          <div className="copy" id="copy" ref={r.copy}>
            <h1>The future of smart port operations</h1>
            <p>One intelligent platform. Complete terminal control.</p>
          </div>
          <div className="scene" onClick={jump}>
            <div className="laptop" id="laptop" ref={r.laptop}>
              <div className="shadow" />
              <div className="deck"><div className="keys" /><div className="pad" /></div>
              <div className="mouse" id="mouse" ref={r.mouse} />
              <div className="lid" id="lid" ref={r.lid}>
                <div className="face outer" />
                <div className="face screen"><div className="display mini"><div className="dashwrap"><img className="sh on" alt="SmartPort landing page" src={shot.src} /></div></div></div>
              </div>
            </div>
          </div>
          <div className="fs" id="fs" ref={r.fs} aria-label="SmartPort dashboard preview">
            <iframe ref={r.frame} title="SmartPort" src="/app" />
          </div>
          <div className="cue" id="cue" ref={r.cue}><span>SCROLL TO EXPLORE</span><i /></div>
        </div>
      </div>
    </>
  )
}
