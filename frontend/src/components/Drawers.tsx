'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { rnd } from '../lib/data'
import { dwell, due } from '../lib/logic'
import { ZONES, Zone } from '../lib/data'
import { actions, toast, useStore } from '../lib/store'

/** Right-hand drawer: container details, gate ticket, and the add-container wizard. */
export function Drawers() {
  const { drawer, C, slots } = useStore()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && actions.closeDrawer()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [])
  if (!drawer) return null
  return createPortal(
    <div id="ov" onClick={(e) => e.target === e.currentTarget && actions.closeDrawer()}>
      <div className="dr" role="dialog" aria-modal="true" aria-label="Details">
        <button className="btn x" onClick={actions.closeDrawer}>Close</button>
        <div id="ovc" className={drawer.kind === 'detail' ? '' : 'md'}>
          {drawer.kind === 'detail' && <Detail c={C[drawer.i]} />}
          {drawer.kind === 'ticket' && <Ticket time={slots[drawer.i][0]} />}
          {drawer.kind === 'add' && <AddWizard />}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Detail({ c }: { c: ReturnType<typeof useStore>['C'][number] }) {
  const fmt = (t: number) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const ev: [string, string][] = [['Gate-in recorded', fmt(c.at)], ['Customs ' + (c.cus === 'Cleared' ? 'cleared' : 'on hold'), c.cus === 'Cleared' ? 'Cleared' : 'Pending']]
  ev.push([c.st === 'In yard' || c.st === 'Released' ? 'Placed at ' + c.slot : 'Waiting for placement', c.st === 'Pending' ? 'Pending' : 'Done'])
  if (c.rel) ev.push(['Released', fmt(c.rel)])
  return (
    <>
      <svg viewBox="0 0 240 100" width="100%" aria-hidden="true">
        <rect x="6" y="10" width="228" height="76" rx="4" fill="currentColor" opacity=".22" />
        {Array.from({ length: 19 }, (_, k) => <line key={k} x1={18 + k * 11} y1="14" x2={18 + k * 11} y2="82" stroke="currentColor" opacity=".25" />)}
        <rect x="6" y="40" width="228" height="14" fill="var(--lime)" />
        <text x="120" y="51" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0A0B0A">{c.id}</text>
        <rect x="24" y="86" width="20" height="6" fill="currentColor" /><rect x="196" y="86" width="20" height="6" fill="currentColor" />
      </svg>
      <h3>{c.id}</h3>
      <p className="sub">{c.size}, {c.zone} zone, {dwell(c)} days in yard, dues ${due(c)}{c.consignee ? ', consignee ' + c.consignee : ''}</p>
      <ol className="tl">{ev.map((x) => <li key={x[0]}><b>{x[0]}</b><span>{x[1]}</span></li>)}</ol>
    </>
  )
}

function Ticket({ time }: { time: string }) {
  const [no] = useState(() => 1000 + Math.floor(rnd() * 9000))
  const [bits] = useState(() => Array.from({ length: 49 }, () => (rnd() > 0.5 ? 1 : 0.1)))
  return (
    <div id="tick">
      <h3>Gate ticket</h3>
      <p><b>{time}</b> slot, Gate 2</p>
      <p>Ticket TK-{no}</p>
      <div className="qr">{bits.map((o, i) => <i key={i} style={{ opacity: o }} />)}</div>
      <button className="btn p x" onClick={() => print()}>Print ticket</button>
    </div>
  )
}

function AddWizard() {
  const [step, setStep] = useState(0)
  const [f, setF] = useState<{ n: string; t: string; z: Zone; cn: string; lv: string }>({ n: '', t: '40 ft HC', z: 'General', cn: '', lv: '' })
  const names = ['Details', 'Cargo', 'Review']
  const next = () => {
    if (step === 0 && !f.n.trim()) return toast('Enter a container number.', true)
    setStep(step + 1)
  }
  return (
    <>
      <h3>Add container</h3>
      <ol className="stp">{names.map((n, i) => <li key={n} className={i < step ? 'd' : i === step ? 'n' : ''}>{i + 1}. {n}</li>)}</ol>
      {step === 0 && (
        <>
          <label htmlFor="an">Container number</label>
          <input id="an" value={f.n} placeholder="e.g. MSCU1234567" onChange={(e) => setF({ ...f, n: e.target.value.toUpperCase() })} />
          <label htmlFor="at">Type</label>
          <select id="at" value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })}>{['20 ft', '40 ft', '40 ft HC', '45 ft'].map((t) => <option key={t}>{t}</option>)}</select>
        </>
      )}
      {step === 1 && (
        <>
          <label htmlFor="az">Cargo zone</label>
          <select id="az" value={f.z} onChange={(e) => setF({ ...f, z: e.target.value as Zone })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
          <label htmlFor="ac">Consignee</label>
          <input id="ac" value={f.cn} placeholder="Company name" onChange={(e) => setF({ ...f, cn: e.target.value })} />
          <label htmlFor="al">Planned pick-up date (optional)</label>
          <input id="al" type="date" value={f.lv} onChange={(e) => setF({ ...f, lv: e.target.value })} />
        </>
      )}
      {step === 2 && (
        <>
          <p><b>{f.n}</b>, {f.t}</p>
          <p className="sub">{f.z} zone. Consignee: {f.cn || 'not set'}. Pick-up: {f.lv || 'not set'}. It will wait in Placement until you assign a slot.</p>
        </>
      )}
      <p style={{ marginTop: 14 }}>
        {step > 0 && <><button className="btn" onClick={() => setStep(step - 1)}>Back</button>{' '}</>}
        {step < 2 ? <button className="btn p" onClick={next}>Next</button> : <button className="btn p" onClick={() => actions.addContainer({ id: f.n, size: f.t, zone: f.z, consignee: f.cn, leave: f.lv ? new Date(f.lv + 'T12:00').getTime() : undefined })}>Add container</button>}
      </p>
    </>
  )
}
