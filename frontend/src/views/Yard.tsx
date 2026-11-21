'use client'
import { useState } from 'react'
import { actions, useStore } from '../lib/store'
import { Pill, Table } from '../components/ui'

export function CraneTasks() {
  const { tasks } = useStore()
  const [text, setText] = useState('')
  const [p, setP] = useState(3)
  const sorted = [...tasks].sort((a, b) => b.p - a.p)
  const add = () => { actions.addTask(text, p); if (text.trim()) setText('') }
  return (
    <>
      <div className="tile cl-c">
        <b>Add a crane task</b>
        <div className="cl-r">
          <div className="f" style={{ flex: 1 }}><label htmlFor="tt">Task</label><input id="tt" value={text} placeholder="e.g. Lift MSCU1234567 to truck" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /></div>
          <div className="f"><label htmlFor="tp">Priority</label><select id="tp" value={p} onChange={(e) => setP(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'P' + n}</option>)}</select></div>
          <button className="btn p" onClick={add}>Add task</button>
        </div>
      </div>
      <Table head={['Priority', 'Task', '']} rows={sorted.map((t) => [
        <Pill k={t.p >= 5 ? 'x' : t.p >= 4 ? 'w' : ''}>{'P' + t.p}</Pill>, t.text,
        <><button className="btn" onClick={() => actions.escalate(t.id)}>Escalate</button>{' '}<button className="btn p" onClick={() => actions.finishTask(t.id)}>Done</button></>,
      ])} />
    </>
  )
}
