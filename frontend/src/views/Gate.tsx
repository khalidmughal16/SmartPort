'use client'
import { useState } from 'react'
import { ZONES, Zone } from '../lib/data'
import { Suggestion } from '../lib/logic'
import { NewContainer, actions, useStore } from '../lib/store'
import { Table } from '../components/ui'

const SIZES = ['20 ft', '40 ft', '40 ft HC', '45 ft']
const day = (v: string) => (v ? new Date(v + 'T12:00').getTime() : undefined)

/** Shared "suggest a slot" result panel used by Gate-In and Placement. */
function Result({ s, f, onDone }: { s: Suggestion | null | undefined; f: NewContainer; onDone?: () => void }) {
  if (s === undefined) return null
  if (!s) return <p>No valid stack is free in the {f.zone} zone for a {f.size} container{f.weight ? ' of ' + f.weight.toLocaleString('en-US') + ' kg' : ''} (zone, height, size and weight rules). Release a container first.</p>
  return (
    <>
      <p><b>Block {s.block}, stack {s.bay + 1}, tier {s.tier + 1}</b> in the {s.zone} zone. Extra moves: {s.e}.</p>
            <button className="btn p" onClick={async () => { if (await actions.placeContainer(f, s)) onDone?.() }}>Confirm placement</button>
    </>
  )
}

export function GateIn() {
  const [cn, setCn] = useState('')
  const [size, setSize] = useState(SIZES[2])
  const [zone, setZone] = useState<Zone>('General')
  const [co, setCo] = useState('')
  const [lv, setLv] = useState('')
  const [wt, setWt] = useState('')
  const [sugg, setSugg] = useState<Suggestion | null | undefined>(undefined)
  const f: NewContainer = { id: cn, size, zone, consignee: co, leave: day(lv), weight: wt ? Number(wt) : undefined }
  const reset = () => { setSugg(undefined); setCn(''); setCo(''); setLv(''); setWt('') }
  return (
    <div className="two">
      <div>
        <label htmlFor="cn">Container number</label>
        <input id="cn" placeholder="e.g. MSCU1234567" value={cn} onChange={(e) => { setCn(e.target.value.toUpperCase()); setSugg(undefined) }} />
        <label htmlFor="ty">Type</label>
        <select id="ty" value={size} onChange={(e) => { setSize(e.target.value); setSugg(undefined) }}>{SIZES.map((t) => <option key={t}>{t}</option>)}</select>
        <label htmlFor="zn">Cargo zone</label>
        <select id="zn" value={zone} onChange={(e) => { setZone(e.target.value as Zone); setSugg(undefined) }}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
        <label htmlFor="gw">Weight in kg (optional)</label>
        <input id="gw" type="number" min="0" max="100000" placeholder="e.g. 18000" value={wt} onChange={(e) => { setWt(e.target.value); setSugg(undefined) }} />
        <label htmlFor="gc">Consignee</label>
        <input id="gc" value={co} onChange={(e) => setCo(e.target.value)} />
        <label htmlFor="gl">Planned pick-up date (optional)</label>
        <input id="gl" type="date" value={lv} onChange={(e) => { setLv(e.target.value); setSugg(undefined) }} />
        <p><button className="btn p" onClick={async () => setSugg(await actions.suggestSlot(zone, f.leave, size, f.weight))}>Suggest slot</button></p>
      </div>
      <div className="tile" id="res">
        {sugg === undefined ? 'Suggestions appear here with the block, bay, tier and reason.' : <Result s={sugg} f={f} onDone={reset} />}
      </div>
    </div>
  )
}

export function Placement() {
  const { C } = useStore()
  const pend = C.filter((c) => c.st === 'Pending')
  const [pick, setPick] = useState<{ id: string; s: Suggestion | null } | null>(null)
  const cur = pend.find((c) => c.id === pick?.id)
  return (
    <div className="two">
      <div>
        <Table head={['Pending', 'Zone', 'Action']} rows={pend.map((c) => [c.id, c.zone, <button className="btn" onClick={async () => setPick({ id: c.id, s: await actions.suggestSlot(c.zone, c.leave, c.size, c.weight) })}>Suggest</button>])} />
      </div>
      <div className="tile" id="res">
        {pick && cur ? <Result s={pick.s} f={{ id: cur.id, size: cur.size, zone: cur.zone, leave: cur.leave, weight: cur.weight }} onDone={() => setPick(null)} /> : pend.length ? 'Pick a container to see its best slot.' : 'No containers are waiting. Add one from Containers or Gate-In.'}
      </div>
    </div>
  )
}

export function Appointments() {
  const { slots, AD, appointments } = useStore()
  return (
    <>
      <div className="tabs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <button key={d} className={AD === i ? 'on' : ''} onClick={() => actions.setDay(i)}>{d}</button>)}
      </div>
      <div className="gr">
        {slots.map((s, i) => (
          <div className="tile" key={s[0]}>
            <b>{s[0]}</b>
            <p>{s[1]} of 3 trucks</p>
            <button className={`btn ${s[1] < 3 ? 'p' : ''}`} disabled={s[1] >= 3} onClick={() => actions.bookGateSlot(i)}>{s[1] >= 3 ? 'Full' : 'Book slot'}</button>{' '}
            {s[1] > 0 && <button className="btn" onClick={() => actions.openDrawer({ kind: 'ticket', i })}>Ticket</button>}
          </div>
        ))}
      </div>
      <div className="tile" style={{ marginTop: 16 }}>
        <div className="th"><b>Upcoming appointments</b><button className="btn p" disabled={!appointments.length} onClick={actions.handleNextAppointment}>Handle next</button></div>
        <p className="sub">Handled in time order, earliest first.</p>
        {appointments.length ? (
          <Table head={['#', 'Date', 'Time', 'Container', 'Purpose', 'Client']} rows={appointments.map((a, i) => [i + 1, a.d, a.s, a.id, a.t, a.client || '-'])} />
        ) : <p>No upcoming appointments. Client bookings appear here.</p>}
      </div>
    </>
  )
}
