'use client'
import { useState } from 'react'
import { astar, newObstacles } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { Pill, Table } from '../components/ui'

export function CraneTasks() {
  const { tasks } = useStore()
  const sorted = tasks.map((t, i) => ({ t, i })).sort((a, b) => b.t[1] - a.t[1])
  return (
    <Table head={['Priority', 'Task', '']} rows={sorted.map(({ t, i }) => [
      <Pill k={t[1] >= 5 ? 'x' : t[1] >= 4 ? 'w' : ''}>{'P' + t[1]}</Pill>, t[0],
      <button className="btn" onClick={() => actions.escalate(i)}>Escalate</button>,
    ])} />
  )
}

export function Router() {
  const [ob, setOb] = useState(newObstacles)
  const r = astar(ob)
  return (
    <>
      <div className="grid">{ob.map((o, i) => <i key={i} className={o ? 'o' : r.path.has(i) ? 'p' : ''} />)}</div>
      <p className="sub" style={{ marginTop: 12 }}>{r.steps < 1e9 ? 'Shortest clear path: ' + r.steps + ' steps.' : 'No clear path. Generate new obstacles.'}</p>
      <button className="btn p" onClick={() => setOb(newObstacles())}>New obstacles</button>
    </>
  )
}
