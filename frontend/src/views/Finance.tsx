'use client'
import { useState } from 'react'
import { P, R, Role, staffPages, YARD_BLOCKS, BAYS } from '../lib/data'
import { due, dwell, perWeekday, stackAt } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { Bars, Pill, Table } from '../components/ui'

export function CustomsBilling() {
  const { C } = useStore()
  return (
    <Table head={['Container', 'Customs', 'Dwell', 'Dues', 'Actions']} rows={C.map((c, i) => [
      c.id, <Pill k={c.cus === 'Cleared' ? 'ok' : 'w'}>{c.cus}</Pill>, dwell(c) + ' d', '$' + due(c) + (c.paid ? ' (paid)' : ''),
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
  // Expected extra crane moves: containers stacked above one that leaves earlier.
  const extra = YARD_BLOCKS.map((b): [string, number] => {
    let n = 0
    for (let bay = 0; bay < BAYS; bay++) {
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
          <b>Expected extra crane moves in the current stacks</b>
          <p className="sub">Counts containers sitting on top of one that leaves earlier. Needs planned pick-up dates on containers.</p>
          <Bars max={Math.max(1, ...extra.map((e) => e[1]))} rows={extra.map(([k, v]) => [k, v, v === 0])} />
        </div>
      )}
      {tab === 1 && <Table head={['Day (this week)', 'In', 'Out']} rows={days.map((d, i) => [d, inn[i], out[i]])} />}
      {tab === 2 && (
        <div className="tile">
          <b>Storage revenue</b>
          <Bars max={Math.max(1, total)} rows={[['Accrued', total], ['Paid', paid, true], ['Open', total - paid]]} />
          <p className="sub">Storage dues only: 5 free days, then $45 per day, from your container records.</p>
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
