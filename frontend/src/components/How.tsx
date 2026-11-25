'use client'
import { useEffect, useRef, useState } from 'react'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches
const STEPS = [
  { t: 'Arrive', em: 'Vessel in, cargo moving.', p: 'The vessel is discharged and the cargo is shuttled by rail and truck to the dry port.', l: ['Vessel tracker with live ETA', 'Rail shuttle route and truck count'], c: ['On vessel', 'Berth B-3', '0', '0'] },
  { t: 'Clear', em: 'Gate and customs, logged.', p: 'Trucks check in at the gate and documents go through customs, with a full audit trail.', l: ['Driver and plate verified', 'Release blocked until documents clear'], c: ['Customs hold', 'Customs desk', '0', '1'] },
  { t: 'Place', em: 'The optimizer picks the slot.', p: 'Every free slot is scored, and the container goes to the best Bay, Row and Tier.', l: ['No container buried under another', 'Fewer extra moves later'], c: ['Slot assigned', 'Bay 7, tier 2', '0', '2'] },
  { t: 'Release', em: 'Paid, booked, out the gate.', p: 'Dues are paid, the truck is booked and the container leaves the gate.', l: ['Free days and storage charges applied', 'Gate-out recorded in the log'], c: ['Released', 'Gate-out', '0', '5'] },
]
const DUR = 4200

export function How() {
  const [cur, setCur] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  const st = useRef({ cur: 0, t0: 0, on: false, hold: false })

  const render = (i: number) => { st.current.cur = i; st.current.t0 = performance.now(); setCur(i) }
  useEffect(() => {
    const s = st.current, el = box.current as HTMLDivElement
    let raf = 0
    const tick = (n: number) => {
      raf = 0
      if (!s.on) return
      if (!s.hold) {
        const p = Math.min(1, (n - s.t0) / DUR)
        if (bar.current) bar.current.style.width = ((s.cur + p) / STEPS.length) * 100 + '%'
        if (p >= 1) render((s.cur + 1) % STEPS.length)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver((e) => {
      s.on = e[0].isIntersecting && !RM
      if (s.on && !raf) { s.t0 = performance.now(); raf = requestAnimationFrame(tick) }
      if (RM && bar.current) bar.current.style.width = '25%'
    }, { threshold: 0.25 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  const s = STEPS[cur]
  return (
    <section className="sec" id="how">
      <p className="k">How it works</p>
      <h2>From arrival to release in <em>four steps</em>.</h2>
      <div className="sx-how" ref={box} onMouseEnter={() => (st.current.hold = true)} onMouseLeave={() => { st.current.hold = false; st.current.t0 = performance.now() }}>
        <ol className="sx-steps">
          {STEPS.map((x, i) => (
            <li key={x.t} className={i === cur ? 'on' : i < cur ? 'done' : ''}>
              <button aria-label={`Step ${i + 1}: ${x.t}`} onClick={() => { st.current.hold = true; render(i); if (bar.current) bar.current.style.width = ((i + 1) / STEPS.length) * 100 + '%' }}>
                <span className="n">0{i + 1}</span><b>{x.t}</b>
              </button>
            </li>
          ))}
        </ol>
        <div className="sx-track" aria-hidden="true"><i ref={bar as React.RefObject<HTMLElement>} id="sxp" /></div>
        <div className="sx-hp" aria-live="polite" key={cur}>
          <div className="sx-fade"><h3>{s.t}. <em>{s.em}</em></h3><p>{s.p}</p><ul>{s.l.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="sx-card sx-fade">
            <h4>GMT-0042 <span>demo</span></h4>
            {['Status', 'Location', 'Extra moves', 'Dwell days'].map((k, j) => <div className="r" key={k}><span>{k}</span><span>{s.c[j]}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  )
}
