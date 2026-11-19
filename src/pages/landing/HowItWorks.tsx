import { useEffect, useRef, useState } from "react";
import { REDUCED_MOTION as RM, useVisible } from "./hooks";

const S = [
  { t: "Arrive", em: "Vessel in, cargo moving.", p: "The vessel is discharged and the cargo is shuttled by rail and truck to the dry port.", l: ["Vessel tracker with live ETA", "Rail shuttle route and truck count"], c: ["On vessel", "Berth B-3", "0", "0"] },
  { t: "Clear", em: "Gate and customs, logged.", p: "Trucks check in at the gate and documents go through customs, with a full audit trail.", l: ["Driver and plate verified", "Release blocked until documents clear"], c: ["Customs hold", "Customs desk", "0", "1"] },
  { t: "Place", em: "The optimizer picks the slot.", p: "Every free slot is scored, and the container goes to the best Bay, Row and Tier.", l: ["No container buried under another", "Fewer extra crane moves later"], c: ["Slot assigned", "Bay 7, tier 2", "0", "2"] },
  { t: "Release", em: "Paid, booked, out the gate.", p: "Dues are paid, the truck is booked and the container leaves the gate.", l: ["Free days and storage charges applied", "Gate-out recorded in the log"], c: ["Released", "Gate-out", "0", "5"] },
];
const DUR = 4200;

/** Four steps that auto-advance while visible. Hover or click pauses on a step. */
export function HowItWorks() {
  const [box, visible] = useVisible<HTMLDivElement>();
  const [cur, setCur] = useState(0), [prog, setProg] = useState(RM ? 25 : 0);
  const curRef = useRef(0), t0 = useRef(0), hold = useRef(false);

  const go = (i: number) => { curRef.current = i; t0.current = performance.now(); setCur(i); };

  useEffect(() => {
    if (!visible || RM) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (n: number) => {
      if (!hold.current) {
        const p = Math.min(1, (n - t0.current) / DUR);
        setProg(((curRef.current + p) / S.length) * 100);
        if (p >= 1) go((curRef.current + 1) % S.length);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const s = S[cur];
  return (
    <div className="sx-how" ref={box} onMouseEnter={() => { hold.current = true; }} onMouseLeave={() => { hold.current = false; t0.current = performance.now(); }}>
      <ol className="sx-steps">
        {S.map((x, i) => (
          <li key={x.t} className={i === cur ? "on" : i < cur ? "done" : ""}>
            <button aria-label={`Step ${i + 1}: ${x.t}`} onClick={() => { hold.current = true; go(i); setProg(((i + 1) / S.length) * 100); }}>
              <span className="n">0{i + 1}</span><b>{x.t}</b>
            </button>
          </li>
        ))}
      </ol>
      <div className="sx-track" aria-hidden="true"><i style={{ width: prog + "%" }} /></div>
      <div className="sx-hp" aria-live="polite" key={cur}>
        <div className="sx-fade"><h3>{s.t}. <em>{s.em}</em></h3><p>{s.p}</p><ul>{s.l.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="sx-card sx-fade">
          <h4>GMT-0042 <span>demo</span></h4>
          {["Status", "Location", "Extra moves", "Dwell days"].map((k, j) => <div className="r" key={k}><span>{k}</span><span>{s.c[j]}</span></div>)}
        </div>
      </div>
    </div>
  );
}
