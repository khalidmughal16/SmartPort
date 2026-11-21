'use client'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { DAYS, MAN, SM } from './Features'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches
const rnd = (n: number) => Math.floor(Math.random() * n)
const pad = (n: number) => String(n).padStart(2, '0')
const KPIS = [
  { l: 'Containers in yard', v: 212, f: (v: number) => String(v) }, { l: 'Past free days', v: 3, f: (v: number) => String(v) },
  { l: 'Gate-ins today', v: 12, f: (v: number) => String(v) }, { l: 'Storage dues open', v: 1350, f: (v: number) => '$' + v.toLocaleString('en-US') },
]
const SN = ['working', 'idle', 'maintenance'], SC = ['ok', '', 'x']
const gmt = () => 'GMT-00' + pad(10 + rnd(89))
const event = (): ReactNode => {
  const id = gmt()
  return [<>{id} placed in <b>Bay {1 + rnd(9)}, tier {1 + rnd(3)}</b></>, <>{id} checked in at <b>Gate {1 + rnd(3)}</b></>, <>{id} cleared by <b>customs</b></>, <>{id} released, <b>gate-out</b></>][rnd(4)]
}
const stamp = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) }

export function Preview() {
  const win = useRef<HTMLDivElement>(null)
  const [vals, setVals] = useState(KPIS.map((k) => k.v))
  const [shown, setShown] = useState(KPIS.map(() => 0)) // animated count-up values
  const [flash, setFlash] = useState<{ i: number; n: number }>({ i: -1, n: 0 })
  const [showM, setShowM] = useState(true), [showS, setShowS] = useState(true)
  const [grown, setGrown] = useState(false)
  const [cranes, setCranes] = useState([{ n: 'Crane 1', s: 0, u: 82 }, { n: 'Crane 2', s: 0, u: 64 }, { n: 'Crane 3', s: 1, u: 0 }, { n: 'Crane 4', s: 2, u: 0 }])
  const [feed, setFeed] = useState<[string, ReactNode][]>([])
  const live = useRef(false), counted = useRef(false), valsRef = useRef(vals)
  valsRef.current = vals
  const log = (m: ReactNode) => setFeed((f) => [[stamp(), m] as [string, ReactNode], ...f].slice(0, 4))
  const bump = (i: number, fn: (v: number) => number) => { setVals((v) => v.map((x, k) => (k === i ? fn(x) : x))); setFlash((f) => ({ i, n: f.n + 1 })) }

  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
    return () => cancelAnimationFrame(r)
  }, [showM, showS])

  useEffect(() => { setFeed([0, 1, 2].map(() => [stamp(), event()] as [string, ReactNode])) }, [])
  useEffect(() => {
    const el = win.current as HTMLDivElement
    const io = new IntersectionObserver((e) => {
      live.current = e[0].isIntersecting
      if (live.current && !counted.current) {
        counted.current = true
        if (RM) return setShown(valsRef.current.map(() => 1))
        const s = performance.now()
        const step = (n: number) => { const p = Math.min(1, (n - s) / 1100); setShown(valsRef.current.map(() => 1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step) }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.25 })
    io.observe(el)
    const iv = setInterval(() => {
      if (!live.current || document.hidden || RM) return
      const r = rnd(3)
      if (r === 0) { bump(2, (v) => v + 1); bump(0, (v) => v + 1); log(<>{gmt()} checked in at <b>Gate {1 + rnd(3)}</b></>) }
      else if (r === 1) { bump(0, (v) => Math.max(150, v - 1)); log(<>{gmt()} released, <b>gate-out</b></>) }
      else { bump(3, (v) => v + 25); log(event()) }
    }, 3800)
    return () => { io.disconnect(); clearInterval(iv) }
  }, [])

  const h = (v: number) => (grown ? (v / 28) * 100 + '%' : '0%')
  return (
    <section className="sec" id="preview">
      <p className="k">Inside the terminal</p>
      <h2>One dashboard. <em>Every move</em> visible.</h2>
      <div className="sx-win" ref={win}>
        <div className="sx-bar0"><i /><i /><i /><span style={{ marginLeft: 6 }}>smartport / dashboard</span><span className="lv">Live demo</span></div>
        <div className="sx-kpis">
          {KPIS.map((k, i) => (
            <div key={i + ':' + (flash.i === i ? flash.n : 0)} className={`sx-kpi${flash.i === i ? ' sxfl' : ''}`}>
              <b>{k.f(Math.round(vals[i] * shown[i]))}</b><span>{k.l}</span>
            </div>
          ))}
        </div>
        <div className="sx-grid">
          <div className="sx-p">
            <h4>Extra moves: manual vs optimized
              <span className="sx-lg">
                <button className="m" aria-pressed={showM} onClick={() => setShowM(!showM)}>Manual</button>
                <button className="s" aria-pressed={showS} onClick={() => setShowS(!showS)}>Smart</button>
              </span>
            </h4>
            <div className="sx-cols" style={{ height: 200 }}>
              {DAYS.map((d, i) => (
                <div className="sx-col" key={d} tabIndex={0} aria-label={`${d}: manual ${MAN[i]}, smart ${SM[i]}`}>
                  <div className="tt">{d}: <b>{MAN[i]}</b> manual, <b style={{ color: 'var(--lime)' }}>{SM[i]}</b> smart</div>
                  <div className={`sx-bar${showM ? '' : ' hide'}`} style={{ height: h(MAN[i]) }}><em>{showM ? MAN[i] : ''}</em></div>
                  <div className={`sx-bar s${showS ? '' : ' hide'}`} style={{ height: h(SM[i]) }}><em>{showS ? SM[i] : ''}</em></div>
                </div>
              ))}
            </div>
            <div className="sx-xl">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
          </div>
          <div className="sx-p">
            <h4>Crane status<span className="sx-mut" style={{ fontWeight: 400, fontSize: 13 }}>{cranes.filter((c) => c.s === 0).length} of 4 active</span></h4>
            <div className="sx-cr">
              {cranes.map((c, i) => (
                <button key={c.n} className={c.s === 2 ? 'x' : ''} aria-label={`${c.n} ${SN[c.s]}. Press to change.`}
                  onClick={() => {
                    const s = (c.s + 1) % 3
                    setCranes(cranes.map((x, k) => (k === i ? { ...x, s, u: s === 0 ? 55 + rnd(40) : 0 } : x)))
                    log(<>{c.n} set to <b>{SN[s]}</b></>)
                  }}>
                  <span><b style={{ fontWeight: 600 }}>{c.n}</b></span>
                  <span className={`sx-pill ${SC[c.s]}`}>{SN[c.s]}</span>
                  <span className="u"><i style={{ width: `${c.s === 0 ? c.u : c.s === 2 ? 100 : 0}%` }} /></span>
                </button>
              ))}
            </div>
            <p className="sx-hint">Tap a crane to change its status.</p>
          </div>
        </div>
        <div className="sx-p" style={{ marginTop: 12 }}>
          <h4>Live activity</h4>
          <div className="sx-feed">{feed.map((x, i) => <div key={i}><time>{x[0]}</time><span>{x[1]}</span></div>)}</div>
        </div>
      </div>
    </section>
  )
}
