import React, { useEffect, useRef, useState } from "react";
import { pad2, rndInt } from "@/lib/text";
import { REDUCED_MOTION as RM, useGrow, useVisible } from "./hooks";

const MAN = [22, 18, 25, 20, 19], SM = [7, 6, 8, 6, 6], DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const KPI = [
  { l: "Containers in yard", f: (v: number) => String(v) }, { l: "Past free days", f: (v: number) => String(v) },
  { l: "Gate-ins today", f: (v: number) => String(v) }, { l: "Storage dues open", f: (v: number) => "$" + v.toLocaleString("en-US") },
];
const SN = ["working", "idle", "maintenance"], SC = ["ok", "", "x"];
type Crane = { n: string; s: number; u: number };
type Feed = { time: string; msg: React.ReactNode };

const gid = () => "GMT-00" + pad2(10 + rndInt(89));
const randomEvent = (): React.ReactNode => {
  const id = gid();
  return [
    <>{id} placed in <b>Bay {1 + rndInt(9)}, tier {1 + rndInt(3)}</b></>, <>{id} checked in at <b>Gate {1 + rndInt(3)}</b></>,
    <>{id} cleared by <b>customs</b></>, <>{id} released, <b>gate-out</b></>,
  ][rndInt(4)];
};
const stamp = (msg: React.ReactNode): Feed => { const d = new Date(); return { time: pad2(d.getHours()) + ":" + pad2(d.getMinutes()), msg }; };

/** "Inside the terminal": a small live dashboard with count-up KPIs, a toggleable chart, crane controls and an activity feed. */
export function DashboardPreview() {
  const [win, visible] = useVisible<HTMLDivElement>();
  const [vals, setVals] = useState([212, 3, 12, 1350]), [ease, setEase] = useState(RM ? 1 : 0), counted = useRef(false);
  const [flash, setFlash] = useState({ i: -1, n: 0 });
  const [showM, setShowM] = useState(true), [showS, setShowS] = useState(true), grow = useGrow(showM + "" + showS);
  const [cranes, setCranes] = useState<Crane[]>([{ n: "Crane 1", s: 0, u: 82 }, { n: "Crane 2", s: 0, u: 64 }, { n: "Crane 3", s: 1, u: 0 }, { n: "Crane 4", s: 2, u: 0 }]);
  const [feed, setFeed] = useState<Feed[]>(() => [stamp(randomEvent()), stamp(randomEvent()), stamp(randomEvent())]);
  const log = (msg: React.ReactNode) => setFeed((f) => [stamp(msg), ...f].slice(0, 4));

  // count up once, the first time the window is on screen
  useEffect(() => {
    if (!visible || counted.current || RM) return;
    counted.current = true;
    const s = performance.now();
    let raf = 0;
    const step = (n: number) => { const p = Math.min(1, (n - s) / 1100); setEase(1 - Math.pow(1 - p, 3)); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // new "live" events every few seconds while visible
  useEffect(() => {
    if (!visible || RM) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      const r = rndInt(3);
      setFlash((f) => ({ i: r === 0 ? 2 : r === 1 ? 0 : 3, n: f.n + 1 }));
      if (r === 0) { setVals((v) => [v[0] + 1, v[1], v[2] + 1, v[3]]); log(<>{gid()} checked in at <b>Gate {1 + rndInt(3)}</b></>); }
      else if (r === 1) { setVals((v) => [Math.max(150, v[0] - 1), v[1], v[2], v[3]]); log(<>{gid()} released, <b>gate-out</b></>); }
      else { setVals((v) => [v[0], v[1], v[2], v[3] + 25]); log(randomEvent()); }
    }, 3800);
    return () => clearInterval(id);
  }, [visible]);

  const cycle = (i: number) => {
    const c = cranes[i], s = (c.s + 1) % 3;
    setCranes(cranes.map((x, k) => (k === i ? { ...x, s, u: s === 0 ? 55 + rndInt(40) : 0 } : x)));
    log(<>{c.n} set to <b>{SN[s]}</b></>);
  };

  return (
    <div className="sx-win" ref={win}>
      <div className="sx-bar0"><i></i><i></i><i></i><span style={{ marginLeft: 6 }}>smartport / dashboard</span><span className="lv">Live demo</span></div>
      <div className="sx-kpis">
        {KPI.map((k, i) => (
          <div key={k.l + (flash.i === i ? flash.n : "")} className={"sx-kpi" + (flash.i === i ? " sxfl" : "")}>
            <b>{k.f(Math.round(vals[i] * ease))}</b><span>{k.l}</span>
          </div>
        ))}
      </div>
      <div className="sx-grid">
        <div className="sx-p">
          <h4>Extra moves: manual vs optimized
            <span className="sx-lg">
              <button className="m" aria-pressed={showM} onClick={() => setShowM(!showM)}>Manual</button>
              <button className="s" aria-pressed={showS} onClick={() => setShowS(!showS)}>Smart</button>
            </span>
          </h4>
          <div className="sx-cols" style={{ height: 200 }}>
            {DAYS.map((d, i) => (
              <div className="sx-col" tabIndex={0} aria-label={`${d}: manual ${MAN[i]}, smart ${SM[i]}`} key={d}>
                <div className="tt">{d}: <b>{MAN[i]}</b> manual, <b style={{ color: "var(--lime)" }}>{SM[i]}</b> smart</div>
                <div className={"sx-bar" + (showM ? "" : " hide")} style={{ height: grow ? (MAN[i] / 28) * 100 + "%" : undefined }}><em>{showM ? MAN[i] : ""}</em></div>
                <div className={"sx-bar s" + (showS ? "" : " hide")} style={{ height: grow ? (SM[i] / 28) * 100 + "%" : undefined }}><em>{showS ? SM[i] : ""}</em></div>
              </div>
            ))}
          </div>
          <div className="sx-xl">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        </div>
        <div className="sx-p">
          <h4>Crane status<span className="sx-mut" style={{ fontWeight: 400, fontSize: 13 }}>{cranes.filter((c) => c.s === 0).length} of 4 active</span></h4>
          <div className="sx-cr">
            {cranes.map((c, i) => (
              <button key={c.n} className={c.s === 2 ? "x" : ""} aria-label={`${c.n} ${SN[c.s]}. Press to change.`} onClick={() => cycle(i)}>
                <span><b style={{ fontWeight: 600 }}>{c.n}</b></span><span className={"sx-pill " + SC[c.s]}>{SN[c.s]}</span>
                <span className="u"><i style={{ width: (c.s === 0 ? c.u : c.s === 2 ? 100 : 0) + "%" }} /></span>
              </button>
            ))}
          </div>
          <p className="sx-hint">Tap a crane to change its status.</p>
        </div>
      </div>
      <div className="sx-p" style={{ marginTop: 12 }}>
        <h4>Live activity</h4>
        <div className="sx-feed">{feed.map((x, i) => <div key={x.time + i}><time>{x.time}</time><span>{x.msg}</span></div>)}</div>
      </div>
    </div>
  );
}
