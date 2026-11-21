import { motion, useTransform, useReducedMotion, useMotionValue, useSpring, useScroll, useMotionValueEvent } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

type Lvl = 'OK' | 'WARN' | 'HOLD' | 'INFO'
interface Step { n: string; tag: string; title: string; text: string; badge: string; logs: [string, Lvl, string][] }

// Sample data for the demo: one container (GMT-0042) followed from ship to gate.
const STEPS: Step[] = [
  { n: '01', tag: 'VESSEL', title: 'Vessel arrives, berth assigned', text: 'Pilot boards and tugs guide MV Karachi Star alongside berth B1.', badge: 'Berthed',
    logs: [['06:00', 'INFO', 'ETA confirmed, MV Karachi Star, IMO 9321483'], ['06:12', 'INFO', 'Pilot boarded, 2 tugs assigned'], ['06:48', 'OK', 'Vessel alongside berth B1, lines secured'], ['06:55', 'OK', 'Cranes GC-01 and GC-02 released to vessel ops']] },
  { n: '02', tag: 'MANIFEST', title: 'Manifest received and checked', text: 'The shipping line sends the stowage plan. Every ISO code is validated.', badge: '2 rejected',
    logs: [['06:20', 'INFO', 'Manifest received: 214 containers, 12 reefer, 6 hazmat'], ['06:21', 'OK', 'ISO 6346 check digits verified for 212 containers'], ['06:21', 'WARN', '2 containers rejected, invalid check digit'], ['06:24', 'OK', 'Departure windows linked from truck bookings']] },
  { n: '03', tag: 'CUSTOMS', title: 'Customs status loaded', text: 'Each container is cleared, pending or held before it may leave the port.', badge: '8 held',
    logs: [['07:02', 'OK', '182 containers cleared for release'], ['07:02', 'INFO', '24 pending document review'], ['07:03', 'HOLD', '8 held, inspection ordered by customs'], ['07:03', 'INFO', 'Held containers routed to the inspection zone']] },
  { n: '04', tag: 'DISCHARGE', title: 'Cranes start discharge', text: 'The gantry crane lifts GMT-0042 off the vessel onto a yard truck.', badge: 'In progress',
    logs: [['07:10', 'INFO', 'GC-01 lifts GMT-0042 from vessel bay 07'], ['07:10', 'INFO', 'Weight 21 t, 40ft, departs in 18 h'], ['07:11', 'OK', 'Container landed on yard truck YT-05'], ['07:11', 'INFO', 'Optimizer asked for a yard slot']] },
  { n: '05', tag: 'PLACEMENT', title: 'Optimizer picks the slot', text: 'Every free slot is scored so nothing leaving sooner gets buried.', badge: '0 reshuffles',
    logs: [['07:11', 'INFO', 'Scanning free slots, hazmat spacing applied'], ['07:11', 'OK', 'Best slot: Bay 03, Row 02, Tier 1, cost 0'], ['07:11', 'INFO', 'Alternatives: B04/R02/T1 cost 1, B03/R05/T2 cost 2'], ['07:12', 'OK', 'Slot reserved, no earlier-departing box buried']] },
  { n: '06', tag: 'DISPATCH', title: 'Crane task queued, lane checked', text: 'A priority queue orders crane tasks and the lane is checked before every lift.', badge: 'Task T-014',
    logs: [['07:12', 'INFO', 'Task T-014 queued, priority 1 (departs in 18 h)'], ['07:12', 'OK', 'Lane check: 14 cells, no blocked lanes'], ['07:13', 'OK', 'GC-02 assigned, lane clear of GC-01'], ['07:19', 'OK', 'Container placed at B03/R02/T1']] },
  { n: '07', tag: 'GATE', title: 'Truck books and checks in', text: 'The gate officer validates the driver, customs status and the slot.', badge: 'Cleared',
    logs: [['D+1 01:40', 'INFO', 'Truck LEB-4821 checks in, window 02:00-03:00'], ['D+1 01:41', 'OK', 'Customs status cleared, no holds'], ['D+1 01:41', 'OK', 'Container reachable, 0 containers above it'], ['D+1 01:42', 'OK', 'Gate slip printed with slot B03/R02/T1']] },
  { n: '08', tag: 'DEPARTURE', title: 'Loaded, billed, gone', text: 'The container leaves, dwell time is billed and the move log is closed.', badge: 'Delivered',
    logs: [['D+1 02:05', 'OK', 'GMT-0042 loaded, truck leaves gate 3'], ['D+1 02:05', 'INFO', 'Dwell time 19 h, storage charge computed'], ['D+1 02:06', 'OK', 'Invoice INV-0412 issued to client'], ['D+1 02:06', 'OK', 'Extra moves for this container: 0']] },
]

const LVL: Record<Lvl, string> = { OK: 'text-later', WARN: 'text-hazard', HOLD: 'text-soon', INFO: 'text-mute' }
const SPRING = { stiffness: 60, damping: 25, mass: 0.5 }
interface Stage { width: number; height: number; mobile: boolean }

const CARDS = STEPS.map((s, i) => {
  const a = i * 137.5 * (Math.PI / 180)
  return { s, i, cos: Math.cos(a), sin: Math.sin(a), rx: 0.28 + (i % 3) * 0.08, ry: 0.26 + (i % 2) * 0.09, rot: (i % 2 ? -1 : 1) * (3 + (i % 5) * 2) }
})

function LogList({ s }: { s: Step }) {
  return (
    <ul className="space-y-1 font-mono text-[11px] sm:text-xs">
      {s.logs.map(([t, l, m]) => (
        <li key={t + m} className="flex gap-2"><span className="shrink-0 text-mute">{t}</span><span className={`w-11 shrink-0 font-semibold ${LVL[l]}`}>[{l}]</span><span>{m}</span></li>
      ))}
    </ul>
  )
}

function Card({ c, progress, pointer, stage }: { c: (typeof CARDS)[number]; progress: MotionValue<number>; pointer: { x: MotionValue<number>; y: MotionValue<number> }; stage: Stage }) {
  const span = 0.55, start = (c.i / CARDS.length) * (1 - span)
  const local = useTransform(progress, [start, start + span], [0, 1])
  const z = useTransform(local, [0, 1], [stage.mobile ? -1200 : -1700, stage.mobile ? 350 : 500])
  const opacity = useTransform(local, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0])
  const w = stage.mobile ? Math.max(150, Math.min(190, stage.width * 0.4)) : Math.max(210, Math.min(280, stage.width * 0.19))
  const bx = c.cos * stage.width * c.rx, by = c.sin * stage.height * c.ry, pan = stage.mobile ? 20 : 45
  const transform = useTransform([z, pointer.x, pointer.y], ([cz, px, py]: number[]) =>
    `translate3d(calc(-50% + ${bx - px * pan}px), calc(-50% + ${by - py * pan}px), ${cz}px) rotateZ(${c.rot}deg)`)
  return (
    <motion.div style={{ width: w, transform, opacity, zIndex: c.i + 1 }} className="pointer-events-none absolute left-1/2 top-1/2 aspect-[4/5] will-change-transform">
      <div className="flex h-full w-full flex-col border border-line bg-surface shadow-2xl shadow-black/60">
        <div className="corrugated border-b border-line px-3 py-1.5 font-mono text-[10px] text-mute">{c.s.n}/08 · {c.s.tag}</div>
        <div className="flex flex-1 flex-col p-3">
          <div className="font-display text-xl font-bold uppercase leading-none">{c.s.title}</div>
          <p className="mt-2 text-[11px] text-mute">{c.s.text}</p>
          <div className="mt-auto"><span className="border border-orange px-2 py-0.5 font-mono text-[10px] text-orange">{c.s.badge}</span></div>
        </div>
      </div>
    </motion.div>
  )
}

export default function WorkflowTunnel() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const [stage, setStage] = useState<Stage>({ width: 1440, height: 900, mobile: false })
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 30, restDelta: 0.0001 })
  const rx = useMotionValue(0), ry = useMotionValue(0)
  const pointer = { x: useSpring(rx, SPRING), y: useSpring(ry, SPRING) }
  const titleScale = useTransform(smooth, [0, 0.5, 1], [0.8, 1, 1.25])
  const titleOpacity = useTransform(smooth, [0, 0.1, 0.8, 1], [0.3, 1, 0.5, 0])
  const barScale = useTransform(smooth, [0, 1], [0, 1])

  useMotionValueEvent(smooth, 'change', (v) => setStep(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length))))

  useEffect(() => {
    const size = () => setStage({ width: window.innerWidth, height: window.innerHeight, mobile: window.innerWidth < 768 })
    size(); window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [])
  useEffect(() => {
    if (reduce) return
    const move = (e: PointerEvent) => { rx.set((e.clientX / window.innerWidth - 0.5) * 2); ry.set((e.clientY / window.innerHeight - 0.5) * 2) }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduce, rx, ry])

  if (reduce) {
    return (
      <section className="relative z-10 space-y-4 bg-bg px-6 py-16">
        <h2 className="font-display text-4xl font-bold uppercase">From ship to gate</h2>
        {STEPS.map((s) => (
          <div key={s.n} className="border border-line bg-surface p-4">
            <div className="mb-2 font-display text-xl font-bold uppercase">{s.n} · {s.title}</div>
            <LogList s={s} />
          </div>
        ))}
      </section>
    )
  }

  const cur = STEPS[step]
  return (
    <section ref={ref} id="workflow" className="relative z-10 bg-bg" style={{ height: '600vh' }}>
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden" style={{ perspective: stage.mobile ? '900px' : '1200px' }}>
        <motion.div style={{ scaleX: barScale }} className="absolute left-0 top-0 z-20 h-1 w-full origin-left bg-orange" />
        <div className="pointer-events-none absolute inset-0 [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)]" style={{ backgroundImage: 'radial-gradient(#23415F 1px, transparent 1px)' }} />
        <motion.div style={{ scale: titleScale, opacity: titleOpacity }} className="pointer-events-none z-0 flex max-w-xl flex-col items-center px-6 text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-teal">Follow one container</p>
          <h2 className="font-display text-6xl font-bold uppercase leading-[0.9] sm:text-8xl">From ship<br />to gate.</h2>
          <p className="mt-4 max-w-[36ch] text-sm text-mute">Keep scrolling. Each step of the port workflow flies past, and its log appears below.</p>
        </motion.div>
        <div className="pointer-events-none absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {CARDS.map((c) => <Card key={c.i} c={c} progress={smooth} pointer={pointer} stage={stage} />)}
        </div>
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="absolute bottom-6 left-1/2 z-20 w-[min(94vw,680px)] -translate-x-1/2 border border-line bg-surface" aria-live="polite">
          <div className="corrugated flex items-center justify-between border-b border-line px-4 py-2 font-mono text-[11px]">
            <span className="text-mute">STEP {cur.n}/08 · {cur.tag}</span><span className="text-orange">{cur.badge}</span>
          </div>
          <div className="space-y-2 p-4">
            <div className="font-display text-2xl font-bold uppercase">{cur.title}</div>
            <LogList s={cur} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
