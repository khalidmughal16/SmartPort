'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { STORY } from '../lib/data'
import { film } from '../lib/film'
import film0 from '../assets/film-0.jpg'
import film1 from '../assets/film-1.jpg'
import film2 from '../assets/film-2.jpg'
import film3 from '../assets/film-3.jpg'
import film4 from '../assets/film-4.jpg'
import film5 from '../assets/film-5.jpg'
import film6 from '../assets/film-6.jpg'
import film7 from '../assets/film-7.jpg'
import film8 from '../assets/film-8.jpg'
import film9 from '../assets/film-9.jpg'

const bgs = [film0, film1, film2, film3, film4, film5, film6, film7, film8, film9].map((m) => m.src)

/**
 * Landing hero. Light mode shows the daytime port photo, dark mode the night one
 * (public/hero/hero-light.jpg, hero-dark.jpg). The laptop on the photo is closed;
 * as you scroll it opens (3D), then zooms in until the screen fills the view. The
 * screen shows the real first chapter of the landing film (<ScreenPage/>), so after the
 * zoom the page simply carries on inside it (the <Film/> section right below).
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

/**
 * The laptop screen runs the SAME slider as <Film/>: it reads film.p (the shared progress), so the photo,
 * chapter text and journey pill change on the laptop exactly as they do below. Nothing is a frozen picture.
 */
const SG = [0, 0, 1, 2, 3, 3, 3, 3, 4, 4]
function ScreenPage({ live }: { live: boolean }) {
  const [light, setLight] = useState(false)
  const [lightOk, setLightOk] = useState<boolean[]>(() => bgs.map(() => false))
  const [idx, setIdx] = useState(() => Math.min(9, Math.floor(film.p * 10)))
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const de = document.documentElement
    const read = () => setLight(de.getAttribute('data-theme') === 'light')
    read()
    const mo = new MutationObserver(read)
    mo.observe(de, { attributes: true, attributeFilter: ['data-theme'] })
    bgs.forEach((_, i) => {
      const im = new Image()
      im.onload = () => setLightOk((a) => a.map((v, j) => (j === i ? true : v)))
      im.src = `/film-light/${i}.jpg`
    })
    return () => mo.disconnect()
  }, [])
  useEffect(() => {
    const el = root.current
    if (!el) return
    const sync = () => {
      const p = Math.min(0.9999, Math.max(0, film.p)), i = Math.min(9, Math.floor(p * 10)), t = p * 10 - i
      setIdx((o) => (o === i ? o : i))
      const im = el.querySelectorAll<HTMLElement>('.ph-pbgw img')[i]
      if (im) im.style.transform = `scale(${1.03 + 0.07 * t}) translateX(${(t - 0.5) * -1.6}%)`
      const st = el.querySelector('.ph-gst'), mv = el.querySelector('.ph-gmv')
      if (st) st.textContent = i === 3 ? (t < 0.5 ? 'Customs hold' : 'Cleared') : STORY[i][3]
      if (mv) mv.textContent = String(i === 4 ? Math.round(7 * t) : i === 5 ? Math.round(7 * (1 - Math.min(1, t * 2))) : 0)
    }
    sync()
    film.subs.add(sync)
    // the slider's clock lives here now: it only advances once the laptop is fully zoomed in (film.run)
    const SLIDE_MS = 3000
    let raf = 0, at = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(1000, t - at || 0); at = t
      if (!film.run || document.hidden) return
      film.p += dt / (SLIDE_MS * 10)
      if (film.p >= 1) film.p = 0
      sync()
    }
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) raf = requestAnimationFrame(tick)
    film.go = (i: number) => { film.p = (i + 0.02) / 10; sync() }
    film.set = (x: number) => { film.p = Math.min(0.9999, Math.max(0, x)); sync() }
    return () => { cancelAnimationFrame(raf); film.subs.delete(sync); film.go = () => {}; film.set = () => {} }
  }, [])
  const ti = live ? 0 : -1
  const s = STORY[idx], sg = SG[idx]
  return (
    <div className="ph-pg" aria-hidden={!live} ref={root}>
      <div className="ph-pbgw">
        {bgs.map((src, i) => {
          const lt = light && lightOk[i]
          return <img key={i} alt="" draggable={false} src={lt ? `/film-light/${i}.jpg` : src} className={(i === idx ? 'on' : '') + (light && !lt ? ' fb' : '')} />
        })}
      </div>
      <div className="ph-pshade" />
      <div className="ph-pnav">
        <span className="ph-plogo">SmartPort<i>.</i></span>
        <span className="ph-pnl">
          <span>Journey</span><span>Platform</span><span>Client portal</span>
          <i className="ph-pth" />
          <span className="ph-pbtn">Sign in</span><span className="ph-pbtn">Sign up</span><span className="ph-pbtn p">Enter Terminal</span>
        </span>
      </div>
      <ol className="ph-pjr">
        {['Vessel', 'Gate-in', 'Customs', 'Yard', 'Released'].map((n, i) => <li key={n} className={i === sg ? 'n' : ''}>{n}</li>)}
      </ol>
      {idx === 0 && <div className="ph-pbd"><i />Berth B-3 &middot; vessel arriving</div>}
      {idx === 0 && (
        <div className="ph-ptr">
          <div className="ph-ptrh"><span>Vessel tracker</span><em><i />live</em></div>
          <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" opacity=".3"><circle cx="100" cy="100" r="90" /><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="30" /><path d="M100 10V190M10 100H190" /></g>
            <path d="M100 100V10" stroke="var(--lime)" strokeWidth="2.5" style={{ transformOrigin: '100px 100px', animation: 'sw 4s linear infinite' }} />
            <circle cx="132" cy="54" r="6" fill="var(--lime)" />
          </svg>
          <div className="ph-ptrk"><b>MV Karachi Star</b><span>ETA <b>13</b> min</span><span>Berth <b>B-3</b></span><span>Tugs <b>2</b></span></div>
        </div>
      )}
      <div className="ph-pch" key={idx}>
        <p className="ph-pk">{String(idx + 1).padStart(2, '0')} / 10</p>
        <h2 className="ph-phd">{s[0]}<br /><em>{s[1]}</em></h2>
        <p className="ph-pa">
          <Link className="ph-pb p" href="/app/login" tabIndex={ti}>Enter Terminal</Link>
          {idx === 0 && <button type="button" className="ph-pb" tabIndex={ti} onClick={() => film.go(1)}>Follow the journey</button>}
        </p>
      </div>
      <div className="ph-pgm">
        <b>GMT-0042 <span>demo</span></b>
        <div><span>Status</span><span className="ph-gst">{s[3]}</span></div>
        <div><span>Location</span><span>{s[4]}</span></div>
        <div><span>Extra moves</span><span className="ph-gmv">0</span></div>
        <div><span>Dwell days</span><span>{s[6]}</span></div>
      </div>
    </div>
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
      el.style.setProperty('--se', Math.max(vw / (w * 0.976), vh / (w * 0.549)).toFixed(3)) // inner screen covers the viewport
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
      film.run = z > 0.98 // slider starts only once we are inside the laptop
    }
    const req = () => { if (!raf) raf = requestAnimationFrame(tick) }
    addEventListener('scroll', req, { passive: true })
    addEventListener('resize', req)
    const mo = new MutationObserver(req) // theme flip changes which photo / laptop size is used
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    tick()
    return () => { film.run = false; removeEventListener('scroll', req); removeEventListener('resize', req); mo.disconnect(); cancelAnimationFrame(raf) }
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
                  <ScreenPage live={open} />
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
