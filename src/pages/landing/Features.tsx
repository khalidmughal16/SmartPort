import React, { useEffect, useRef, useState } from "react";
import { pad2, rndInt } from "@/lib/text";
import { REDUCED_MOTION as RM, useGrow } from "./hooks";

const MAN = [22, 18, 25, 20, 19], SM = [7, 6, 8, 6, 6], DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const CHK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;

const Head = ({ t, p, children }: { t: string; p: string; children?: React.ReactNode }) => (
  <div className="sx-dh"><div><h3>{t}</h3><p>{p}</p></div><div className="sx-acts">{children}</div></div>
);

/** 0. Drop a container two ways and compare the extra moves. */
function PlacementDemo() {
  const BASE = [3, 1, 4, 2, 0, 3, 2];
  const [H, setH] = useState(BASE), [tot, setTot] = useState({ r: 0, s: 0 });
  const [scores, setScores] = useState<number[] | null>(null), [best, setBest] = useState(-1), [mark, setMark] = useState<{ c: number; cls: string } | null>(null);
  const [msg, setMsg] = useState<React.ReactNode>("Pick a placement method."), busy = useRef(false), timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const reset = () => { clearTimeout(timer.current); busy.current = false; setH(BASE); setTot({ r: 0, s: 0 }); setScores(null); setBest(-1); setMark(null); setMsg("Yard reset."); };
  const open = H.map((h, i) => (h < 5 ? i : -1)).filter((i) => i >= 0);
  const random = () => {
    if (busy.current) return;
    if (!open.length) return setMsg("Yard is full. Press Reset.");
    const c = open[rndInt(open.length)], moves = H[c];
    setH(H.map((h, i) => (i === c ? h + 1 : h))); setMark({ c, cls: "bad" }); setScores(null); setBest(-1);
    setTot({ ...tot, r: tot.r + moves });
    setMsg(<>Random: dropped on Bay {c + 1}, a stack of {moves}. <b>{moves} extra moves</b> later.</>);
  };
  const smart = () => {
    if (busy.current) return;
    if (!open.length) return setMsg("Yard is full. Press Reset.");
    busy.current = true;
    const sc = H.map((h) => (h >= 5 ? 0 : 1 - h / 5));
    setScores(sc); setBest(-1); setMsg("Scoring every free slot...");
    timer.current = setTimeout(() => {
      let b = 0; sc.forEach((v, i) => { if (v > sc[b]) b = i; });
      const moves = H[b];
      setBest(b); setH(H.map((h, i) => (i === b ? h + 1 : h))); setMark({ c: b, cls: "new" });
      setTot((x) => ({ ...x, s: x.s + moves }));
      setMsg(<>Optimizer: best slot is Bay {b + 1}, score {sc[b].toFixed(2)}. <b>{moves} extra moves</b> later.</>);
      busy.current = false;
    }, RM ? 0 : 650);
  };
  return (<>
    <Head t="Yard slot optimizer" p="Drop a container two ways and compare the extra moves it will cost later.">
      <button className="sx-btn" onClick={random}>Place randomly</button>
      <button className="sx-btn p" onClick={smart}>Place with optimizer</button>
      <button className="sx-btn" aria-label="Reset yard" onClick={reset}>Reset</button>
    </Head>
    <div className="sx-yard">{H.map((h, c) => <div className="sx-bay" key={c}>{Array.from({ length: h }, (_, k) => <div key={k} className={"b" + (mark && mark.c === c && k === h - 1 ? " " + mark.cls : "")} />)}</div>)}</div>
    <div className="sx-lbls">{H.map((_, c) => <span key={c} className={c === best ? "best" : ""}>Bay {c + 1}<b>{scores ? scores[c].toFixed(2) : "\u00a0"}</b></span>)}</div>
    <div className="sx-msg" aria-live="polite">{msg}</div>
    <div className="sx-stat"><div><b>{tot.r}</b><span>Extra moves, random</span></div><div><b style={{ color: "var(--lime)" }}>{tot.s}</b><span>Extra moves, optimizer</span></div></div>
  </>);
}

/** 1. Customs desk: clear every item before the container can be released. */
function CustomsDemo() {
  const INIT: [string, boolean][] = [["Bill of lading", true], ["Commercial invoice", false], ["Packing list", false], ["Duty and storage dues paid", false]];
  const [docs, setDocs] = useState(INIT), [msg, setMsg] = useState<React.ReactNode>(""), [shake, setShake] = useState(0);
  const left = docs.filter((d) => !d[1]);
  const release = () => {
    if (left.length) {
      setMsg(<><b style={{ color: "var(--bad)" }}>Blocked.</b> {left.length} item{left.length > 1 ? "s" : ""} still pending: {left.map((d) => d[0].toLowerCase()).join(", ")}.</>);
      setShake((s) => s + 1);
    } else setMsg(<><b style={{ color: "var(--lime)" }}>Released.</b> GMT-0042 is cleared for gate-out. Audit trail saved.</>);
  };
  return (<>
    <Head t="Customs desk" p="Container GMT-0042. Tap each item to clear it, then try to release.">
      <span className={"sx-pill " + (left.length ? "x" : "ok")}>{left.length ? "Hold" : "Cleared"}</span>
    </Head>
    <div className={"sx-list" + (shake ? " sx-shake" : "")} key={shake}>
      {docs.map((d, i) => (
        <button key={d[0]} className={"sx-row" + (d[1] ? " on" : "")} role="checkbox" aria-checked={d[1]}
          onClick={() => { setDocs(docs.map((x, k) => (k === i ? [x[0], !x[1]] : x))); setMsg(""); }}>
          <span className="ck">{CHK}</span><span className="t">{d[0]}</span><span className="r">{d[1] ? "done" : "pending"}</span>
        </button>
      ))}
    </div>
    <div className="sx-msg" aria-live="polite">{msg}</div>
    <div className="sx-acts"><button className="sx-btn p" onClick={release}>Release container</button><button className="sx-btn" onClick={() => { setDocs(INIT); setMsg(""); }}>Reset</button></div>
  </>);
}

type Ticket = { id: number; truck: string; lane: number; slot: string; bits: boolean[] };
/** 2. Gate 2 check-in: plate, driver, slot, ticket. */
function GateDemo() {
  const [done, setDone] = useState(0), [busy, setBusy] = useState(false), [msg, setMsg] = useState<React.ReactNode>(""), [ticket, setTicket] = useState<Ticket | null>(null), [processing, setProcessing] = useState(false);
  const n = useRef(42), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const go = () => {
    if (busy) return;
    setBusy(true); setDone(0); setTicket(null); setProcessing(true);
    const id = ++n.current, truck = "T-" + (10 + rndInt(89));
    const texts = [`Reading plate ${truck}...`, "Driver verified.", "Booking the next free slot...", "Printing ticket..."];
    texts.forEach((txt, i) => timers.current.push(setTimeout(() => {
      setDone(i + 1); setMsg(txt);
      if (i === 3) {
        const d = new Date(Date.now() + (8 + rndInt(20)) * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
        const bits = Array.from({ length: 49 }, (_, k) => (k % 7 < 2 && k < 14) || k === 6 || k === 42 || k === 48 || Math.random() > 0.5);
        setProcessing(false); setTicket({ id, truck, lane: 1 + rndInt(3), slot: pad2(d.getHours()) + ":" + pad2(d.getMinutes()), bits });
        setMsg(<><b>Checked in</b> in under 3 seconds.</>); setBusy(false);
      }
    }, RM ? i * 10 : (i + 1) * 480)));
  };
  return (<>
    <Head t="Gate 2 check-in" p="Run a truck through the gate and print its ticket."><button className="sx-btn p" disabled={busy} onClick={go}>Check in next truck</button></Head>
    <div className="sx-steps2">{["Plate scan", "Driver check", "Slot booked", "Ticket printed"].map((x, i) => <div key={x} className={i < done ? "on" : ""}>{x}</div>)}</div>
    <div>
      {ticket ? (
        <div className="sx-tk sx-fade">
          <div className="sx-qr" aria-hidden="true">{ticket.bits.map((b, i) => <i key={i} className={b ? "" : "o"} />)}</div>
          <dl><dt>Container</dt><dd>GMT-00{ticket.id}</dd><dt>Truck</dt><dd>{ticket.truck}</dd><dt>Bay</dt><dd>Gate 2, Lane {ticket.lane}</dd><dt>Slot</dt><dd>{ticket.slot}</dd></dl>
        </div>
      ) : <div className="sx-empty">{processing ? "Processing..." : "No ticket yet. Press the button to check in a truck."}</div>}
    </div>
    <div className="sx-msg" aria-live="polite">{msg}</div>
  </>);
}

/** 3. Crane dispatch queue: urgent pickups jump the line. */
function CraneDemo() {
  type Job = { id: number; u: number };
  const [q, setQ] = useState<Job[]>([{ id: 42, u: 1 }, { id: 17, u: 0 }, { id: 31, u: 0 }, { id: 9, u: 0 }, { id: 21, u: 0 }]);
  const [msg, setMsg] = useState<React.ReactNode>("Queue is sorted by priority."), [going, setGoing] = useState(false);
  const dispatch = () => {
    if (!q.length || going) return;
    const f = q[0]; setGoing(true);
    setMsg(<>Crane {1 + rndInt(3)} picking <b>GMT-00{pad2(f.id)}</b> for Gate 2.</>);
    setTimeout(() => {
      setQ((cur) => { const nx = cur.slice(1); while (nx.length < 5) nx.push({ id: 10 + rndInt(89), u: 0 }); return nx; });
      setGoing(false);
    }, RM ? 0 : 340);
  };
  const urgent = () => {
    const id = 10 + rndInt(89);
    setQ([{ id, u: 1 }, ...q.filter((x) => x.id !== id)].slice(0, 5));
    setMsg(<>Rush pickup <b>GMT-00{pad2(id)}</b> moved to P1.</>);
  };
  return (<>
    <Head t="Crane dispatch queue" p="Most urgent first. Add a rush job and watch it jump the line.">
      <button className="sx-btn" onClick={urgent}>Add urgent pickup</button><button className="sx-btn p" onClick={dispatch}>Dispatch next</button>
    </Head>
    <div className="sx-list">
      {q.map((x, i) => (
        <div key={x.id} className={"sx-row" + (i === 0 ? " on" : "") + (i === 0 && going ? " go" : "")}>
          <span className="ck">{i === 0 ? CHK : null}</span>
          <span className="t">GMT-00{pad2(x.id)}{x.u ? <span className="sx-pill w" style={{ marginLeft: 6 }}>rush</span> : null}</span>
          <span className="r">P{i + 1}</span>
        </div>
      ))}
    </div>
    <div className="sx-msg" aria-live="polite">{msg}</div>
  </>);
}

/** 4. Storage invoice: 5 free days, then $25 per day. */
function BillingDemo() {
  const rate = 25, free = 5, [d, setD] = useState(3), c = Math.max(0, d - free);
  return (<>
    <Head t="Storage invoice" p="Drag to change how long the container has been in the yard." />
    <div>
      <label htmlFor="sxdays" className="sx-mut" style={{ fontSize: 14 }}>Days in yard: <b style={{ color: "var(--fg)" }}>{d}</b></label>
      <input className="sx-rng" id="sxdays" type="range" min={1} max={14} value={d} onChange={(e) => setD(+e.target.value)} />
    </div>
    <div className="sx-seg" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} className={i < Math.min(d, free) ? "f" : i < d ? "c" : ""} />)}</div>
    <div className="sx-msg" aria-live="polite">{c ? <><b style={{ color: "var(--warn)" }}>{c} day{c > 1 ? "s" : ""} over</b> the free period. Storage is now charged.</> : <>Within the <b>{free} free days</b>. No charge yet.</>}</div>
    <div className="sx-inv">
      <div><span>Free days</span><span>{Math.min(d, free)} of {free}</span></div><div><span>Chargeable days</span><span>{c}</span></div>
      <div><span>Rate per day</span><span>${rate}</span></div><div><span>Total due</span><span style={{ color: c ? "var(--warn)" : "var(--lime)" }}>${c * rate}</span></div>
    </div>
  </>);
}

/** 5. Placement report: random vs smart extra moves, with CSV export. */
function ReportsDemo() {
  const [m, setM] = useState(2), grow = useGrow(m), pc = Math.round((1 - sum(SM) / sum(MAN)) * 100);
  const exportCsv = () => {
    const csv = "day,random_extra_moves,smart_extra_moves\n" + DAYS.map((d, i) => `${d},${MAN[i]},${SM[i]}`).join("\n") + "\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "smartport-placement-report.csv";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return (<>
    <Head t="Placement report" p="Extra crane moves per day, random versus smart.">
      <div className="sx-seg2" role="group" aria-label="Series">{["Random", "Smart", "Compare"].map((x, i) => <button key={x} aria-pressed={i === m} onClick={() => setM(i)}>{x}</button>)}</div>
      <button className="sx-btn" onClick={exportCsv}>Export CSV</button>
    </Head>
    <div className="sx-cols">
      {DAYS.map((d, i) => (
        <div className="sx-col" key={d}>
          <div className={"sx-bar" + (m === 1 ? " hide" : "")} style={{ display: m === 1 ? "none" : undefined, height: grow ? (MAN[i] / 28) * 100 + "%" : undefined }}><em>{MAN[i]}</em></div>
          <div className="sx-bar s" style={{ display: m === 0 ? "none" : undefined, height: grow ? (SM[i] / 28) * 100 + "%" : undefined }}><em>{SM[i]}</em></div>
        </div>
      ))}
    </div>
    <div className="sx-xl">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
    <div className="sx-dh">
      <div className="sx-big">{m === 0 ? sum(MAN) + " moves" : m === 1 ? sum(SM) + " moves" : pc + "% fewer"}</div>
      <p className="sx-mut">{m === 0 ? "Random placement, Mon to Fri." : m === 1 ? "Smart placement, Mon to Fri." : `Smart ${sum(SM)} moves vs random ${sum(MAN)} this week.`}</p>
    </div>
  </>);
}

const F: { t: string; s: string; i: string; Demo: React.FC }[] = [
  { t: "Smart placement", s: "Scores every free slot so no container is buried under another.", i: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.29 7 12 12l8.71-5M7.5 4.27l9 5.15", Demo: PlacementDemo },
  { t: "Customs control", s: "No release until documents are cleared and dues are paid.", i: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4", Demo: CustomsDemo },
  { t: "Gate flow", s: "Check in trucks, book slots and print tickets in seconds.", i: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", Demo: GateDemo },
  { t: "Crane dispatch", s: "A priority queue puts the most urgent pickup first.", i: "M4 21h16M7 21V5h11M7 5 3 10M18 5v9M16 14h4v4h-4z", Demo: CraneDemo },
  { t: "Billing", s: "Free days, daily storage charges and invoices, automatic.", i: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11", Demo: BillingDemo },
  { t: "Reports", s: "Compare random and smart placement and export the numbers.", i: "M3 3v18h18M7 14v4M12 9v9M17 5v13", Demo: ReportsDemo },
];

/** "What SmartPort does": six tabs, each with a small working demo. */
export function Features() {
  const [cur, setCur] = useState(0), tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (n: number) => { setCur(n); tabs.current[n]?.focus(); };
  const Demo = F[cur].Demo;
  return (
    <div className="sx-ft">
      <div className="sx-tabs" role="tablist" aria-label="Modules">
        {F.map((f, i) => (
          <button key={f.t} ref={(el) => { tabs.current[i] = el; }} role="tab" id={"sxt" + i} aria-selected={i === cur} aria-controls="sxd" onClick={() => setCur(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move((i + 1) % 6); }
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move((i + 5) % 6); }
            }}>
            <svg className="sx-i" viewBox="0 0 24 24" aria-hidden="true"><path d={f.i} /></svg>
            <span><b>{f.t}</b><small>{f.s}</small></span>
          </button>
        ))}
      </div>
      <div className="sx-demo sx-fade" id="sxd" role="tabpanel" aria-labelledby={"sxt" + cur} key={cur}><Demo /></div>
    </div>
  );
}
