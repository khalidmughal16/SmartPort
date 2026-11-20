'use client'
import { useRef, useState } from 'react'
import { due } from '../lib/logic'
import { actions, toast, useStore } from '../lib/store'
import { Bars, Kp, Pill, Table } from '../components/ui'

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
  const cur = c ? (c.st === 'Released' ? 4 : c.cus === 'Cleared' ? 3 : 2) : 0
  return (
    <div className="tile">
      <b>Track a container</b>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input id="tk" placeholder="GMT-0017" aria-label="Container number" style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn p" onClick={track}>Track</button>
      </div>
      <div id="tkr">
        {res === 'none' && <p className="sub">No container found. Try {C[0].id}.</p>}
        {c && (
          <>
            <ol className="stp">
              {['Vessel', 'Gate-in', 'Customs', 'Yard', 'Released'].map((n, i) => <li key={n} className={i < cur ? 'd' : i === cur ? 'n' : ''}>{n}</li>)}
            </ol>
            <p className="sub">{c.id}: {c.zone} zone, slot {c.slot}, dwell {c.d} days.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Widgets() {
  const ves: [string, number, string][] = [['MV Karachi Star', 82, 'ETA 40 min'], ['MV Indus Trader', 45, 'ETA 2 h'], ['MV Sindh Pearl', 12, 'ETA 6 h']]
  const brt: [string, [number, number, string][]][] = [
    ['B-1', [[0, 30, 'Harbor Lark'], [40, 35, 'Indus Trader']]], ['B-2', [[10, 45, 'Sindh Pearl']]], ['B-3', [[0, 55, 'Karachi Star'], [60, 30, 'Reserved']]],
  ]
  const crn: [string, string, number][] = [['Crane 1', 'Working', 32], ['Crane 2', 'Working', 28], ['Crane 3', 'Idle', 0], ['Crane 4', 'Maintenance', 0]]
  return (
    <div className="wg">
      <div className="tile">
        <b>Vessels approaching</b>
        {ves.map((v) => (
          <div className="bar" key={v[0]}><span style={{ width: 120 }}>{v[0]}</span><i className="l" style={{ width: `${v[1] * 0.5}%` }} />{v[2]}</div>
        ))}
      </div>
      <div className="tile">
        <b>Tide and weather</b>
        <div className="kp" style={{ margin: '10px 0 0' }}>
          <div><b>1.2 m</b><span>Tide, rising</span></div><div><b>8 kn</b><span>Wind NW</span></div><div><b>9 km</b><span>Visibility</span></div>
        </div>
      </div>
      <div className="tile" style={{ gridColumn: '1/-1' }}>
        <b>Berth schedule, 24 h</b>
        {brt.map((b) => (
          <div className="gt" key={b[0]}>
            <span>{b[0]}</span>
            <div>{b[1].map((x, i) => <i key={i} style={{ left: `${x[0]}%`, width: `${x[1]}%` }}>{x[2]}</i>)}</div>
          </div>
        ))}
      </div>
      <div className="tile" style={{ gridColumn: '1/-1' }}>
        <b>Crane status</b>
        <div className="gr" style={{ marginTop: 10 }}>
          {crn.map((c) => (
            <div className="tile" key={c[0]}>
              <b>{c[0]}</b>
              <p><Pill k={c[1] === 'Working' ? 'ok' : c[1] === 'Idle' ? '' : 'x'}>{c[1]}</Pill></p>
              <span className="sub">{c[2]} moves per hour</span>
            </div>
          ))}
        </div>
      </div>
      <div className="tile">
        <b>Gate queue</b>
        <div className="kp" style={{ margin: '10px 0 0' }}>
          <div><b>6</b><span>Trucks in, 5 min wait</span></div><div><b>3</b><span>Trucks out, 2 min wait</span></div>
        </div>
      </div>
      <TrackBox />
    </div>
  )
}

export function Dashboard() {
  const { C } = useStore()
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], man = [22, 18, 25, 20, 24], smart = [7, 6, 8, 6, 7]
  return (
    <>
      <Kp items={[
        [C.filter((c) => c.st === 'In yard').length + 200, 'Containers in yard'],
        [C.filter((c) => c.d > 5).length, 'Past free days'],
        [12, 'Gate-ins today'],
        ['$' + C.reduce((s, c) => s + due(c), 0), 'Storage dues open'],
      ]} />
      <div className="two">
        <div className="tile">
          <b>Extra moves: manual vs optimized</b>
          {days.map((d, i) => <Bars key={d} max={25} rows={[[d + ' manual', man[i]], [d + ' smart', smart[i], true]]} />)}
        </div>
        <div className="tile">
          <b>Alerts</b>
          <p><Pill k="w">Customs hold</Pill> GMT-0019 waits for clearance.</p>
          <p><Pill k="x">Overdue</Pill> {C.filter((c) => c.d > 7).length} containers beyond 7 days.</p>
          <p><Pill k="ok">Gate</Pill> Queue under 6 minutes.</p>
        </div>
      </div>
      <Widgets />
    </>
  )
}

/* ---------- Yard map ---------- */
function Iso({ heights, before }: { heights: number[]; before: boolean }) {
  const R = 3, out: JSX.Element[] = []
  for (let d = 0; d < 8 + R; d++)
    for (let c = 0; c < 8; c++) {
      const r = d - c
      if (r < 0 || r >= R) continue
      const n = Math.max(1, Math.min(4, heights[c] + ((c * 7 + r * 5) % 3) - 1))
      for (let t = 0; t < n; t++) {
        const x = (c - r) * 30 + 270, y = (c + r) * 15 + 90 - t * 18
        const g = !before && c === 6 && r === 0 && t === n - 1, f = g ? 'var(--lime)' : 'var(--fg)'
        out.push(
          <g key={`${c}-${r}-${t}`}>
            <polygon points={`${x},${y - 15} ${x + 30},${y} ${x},${y + 15} ${x - 30},${y}`} fill={f} opacity={g ? 1 : 0.55} />
            <polygon points={`${x - 30},${y} ${x},${y + 15} ${x},${y + 33} ${x - 30},${y + 18}`} fill={f} opacity={g ? 0.8 : 0.3} />
            <polygon points={`${x},${y + 15} ${x + 30},${y} ${x + 30},${y + 18} ${x},${y + 33}`} fill={f} opacity={g ? 0.6 : 0.18} />
          </g>,
        )
      }
    }
  return <svg viewBox="0 0 540 300" role="img" aria-label="3D yard view" style={{ width: '100%', maxWidth: 640 }}>{out}</svg>
}

export function YardMap() {
  const { Y } = useStore()
  const [before, setBefore] = useState(false)
  const [iso, setIso] = useState(false)
  const [info, setInfo] = useState('Select a bay to see its stack. Brighter means taller.')
  const heights = before ? [4, 1, 4, 2, 4, 1, 3, 4] : Y.map((s) => s.length)
  return (
    <>
      <p>
        <button className={`btn ${before ? '' : 'p'}`} onClick={() => setBefore(false)}>After: smart placement</button>{' '}
        <button className={`btn ${before ? 'p' : ''}`} onClick={() => setBefore(true)}>Before: random placement</button>
      </p>
      <p>
        <button className={`btn ${iso ? '' : 'p'}`} onClick={() => setIso(false)}>Heatmap</button>{' '}
        <button className={`btn ${iso ? 'p' : ''}`} onClick={() => setIso(true)}>3D view</button>
      </p>
      {iso && <Iso heights={heights} before={before} />}
      <div className="hm" style={iso ? { display: 'none' } : undefined}>
        {heights.map((n, c) => (
          <button key={c} aria-label={`Bay ${c + 1}`} style={{ opacity: 0.2 + n * 0.2 }}
            onClick={() => setInfo(`Bay ${c + 1}: ` + (Y[c].length ? `${Y[c].length} containers, top leaves on day ${Y[c][Y[c].length - 1]}` : 'empty'))}>{n}</button>
        ))}
      </div>
      <p className="sub">Illustrative demo: {before ? 'many blockers, about 18 extra moves' : 'blockers avoided, about 6 extra moves'}.</p>
      <p id="info" className="sub" style={{ marginTop: 14 }}>{info}</p>
    </>
  )
}

/* ---------- Containers ---------- */
export function Containers() {
  const { C } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const rows = C.map((c, i) => ({ c, i })).filter(({ c }) => {
    const text = [c.id, c.zone, c.slot, c.d + ' d', c.st].join(' ').toLowerCase()
    return text.includes(q.toLowerCase())
  })
  return (
    <>
      <input id="flt" placeholder="Filter by number, zone or status" aria-label="Filter containers" style={{ marginBottom: 12, width: 'min(360px,100%)' }} value={q} onChange={(e) => setQ(e.target.value)} />{' '}
      <button className="btn p" onClick={() => actions.openDrawer({ kind: 'add' })}>Add container</button>{' '}
      <button className="btn" onClick={() => { actions.clearMany(sel); setSel([]) }}>Clear customs for selected</button>
      <Table id="ct" head={['', 'Container', 'Zone', 'Slot', 'Dwell', 'Status', '']}
        rows={rows.map(({ c, i }) => [
          <input type="checkbox" className="bk" aria-label={`Select ${c.id}`} checked={sel.includes(i)}
            onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />,
          c.id, c.zone, c.slot, c.d + ' d', <Pill k={c.st === 'Released' ? 'ok' : ''}>{c.st}</Pill>,
          <button className="btn" onClick={() => actions.openDrawer({ kind: 'detail', i })}>Details</button>,
        ])} />
    </>
  )
}

/* ---------- Vessels ---------- */
export function Vessels() {
  const [rows, setRows] = useState<string[][] | null>(null)
  const [hover, setHover] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const show = (r: string[][]) => { setRows(r); toast(r.length - 1 + ' containers in manifest') }
  const read = (f: File) => {
    const rd = new FileReader()
    rd.onload = () => show(String(rd.result).trim().split(/\r?\n/).slice(0, 40).map((l) => l.split(',').map((x) => x.trim())))
    rd.readAsText(f)
  }
  return (
    <>
      <Table head={['Vessel', 'ETA', 'Containers', 'Berth']} rows={[
        ['MV Karachi Star', 'Mon 06:00', 412, 'B-3'], ['MV Indus Trader', 'Tue 14:00', 268, 'B-1'],
        ['MV Sindh Pearl', 'Thu 09:00', 530, 'B-2'], ['MV Harbor Lark', 'Sat 18:00', 190, 'B-3'],
      ]} />
      <h3>Schedule</h3>
      <Bars max={50} rows={[['Mon', 30], ['Tue', 20, true], ['Thu', 44], ['Sat', 14]]} />
      <h3>Manifest</h3>
      <div id="dz" className={`dz ${hover ? 'hv' : ''}`} tabIndex={0} role="button"
        onClick={() => file.current?.click()} onKeyDown={(e) => e.key === 'Enter' && file.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true) }} onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); const f = e.dataTransfer.files[0]; if (f) read(f) }}>
        Drop a CSV manifest here or click to choose
      </div>
      <input id="mf" ref={file} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      <p>
        <button className="btn" onClick={() => show([['Container', 'Type', 'Weight kg', 'Consignee'], ['GMT-0101', '40 ft HC', '21400', 'Indus Traders'], ['GMT-0102', '20 ft', '9800', 'Sindh Foods'], ['GMT-0103', 'Reefer', '18200', 'Pearl Exports']])}>Load sample manifest</button>
      </p>
      <div id="mr">{rows && <Table head={rows[0]} rows={rows.slice(1)} />}</div>
    </>
  )
}
