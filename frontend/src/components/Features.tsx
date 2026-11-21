'use client'
import { ReactNode, useEffect, useState } from 'react'
import { Icon } from './ui'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches
const rnd = (n: number) => Math.floor(Math.random() * n)
const pad = (n: number) => String(n).padStart(2, '0')
export const MAN = [22, 18, 25, 20, 19], SM = [7, 6, 8, 6, 6], DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>

const F = [
  { t: 'Smart placement', s: 'Scores every free slot so no container is buried under another.', i: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.29 7 12 12l8.71-5M7.5 4.27l9 5.15' },
  { t: 'Customs control', s: 'No release until documents are cleared and dues are paid.', i: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4' },
  { t: 'Gate flow', s: 'Check in trucks, book slots and print tickets in seconds.', i: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z' },
  { t: 'Crane dispatch', s: 'A priority queue puts the most urgent pickup first.', i: 'M4 21h16M7 21V5h11M7 5 3 10M18 5v9M16 14h4v4h-4z' },
  { t: 'Billing', s: 'Free days, daily storage charges and invoices, automatic.', i: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11' },
  { t: 'Reports', s: 'Compare random and smart placement and export the numbers.', i: 'M3 3v18h18M7 14v4M12 9v9M17 5v13' },
]

const Head = ({ t, p, children }: { t: string; p: string; children?: ReactNode }) => (
  <div className="sx-dh"><div><h3>{t}</h3><p>{p}</p></div><div className="sx-acts">{children}</div></div>
)

/* 0 - slot optimizer */
function Placement() {
  const base = [3, 1, 4, 2, 0, 3, 2]
  const [H, setH] = useState(base)
  const [tot, setTot] = useState({ r: 0, s: 0 })
  const [mark, setMark] = useState<{ c: number; cls: string } | null>(null)
  const [scores, setScores] = useState<{ sc: number[]; best: number } | null>(null)
  const [msg, setMsg] = useState<ReactNode>('Pick a placement method.')
  const [busy, setBusy] = useState(false)
  const open = () => H.map((h, i) => (h < 5 ? i : -1)).filter((i) => i >= 0)
  const random = () => {
    const o = open(); if (!o.length) return setMsg('Yard is full. Press Reset.')
    const c = o[rnd(o.length)], moves = H[c]
    setH(H.map((h, i) => (i === c ? h + 1 : h))); setMark({ c, cls: 'bad' }); setScores(null)
    setTot({ ...tot, r: tot.r + moves })
    setMsg(<>Random: dropped on Bay {c + 1}, a stack of {moves}. <b>{moves} extra moves</b> later.</>)
  }
  const smart = () => {
    if (!open().length) return setMsg('Yard is full. Press Reset.')
    const sc = H.map((h) => (h >= 5 ? 0 : 1 - h / 5))
    setBusy(true); setScores({ sc, best: -1 }); setMsg('Scoring every free slot...')
    setTimeout(() => {
      let best = 0; sc.forEach((v, i) => { if (v > sc[best]) best = i })
      const moves = H[best]
      setH(H.map((h, i) => (i === best ? h + 1 : h))); setMark({ c: best, cls: 'new' }); setScores({ sc, best })
      setTot((t) => ({ ...t, s: t.s + moves }))
      setMsg(<>Optimizer: best slot is Bay {best + 1}, score {sc[best].toFixed(2)}. <b>{moves} extra moves</b> later.</>)
      setBusy(false)
    }, RM ? 0 : 650)
  }
  const reset = () => { setH(base); setTot({ r: 0, s: 0 }); setMark(null); setScores(null); setMsg('Yard reset.') }
  return (
    <>
      <Head t="Yard slot optimizer" p="Drop a container two ways and compare the extra moves it will cost later.">
        <button className="sx-btn" disabled={busy} onClick={random}>Place randomly</button>
        <button className="sx-btn p" disabled={busy} onClick={smart}>Place with optimizer</button>
        <button className="sx-btn" aria-label="Reset yard" onClick={reset}>Reset</button>
      </Head>
      <div className="sx-yard">
        {H.map((h, c) => <div className="sx-bay" key={c}>{Array.from({ length: h }, (_, k) => <div key={k} className={`b${mark && mark.c === c && k === h - 1 ? ' ' + mark.cls : ''}`} />)}</div>)}
      </div>
      <div className="sx-lbls">
        {H.map((_, c) => <span key={c} className={scores && c === scores.best ? 'best' : ''}>Bay {c + 1}<b>{scores ? scores.sc[c].toFixed(2) : '\u00a0'}</b></span>)}
      </div>
      <div className="sx-msg" aria-live="polite">{msg}</div>
      <div className="sx-stat">
        <div><b>{tot.r}</b><span>Extra moves, random</span></div>
        <div><b style={{ color: 'var(--lime)' }}>{tot.s}</b><span>Extra moves, optimizer</span></div>
      </div>
    </>
  )
}

/* 1 - customs desk */
function Customs() {
  const init: [string, boolean][] = [['Bill of lading', true], ['Commercial invoice', false], ['Packing list', false], ['Duty and storage dues paid', false]]
  const [docs, setDocs] = useState(init)
  const [msg, setMsg] = useState<ReactNode>('')
  const [shake, setShake] = useState(0)
  const left = docs.filter((d) => !d[1])
  const release = () => {
    if (left.length) { setMsg(<><b style={{ color: 'var(--bad)' }}>Blocked.</b> {left.length} item{left.length > 1 ? 's' : ''} still pending: {left.map((d) => d[0].toLowerCase()).join(', ')}.</>); setShake(shake + 1) }
    else setMsg(<><b style={{ color: 'var(--lime)' }}>Released.</b> GMT-0042 is cleared for gate-out. Audit trail saved.</>)
  }
  return (
    <>
      <Head t="Customs desk" p="Container GMT-0042. Tap each item to clear it, then try to release."><span className={`sx-pill ${left.length ? 'x' : 'ok'}`}>{left.length ? 'Hold' : 'Cleared'}</span></Head>
      <div className={`sx-list${shake ? ' sx-shake' : ''}`} key={shake}>
        {docs.map((d, i) => (
          <button key={d[0]} className={`sx-row${d[1] ? ' on' : ''}`} role="checkbox" aria-checked={d[1]} onClick={() => { setDocs(docs.map((x, k) => (k === i ? [x[0], !x[1]] : x))); setMsg('') }}>
            <span className="ck"><Check /></span><span className="t">{d[0]}</span><span className="r">{d[1] ? 'done' : 'pending'}</span>
          </button>
        ))}
      </div>
      <div className="sx-msg" aria-live="polite">{msg}</div>
      <div className="sx-acts">
        <button className="sx-btn p" onClick={release}>Release container</button>
        <button className="sx-btn" onClick={() => { setDocs(init); setMsg('') }}>Reset</button>
      </div>
    </>
  )
}

/* 2 - gate check-in */
let truckNo = 42
function Gate() {
  const [step, setStep] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<ReactNode>('')
  const [ticket, setTicket] = useState<ReactNode>(<div className="sx-empty">No ticket yet. Press the button to check in a truck.</div>)
  const go = () => {
    if (busy) return
    setBusy(true); setStep(-1); setTicket(<div className="sx-empty">Processing...</div>)
    const id = ++truckNo, truck = 'T-' + (10 + rnd(89))
    const lines = ['Reading plate ' + truck + '...', 'Driver verified.', 'Booking the next free slot...', 'Printing ticket...']
    lines.forEach((m, i) => setTimeout(() => {
      setStep(i); setMsg(m)
      if (i === 3) {
        const d = new Date(Date.now() + (8 + rnd(20)) * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
        const bits = Array.from({ length: 49 }, (_, k) => ((k % 7 < 2 && k < 14) || k === 6 || k === 42 || k === 48 || Math.random() > 0.5 ? 1 : 0))
        setTicket(
          <div className="sx-tk sx-fade">
            <div className="sx-qr" aria-hidden="true">{bits.map((b, k) => <i key={k} className={b ? '' : 'o'} />)}</div>
            <dl><dt>Container</dt><dd>GMT-00{id}</dd><dt>Truck</dt><dd>{truck}</dd><dt>Bay</dt><dd>Gate 2, Lane {1 + rnd(3)}</dd><dt>Slot</dt><dd>{pad(d.getHours())}:{pad(d.getMinutes())}</dd></dl>
          </div>,
        )
        setMsg(<><b>Checked in</b> in under 3 seconds.</>); setBusy(false)
      }
    }, RM ? i * 10 : (i + 1) * 480))
  }
  return (
    <>
      <Head t="Gate 2 check-in" p="Run a truck through the gate and print its ticket."><button className="sx-btn p" disabled={busy} onClick={go}>Check in next truck</button></Head>
      <div className="sx-steps2">{['Plate scan', 'Driver check', 'Slot booked', 'Ticket printed'].map((x, i) => <div key={x} className={i <= step ? 'on' : ''}>{x}</div>)}</div>
      <div>{ticket}</div>
      <div className="sx-msg" aria-live="polite">{msg}</div>
    </>
  )
}

/* 3 - crane queue */
type Job = { id: number; u: number }
function Crane() {
  const [q, setQ] = useState<Job[]>([{ id: 42, u: 1 }, { id: 17, u: 0 }, { id: 31, u: 0 }, { id: 9, u: 0 }, { id: 21, u: 0 }])
  const [going, setGoing] = useState(false)
  const [msg, setMsg] = useState<ReactNode>('Queue is sorted by priority.')
  const dispatch = () => {
    if (!q.length || going) return
    setGoing(true); setMsg(<>Crane {1 + rnd(3)} picking <b>GMT-00{pad(q[0].id)}</b> for Gate 2.</>)
    setTimeout(() => {
      const n = q.slice(1); while (n.length < 5) n.push({ id: 10 + rnd(89), u: 0 })
      setQ(n); setGoing(false)
    }, RM ? 0 : 340)
  }
  const rush = () => {
    const id = 10 + rnd(89)
    setQ([{ id, u: 1 }, ...q.filter((x) => x.id !== id)].slice(0, 5)); setMsg(<>Rush pickup <b>GMT-00{pad(id)}</b> moved to P1.</>)
  }
  return (
    <>
      <Head t="Crane dispatch queue" p="Most urgent first. Add a rush job and watch it jump the line.">
        <button className="sx-btn" onClick={rush}>Add urgent pickup</button><button className="sx-btn p" onClick={dispatch}>Dispatch next</button>
      </Head>
      <div className="sx-list">
        {q.map((x, i) => (
          <div key={x.id} className={`sx-row${i === 0 ? ' on' : ''}${i === 0 && going ? ' go' : ''}`}>
            <span className="ck">{i === 0 && <Check />}</span>
            <span className="t">GMT-00{pad(x.id)}{x.u ? <span className="sx-pill w" style={{ marginLeft: 6 }}>rush</span> : null}</span>
            <span className="r">P{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="sx-msg" aria-live="polite">{msg}</div>
    </>
  )
}

/* 4 - storage invoice */
function Billing() {
  const [d, setD] = useState(3)
  const rate = 25, free = 5, c = Math.max(0, d - free)
  return (
    <>
      <Head t="Storage invoice" p="Drag to change how long the container has been in the yard." />
      <div>
        <label htmlFor="sxdays" className="sx-mut" style={{ fontSize: 14 }}>Days in yard: <b style={{ color: 'var(--fg)' }}>{d}</b></label>
        <input className="sx-rng" id="sxdays" type="range" min={1} max={14} value={d} onChange={(e) => setD(+e.target.value)} />
      </div>
      <div className="sx-seg" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} className={i < Math.min(d, free) ? 'f' : i < d ? 'c' : ''} />)}</div>
      <div className="sx-msg" aria-live="polite">
        {c ? <><b style={{ color: 'var(--warn)' }}>{c} day{c > 1 ? 's' : ''} over</b> the free period. Storage is now charged.</> : <>Within the <b>{free} free days</b>. No charge yet.</>}
      </div>
      <div className="sx-inv">
        <div><span>Free days</span><span>{Math.min(d, free)} of {free}</span></div>
        <div><span>Chargeable days</span><span>{c}</span></div>
        <div><span>Rate per day</span><span>${rate}</span></div>
        <div><span>Total due</span><span style={{ color: c ? 'var(--warn)' : 'var(--lime)' }}>${c * rate}</span></div>
      </div>
    </>
  )
}

/* 5 - placement report */
function Reports() {
  const [m, setM] = useState(2)
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    setGrown(false)
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
    return () => cancelAnimationFrame(r)
  }, [m])
  const pc = Math.round((1 - sum(SM) / sum(MAN)) * 100)
  const exportCsv = () => {
    const csv = 'day,random_extra_moves,smart_extra_moves\n' + DAYS.map((d, i) => `${d},${MAN[i]},${SM[i]}`).join('\n') + '\n'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'smartport-placement-report.csv'
    document.body.appendChild(a); a.click(); a.remove()
  }
  const h = (v: number) => (grown ? (v / 28) * 100 + '%' : '0%')
  return (
    <>
      <Head t="Placement report" p="Extra crane moves per day, random versus smart.">
        <div className="sx-seg2" role="group" aria-label="Series">{['Random', 'Smart', 'Compare'].map((x, i) => <button key={x} aria-pressed={m === i} onClick={() => setM(i)}>{x}</button>)}</div>
        <button className="sx-btn" onClick={exportCsv}>Export CSV</button>
      </Head>
      <div className="sx-cols">
        {DAYS.map((d, i) => (
          <div className="sx-col" key={d}>
            <div className={`sx-bar${m === 1 ? ' hide' : ''}`} style={{ height: h(MAN[i]), display: m === 1 ? 'none' : undefined }}><em>{MAN[i]}</em></div>
            <div className="sx-bar s" style={{ height: h(SM[i]), display: m === 0 ? 'none' : undefined }}><em>{SM[i]}</em></div>
          </div>
        ))}
      </div>
      <div className="sx-xl">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="sx-dh">
        <div className="sx-big">{m === 0 ? sum(MAN) + ' moves' : m === 1 ? sum(SM) + ' moves' : pc + '% fewer'}</div>
        <p className="sx-mut">{m === 0 ? 'Random placement, Mon to Fri.' : m === 1 ? 'Smart placement, Mon to Fri.' : `Smart ${sum(SM)} moves vs random ${sum(MAN)} this week.`}</p>
      </div>
    </>
  )
}

const demos = [Placement, Customs, Gate, Crane, Billing, Reports]

export function Features() {
  const [cur, setCur] = useState(0)
  const Demo = demos[cur]
  const key = (e: React.KeyboardEvent, i: number) => {
    const to = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (i + 1) % 6 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (i + 5) % 6 : -1
    if (to < 0) return
    e.preventDefault(); setCur(to); document.getElementById('sxt' + to)?.focus()
  }
  return (
    <section className="sec" id="features">
      <p className="k">What SmartPort does</p>
      <h2>Everything a dry port needs, in <em>one terminal</em>.</h2>
      <div className="sx-ft">
        <div className="sx-tabs" role="tablist" aria-label="Modules">
          {F.map((f, i) => (
            <button key={f.t} role="tab" id={'sxt' + i} aria-selected={cur === i} aria-controls="sxd" onClick={() => setCur(i)} onKeyDown={(e) => key(e, i)}>
              <Icon d={f.i} cls="sx-i" /><span><b>{f.t}</b><small>{f.s}</small></span>
            </button>
          ))}
        </div>
        <div className="sx-demo sx-fade" id="sxd" role="tabpanel" aria-labelledby={'sxt' + cur} key={cur}><Demo /></div>
      </div>
    </section>
  )
}
