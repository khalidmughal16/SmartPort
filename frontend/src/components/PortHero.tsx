'use client'
import React, { useEffect, useRef, useState } from 'react'
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

// Closed laptop footprint inside each 1672x941 photo: centre x/y and width (px)
const LAP = { light: { cx: 818, cy: 772, w: 955, mx: 0.641, my: 0.045 }, dark: { cx: 820, cy: 755, w: 950, mx: 0.642, my: 0.063 } }

// photo is bottom-weighted (object-position 50% 78%) so the laptop + mouse are never cropped; keep in sync with app.css
const FY = 0.78
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
      if (st) st.textContent = i === 4 ? (t < 0.35 ? 'At gate' : t < 0.7 ? 'Customs' : 'Released') : SLIDES[i].s[3]
      if (mv) mv.textContent = SLIDES[i].s[5]
    }
    sync()
    film.subs.add(sync)
    // The slider is driven by the VIDEO itself: progress = playhead of the current clip, and the next slide
    // starts only when the clip has played to its end, so every video plays in full (~8 s each).
    let raf = 0, cur = -1, t0 = 0, kick = 0
    const advance = (i: number) => {
      const nx = vid((i + 1) % N); if (nx) nx.currentTime = 0 // a clip that already played once must not look 'ended' again
      film.p = (((i + 1) % N) + 0.001) / N; sync()
    }
    const onRun = () => { t0 = performance.now() }
    addEventListener('sp-run', onRun)
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      if (!film.run || document.hidden || !film.vis) { t0 = now; return } // paused: off screen, hidden tab or laptop not zoomed yet
      const i = Math.min(N - 1, Math.floor(Math.min(0.9999, Math.max(0, film.p)) * N))
      if (i !== cur) { cur = i; t0 = now }
      const v = vid(i)
      const dur = v && isFinite(v.duration) && v.duration > 0 ? v.duration : 8
      const ended = !!v && (v.ended || (isFinite(v.duration) && v.currentTime >= v.duration - 0.04))
      // watchdog: never wait on a clip longer than its length + 1.2 s (a stuck/failed clip must not freeze the slider)
      if (ended || now - t0 > (dur + 1.2) * 1000) { advance(i); return }
      if (v && v.paused && now - kick > 600) { kick = now; v.play().catch(() => {}) } // nudge a clip that did not start
      if (v && !v.paused && v.readyState >= 2) { film.p = (i + Math.min(0.999, v.currentTime / dur)) / N; sync() }
    }
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) raf = requestAnimationFrame(tick)
    film.go = (i: number) => { film.p = (i + 0.001) / N; sync() }
    film.set = (x: number) => { film.p = Math.min(0.9999, Math.max(0, x)); sync() }
    return () => { cancelAnimationFrame(raf); removeEventListener('sp-run', onRun); film.subs.delete(sync); film.go = () => {}; film.set = () => {} }
  }, [])
  useChapterVideos(root, idx)
  const ti = live ? 0 : -1
  const s = SLIDES[idx].s, sg = SLIDES[idx].stage
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
        <p className="ph-pk">{String(idx + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</p>
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



/** Laptop keyboard: dark keys with real legends in a recessed well, proper row layout, faint lime backlight. */
const KROWS: { h: number; k: number[]; l: string[] }[] = [
  { h: 0.62, k: [1.5, ...Array(12).fill(1), 1.5], l: ['esc', ...Array.from({ length: 12 }, (_, i) => 'F' + (i + 1)), '\u23FB'] },
  { h: 1, k: [...Array(13).fill(1), 2], l: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'] },
  { h: 1, k: [1.5, ...Array(12).fill(1), 1.5], l: ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'] },
  { h: 1, k: [1.75, ...Array(11).fill(1), 2.25], l: ['caps lock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'] },
  { h: 1, k: [2.25, ...Array(10).fill(1), 2.75], l: ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'] },
  { h: 1, k: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1], l: ['fn', 'ctrl', 'opt', 'cmd', '', 'cmd', 'opt', '\u25C0', '', '\u25B6'] },
]
function Keys() {
  const G = 0.13, PAD = 0.28
  const out: React.ReactNode[] = []
  const key = (id: string, x: number, y: number, w: number, h: number) => (
    <rect key={id} x={x} y={y} width={w} height={h} rx={0.14} fill="url(#kb-key)" stroke="rgba(255,255,255,.16)" strokeWidth={0.025} />
  )
  const txt = (id: string, x: number, y: number, t: string, size: number) => (
    <text key={id} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontFamily="Inter,system-ui,sans-serif" fontWeight={500} fontSize={size} fill="rgba(236,243,251,.88)">{t}</text>
  )
  let y = PAD
  KROWS.forEach((row, r) => {
    let x = PAD
    row.k.forEach((kw, c) => {
      const w = kw - G, kx = x + G / 2, ky = y + G / 2, cx = kx + w / 2
      const label = row.l[c]
      if (r === 5 && c === 8) {
        // up / down: two half-height keys stacked
        const hh = (row.h - G) / 2 - G / 4
        out.push(key(`${r}-${c}a`, kx, ky, w, hh), key(`${r}-${c}b`, kx, ky + hh + G / 2, w, hh))
        out.push(txt(`${r}-${c}ta`, cx, ky + hh / 2, '\u25B2', 0.2), txt(`${r}-${c}tb`, cx, ky + hh + G / 2 + hh / 2, '\u25BC', 0.2))
      } else {
        out.push(key(`${r}-${c}`, kx, ky, w, row.h - G))
        if (label) out.push(txt(`${r}-${c}t`, cx, ky + (row.h - G) / 2, label, row.h < 1 ? 0.2 : label.length === 1 ? 0.38 : label.length <= 3 ? 0.24 : 0.19))
        // home-row bumps on F and J, like a real keyboard
        if (label === 'F' || label === 'J') out.push(<rect key={`${r}-${c}b`} x={cx - 0.14} y={ky + row.h - G - 0.16} width={0.28} height={0.04} rx={0.02} fill="rgba(236,243,251,.7)" />)
      }
      x += kw
    })
    y += row.h
  })
  return (
    <svg viewBox={`0 0 ${15 + PAD * 2} ${y + PAD}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kb-key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a424e" /><stop offset="1" stopColor="#181c22" /></linearGradient>
        <radialGradient id="kb-glow" cx=".5" cy=".5" r=".6"><stop offset="0" stopColor="#B4F02B" stopOpacity=".26" /><stop offset="1" stopColor="#B4F02B" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={15 + PAD * 2} height={y + PAD} rx={0.3} fill="#0b0e12" />
      <rect width={15 + PAD * 2} height={y + PAD} rx={0.3} fill="url(#kb-glow)" />
      {out}
    </svg>
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
      const L = document.documentElement.dataset.theme === 'light' ? LAP.light : LAP.dark
      const w = (L.w * s * 0.96) / 1.03
      el.style.setProperty('--w', w.toFixed(1) + 'px')
      el.style.setProperty('--lx', ((vw - 1672 * s) / 2 + L.cx * s).toFixed(1) + 'px')
      el.style.setProperty('--ly', ((vh - 941 * s) * FY + L.cy * s - w * 0.07).toFixed(1) + 'px')
      el.style.setProperty('--dx', (vw / 2 - ((vw - 1672 * s) / 2 + L.cx * s)).toFixed(1) + 'px')
      el.style.setProperty('--dy', (vh / 2 - ((vh - 941 * s) * FY + L.cy * s - w * 0.07)).toFixed(1) + 'px')
      el.style.setProperty('--mx', ((vw - 1672 * s) / 2 + (L.cx + L.mx * L.w) * s).toFixed(1) + 'px')
      el.style.setProperty('--my', ((vh - 941 * s) * FY + (L.cy + L.my * L.w) * s).toFixed(1) + 'px')
      el.style.setProperty('--mw', (L.w * s * 0.18).toFixed(1) + 'px')
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
        <div className="ph-bgs" aria-hidden="true"><Pic screen /></div>
        <div className="ph-veil" />

        <div className="ph-txt">
          <h1><Title /></h1>
          <p>One intelligent platform. Complete terminal control.</p>
        </div>

        <div className="ph-mouse" aria-hidden="true" />

        <div className="ph-scene">
          <div className="ph-rig">
            <div className="ph-sh" />
            <div className="ph-base"><div className="ph-key"><Keys /></div><div className="ph-pad" /></div>
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
