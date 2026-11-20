'use client'
import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IC, P, R, RD, Role } from '../lib/data'
import { actions } from '../lib/store'
import { ROLES_BG } from '../lib/rolesBg'
import { Icon } from './ui'
import roleA from '../assets/role-A.webp'
import roleG from '../assets/role-G.webp'
import roleY from '../assets/role-Y.webp'
import roleD from '../assets/role-D.webp'
import roleB from '../assets/role-B.webp'

const BI: Partial<Record<Role, string>> = { A: roleA.src, G: roleG.src, Y: roleY.src, D: roleD.src, B: roleB.src }
const KEYS = (Object.keys(R) as Role[]).filter((k) => BI[k])
const N = KEYS.length
const pg = (k: Role) => P.filter((p) => p.roles.includes(k))
const counts = KEYS.map((k) => pg(k).length)
const mn = Math.min(...counts), mx = Math.max(...counts)
const tier = (i: number) => (mx === mn ? 5 : 1 + Math.round((4 * (counts[i] - mn)) / (mx - mn)))
const acc = (i: number) => counts[i] + ' pages'
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

interface Engine { step(n: number): void; to(i: number): void; setPause(x: boolean): void; setAct(i: number): void; open(i: number, btn: HTMLElement): void; modal(x: boolean): void }

/** The 3D conveyor belt of role cards, plus the details dialog. The belt maths runs in an effect; React owns the markup. */
export function Roles() {
  const router = useRouter()
  const belt = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const chip = useRef<HTMLDivElement>(null)
  const pl = useRef<HTMLButtonElement[]>([])
  const pn = useRef<HTMLDivElement[]>([])
  const dlg = useRef<HTMLDivElement>(null)
  const dlgImg = useRef<HTMLImageElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const eng = useRef<Engine | null>(null)
  const state = useRef({ cur: 0, from: null as HTMLElement | null, fly: null as HTMLImageElement | null })
  const [act, setActState] = useState(-1)
  const [paused, setPausedState] = useState(reduce)
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState(false)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    const B = belt.current as HTMLDivElement, S = svg.current as SVGSVGElement, chipEl = chip.current as HTMLDivElement
    let W = 0, H = 0, L = 1, a = 0, R0 = 1, k2 = 1, d = 100, cx = 0, cy = 0, off = 0, v = 0
    const sp = reduce ? 0 : 34
    let goal: number | null = null, activeI = -1
    const lift = KEYS.map(() => 0)
    let auto = true, paused = reduce, vis = true, modal = false, moved = false, raf = 0, last = 0, ti = 0, hov = -1, foc = -1
    let drag: { x: number; id: number; t: number; cap: boolean } | null = null
    const ease = (x: number, t: number) => 1 - Math.exp(-x * t)

    function pos(p: number) {
      p = ((p % L) + L) % L
      let gx: number, gz: number
      const s = 2 * a, u = Math.PI * R0
      if (p < s) { gx = -a + p; gz = -R0 } else if (p < s + u) { const t = (p - s) / R0; gx = a + R0 * Math.sin(t); gz = -R0 * Math.cos(t) }
      else if (p < 2 * s + u) { gx = a - (p - s - u); gz = R0 } else { const t = (p - 2 * s - u) / R0; gx = -a - R0 * Math.sin(t); gz = R0 * Math.cos(t) }
      const t = (gz + R0) / (2 * R0)
      return { x: cx + gx, y: cy + gz * k2, t, s: 0.55 + 0.45 * t }
    }
    function measure() {
      W = B.clientWidth; H = B.clientHeight
      if (!W) return false
      d = Math.max(84, Math.min(W * 0.27, 172)); R0 = Math.min(W * 0.2, H * 0.5); a = Math.max(0, W / 2 - R0 - d * 0.52)
      const ry = Math.min(H * 0.34, R0 * 0.82); k2 = ry / R0; L = 4 * a + 2 * Math.PI * R0; cx = W / 2; cy = H * 0.46
      const pts: string[] = []
      for (let i = 0; i <= 120; i++) { const q = pos((i / 120) * L); pts.push((i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)) }
      const D = pts.join(' ') + 'Z'
      S.setAttribute('viewBox', `0 0 ${W} ${H}`)
      S.innerHTML = `<defs><filter id="gl" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs><path d="${D}" fill="none" stroke="rgba(198,241,53,.6)" stroke-width="12" filter="url(#gl)"/><path d="${D}" fill="none" stroke="rgba(198,241,53,.95)" stroke-width="2.5" stroke-linejoin="round"/><g transform="translate(${cx} ${cy}) scale(.93 .86) translate(${-cx} ${-cy})"><path d="${D}" fill="none" stroke="rgba(198,241,53,.55)" stroke-width="1.6"/></g><path id="bd" d="${D}" fill="none" stroke="rgba(230,255,140,.9)" stroke-width="3" stroke-dasharray="2 26" stroke-linecap="round"/>`
      return true
    }
    const frontP = (i: number) => 3 * a + Math.PI * R0 - (i * L) / N
    const to = (i: number) => { if (i < 0) return; const t = frontP(i); const g = t + Math.round((off - t) / L) * L; if (reduce) { off = g; goal = null } else goal = g }
    const setAct = (i: number) => { activeI = i; setActState(i) }
    function draw() {
      const bd = S.querySelector('#bd') as SVGPathElement | null
      if (bd) bd.style.strokeDashoffset = String(-off * 0.9)
      pl.current.forEach((b, i) => {
        const q = pos(off + (i * L) / N)
        lift[i] += ((i === activeI ? 1 : 0) - lift[i]) * (reduce ? 1 : 0.22)
        const l = lift[i], s = q.s * (1 + 0.12 * l), z = Math.round(q.t * 100) + (l > 0.05 ? 150 : 0)
        b.style.width = b.style.height = d + 'px'; b.style.zIndex = String(z)
        b.style.transform = `translate(${(q.x - d / 2).toFixed(1)}px,${(q.y - d / 2 - l * 16 * q.s).toFixed(1)}px) scale(${s.toFixed(3)})`
        const e = pn.current[i]
        e.style.zIndex = String(z); e.style.opacity = i === activeI ? '0' : '1'
        e.style.transform = `translate(${q.x.toFixed(1)}px,${(q.y + (d * s) / 2 + 2).toFixed(1)}px) translateX(-50%)`
        if (i === activeI) chipEl.style.transform = `translate(${q.x.toFixed(1)}px,${(q.y + (d * s) / 2 + 10).toFixed(1)}px) translateX(-50%)`
      })
    }
    function loop(t: number) {
      raf = 0
      if (!vis || document.hidden || !W) return
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t
      if (drag) { /* the pointer drives it */ }
      else if (goal != null) { const df = goal - off; off += df * ease(dt, 5); v = 0; if (Math.abs(df) < 0.4) { off = goal; goal = null } }
      else { const hold = modal || paused || hov >= 0 || foc >= 0; v += ((hold ? 0 : sp) - v) * ease(dt, hold ? 6 : 1.2); if (!reduce) off += v * dt }
      if (auto && !paused && !modal && hov < 0 && foc < 0) { ti += dt; if (ti > 2.6) { ti = 0; setAct((activeI + 1) % N) } }
      draw(); raf = requestAnimationFrame(loop)
    }
    const kick = () => { if (!raf && vis && !document.hidden && W) { last = performance.now(); raf = requestAnimationFrame(loop) } }
    const stopAuto = () => { if (auto) { auto = false; activeI = hov >= 0 ? hov : foc >= 0 ? foc : -1; setActState(activeI) } }

    const ro = new ResizeObserver(() => { if (measure()) { draw(); kick() } }); ro.observe(B)
    const io = new IntersectionObserver((e) => { vis = e[0].isIntersecting; kick() }, { threshold: 0.05 }); io.observe(B)
    const onVis = () => kick(); document.addEventListener('visibilitychange', onVis)

    const cleanups: (() => void)[] = []
    const on = (el: EventTarget, ev: string, fn: (e: any) => void) => { el.addEventListener(ev, fn); cleanups.push(() => el.removeEventListener(ev, fn)) }
    pl.current.forEach((b, i) => {
      on(b, 'pointerenter', (e: PointerEvent) => { if (e.pointerType === 'touch' || drag) return; hov = i; stopAuto(); setAct(i); kick() })
      on(b, 'pointerleave', () => { if (hov === i) { hov = -1; if (!auto) setAct(foc >= 0 ? foc : -1) } })
      on(b, 'focus', () => { foc = i; stopAuto(); setAct(i); kick() })
      on(b, 'blur', () => { if (foc === i) { foc = -1; if (!auto && hov < 0) setAct(-1) } })
      on(b, 'click', () => { if (moved) { moved = false; return } stopAuto(); eng.current?.open(i, b) })
    })
    on(B, 'pointerdown', (e: PointerEvent) => { if (e.button) return; stopAuto(); drag = { x: e.clientX, id: e.pointerId, t: performance.now(), cap: false }; moved = false; goal = null })
    on(B, 'pointermove', (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x
      if (!drag.cap && Math.abs(dx) > 6) { drag.cap = true; moved = true; B.classList.add('dg'); try { B.setPointerCapture(e.pointerId) } catch { /* ignore */ } }
      if (drag.cap) {
        const n = performance.now(), dt = Math.max(0.008, (n - drag.t) / 1000)
        if (!reduce) { off -= dx; v = 0.6 * v + 0.4 * (-dx / dt) }
        drag.x = e.clientX; drag.t = n; v = Math.max(-900, Math.min(900, v)); draw()
      }
    })
    const up = () => { if (!drag) return; drag = null; B.classList.remove('dg'); if (moved) { setTimeout(() => (moved = false), 0); if (activeI < 0 && hov >= 0) setAct(hov) } kick() }
    on(B, 'pointerup', up); on(B, 'pointercancel', up)
    const step = (n: number) => { stopAuto(); const c = activeI < 0 ? 0 : (activeI + n + N) % N; setAct(c); to(c); kick() }
    on(B, 'keydown', (e: globalThis.KeyboardEvent) => {
      if (modal) return
      const m: Record<string, () => void> = { ArrowLeft: () => step(-1), ArrowRight: () => step(1), Home: () => { stopAuto(); setAct(0); to(0); kick() }, End: () => { stopAuto(); setAct(N - 1); to(N - 1); kick() } }
      if (m[e.key]) { e.preventDefault(); m[e.key]() }
    })

    eng.current = {
      step, to: (i) => { to(i); kick() }, setAct,
      setPause: (x) => { paused = x; setPausedState(x); kick() },
      modal: (x) => { modal = x; kick() },
      open: (i, btn) => {
        const s = state.current; s.from = btn; modal = true; s.cur = i; setCur(i); setAct(i); setOpen(true)
        requestAnimationFrame(() => {
          setOn(true)
          const di = dlgImg.current as HTMLImageElement
          di.style.visibility = 'hidden'
          flyTo(BI[KEYS[i]] as string, rect(btn.querySelector('img') as HTMLElement), rect(di), () => { di.style.visibility = '' })
          closeBtn.current?.focus(); kick()
        })
      },
    }
    if (measure()) { draw(); kick() }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); cleanups.forEach((f) => f()) }
  }, [])

  /* ---- dialog ---- */
  const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height } }
  function flyTo(src: string, r1: ReturnType<typeof rect>, r2: ReturnType<typeof rect>, done: () => void) {
    if (reduce) return done()
    const s = state.current
    s.fly?.remove()
    const img = (s.fly = document.createElement('img'))
    img.className = 'fly'; img.src = src; document.body.appendChild(img)
    const f = (r: typeof r1) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    Object.assign(img.style, f(r1))
    img.animate([f(r1), f(r2)], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.then(() => { s.fly?.remove(); s.fly = null; done() }, () => {})
  }
  const fill = (i: number) => { state.current.cur = i; setCur(i) }
  const closeD = () => {
    if (!open) return
    const s = state.current, di = dlgImg.current as HTMLImageElement, el = pl.current[s.cur]
    setOn(false); di.style.visibility = 'hidden'
    flyTo(BI[KEYS[s.cur]] as string, rect(di), rect(el.querySelector('img') as HTMLElement), () => {})
    setTimeout(() => { setOpen(false); eng.current?.modal(false); di.style.visibility = ''; el.focus({ preventScroll: true }) }, reduce ? 0 : 380)
  }
  const go = (n: number) => { const c = (state.current.cur + n + N) % N; fill(c); eng.current?.setAct(c); eng.current?.to(c) }
  const togglePause = () => eng.current?.setPause(!paused)
  const onDlgKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeD(); return }
    if (e.key === 'ArrowLeft') go(-1)
    if (e.key === 'ArrowRight') go(1)
    if (e.key === 'Tab') {
      const f = [...(dlg.current as HTMLElement).querySelectorAll('button')].filter((x) => !x.disabled), i = f.indexOf(document.activeElement as HTMLButtonElement)
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
  }

  const k = KEYS[cur]
  const ordered = KEYS.map((_, i) => ({ i, t: tier(i) })).sort((a, b) => b.t - a.t)
  return (
    <section className="sec" id="roles">
      <svg className="rbg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ROLES_BG }} />
      <div className="rb">
        <div className="rbt">
          <p className="sub" style={{ marginBottom: 10, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12 }}><b style={{ color: 'var(--lime)', fontWeight: 600 }}>Roles</b> . Access belt</p>
          <h2>Five roles. One <em>shared mission</em>.</h2>
          <p className="sub">Hover to stop the belt, flick to spin it, pick a role to see what it can open.</p>
          <ul className="rl" id="rlg" aria-label="Access levels">
            {ordered.map((o) => <li key={o.i}><span className="lr"><span className="li"><Icon d={IC[KEYS[o.i]]} /></span><b>{R[KEYS[o.i]]}</b></span><span>{acc(o.i)}</span></li>)}
          </ul>
          <Link className="btn p" href="/app/login">Enter Terminal</Link>
        </div>
        <div>
          <div className="belt" id="belt" ref={belt} tabIndex={0} role="group" aria-label="Role conveyor belt">
            <svg className="bsv" ref={svg} aria-hidden="true" />
            <div className={`bchip${act >= 0 ? ' on' : ''}`} ref={chip} aria-hidden="true">{act >= 0 && <><b>{R[KEYS[act]]}</b><span>{acc(act)}</span></>}</div>
            {KEYS.map((key, i) => (
              <button key={key} type="button" className="pl" ref={(e) => { if (e) pl.current[i] = e }} aria-label={`${R[key]}, ${acc(i)}. Open details`}><img alt="" src={BI[key]} /></button>
            ))}
            {KEYS.map((key, i) => <div key={key} className="pn" ref={(e) => { if (e) pn.current[i] = e }} aria-hidden="true"><i />{R[key]}</div>)}
          </div>
          <div className="rbc">
            <button className="btn" type="button" onClick={() => eng.current?.step(-1)}>Previous role</button>
            <button className="btn" type="button" aria-pressed={paused} onClick={togglePause}><i className="pi" aria-hidden="true" /><span>{paused ? 'Resume belt' : 'Pause belt'}</span></button>
            <button className="btn" type="button" onClick={() => eng.current?.step(1)}>Next role</button>
          </div>
        </div>
      </div>
      {open && (
        <div className={`rdlg${on ? ' on' : ''}`} id="rdlg" ref={dlg} onKeyDown={onDlgKey} onClick={(e) => e.target === e.currentTarget && closeD()}>
          <div className="rdb" role="dialog" aria-modal="true" aria-labelledby="rdn">
            <button className="btn rdx" type="button" ref={closeBtn} onClick={closeD}>Close</button>
            <div className="rdi"><img id="rdi" ref={dlgImg} alt="" src={BI[k]} /></div>
            <div className="rdt">
              <small>{String(cur + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</small>
              <h3 id="rdn">{R[k]}</h3>
              <p>{RD[k]}</p>
              <div className="rdch">{pg(k).map((p) => <span key={p.id}>{p.label}</span>)}</div>
              <p>Access: {acc(cur)} (level {tier(cur)} of 5)</p>
              <div className="rdbn">
                <button className="btn" type="button" onClick={() => go(-1)}>Previous role</button>
                <button className="btn" type="button" aria-pressed={paused} onClick={togglePause}>{paused ? 'Resume belt' : 'Pause belt'}</button>
                <button className="btn" type="button" onClick={() => go(1)}>Next role</button>
              </div>
              <div className="rdbn"><button className="btn p" type="button" onClick={() => { actions.setNext(null); setOpen(false); eng.current?.modal(false); router.push('/app/login') }}>Sign in as this role</button></div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
