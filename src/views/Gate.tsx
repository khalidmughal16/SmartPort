'use client'
import { useState } from 'react'
import { rnd } from '../lib/data'
import { Suggestion, suggest } from '../lib/logic'
import { actions, useStore } from '../lib/store'
import { Table } from '../components/ui'

/** Shared "suggest a slot" result panel used by Gate-In and Placement. */
function Result({ s, name, onDone }: { s: Suggestion | null | undefined; name: string; onDone?: () => void }) {
  if (s === undefined) return null
  if (!s) return <p>All stacks are at maximum height. Free a slot first.</p>
  return (
    <>
      <p><b>Bay {s.col + 1}, tier {s.tier + 1}</b> in the {s.zone}. Extra moves: {s.e}. Reason: the stack with the fewest containers that leave earlier than this one.</p>
      <button className="btn p" onClick={() => { actions.placeContainer(name, s); onDone?.() }}>Confirm placement</button>
    </>
  )
}

export function GateIn() {
  const { Y } = useStore()
  const [cn, setCn] = useState('')
  const [type, setType] = useState('40 ft HC')
  const [hz, setHz] = useState(false)
  const [sugg, setSugg] = useState<Suggestion | null | undefined>(undefined)
  return (
    <div className="two">
      <div>
        <label htmlFor="cn">Container number</label>
        <input id="cn" placeholder="GMT-0060" value={cn} onChange={(e) => setCn(e.target.value)} />
        <label htmlFor="ty">Type</label>
        <select id="ty" value={type} onChange={(e) => setType(e.target.value)}><option>40 ft HC</option><option>20 ft</option><option>Reefer</option></select>
        <label><input type="checkbox" id="hz" style={{ marginRight: 8 }} checked={hz} onChange={(e) => setHz(e.target.checked)} />Hazardous cargo</label>
        <p><button className="btn p" onClick={() => setSugg(suggest(Y, 1 + Math.floor(rnd() * 10), hz))}>Suggest slot</button></p>
      </div>
      <div className="tile" id="res">
        {sugg === undefined ? 'Suggestions appear here with the bay, tier and reason.' : <Result s={sugg} name={cn.trim() || 'GMT-0060'} onDone={() => setSugg(undefined)} />}
      </div>
    </div>
  )
}

export function Placement() {
  const { Y, pend } = useStore()
  const [pick, setPick] = useState<{ p: number; s: Suggestion | null } | null>(null)
  return (
    <div className="two">
      <div>
        <Table head={['Pending', 'Action']} rows={pend.map((p, i) => [p, <button className="btn" onClick={() => setPick({ p: i, s: suggest(Y, 1 + Math.floor(rnd() * 10)) })}>Suggest</button>])} />
      </div>
      <div className="tile" id="res">
        {pick ? <Result s={pick.s} name={pend[pick.p]} onDone={() => setPick(null)} /> : 'Pick a container to see its best slot.'}
      </div>
    </div>
  )
}

export function Appointments() {
  const { slots, AD } = useStore()
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
    </>
  )
}
