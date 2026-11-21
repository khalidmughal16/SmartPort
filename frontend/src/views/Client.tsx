'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Container, pkr } from '../lib/data'
import { due, dwell, settled } from '../lib/logic'
import { actions, currentUser, useStore } from '../lib/store'
import { Kp, Pill, Table } from '../components/ui'

const useWatchlist = (): { u: ReturnType<typeof currentUser>; L: Container[] } => {
  const s = useStore()
  const u = currentUser(s)
  return { u, L: (u.watch || []).map((id) => s.C.find((c) => c.id === id)).filter(Boolean) as Container[] }
}
const owed = (L: Container[]) => L.reduce((s, c) => s + (settled(c) ? 0 : due(c)), 0)

export function Overview() {
  const { u, L } = useWatchlist()
  const B = u.slots || []
  return (
    <>
      <p className="sub">Welcome{u.n ? ', ' + u.n.split(' ')[0] : ''}{u.co ? ` (${u.co})` : ''}. Here is where your containers stand today.</p>
      <Kp items={[[L.length, 'Containers tracked'], [L.filter((c) => c.cus !== 'Cleared').length, 'Customs holds'], [pkr(owed(L)), 'Outstanding dues'], [B.length, 'Gate bookings']]} />
      <div className="tile cl-c">
        <b>Quick actions</b>
        <div className="cl-r">
          <Link className="btn p" href="/app/shipments">Track a container</Link>
          <Link className="btn" href="/app/book-slot">Book a gate slot</Link>
          <Link className="btn" href="/app/my-billing">Pay dues</Link>
        </div>
      </div>
      {L.length > 0 && <Table head={['Container', 'Customs', 'Dues', 'Days in yard']} rows={L.map((c) => [c.id, c.cus, settled(c) ? pkr(0) : pkr(due(c)), dwell(c)])} />}
    </>
  )
}

export function Shipments() {
  const { L } = useWatchlist()
  const [v, setV] = useState('')
  const stages = ['Discharged', 'Customs cleared', 'Dues paid', 'Pickup booked']
  return (
    <>
      <div className="tile cl-c">
        <b>Track a container</b>
        <div className="cl-r">
          <div className="f"><label htmlFor="tkn">Container number</label><input id="tkn" placeholder="Container number" autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} /></div>
          <button className="btn p" onClick={() => { actions.addShipment(v); setV('') }}>Add to my shipments</button>
        </div>
      </div>
      {L.length ? L.map((c) => {
        const dn = 1 + (c.cus === 'Cleared' ? 1 : 0) + (c.cus === 'Cleared' && settled(c) ? 1 : 0) + (c.bk ? 1 : 0)
        return (
          <div className="tile cl-c" key={c.id}>
            <div className="cl-h">
              <b>{c.id}</b>
              <span>
                <Pill k={c.cus === 'Cleared' ? 'ok' : 'w'}>{c.cus === 'Cleared' ? 'Customs cleared' : 'Customs hold'}</Pill>{' '}
                {settled(c) ? <Pill k="ok">No dues</Pill> : <Pill k="x">{'Dues ' + pkr(due(c))}</Pill>}
              </span>
            </div>
            <div className="stp" role="img" aria-label={'Progress: ' + stages[dn - 1]}>{stages.map((s, i) => <span key={s} className={i < dn ? 'on' : ''} />)}</div>
            <p className="sub">{stages[dn - 1]}. {c.zone} zone, {c.slot}, day {dwell(c)} in yard.</p>
            <button className="btn" onClick={() => actions.removeShipment(c.id)}>Remove</button>
          </div>
        )
      }) : <p className="sub">No shipments yet. Add a container number above .</p>}
    </>
  )
}

export function BookSlot() {
  const { C } = useStore()
  const { u } = useWatchlist()
  const L = (u.watch || []).filter((id) => C.some((c) => c.id === id)), B = u.slots || []
  const today = new Date().toISOString().slice(0, 10)
  const times = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '13:00-14:00', '14:00-15:00', '15:00-16:00']
  const [f, setF] = useState({ id: '', t: 'Pickup', d: today, s: times[0] })
  const [err, setErr] = useState('')
  if (!L.length) return (<><p className="sub">Add a container in My Shipments first, then book a slot.</p><Link className="btn p" href="/app/shipments">Go to My Shipments</Link></>)
  const id = L.includes(f.id) ? f.id : L[0]
  return (
    <>
      <div className="tile cl-c">
        <b>Book a gate slot</b>
        <div className="cl-g">
          <div className="f"><label htmlFor="kc">Container</label><select id="kc" value={id} onChange={(e) => setF({ ...f, id: e.target.value })}>{L.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div className="f"><label htmlFor="kt">Purpose</label><select id="kt" value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })}><option>Pickup</option><option>Drop-off</option></select></div>
          <div className="f"><label htmlFor="kd">Date</label><input id="kd" type="date" min={today} value={f.d} onChange={(e) => setF({ ...f, d: e.target.value })} /></div>
          <div className="f"><label htmlFor="ks">Time</label><select id="ks" value={f.s} onChange={(e) => setF({ ...f, s: e.target.value })}>{times.map((x) => <option key={x}>{x}</option>)}</select></div>
        </div>
        <p id="er" className="er" role="alert">{err}</p>
        <button className="btn p" onClick={async () => setErr((await actions.bookClientSlot({ id, t: f.t, d: f.d, s: f.s })) || '')}>Book slot</button>
      </div>
      <div className="tile cl-c">
        <b>My bookings</b>
        {B.length ? B.map((x, i) => (
          <p className="cl-b" key={i}><span>{x.id} &middot; {x.t} &middot; {x.d} {x.s}</span><button className="btn" onClick={() => actions.cancelBooking(i)}>Cancel</button></p>
        )) : <p className="sub">No bookings yet.</p>}
      </div>
    </>
  )
}

export function MyBilling() {
  const { L } = useWatchlist()
  return (
    <>
      <Kp items={[[pkr(owed(L)), 'Outstanding dues'], [L.length, 'Containers tracked'], [L.filter((c) => c.cus === 'Cleared' && settled(c)).length, 'Ready for pickup']]} />
      <Table head={['Container', 'Days in yard', 'Customs', 'Dues', 'Action']} rows={L.map((c) => [
        c.id, dwell(c), c.cus, settled(c) ? pkr(0) : pkr(due(c)),
        settled(c) ? <Pill k="ok">Settled</Pill> : <button className="btn p" onClick={() => actions.payClient(c.id)}>Pay {pkr(due(c))}</button>,
      ])} />
    </>
  )
}
