'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { film } from '../lib/film'
import { SLIDES } from '../lib/reel'
import { useChapterVideos } from '../lib/useChapterVideos'


/**
 * Landing hero. Light mode shows the daytime port photo, dark mode the night one
 * (public/hero/hero-light.jpg, hero-dark.jpg). The laptop on the photo is closed;
 * as you scroll it opens (3D), then zooms in until the screen fills the view. The
 * screen shows the real first chapter of the landing film (<ScreenPage/>), so after the
 * zoom the page simply carries on inside it (the <Film/> section right below).
 */

// Open laptop footprint inside the 1672x941 background (same spot in light and dark): centre x, y and lid width (px)
const LAP = { cx: 838, cy: 817, w: 1059 }

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
const N = SLIDES.length
function ScreenPage({ live }: { live: boolean }) {
  const [idx, setIdx] = useState(() => Math.min(N - 1, Math.floor(film.p * N)))
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const vid = (i: number) => el.querySelector<HTMLVideoElement>(`video[data-ch="${i}"]`)
    const sync = () => {
      const p = Math.min(0.9999, Math.max(0, film.p)), i = Math.min(N - 1, Math.floor(p * N)), t = p * N - i
      setIdx((o) => (o === i ? o : i))
      const st = el.querySelector('.ph-gst'), mv = el.querySelector('.ph-gmv')
      // slide 5 is gate -> customs -> release in one clip, so its status follows the clip
      if (st) st.textContent = SLIDES[i].src.endsWith('/s4.mp4') ? (t < 0.35 ? 'At gate' : t < 0.7 ? 'Customs' : 'Released') : SLIDES[i].s[3]
      if (mv) mv.textContent = SLIDES[i].s[5]
    }
    sync()
    film.subs.add(sync)
    // The slider has its own clock, locked to the playing clip: while a clip plays, progress = its playhead; if a clip
    // is slow to start or stuck, the clock keeps going after a short grace period, so the slider can never freeze on one video.
    // The next slide starts when the clip has ended (or its length has elapsed), and the last slide wraps to the first.
    let raf = 0, cur = -1, spent = 0, stuck = 0, lastPlay = 0, last = performance.now(), vis = true
    const io = new IntersectionObserver((e) => { vis = e[0].isIntersecting }, { threshold: 0.05 })
    io.observe(el)
    const advance = (i: number) => {
      const n = (i + 1) % N, nx = vid(n)
      if (nx) { nx.currentTime = 0; nx.play().catch(() => {}) }
      cur = n; spent = 0; stuck = 0
      film.p = (n + 0.001) / N; sync()
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.25, (now - last) / 1000); last = now
      if (!film.run || document.hidden || !vis) return
      const i = Math.min(N - 1, Math.floor(Math.min(0.9999, Math.max(0, film.p)) * N))
      const v = vid(i)
      const dur = v && isFinite(v.duration) && v.duration > 0 ? v.duration : 8
      if (cur !== i) { cur = i; spent = (Math.min(0.9999, Math.max(0, film.p)) * N - i) * dur; stuck = 0 }
      if (v && !v.paused && !v.ended && v.readyState >= 3 && v.currentTime > 0) { stuck = 0; spent = v.currentTime }
      else {
        stuck += dt
        if (stuck > 4) spent += dt // clip is not moving: let the clock run so the slider still advances
        if (v && !v.ended && now - lastPlay > 800) { lastPlay = now; v.play().catch(() => {}) }
      }
      if ((v && v.ended) || spent >= dur - 0.05) { advance(i); return }
      film.p = (i + Math.min(0.999, spent / dur)) / N; sync()
    }
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) raf = requestAnimationFrame(tick)
    film.go = (i: number) => { film.p = (i + 0.001) / N; cur = -1; sync() }
    film.set = (x: number) => { film.p = Math.min(0.9999, Math.max(0, x)); cur = -1; sync() }
    return () => { cancelAnimationFrame(raf); io.disconnect(); film.subs.delete(sync); film.go = () => {}; film.set = () => {} }
  }, [])
  useChapterVideos(root, idx)
  const ti = live ? 0 : -1
  const s = SLIDES[idx].s, sg = SLIDES[idx].stage, clean = !!SLIDES[idx].clean
  return (
    <div className="ph-pg" aria-hidden={!live} ref={root}>
      <div className="ph-pbgw">
        {SLIDES.map((sl, i) => (
          <video key={sl.src} data-ch={i} className={i === idx ? 'on' : ''} src={sl.src} poster={sl.poster} muted playsInline preload={i === idx || i === (idx + 1) % N ? 'auto' : 'metadata'} aria-hidden="true" />
        ))}
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
      {!clean && <ol className="ph-pjr">
        {['Vessel', 'Gate-in', 'Customs', 'Yard', 'Released'].map((n, i) => <li key={n} className={i === sg ? 'n' : ''}>{n}</li>)}
      </ol>}
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
      {!clean && <div className="ph-pch" key={idx}>
        <p className="ph-pk">{String(idx + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</p>
        <h2 className="ph-phd">{s[0]}<br /><em>{s[1]}</em></h2>
        <p className="ph-pa">
          <Link className="ph-pb p" href="/app/login" tabIndex={ti}>Enter Terminal</Link>
          {idx === 0 && <button type="button" className="ph-pb" tabIndex={ti} onClick={() => film.go(1)}>Follow the journey</button>}
        </p>
      </div>}
      {!clean && <div className="ph-pgm">
        <b>GMT-0042 <span>demo</span></b>
        <div><span>Status</span><span className="ph-gst">{s[3]}</span></div>
        <div><span>Location</span><span>{s[4]}</span></div>
        <div><span>Extra moves</span><span className="ph-gmv">0</span></div>
        <div><span>Dwell days</span><span>{s[6]}</span></div>
      </div>}
    </div>
  )
}


/**
 * What the laptop screen shows while it opens and zooms (until we are "inside" the screen): a branded wallpaper.
 * Dark mode uses the green-wave wallpaper (public/hero/wall-dark.jpg); light mode a matching light wallpaper (SVG, crisp at any size).
 * Its opacity is driven by --z in CSS and reaches 0 just before the slider takes over.
 */
function Wall() {
  return (
    <div className="ph-wall" aria-hidden="true">
      <img className="wd" src="/hero/wall-dark.jpg" alt="" draggable={false} />
      <svg className="wl" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="wl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F9FBFE" /><stop offset="1" stopColor="#E4EEF9" /></linearGradient>
          <linearGradient id="wl-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B4F02B" stopOpacity=".95" /><stop offset="1" stopColor="#3F8A00" stopOpacity=".75" /></linearGradient>
          <linearGradient id="wl-g2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#3F8A00" stopOpacity=".8" /><stop offset="1" stopColor="#B4F02B" stopOpacity=".95" /></linearGradient>
          <filter id="wl-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <rect width="1600" height="900" fill="url(#wl-bg)" />
        <g fill="none" strokeLinecap="round">
          <path d="M-40 70 C 260 -10, 560 40, 700 -30" stroke="url(#wl-g1)" strokeWidth="46" opacity=".35" filter="url(#wl-glow)" />
          <path d="M-40 70 C 260 -10, 560 40, 700 -30" stroke="url(#wl-g1)" strokeWidth="5" />
          <path d="M-40 140 C 220 40, 420 140, 640 -10" stroke="url(#wl-g1)" strokeWidth="3" opacity=".7" />
          <path d="M-40 230 C 150 150, 300 160, 420 40" stroke="url(#wl-g1)" strokeWidth="2" opacity=".5" />
          <path d="M-60 820 C 300 700, 640 820, 960 770 S 1420 560, 1680 600" stroke="url(#wl-g2)" strokeWidth="50" opacity=".32" filter="url(#wl-glow)" />
          <path d="M-60 820 C 300 700, 640 820, 960 770 S 1420 560, 1680 600" stroke="url(#wl-g2)" strokeWidth="6" />
          <path d="M-60 860 C 340 760, 700 880, 1000 820 S 1440 640, 1680 690" stroke="url(#wl-g2)" strokeWidth="3" opacity=".7" />
          <path d="M-60 900 C 400 820, 760 930, 1060 870 S 1480 730, 1680 780" stroke="url(#wl-g2)" strokeWidth="2" opacity=".5" />
        </g>
        <text x="800" y="500" textAnchor="middle" fontFamily="'Inter Tight','Inter',system-ui,sans-serif" fontWeight="700" fontSize="168" letterSpacing="-4">
          <tspan fill="#0B1B3A">Smart</tspan><tspan fill="#4E9A00">port</tspan>
        </text>
      </svg>
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
      const L = LAP
      const w = (L.w * s * 0.96) / 1.03
      el.style.setProperty('--w', w.toFixed(1) + 'px')
      el.style.setProperty('--lx', ((vw - 1672 * s) / 2 + L.cx * s).toFixed(1) + 'px')
      el.style.setProperty('--ly', ((vh - 941 * s) / 2 + L.cy * s - w * 0.07).toFixed(1) + 'px')
      el.style.setProperty('--dx', (vw / 2 - ((vw - 1672 * s) / 2 + L.cx * s)).toFixed(1) + 'px')
      el.style.setProperty('--dy', (vh / 2 - ((vh - 941 * s) / 2 + L.cy * s - w * 0.07)).toFixed(1) + 'px')
      el.style.setProperty('--se', Math.max(vw / (w * 0.966), vh / (w * 0.5434)).toFixed(3)) // inner screen covers the viewport
    }
    const tick = () => {
      raf = 0
      layout()
      if (rm) return
      const span = el.offsetHeight - innerHeight
      const p = span <= 0 ? 0 : clamp(-el.getBoundingClientRect().top / span)
      const c = clamp(p / 0.06) // fades the "Scroll to explore" hint
      const o = ease(clamp((p - 0.04) / 0.4)) // lid opens first ...
      const z = ease(clamp((p - 0.46) / 0.4)) // ... then we zoom into the screen
      el.style.setProperty('--c', c.toFixed(3))
      el.style.setProperty('--o', o.toFixed(4))
      el.style.setProperty('--z', z.toFixed(4))
      setOpen(o > 0.85)
      const was = film.run
      film.run = z > 0.98 // slider starts only once we are inside the laptop
      if (film.run && !was) dispatchEvent(new Event('sp-run')) // restart chapter 1's clip exactly when the slider starts
      // fully zoomed: drop the 3D scaling and show the screen as a plain full-size page (crisp text, no blur)
      const done = el.classList.contains('ph-done')
      if (!done && z > 0.995) el.classList.add('ph-done')
      else if (done && z < 0.985) el.classList.remove('ph-done')
      // laptop closed again (scrolled back to the top): next time the slider starts from chapter 1 again
      if (z < 0.02 && film.p > 0.0021) { film.p = 0.002; film.subs.forEach((f) => f()) }
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
                  <Wall />
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
