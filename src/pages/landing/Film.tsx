import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clamp } from "@/lib/text";

/** The 10-chapter scroll story: [line 1, line 2 (accent), body, status, location, extra moves, dwell days]. */
const ST = [
  ["Born at sea.", "Bound for better.", "One container. Ten connected moments. Follow GMT-0042 from the first lift to the final mile.", "On vessel", "Berth B-3", "0", "0"],
  ["Crossing land.", "Straight to the dry port.", "Rail and truck shuttles carry cargo inland, so the seaport stays clear.", "In transit", "Rail shuttle", "0", "0"],
  ["At the gate.", "Checked in, seconds.", "The gate officer records the truck, the driver and the container, then lifts the barrier.", "At gate", "Gate 2", "0", "0"],
  ["Cleared,", "not stuck.", "Documents are verified and the hold clears. Nothing leaves without customs clearance and cleared dues.", "Customs", "Customs desk", "0", "1"],
  ["Buried", "by chaos.", "Stack it wrong and every pickup costs extra crane moves.", "Buried", "Bay 3, tier 1", "", "2"],
  ["Placed", "by logic.", "The optimizer scores every free slot and picks the one that blocks nothing.", "Slot assigned", "Bay 7, tier 2", "", "2"],
  ["The shortest", "way there.", "A* finds the shortest clear path for the crane and the truck.", "Routing", "Yard lane 2", "0", "3"],
  ["First", "in line.", "Pickups wait in a priority queue, so urgent trucks are served first.", "Queued, P1", "Bay 7, tier 2", "0", "4"],
  ["Paid", "in full.", "Free days, then a daily storage charge. Dues clear and the release is approved.", "Release ok", "Billing", "0", "5"],
  ["Out", "the gate.", "Container GMT-0042 leaves with the customer. Every move was connected.", "Released", "Gate-out", "0", "5"],
];
const CHIPS = ["Berth B-3 · vessel arriving", "Rail shuttle · inland", "Gate 2 · check-in", "Customs · documents", "Yard · bay 3", "Optimizer · best slot", "Router · shortest path", "Queue · priority P1", "Billing · dues clear", "Gate-out · released"];
const JOURNEY = ["Vessel", "Gate-in", "Customs", "Yard", "Released"];
const JOURNEY_AT = [0, 0, 1, 2, 3, 3, 3, 3, 4, 4];
const OBSTACLES = [12, 13, 22, 23, 32, 33, 17, 27, 37, 45, 46];

/** Live mini-panel for each chapter. t (0..1) is progress inside the chapter. */
function Widget({ i, t }: { i: number; t: number }) {
  switch (i) {
    case 0: {
      const r = 85 * (1 - t) + 12;
      return (<>
        <div className="wh"><span>Vessel tracker</span><em>live</em></div>
        <svg viewBox="0 0 200 200" style={{ width: "100%", maxHeight: 260 }} aria-hidden="true">
          <g fill="none" stroke="currentColor" opacity=".25"><circle cx="100" cy="100" r="90" /><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="30" /><path d="M100 10V190M10 100H190" /></g>
          <path d="M100 100V10" stroke="var(--lime)" strokeWidth="2" style={{ transformOrigin: "100px 100px", animation: "sw 4s linear infinite" }} />
          <circle cx={100 + r * 0.62} cy={100 - r * 0.78} r="6" fill="var(--lime)" />
        </svg>
        <div className="kr"><span><b>MV Karachi Star</b></span><span>ETA <b>{Math.round(40 * (1 - t))}</b> min</span><span>Berth <b>B-3</b></span><span>Tugs <b>2</b></span></div>
      </>);
    }
    case 1: return (<>
      <div className="wh"><span>Shuttle route</span><em>live</em></div>
      <svg viewBox="0 0 300 80" style={{ width: "100%" }} aria-hidden="true">
        <path d="M20 40H280" stroke="currentColor" opacity=".3" strokeWidth="4" strokeDasharray="10 8" />
        <circle cx="20" cy="40" r="7" fill="currentColor" /><circle cx="280" cy="40" r="7" fill="var(--lime)" />
        <circle cx={20 + 260 * t} cy="40" r="9" fill="var(--lime)" />
        <text x="14" y="70" fontSize="11" fill="currentColor" opacity=".6">Seaport</text><text x="252" y="70" fontSize="11" fill="currentColor" opacity=".6">Dry port</text>
      </svg>
      <div className="kr"><span>Rail and truck <b>38 km</b></span><span>Trucks <b>6</b></span><span>ETA <b>55 min</b></span></div>
    </>);
    case 2: return (<>
      <div className="wh"><span>Gate 2</span><em>live</em></div>
      <ul><li><span>Barrier</span><b>{t > 0.4 ? "Open" : "Closed"}</b></li><li><span>Truck</span><b>T-88, GMT-0042</b></li><li><span>Driver check</span><b>Verified</b></li><li><span>Queue</span><b>6 in, 5 min wait</b></li></ul>
    </>);
    case 3: return (<>
      <div className="wh"><span>Customs desk</span><em>{t > 0.8 ? "Cleared" : "Hold"}</em></div>
      <ul className="ck">{["Bill of lading", "Commercial invoice", "Packing list", "Duty paid"].map((n, k) => <li key={n} className={t > (k + 1) / 5 ? "d" : ""}><span>{n}</span></li>)}</ul>
    </>);
    case 4: return (<>
      <div className="wh"><span>Yard stack, bay 3</span><em>live</em></div>
      <div className="col"><i style={{ height: "90%" }} /><i style={{ height: "70%" }} /><i style={{ height: "55%" }} className="g" /><i style={{ height: "40%" }} /><i style={{ height: "80%" }} /><i style={{ height: "60%" }} /></div>
      <p className="kr" style={{ margin: "12px 0" }}>GMT-0042 sits under three blockers.</p>
      <div className="kr"><span>Extra moves</span><span className="big2">{Math.round(7 * t)}</span></div>
    </>);
    case 5: {
      const w = Math.min(1, t * 2);
      return (<>
        <div className="wh"><span>Slot optimizer</span><em>scoring</em></div>
        {[["Bay 3, T1", 31, ""], ["Bay 5, T2", 58, ""], ["Bay 7, T2", 97, " b"]].map(([n, v, c]) => (
          <div className={"sb" + c} key={n as string}><span>{n}</span><div><i style={{ width: (v as number) * w + "%" }} /></div>{(((v as number) / 100)).toFixed(2)}</div>
        ))}
        <p className="kr" style={{ marginTop: 12 }}>Best slot <b>Bay 7, tier 2</b> and extra moves <b>0</b></p>
      </>);
    }
    case 6: return (<>
      <div className="wh"><span>A* router</span><em>live</em></div>
      <svg viewBox="0 0 284 172" style={{ width: "100%" }} aria-hidden="true">
        {Array.from({ length: 60 }, (_, k) => <rect key={k} x={(k % 10) * 28 + 4} y={Math.floor(k / 10) * 28 + 4} width="24" height="24" rx="3" fill="currentColor" opacity={OBSTACLES.includes(k) ? 0.65 : 0.12} />)}
        <path pathLength={1} d="M16 16H268V156" fill="none" stroke="var(--lime)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, t * 1.4)} />
      </svg>
    </>);
    case 7: return (<>
      <div className="wh"><span>Pickup queue</span><em>priority</em></div>
      <ul>{[["GMT-0042, T-88", "P1"], ["GMT-0017, T-31", "P2"], ["GMT-0031, T-12", "P3"], ["GMT-0009, T-77", "P4"], ["GMT-0021, T-05", "P5"]].map((r, k) => <li key={r[0]} style={{ opacity: k <= t * 5 ? 1 : 0.3 }}><span>{r[0]}</span><b>{r[1]}</b></li>)}</ul>
    </>);
    case 8: return (<>
      <div className="wh"><span>Invoice INV-0042</span><em>billing</em></div>
      <ul><li><span>Free days</span><b>5</b></li><li><span>Storage</span><b>$0</b></li><li><span>Handling</span><b>$120</b></li><li><span>Total</span><b>$120</b></li></ul>
      <p><span className="stamp" style={{ opacity: t > 0.5 ? 1 : 0 }}>PAID</span></p>
    </>);
    default: return (<>
      <div className="wh"><span>Released</span><em>done</em></div>
      <div className="kr"><span><b className="big2">68%</b><br />fewer extra moves</span><span><b className="big2">0</b><br />extra moves</span><span><b className="big2">5</b><br />days dwell</span></div>
    </>);
  }
}

/** Sticky, scroll-driven film: 10 full-screen scenes, one per chapter. Scroll position -> p (0..1). */
export function Film() {
  const film = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let tick = 0;
    const frame = () => {
      tick = 0;
      const f = film.current;
      if (f) setP(clamp(-f.getBoundingClientRect().top / (f.offsetHeight - innerHeight)));
    };
    const onScroll = () => { if (!tick) tick = requestAnimationFrame(frame); };
    frame();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", frame);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", frame); cancelAnimationFrame(tick); };
  }, []);

  const i = Math.min(9, Math.floor(p * 10)), t = p * 10 - i, s = ST[i];
  const c1 = i === 3 ? (t < 0.5 ? "Customs hold" : "Cleared") : s[3];
  const c3 = i === 4 ? Math.round(7 * t) : i === 5 ? Math.round(7 * (1 - clamp(t * 2))) : "0";
  const goTo = (top: number) => scrollTo({ top, behavior: "smooth" });

  return (
    <div id="film" ref={film}>
      <div className="stage" id="stage">
        <div id="bg" aria-hidden="true">
          {Array.from({ length: 10 }, (_, n) => (
            <img key={n} alt="" src={`/assets/scene-${String(n + 1).padStart(2, "0")}.jpg`} className={n === i ? "on" : ""}
              style={n === i ? { transform: `scale(${1.03 + 0.07 * t}) translateX(${(t - 0.5) * -1.6}%)` } : undefined} />
          ))}
        </div>
        <div id="wd">
          {Array.from({ length: 10 }, (_, n) => <div key={n} className={"w" + (n === i ? " on" : "")}><Widget i={n} t={n < i ? 1 : n > i ? 0 : t} /></div>)}
        </div>
        <div id="chs">
          {ST.map((c, n) => (
            <div className={"ch" + (n === i ? " on" : "")} key={n}>
              <p className="k">{String(n + 1).padStart(2, "0")} / 10</p>
              <h1 className="hd" role={n ? "presentation" : undefined}>{c[0]} <em>{c[1]}</em></h1>
              <p className="b">{c[2]}</p>
              {n === 0 && <p><Link className="btn p" to="/login">Enter Terminal</Link> <button className="btn" onClick={() => goTo(innerHeight * 1.02)}>Follow the journey</button></p>}
              {n === 9 && <p><Link className="btn p" to="/login">Enter Terminal</Link> <button className="btn" onClick={() => goTo(0)}>Replay the journey</button></p>}
            </div>
          ))}
        </div>
        <div className="card" aria-live="off">
          <b>GMT-0042 <span style={{ color: "var(--acc)" }}>demo</span></b>
          <div><span>Status</span><span>{c1}</span></div>
          <div><span>Location</span><span>{s[4]}</span></div>
          <div><span>Extra moves</span><span>{c3}</span></div>
          <div><span>Dwell days</span><span>{s[6]}</span></div>
        </div>
        <div className={"fl" + (i === 7 ? " on" : "")} id="q"><b>Pickup queue</b><ul><li><span>GMT-0042</span><span>P1</span></li><li><span>GMT-0017</span><span>P2</span></li><li><span>GMT-0031</span><span>P3</span></li><li><span>GMT-0009</span><span>P4</span></li></ul></div>
        <div className={"fl" + (i === 8 ? " on" : "")} id="iv"><b>Invoice INV-0042</b><ul><li><span>Free days</span><span>5</span></li><li><span>Storage</span><span>$0</span></li></ul><p><span className="stamp">PAID</span></p></div>
        <ol className="jr" id="jr" aria-label="Container journey">
          {JOURNEY.map((n, k) => <li key={n} className={k < JOURNEY_AT[i] ? "d" : k === JOURNEY_AT[i] ? "n" : ""}>{n}</li>)}
        </ol>
        <div className="chip" id="chip">{CHIPS[i]}</div>
        <div className="hint" id="sh" style={{ opacity: p > 0.02 ? 0 : 1 }}>Scroll<i /></div>
        <div className="prog"><i id="pb" style={{ width: p * 100 + "%" }} /></div>
        <div className="rail" id="rail" role="navigation" aria-label="Chapters">
          {ST.map((_, n) => <button key={n} aria-label={`Chapter ${n + 1}`} className={n === i ? "on" : ""} onClick={() => goTo((film.current?.offsetTop ?? 0) + n * innerHeight)}>{n + 1}</button>)}
        </div>
      </div>
    </div>
  );
}
