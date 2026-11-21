import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import WorkflowTunnel from '../components/WorkflowTunnel'

type V = [number, number, number]
type Item = { p: V; c: string }
const prog = { v: 0 }
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ss = (a: number, b: number, x: number) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const CS: V = [1, 1, 2.4] // container: width, height, length (along z)
const PAL = ['#B5472F', '#3A6EA5', '#2A8C82', '#C99A3C', '#7C8794']

let sd = 7
const rnd = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296 }
const pick = () => PAL[Math.floor(rnd() * PAL.length)]

const shipItems: Item[] = []
for (const x of [-9.2, -8, -6.8]) for (const z of [-7.8, -5.2, -2.6, 0, 2.6, 5.2]) {
  const h = x === -8 && z === -5.2 ? 2 : 1 + Math.floor(rnd() * 3)
  for (let t = 0; t < h; t++) shipItems.push({ p: [x, 1.6 + t, z], c: pick() })
}
const yardItems: Item[] = []
for (const x of [6, 7.5, 9, 10.5, 12, 13.5, 15, 16.5]) for (const z of [-8, -5, -2, 1, 4, 7]) {
  if (x === 9 && z === -2) continue
  const h = x === 12 && z === 1 ? 2 : Math.floor(rnd() * 4)
  for (let t = 0; t < h; t++) yardItems.push({ p: [x, 1.1 + t, z], c: pick() })
}

const A: V = [-8, 3.6, -5.2], B: V = [9, 1.1, -2], C: V = [12, 3.1, 1]
const PH: V[] = [C, [12, 5.6, 1], [24, 5.6, 1], [24, 1.6, 1]]
const PG: V[] = [[12, 0.7, 1], [12, 0.7, -0.5], [24, 0.7, -0.5], [24, 0.7, 1]]
const truckZ = (p: number) => 1 + ss(0.9, 1, p) * 40

function along(pts: V[], u: number): V {
  const L = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]))
  let d = u * L.reduce((a, b) => a + b, 0)
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) return mix(pts[i], pts[i + 1], cl(d / L[i]))
    d -= L[i]
  }
  return pts[pts.length - 1]
}
function heroPos(p: number): V {
  if (p < 0.1) return A
  if (p < 0.18) { const t = ss(0.1, 0.18, p), v = mix(A, B, t); v[1] += Math.sin(Math.PI * t) * 5; return v }
  if (p < 0.36) return B
  if (p < 0.5) { const t = ss(0.36, 0.5, p), v = mix(B, C, t); v[1] += Math.sin(Math.PI * t) * 5; return v }
  if (p < 0.55) return C
  if (p < 0.75) return along(PH, ss(0.55, 0.75, p))
  return [24, 1.6, truckZ(p)]
}
const blockerPos = (i: number, p: number): V => {
  const a = 0.2 + 0.04 * i
  const t = ss(a, a + 0.04, p)
  const v = mix([9, 2.1 + i, -2], [3.4, 1.1, -5 + 3 * i], t)
  v[1] += Math.sin(Math.PI * t) * 4
  return v
}
function carried(p: number): V | null {
  if ((p >= 0.1 && p < 0.18) || (p >= 0.36 && p < 0.5) || (p >= 0.55 && p < 0.75)) return heroPos(p)
  if (p >= 0.2 && p < 0.32) return blockerPos(Math.min(2, Math.floor((p - 0.2) / 0.04)), p)
  return null
}

const CAM: { p: number; pos: V; look: V }[] = [
  { p: 0, pos: [-22, 4, 14], look: [-8, 2, -3] },
  { p: 0.15, pos: [-14, 7, 12], look: [-2, 2, -2] },
  { p: 0.3, pos: [3.5, 5, 10], look: [9, 2, -2] },
  { p: 0.45, pos: [18, 7, 14], look: [12, 2, 1] },
  { p: 0.65, pos: [15, 30, 7], look: [15, 0, 0] },
  { p: 0.8, pos: [30, 6, -6], look: [24, 1, 1] },
  { p: 1, pos: [34, 4, -10], look: [24, 1, 16] },
]
const SKY = ['#D9895A', '#6FA3CF', '#3B2A4A'].map((c) => new THREE.Color(c))
const ORANGE = new THREE.Color('#FF6A1A'), RED = new THREE.Color('#E5383B'), GREEN = new THREE.Color('#2ECC71')

function Boxes({ items }: { items: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current!, o = new THREE.Object3D(), c = new THREE.Color()
    items.forEach((it, i) => { o.position.set(...it.p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(it.c)) })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={CS} />
      <meshStandardMaterial roughness={0.7} metalness={0.2} />
    </instancedMesh>
  )
}

function Scene() {
  const bg = useRef<THREE.Color>(null), fog = useRef<THREE.Fog>(null)
  const ship = useRef<THREE.Group>(null), truck = useRef<THREE.Group>(null)
  const hero = useRef<THREE.Mesh>(null), heroMat = useRef<THREE.MeshStandardMaterial>(null)
  const blk = useRef<(THREE.Mesh | null)[]>([]), cm = useRef<(THREE.Mesh | null)[]>([])
  const cr = useRef({ cx: -3, tx: -8, tz: -5.2, sy: 6.5 })
  const look = useRef(new THREE.Vector3(-8, 2, -3))
  const sky = useMemo(() => new THREE.Color(), [])
  const line = useMemo(() => {
    const pts = Array.from({ length: 61 }, (_, i) => new THREE.Vector3(...along(PG, i / 60)))
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#14B8A6' }))
  }, [])
  const setCm = (i: number) => (m: THREE.Mesh | null) => { cm.current[i] = m }

  useFrame((s) => {
    const p = prog.v, t = s.clock.elapsedTime
    // sky: dawn -> day -> dusk
    if (p < 0.5) sky.copy(SKY[0]).lerp(SKY[1], p * 2); else sky.copy(SKY[1]).lerp(SKY[2], (p - 0.5) * 2)
    bg.current?.copy(sky); fog.current?.color.copy(sky)
    if (ship.current) { ship.current.position.y = Math.sin(t * 0.8) * 0.05; ship.current.rotation.z = Math.sin(t * 0.6) * 0.006 }
    // hero container
    const h = heroPos(p), m = hero.current, hm = heroMat.current
    if (m && hm) {
      m.position.set(h[0], h[1], h[2])
      hm.color.lerp(p < 0.18 ? ORANGE : p < 0.36 ? RED : p < 0.55 ? GREEN : ORANGE, 0.1)
      hm.emissive.copy(hm.color).multiplyScalar(0.45 + 0.25 * Math.sin(t * 4))
    }
    // blockers lifted off the buried container
    blk.current.forEach((b, i) => {
      if (!b) return
      const v = blockerPos(i, p)
      b.position.set(v[0], v[1], v[2]); b.scale.setScalar(Math.max(ss(0.17, 0.2, p), 0.001))
    })
    // truck
    truck.current?.position.set(24, 0, truckZ(p))
    // crane
    const c = cr.current, car = carried(p)
    if (car) { c.tx += (car[0] - c.tx) * 0.15; c.tz += (car[2] - c.tz) * 0.15 }
    c.sy += ((car ? car[1] + 1.2 : 6.5) - c.sy) * 0.12
    c.cx += (cl(c.tx, -3, 28) - c.cx) * 0.12
    const [beam, l1, l2, arm, cable, spr] = cm.current
    beam?.position.set(c.cx, 8, 0); l1?.position.set(c.cx, 4, -11); l2?.position.set(c.cx, 4, 11)
    arm?.position.set((c.cx + c.tx) / 2, 8, c.tz); arm?.scale.set(Math.abs(c.tx - c.cx) + 0.4, 0.4, 0.5)
    cable?.position.set(c.tx, (8 + c.sy) / 2, c.tz); cable?.scale.set(0.06, 8 - c.sy, 0.06)
    spr?.position.set(c.tx, c.sy, c.tz)
    // crane lane draws itself
    line.geometry.setDrawRange(0, Math.floor(61 * ss(0.55, 0.75, p)))
    // camera
    let i = 0
    while (i < CAM.length - 2 && p >= CAM[i + 1].p) i++
    const k = ss(CAM[i].p, CAM[i + 1].p, p)
    const tp = mix(CAM[i].pos, CAM[i + 1].pos, k), tl = mix(CAM[i].look, CAM[i + 1].look, k)
    s.camera.position.lerp(new THREE.Vector3(...tp), 0.08)
    look.current.lerp(new THREE.Vector3(...tl), 0.08)
    s.camera.lookAt(look.current)
  })

  return (
    <>
      <color ref={bg} attach="background" args={['#D9895A']} />
      <fog ref={fog} attach="fog" args={['#D9895A', 35, 130]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[30, 25, 10]} intensity={1.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[400, 400]} /><meshStandardMaterial color="#0F3B52" roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh position={[36, 0, 0]}><boxGeometry args={[80, 1.2, 120]} /><meshStandardMaterial color="#3A4756" roughness={0.9} /></mesh>
      <group ref={ship}>
        <mesh position={[-8, 0.3, 0]}><boxGeometry args={[4.4, 1.6, 17]} /><meshStandardMaterial color="#2B3A4D" /></mesh>
        <mesh position={[-8, 2.7, 7.6]}><boxGeometry args={[3.2, 3.2, 1.8]} /><meshStandardMaterial color="#E8EEF4" /></mesh>
        <Boxes items={shipItems} />
      </group>
      <Boxes items={yardItems} />
      <mesh ref={hero}>
        <boxGeometry args={CS} /><meshStandardMaterial ref={heroMat} color="#FF6A1A" emissive="#FF6A1A" roughness={0.5} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { blk.current[i] = m }}><boxGeometry args={CS} /><meshStandardMaterial color={PAL[i + 1]} roughness={0.7} /></mesh>
      ))}
      <group ref={truck}>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.8, 0.4, 6]} /><meshStandardMaterial color="#7C8794" /></mesh>
        <mesh position={[0, 1.6, 2.2]}><boxGeometry args={[1.8, 1.4, 1.4]} /><meshStandardMaterial color="#3A6EA5" /></mesh>
      </group>
      <primitive object={line} />
      {[[0.5, 0.5, 22], [0.6, 8, 0.6], [0.6, 8, 0.6], [1, 1, 1], [1, 1, 1], [1.2, 0.25, 2.6]].map((sc, i) => (
        <mesh key={i} ref={setCm(i)} scale={sc as V}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={i === 5 ? '#FF6A1A' : '#C99A3C'} /></mesh>
      ))}
    </>
  )
}

const STAGES = ['On vessel', 'Buried', 'Placed', 'In transit', 'Gate out', 'Delivered']
const AT = [0, 0.15, 0.35, 0.55, 0.75, 0.9]
const stageOf = (p: number) => AT.reduce((a, v, i) => (p >= v ? i : a), 0)
const movesOf = (p: number) => (p >= 0.2 && p < 0.36 ? Math.min(3, 1 + Math.floor((p - 0.2) / 0.04)) : 0)

function Panel({ side, tag, title, children }: { side: 'l' | 'r'; tag: string; title: string; children: ReactNode }) {
  return (
    <section className={`flex min-h-screen items-center px-6 lg:px-16 ${side === 'r' ? 'justify-end' : ''}`}>
      <div className="max-w-md border border-white/10 bg-[rgba(13,31,51,0.62)] backdrop-blur-md">
        <div className="corrugated border-b border-white/10 px-5 py-2 font-mono text-[11px] text-mute">{tag}</div>
        <div className="space-y-3 p-5">
          <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-wide">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const bar = useRef<HTMLDivElement>(null)
  const story = useRef<HTMLElement>(null)
  const [hud, setHud] = useState('0|0')
  const lite = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency || 8) <= 2, [])

  useEffect(() => {
    const on = () => {
      const span = (story.current?.offsetHeight ?? document.documentElement.scrollHeight) - window.innerHeight
      const p = cl(window.scrollY / Math.max(1, span))
      prog.v = p
      if (bar.current) bar.current.style.width = `${p * 100}%`
      setHud(`${stageOf(p)}|${movesOf(p)}`)
    }
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); prog.v = 0 }
  }, [])

  const [st, mv] = hud.split('|').map(Number)
  const p = 'text-sm text-mute'
  return (
    <div className="relative bg-bg text-ink">
      {!lite && (
        <div className="fixed inset-0 z-0" aria-hidden="true">
          <Canvas dpr={[1, 1.75]} camera={{ position: [-22, 4, 14], fov: 50 }}><Scene /></Canvas>
        </div>
      )}
      <div ref={bar} className="fixed left-0 top-0 z-30 h-1 bg-orange" style={{ width: 0 }} />
      <nav className="fixed inset-x-0 top-1 z-20 flex items-center justify-between px-6 py-3">
        <div className="font-display text-2xl font-bold uppercase">Smart<span className="text-orange">Port</span></div>
        <Link to="/login" className="border border-white/20 bg-[rgba(13,31,51,0.6)] px-4 py-1.5 text-sm backdrop-blur-md">Login</Link>
      </nav>
      <div className="fixed bottom-4 left-4 z-20 border border-white/10 bg-[rgba(13,31,51,0.7)] px-3 py-2 font-mono text-xs backdrop-blur-md">
        GMT-0042 · {STAGES[st]}<br />Extra moves: {mv}
      </div>

      <main ref={story} className="relative z-10">
        <Panel side="l" tag="00 / VESSEL" title="Every container, in the right place.">
          <p className={p}>SmartPort decides where each container goes, so the one leaving tomorrow is never buried under the ones leaving next week.</p>
          <div className="flex gap-3 pt-1">
            <Link to="/login" className="bg-orange px-4 py-2 font-semibold text-bg">Enter Terminal</Link>
            <a href="#problem" className="border border-white/20 px-4 py-2 text-sm">See how it works</a>
            <a href="#workflow" className="border border-white/20 px-4 py-2 text-sm">Port workflow</a>
          </div>
        </Panel>
        <div id="problem" />
        <Panel side="r" tag="01 / PROBLEM" title="Buried means reshuffled.">
          <p className={p}>To reach GMT-0042 the crane lifts every container above it, sets them aside and puts them back. Each lift costs time, fuel and a waiting truck.</p>
        </Panel>
        <Panel side="l" tag="02 / SOLUTION" title="Earliest departure on top.">
          <p className={p}>The greedy optimizer scores every free slot and picks the one that buries nothing that leaves sooner. Extra moves drop to zero.</p>
        </Panel>
        <Panel side="r" tag="03 / ROUTING" title="Shortest path, urgent first.">
          <p className={p}>A priority queue keeps the most urgent crane task at the front, and the lane is checked before every lift.</p>
          <ol className="font-mono text-xs text-mute"><li>1  T-014  priority 1</li><li>2  T-009  priority 3</li><li>3  T-021  priority 4</li></ol>
        </Panel>
        <Panel side="l" tag="04 / ROLES" title="Three roles, one yard.">
          <ul className={`${p} space-y-2`}>
            <li><b className="text-ink">Yard Superintendent:</b> throughput, vessels, billing, reports.</li>
            <li><b className="text-ink">Crane Operator:</b> a ranked task queue and the planned path.</li>
            <li><b className="text-ink">Gate Officer:</b> truck check-in, customs status, pickup slips.</li>
          </ul>
        </Panel>
        <Panel side="r" tag="05 / DELIVERED" title="Out the gate, no detours.">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['3', 'Roles'], ['12', 'Screens'], ['0', 'Extra moves']].map(([n, l]) => (
              <div key={l}><div className="font-display text-4xl font-bold text-orange">{n}</div><div className="text-xs text-mute">{l}</div></div>
            ))}
          </div>
          <Link to="/login" className="mt-2 block bg-orange px-4 py-2.5 text-center font-semibold text-bg">Login to SmartPort</Link>
        </Panel>
      </main>
      <WorkflowTunnel />
    </div>
  )
}
