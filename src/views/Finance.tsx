'use client'
import { useState } from 'react'
import { P, R, Role, staffPages } from '../lib/data'
import { due, simulate } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { Bars, Pill, Table } from '../components/ui'

export function CustomsBilling() {
  const { C } = useStore()
  return (
    <Table head={['Container', 'Customs', 'Dwell', 'Dues', 'Actions']} rows={C.map((c, i) => [
      c.id, <Pill k={c.cus === 'Cleared' ? 'ok' : 'w'}>{c.cus}</Pill>, c.d + ' d', '$' + due(c) + (c.paid ? ' (paid)' : ''),
      <>
        <button className="btn" onClick={() => actions.clearCustoms(i)}>Clear</button>{' '}
        <button className="btn" onClick={() => actions.pay(i)}>Pay</button>{' '}
        <button className="btn p" onClick={() => actions.release(i)}>Release</button>
      </>,
    ])} />
  )
}

export function Reports() {
  const [tab, setTab] = useState(0)
  const [sim, setSim] = useState<[number, number] | null>(null)
  return (
    <>
      <div className="tabs" role="tablist">
        {['Placement', 'Gate activity', 'Revenue'].map((n, i) => (
          <button key={n} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{n}</button>
        ))}
      </div>
      {tab === 1 && <Table head={['Day', 'In', 'Out']} rows={[['Mon', 42, 38], ['Tue', 51, 47], ['Wed', 39, 44]]} />}
      {tab === 2 && <Bars max={600} rows={[['Storage', 320], ['Handling', 540, true], ['Gate fees', 180]]} />}
      <div hidden={tab !== 0}>
        <button className="btn p" onClick={() => setSim(simulate())}>{sim ? 'Run again' : 'Run the comparison'}</button>
        {sim ? (
          <div className="tile" style={{ marginTop: 14 }}>
            <Bars max={Math.max(1, sim[0])} rows={[['Random', sim[0]], ['Smart', sim[1], true]]} />
            <p><b>{sim[0] - sim[1]}</b> extra moves saved over 40 containers ({Math.round((1 - sim[1] / Math.max(1, sim[0])) * 100)}% fewer).</p>
          </div>
        ) : <p className="sub" style={{ marginTop: 14 }}>Compare random placement with the smart slot rule on 40 containers.</p>}
      </div>
    </>
  )
}

export function Users() {
  const cols = staffPages.slice(0, 7)
  return (
    <Table head={['Role', 'Name', ...cols.map((p) => p.label)]}
      rows={(Object.keys(R) as Role[]).map((k) => [R[k], 'Demo ' + R[k], ...cols.map((p) => (p.roles.includes(k) ? 'Yes' : '-'))])} />
  )
}
export { P }
