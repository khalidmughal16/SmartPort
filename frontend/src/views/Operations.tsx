'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { BAYS, CAPACITY, Container, MAX_TIER, YARD_BLOCKS, ZONES, Zone } from '../lib/data'
import { ago, dwell, inYard, perWeekday, stackAt, Suggestion } from '../lib/logic'
import { actions, toast, useStore } from '../lib/store'
import { Bars, Icon, Pill, Table } from '../components/ui'

const zoneOf = (s: string): Zone => (/reef|cold|chill/i.test(s) ? 'Refrigerated' : /haz|dg|imo/i.test(s) ? 'Hazardous' : 'General')
const PATHS = {
  box: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  truck: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  warn: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
}

/* ---------- shared yard grid ---------- */
export function YardGrid({ C, compact, sel, mark, onPick }: {
  C: Container[]; compact?: boolean; sel?: { block: string; bay: number } | null
  mark?: { block: string; bay: number } | null; onPick?: (block: string, bay: number) => void
}) {
  return (
    <div className={`yg ${compact ? 'sm' : ''}`} role="group" aria-label="Yard blocks">
      {YARD_BLOCKS.map((b) => (
        <div className="yb" key={b.id}>
          <span className="ybl">{b.id}</span>
          <div className="ybr">
            {Array.from({ length: BAYS }, (_, bay) => {
              const s = stackAt(C, b.id, bay)
              const on = sel?.block === b.id && sel.bay === bay, mk = mark?.block === b.id && mark.bay === bay
              const cls = `yc z${b.zone[0]} ${s.length ? 'f' : ''} ${on ? 'on' : ''} ${mk ? 'mk' : ''}`
              const inner = Array.from({ length: MAX_TIER }, (_, t) => <i key={t} className={t < s.length ? 'o' : ''} />)
              if (compact || !onPick) return <div key={bay} className={cls}>{inner}</div>
              const top = s[s.length - 1]
              return (
                <button key={bay} className={cls} aria-label={`${b.id} bay ${bay + 1}: ${s.length} of ${MAX_TIER} containers`} onClick={() => onPick(b.id, bay)}>
                  {inner}
                  {on && (
                    <span className="ytt" role="status">
                      {top ? <><b>{top.id}</b><small>{top.size} &bull; In yard</small><small>Stack: {bay + 1} &bull; Tier: {top.tier! + 1}</small></> : <><b>{b.id} &bull; bay {bay + 1}</b><small>Empty stack</small></>}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Dashboard ---------- */
function TrackBox() {
  const { C } = useStore()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<'idle' | 'none' | number>('idle')
  const track = () => {
    const i = C.findIndex((x) => x.id === q.trim().toUpperCase())
    setRes(i < 0 ? 'none' : i)
  }
  const c = typeof res === 'number' ? C[res] : null
  const done = c ? (c.st === 'Released' ? 4 : c.st === 'In yard' ? 3 : c.cus === 'Cleared' ? 2 : 1) : 0
  return (
    <div className="tile">
      <b>Track a container</b>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input id="tk" placeholder="Container number" aria-label="Container number" style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && track()} />
        <button className="btn p" onClick={track}>Track</button>
      </div>
      <div id="tkr">
        {res === 'none' && <p className="sub">No container found with that number.</p>}
        {c && (
          <>
            <ol className="stp">
              {['Gate-in', 'Customs', 'Yard', 'Released'].map((n, i) => <li key={n} className={i < done ? 'd' : i === done ? 'n' : ''}>{n}</li>)}
            </ol>
            <p className="sub">{c.id}: {c.size}, {c.zone} zone, slot {c.slot}, dwell {dwell(c)} days.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Donut({ pct }: { pct: number }) {
  const r = 52, len = 2 * Math.PI * r
  return (
    <svg className="dn" viewBox="0 0 130 130" role="img" aria-label={`Yard occupancy ${pct}%`}>
      <circle cx="65" cy="65" r={r} className="dn-t" />
      {pct > 0 && <circle cx="65" cy="65" r={r} className="dn-v" strokeDasharray={`${(len * Math.min(100, pct)) / 100} ${len}`} transform="rotate(-90 65 65)" />}
      <text x="65" y="72" textAnchor="middle" className="dn-x">{pct}%</text>
    </svg>
  )
}

const MOVE_PILL: Record<string, string> = { 'Gate-in': 'ok', Placed: 'ok', 'Gate-out': '', Customs: 'w', Payment: 'ok' }

export function Dashboard() {
  const { C, log, vessels } = useStore()
  const live = C.filter((c) => c.st !== 'Released')
  const yard = inYard(C)
  const now = Date.now()
  const pct = Math.round((yard.length / CAPACITY) * 100)
  const overdue = live.filter((c) => dwell(c, now) > 5).length
  const todayIn = C.filter((c) => new Date(c.at).toDateString() === new Date(now).toDateString()).length
  const hold = live.filter((c) => c.cus === 'Hold').length
  const share = (z: Zone) => (yard.length ? Math.round((yard.filter((c) => c.zone === z).length / yard.length) * 100) : 0)
  const wk = perWeekday(C.map((c) => c.at), now), wmax = Math.max(1, ...wk)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const moves = log.filter((l) => l.id).slice(0, 5)
  const nextV = vessels.filter((v) => v.eta >= now - 3600000).slice(0, 3)
  const kp: [string, number | string, string, string][] = [
    ['k1', live.length, 'Containers in terminal', PATHS.box], ['k2', overdue, 'Overdue containers', PATHS.clock],
    ['k3', todayIn, 'Gate-ins today', PATHS.truck], ['k4', hold, 'Customs pending', PATHS.warn],
  ]
  return (
    <>
      {!C.length && (
        <div className="tile empty">
          <b>No data yet</b>
          <p className="sub">Everything on this page is calculated from your own records. Add your first container to start.</p>
          <button className="btn p" onClick={() => actions.openDrawer({ kind: 'add' })}>Add container</button>{' '}
          <Link className="btn" href="/app/gate-in">Gate-In a truck</Link>{' '}
          <Link className="btn" href="/app/vessels">Add a vessel</Link>
        </div>
      )}
      <div className="kp kpi">
        {kp.map(([c, v, l, d]) => (
          <div className={`tile ${c}`} key={l}><span className="ki"><Icon d={d} cls="ic" /></span><div><b>{v}</b><span>{l}</span></div></div>
        ))}
      </div>
      <div className="dg">
        <div className="tile">
          <b>Yard Occupancy</b>
          <div className="occ">
            <Donut pct={pct} />
            <ul className="lg">
              {ZONES.map((z) => <li key={z}><i className={`z${z[0]}`} />{z}<span>{share(z)}%</span></li>)}
              <li className="cap">{yard.length} of {CAPACITY} slots used</li>
            </ul>
          </div>
        </div>
        <div className="tile">
          <b>Recent Container Movements</b>
          <div className="mv">
            {moves.length ? moves.map((l) => (
              <div key={l.t + (l.id || '')}><span>{l.id}</span><small>{ago(l.t, now)}</small><Pill k={MOVE_PILL[l.kind] ?? ''}>{l.kind}</Pill></div>
            )) : <p className="sub">No movements yet.</p>}
          </div>
        </div>
        <div className="tile">
          <div className="th"><b>Yard Map</b><Link href="/app/yard-map" className="lnk">View Full Map &rarr;</Link></div>
          <YardGrid C={C} compact />
        </div>
      </div>
      <div className="dg2">
        <div className="tile">
          <b>Gate Activity</b><small className="sub"> gate-ins this week</small>
          <div className="ga">
            {wk.map((n, i) => (
              <div key={i}><em>{n || ''}</em><i style={{ height: `${Math.max(n ? 8 : 3, (n / wmax) * 100)}%` }} className={n ? 'on' : ''} /><span>{days[i]}</span></div>
            ))}
          </div>
        </div>
        <div className="tile">
          <b>Latest Activity</b>
          <ul className="la">
            {log.length ? log.slice(0, 5).map((l) => <li key={l.t + l.m}><span>{l.m}</span><small>{new Date(l.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></li>) : <li className="sub">Nothing has happened yet.</li>}
          </ul>
        </div>
      </div>
      <div className="dg2">
        <div className="tile">
          <div className="th"><b>Vessels approaching</b><Link href="/app/vessels" className="lnk">Manage &rarr;</Link></div>
          {nextV.length ? nextV.map((v) => <div className="bar" key={v.id}><span style={{ width: 130 }}>{v.name}</span><i className="l" style={{ width: '18%' }} />{new Date(v.eta).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} &middot; {v.berth}</div>) : <p className="sub">No vessels scheduled.</p>}
        </div>
        <TrackBox />
      </div>
    </>
  )
}

/* ---------- Yard map ---------- */
export function YardMap() {
  const { C } = useStore()
  const [sel, setSel] = useState<{ block: string; bay: number } | null>(null)
  const [mark, setMark] = useState<{ block: string; bay: number } | null>(null)
  const [q, setQ] = useState('')
  const [zone, setZone] = useState<Zone>('General')
  const [msg, setMsg] = useState('')
  const blk = YARD_BLOCKS.find((b) => b.id === sel?.block) ?? YARD_BLOCKS[0]
  const zb = YARD_BLOCKS.filter((b) => b.zone === blk.zone)
  const used = zb.reduce((n, b) => n + Array.from({ length: BAYS }, (_, i) => stackAt(C, b.id, i).length).reduce((a, c) => a + c, 0), 0)
  const cap = Math.round((used / (zb.length * BAYS * MAX_TIER)) * 100)
  const find = () => {
    const c = C.find((x) => x.id === q.trim().toUpperCase() && x.st === 'In yard')
    if (!c) { setMsg('Not in the yard: ' + (q.trim() || 'enter a number')); return }
    setSel({ block: c.block!, bay: c.bay! }); setMark(null); setMsg(c.id + ' is at ' + c.slot)
  }
  const sug = async () => {
    const s: Suggestion | null = await actions.suggestSlot(zone)
    if (!s) { setMsg('No free slot left in the ' + zone + ' zone.'); setMark(null); return }
    setMark({ block: s.block, bay: s.bay }); setSel(null); setMsg(`Best slot: ${s.block}, bay ${s.bay + 1}, tier ${s.tier + 1}`)
  }
  return (
    <div className="ym">
      <div className="tile ym-map">
        <div className="th">
          <b>Block layout</b>
          <ul className="lg row">{ZONES.map((z) => <li key={z}><i className={`z${z[0]}`} />{z}</li>)}</ul>
        </div>
        <YardGrid C={C} sel={sel} mark={mark} onPick={(block, bay) => { setSel({ block, bay }); setMark(null); setMsg('') }} />
        {!inYard(C).length && <p className="sub">The yard is empty. Place a container from Gate-In or Placement and it appears here.</p>}
      </div>
      <div className="ym-side">
        <div className="tile">
          <b><Icon d={PATHS.box} cls="ic in" /> {blk.zone} Zone</b>
          <dl className="zi">
            <dt>Blocks</dt><dd>{zb.map((b) => b.id).join(', ')}</dd>
            <dt>Stacks</dt><dd>{zb.length * BAYS}</dd>
            <dt>Capacity</dt><dd>{cap}%</dd>
          </dl>
          <div className="pb"><i style={{ width: cap + '%' }} /></div>
        </div>
        <div className="tile">
          <b>Quick Actions</b>
          <div className="qa">
            <input placeholder="Container number" aria-label="Find container" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} />
            <button className="btn" onClick={find}>Find Container</button>
            <select aria-label="Zone" value={zone} onChange={(e) => setZone(e.target.value as Zone)}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
            <button className="btn" onClick={sug}>Suggest Location</button>
          </div>
          {msg && <p className="sub" role="status">{msg}</p>}
        </div>
      </div>
    </div>
  )
}

/* ---------- Containers ---------- */
export function Containers() {
  const { C } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const rows = C.map((c, i) => ({ c, i })).filter(({ c }) => {
    const text = [c.id, c.size, c.zone, c.slot, dwell(c) + ' d', c.st, c.consignee || ''].join(' ').toLowerCase()
    return text.includes(q.toLowerCase())
  })
  return (
    <>
      <input id="flt" placeholder="Filter by number, zone or status" aria-label="Filter containers" style={{ marginBottom: 12, width: 'min(360px,100%)' }} value={q} onChange={(e) => setQ(e.target.value)} />{' '}
      <button className="btn p" onClick={() => actions.openDrawer({ kind: 'add' })}>Add container</button>{' '}
      <button className="btn" onClick={() => { actions.clearMany(sel); setSel([]) }}>Clear customs for selected</button>
      <Table id="ct" head={['', 'Container', 'Type', 'Zone', 'Slot', 'Dwell', 'Status', '']}
        rows={rows.map(({ c, i }) => [
          <input type="checkbox" className="bk" aria-label={`Select ${c.id}`} checked={sel.includes(i)}
            onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />,
          c.id, c.size, c.zone, c.slot, dwell(c) + ' d', <Pill k={c.st === 'Released' ? 'ok' : c.st === 'Pending' ? 'w' : ''}>{c.st}</Pill>,
          <>
            <button className="btn" onClick={() => actions.openDrawer({ kind: 'detail', i })}>Details</button>{' '}
            <button className="btn" aria-label={`Remove ${c.id}`} onClick={() => { if (confirm('Remove ' + c.id + ' from the records?')) { actions.deleteContainer(i); setSel([]) } }}>Remove</button>
          </>,
        ])} />
    </>
  )
}

/* ---------- Vessels ---------- */
export function Vessels() {
  const { vessels } = useStore()
  const [rows, setRows] = useState<string[][] | null>(null)
  const [hover, setHover] = useState(false)
  const [f, setF] = useState({ name: '', eta: '', boxes: '', berth: 'B-1' })
  const file = useRef<HTMLInputElement>(null)
  const read = (fl: File) => {
    const rd = new FileReader()
    rd.onload = () => {
      const r = String(rd.result).trim().split(/\r?\n/).filter(Boolean).map((l) => l.split(',').map((x) => x.trim()))
      if (r.length < 2) return toast('The file has no rows.', true)
      setRows(r); toast(r.length - 1 + ' containers in manifest')
    }
    rd.readAsText(fl)
  }
  const importRows = async () => {
    if (!rows) return
    const n = await actions.importContainers(rows.slice(1).map((r) => ({ id: r[0] || '', size: r[1] || '40 ft', zone: zoneOf(r[1] || ''), consignee: r[3] })))
    if (n) setRows(null)
  }
  const add = async () => {
    if (await actions.addVessel({ name: f.name, eta: f.eta ? new Date(f.eta).getTime() : 0, boxes: Number(f.boxes) || 0, berth: f.berth })) setF({ name: '', eta: '', boxes: '', berth: f.berth })
  }
  const max = Math.max(1, ...vessels.map((v) => v.boxes))
  return (
    <>
      <div className="tile cl-c">
        <b>Add a vessel</b>
        <div className="cl-g">
          <div className="f"><label htmlFor="vn">Vessel name</label><input id="vn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="f"><label htmlFor="ve">Arrival (ETA)</label><input id="ve" type="datetime-local" value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} /></div>
          <div className="f"><label htmlFor="vc">Containers</label><input id="vc" type="number" min="0" value={f.boxes} onChange={(e) => setF({ ...f, boxes: e.target.value })} /></div>
          <div className="f"><label htmlFor="vb">Berth</label><select id="vb" value={f.berth} onChange={(e) => setF({ ...f, berth: e.target.value })}>{['B-1', 'B-2', 'B-3', 'B-4'].map((b) => <option key={b}>{b}</option>)}</select></div>
        </div>
        <p><button className="btn p" onClick={add}>Add vessel</button></p>
      </div>
      <Table head={['Vessel', 'ETA', 'Containers', 'Berth', '']} rows={vessels.map((v) => [
        v.name, new Date(v.eta).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), v.boxes, v.berth,
        <button className="btn" onClick={() => actions.removeVessel(v.id)}>Remove</button>,
      ])} />
      {vessels.length > 0 && (<><h3>Load per vessel</h3><Bars max={max} rows={vessels.map((v, i): [string, number, boolean] => [v.name, v.boxes, i === 0])} /></>)}
      <h3>Manifest</h3>
      <div id="dz" className={`dz ${hover ? 'hv' : ''}`} tabIndex={0} role="button"
        onClick={() => file.current?.click()} onKeyDown={(e) => e.key === 'Enter' && file.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true) }} onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); const fl = e.dataTransfer.files[0]; if (fl) read(fl) }}>
        Drop a CSV manifest here or click to choose (columns: Container, Type, Weight kg, Consignee)
      </div>
      <input id="mf" ref={file} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      <div id="mr">
        {rows && (<>
          <Table head={rows[0]} rows={rows.slice(1, 41)} />
          <p><button className="btn p" onClick={importRows}>Import {rows.length - 1} containers as pending</button></p>
        </>)}
      </div>
    </>
  )
}
