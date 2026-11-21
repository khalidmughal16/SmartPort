'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/**
 * Landing hero. Light mode shows the daytime port photo, dark mode the night one
 * (public/hero/hero-light.jpg, hero-dark.jpg). The laptop on the photo is closed;
 * as you scroll it opens (3D), then zooms in so the SmartPort landing page on its
 * screen fills the view.
 */

// Closed laptop footprint inside each 1672x941 photo: centre x/y and width (px)
const LAP = { light: { cx: 775, cy: 727, w: 866 }, dark: { cx: 777, cy: 750, w: 805 } }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number) => Math.min(1, Math.max(0, v))

// `screen` uses the copy with the laptop + mouse painted out, so the screen shows the plain port scene
function Pic({ cls = '', screen = false }: { cls?: string; screen?: boolean }) {
  const sfx = screen ? '-screen' : ''
  return (
    <>
      <img className={`ph-i ph-l ${cls}`} src={`/hero/hero-light${sfx}.jpg`} alt="" draggable={false} />
      <img className={`ph-i ph-d ${cls}`} src={`/hero/hero-dark${sfx}.jpg`} alt="" draggable={false} />
    </>
  )
}

function Cube({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true" focusable="false">
      <polygon points="20,3 36,12 20,21 4,12" fill="#b8f23a" />
      <polygon points="4,12 20,21 20,38 4,29" fill="#5cb30c" />
      <polygon points="36,12 20,21 20,38 36,29" fill="#3f8a06" />
      <path d="M20 21V38M4 12L20 21L36 12" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function Title() {
  return <>The future of smart <i>port <em>operations</em></i></>
}

export function PortHero() {
  const ref = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rm = matchMedia('(prefers-reduced-motion:reduce)').matches
    let raf = 0
    const layout = () => {
      const vw = innerWidth, vh = innerHeight
      const s = Math.max(vw / 1672, vh / 941) // object-fit: cover scale
      const L = document.documentElement.dataset.theme === 'light' ? LAP.light : LAP.dark
      const w = (L.w * s * 0.96) / 1.03
      el.style.setProperty('--w', w.toFixed(1) + 'px')
      el.style.setProperty('--lx', ((vw - 1672 * s) / 2 + L.cx * s).toFixed(1) + 'px')
      el.style.setProperty('--ly', ((vh - 941 * s) / 2 + L.cy * s - w * 0.07).toFixed(1) + 'px')
      el.style.setProperty('--dx', (vw / 2 - ((vw - 1672 * s) / 2 + L.cx * s)).toFixed(1) + 'px')
      el.style.setProperty('--dy', (vh / 2 - ((vh - 941 * s) / 2 + L.cy * s - w * 0.07)).toFixed(1) + 'px')
      el.style.setProperty('--se', Math.min((0.94 * vw) / w, (0.9 * vh) / (w * 0.625)).toFixed(3))
    }
    const tick = () => {
      raf = 0
      layout()
      if (rm) return
      const span = el.offsetHeight - innerHeight
      const p = span <= 0 ? 0 : clamp(-el.getBoundingClientRect().top / span)
      const c = clamp(p / 0.06)
      const o = ease(clamp((p - 0.04) / 0.4))
      const z = ease(clamp((p - 0.46) / 0.4))
      el.style.setProperty('--c', c.toFixed(3))
      el.style.setProperty('--o', o.toFixed(4))
      el.style.setProperty('--z', z.toFixed(4))
      setOpen(o > 0.85)
    }
    const req = () => { if (!raf) raf = requestAnimationFrame(tick) }
    addEventListener('scroll', req, { passive: true })
    addEventListener('resize', req)
    const mo = new MutationObserver(req) // theme flip changes which photo / laptop size is used
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    tick()
    return () => { removeEventListener('scroll', req); removeEventListener('resize', req); mo.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  const nudge = () => scrollTo({ top: innerHeight * 0.9, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' })

  return (
    <section className="ph" ref={ref} aria-label="SmartPort">
      <div className="ph-stage">
        <div className="ph-bg"><Pic /></div>
        <div className="ph-veil" />

        <div className="ph-txt">
          <h1><Title /></h1>
          <p>One intelligent platform. Complete terminal control.</p>
        </div>

        <div className="ph-scene">
          <div className="ph-rig">
            <div className="ph-sh" />
            <div className="ph-base"><div className="ph-key" /><div className="ph-pad" /></div>
            <div className="ph-edge" />
            <div className="ph-lid">
              <div className="ph-scr">
                <i className="ph-cam" />
                <div className="ph-in">
                  <Pic cls="ph-si" screen />
                  <div className="ph-sc" aria-hidden={!open}>
                    <div className="ph-logo"><Cube size="calc(var(--w) * .035)" /><span>SmartPort<b>.</b></span></div>
                    <h2 className="ph-h"><Title /></h2>
                    <p className="ph-sub">One intelligent platform. Complete terminal control.</p>
                    <Link className="ph-btn" href="/app/login" tabIndex={open ? 0 : -1}>Get Started <span aria-hidden="true">&rarr;</span></Link>
                  </div>
                </div>
                <div className="ph-gl" />
              </div>
              <div className="ph-cov"><Cube size="calc(var(--w) * .06)" /></div>
            </div>
          </div>
        </div>

        <button type="button" className="ph-hint" onClick={nudge} aria-label="Scroll to explore">
          Scroll to explore <i aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
