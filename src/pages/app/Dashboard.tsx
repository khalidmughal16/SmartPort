import { useState } from "react";
import { Bars, Kpis, Pill } from "@/components/app/ui";
import { due } from "@/lib/data";
import { useApp } from "@/store/useApp";

const VESSELS: [string, number, string][] = [["MV Karachi Star", 82, "ETA 40 min"], ["MV Indus Trader", 45, "ETA 2 h"], ["MV Sindh Pearl", 12, "ETA 6 h"]];
const BERTHS: [string, [number, number, string][]][] = [
  ["B-1", [[0, 30, "Harbor Lark"], [40, 35, "Indus Trader"]]], ["B-2", [[10, 45, "Sindh Pearl"]]], ["B-3", [[0, 55, "Karachi Star"], [60, 30, "Reserved"]]],
];
const CRANES: [string, string, number][] = [["Crane 1", "Working", 32], ["Crane 2", "Working", 28], ["Crane 3", "Idle", 0], ["Crane 4", "Maintenance", 0]];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"], MANUAL = [22, 18, 25, 20, 24], SMART = [7, 6, 8, 6, 7];

function TrackContainer() {
  const containers = useApp((s) => s.containers);
  const [q, setQ] = useState(""), [done, setDone] = useState(false);
  const c = containers.find((x) => x.id === q.trim().toUpperCase());
  const cur = c ? (c.st === "Released" ? 4 : c.cus === "Cleared" ? 3 : 2) : 0;
  return (
    <div className="tile">
      <b>Track a container</b>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setDone(false); }} onKeyDown={(e) => e.key === "Enter" && setDone(true)}
          placeholder="GMT-0017" aria-label="Container number" style={{ flex: 1 }} />
        <button className="btn p" onClick={() => setDone(true)}>Track</button>
      </div>
      {done && (c ? (
        <>
          <ol className="stp">{["Vessel", "Gate-in", "Customs", "Yard", "Released"].map((n, i) => <li key={n} className={i < cur ? "d" : i === cur ? "n" : ""}>{n}</li>)}</ol>
          <p className="sub">{c.id}: {c.zone} zone, slot {c.slot}, dwell {c.d} days.</p>
        </>
      ) : <p className="sub">No container found. Try {containers[0].id}.</p>)}
    </div>
  );
}

export function Dashboard() {
  const containers = useApp((s) => s.containers);
  return (
    <>
      <Kpis items={[
        [containers.filter((c) => c.st === "In yard").length + 200, "Containers in yard"],
        [containers.filter((c) => c.d > 5).length, "Past free days"],
        [12, "Gate-ins today"],
        ["$" + containers.reduce((s, c) => s + due(c), 0), "Storage dues open"],
      ]} />
      <div className="two">
        <div className="tile">
          <b>Extra moves: manual vs optimized</b>
          {DAYS.map((d, i) => <Bars key={d} max={25} rows={[[d + " manual", MANUAL[i]], [d + " smart", SMART[i], true]]} />)}
        </div>
        <div className="tile">
          <b>Alerts</b>
          <p><Pill kind="w">Customs hold</Pill> GMT-0019 waits for clearance.</p>
          <p><Pill kind="x">Overdue</Pill> {containers.filter((c) => c.d > 7).length} containers beyond 7 days.</p>
          <p><Pill kind="ok">Gate</Pill> Queue under 6 minutes.</p>
        </div>
      </div>
      <div className="wg">
        <div className="tile">
          <b>Vessels approaching</b>
          {VESSELS.map((v) => <div className="bar" key={v[0]}><span style={{ width: 120 }}>{v[0]}</span><i className="l" style={{ width: v[1] * 0.5 + "%" }} />{v[2]}</div>)}
        </div>
        <div className="tile">
          <b>Tide and weather</b>
          <div className="kp" style={{ margin: "10px 0 0" }}>
            <div><b>1.2 m</b><span>Tide, rising</span></div><div><b>8 kn</b><span>Wind NW</span></div><div><b>9 km</b><span>Visibility</span></div>
          </div>
        </div>
        <div className="tile" style={{ gridColumn: "1/-1" }}>
          <b>Berth schedule, 24 h</b>
          {BERTHS.map((b) => (
            <div className="gt" key={b[0]}><span>{b[0]}</span><div>{b[1].map((x) => <i key={x[2]} style={{ left: x[0] + "%", width: x[1] + "%" }}>{x[2]}</i>)}</div></div>
          ))}
        </div>
        <div className="tile" style={{ gridColumn: "1/-1" }}>
          <b>Crane status</b>
          <div className="gr" style={{ marginTop: 10 }}>
            {CRANES.map((c) => (
              <div className="tile" key={c[0]}><b>{c[0]}</b><p><Pill kind={c[1] === "Working" ? "ok" : c[1] === "Idle" ? "" : "x"}>{c[1]}</Pill></p><span className="sub">{c[2]} moves per hour</span></div>
            ))}
          </div>
        </div>
        <div className="tile">
          <b>Gate queue</b>
          <div className="kp" style={{ margin: "10px 0 0" }}>
            <div><b>6</b><span>Trucks in, 5 min wait</span></div><div><b>3</b><span>Trucks out, 2 min wait</span></div>
          </div>
        </div>
        <TrackContainer />
      </div>
    </>
  );
}
