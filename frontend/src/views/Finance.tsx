'use client'
import { useState } from 'react'
import { FREE_DAYS, P, R, Role, staffPages, YARD_BLOCKS, pkr } from '../lib/data'
import { due, dwell, perWeekday, stackAt } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { Bars, Pill, Table } from '../components/ui'

export function CustomsBilling() {
  const { C } = useStore()
  return (
    <Table head={['Container', 'Customs', 'Dwell', 'Dues', 'Actions']} rows={C.map((c, i) => [
      c.id, <Pill k={c.cus === 'Cleared' ? 'ok' : 'w'}>{c.cus}</Pill>, dwell(c) + ' d', pkr(due(c)) + (c.paid ? ' (paid)' : ''),
      <>
        <button className="btn" onClick={() => actions.clearCustoms(i)}>Clear</button>{' '}
        <button className="btn" onClick={() => actions.pay(i)}>Pay</button>{' '}
        <button className="btn p" onClick={() => actions.release(i)}>Release</button>
      </>,
    ])} />
  )
}

export function Reports() {
  const { C } = useStore()
  const [tab, setTab] = useState(0)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const inn = perWeekday(C.map((c) => c.at)), out = perWeekday(C.filter((c) => c.rel).map((c) => c.rel as number))
  // Blockers: containers stacked above one that leaves earlier (each one is an extra move later).
  const extra = YARD_BLOCKS.map((b): [string, number] => {
    let n = 0
    for (let bay = 0; bay < b.stacks; bay++) {
      const st = stackAt(C, b.id, bay)
      st.forEach((c, i) => { if (c.leave) n += st.slice(i + 1).filter((x) => (x.leave ?? Infinity) > (c.leave as number)).length })
    }
    return [b.id, n]
  })
  const total = C.reduce((s, c) => s + due(c), 0), paid = C.reduce((s, c) => s + (c.paid ? due(c) : 0), 0)
  return (
    <>
      <div className="tabs" role="tablist">
        {['Placement', 'Gate activity', 'Revenue'].map((n, i) => (
          <button key={n} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{n}</button>
        ))}
      </div>
      {tab === 0 && (
        <div className="tile">
          <b>Blockers (extra moves) in the current stacks</b>
          <p className="sub">Counts containers sitting on top of one that leaves earlier. Needs planned pick-up dates on containers.</p>
          <Bars max={Math.max(1, ...extra.map((e) => e[1]))} rows={extra.map(([k, v]) => [k, v, v === 0])} />
        </div>
      )}
      {tab === 1 && <Table head={['Day (this week)', 'In', 'Out']} rows={days.map((d, i) => [d, inn[i], out[i]])} />}
      {tab === 2 && (
        <div className="tile">
          <b>Storage revenue</b>
          <Bars max={Math.max(1, total)} rows={[['Accrued ' + pkr(total), total], ['Paid ' + pkr(paid), paid, true], ['Open ' + pkr(total - paid), total - paid]]} />
          <p className="sub">Storage dues only, in PKR: {FREE_DAYS} free days, then chargeable days x the daily tariff for the container size and cargo type.</p>
        </div>
      )}
    </>
  )
}

export function Users() {
  const { users } = useStore()
  const cols = staffPages.slice(0, 7)
  return (
    <Table head={['Role', 'Name', 'Email', ...cols.map((p) => p.label)]}
      rows={users.map((u) => [R[u.r], u.n, u.e, ...cols.map((p) => (p.roles.includes(u.r) ? 'Yes' : '-'))])} />
  )
}
export { P }
