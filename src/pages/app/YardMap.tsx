import { useState } from "react";
import { useApp } from "@/store/useApp";

/** Isometric 3D view of the yard stacks. `random` shows the unoptimised layout. */
function Iso({ heights, random }: { heights: number[]; random: boolean }) {
  const R = 3, cubes: JSX.Element[] = [];
  for (let d = 0; d < 8 + R; d++) for (let c = 0; c < 8; c++) {
    const r = d - c;
    if (r < 0 || r >= R) continue;
    const n = Math.max(1, Math.min(4, heights[c] + ((c * 7 + r * 5) % 3) - 1));
    for (let t = 0; t < n; t++) {
      const x = (c - r) * 30 + 270, y = (c + r) * 15 + 90 - t * 18, g = !random && c === 6 && r === 0 && t === n - 1, f = g ? "var(--lime)" : "var(--fg)";
      cubes.push(
        <g key={`${c}-${r}-${t}`}>
          <polygon points={`${x},${y - 15} ${x + 30},${y} ${x},${y + 15} ${x - 30},${y}`} fill={f} opacity={g ? 1 : 0.55} />
          <polygon points={`${x - 30},${y} ${x},${y + 15} ${x},${y + 33} ${x - 30},${y + 18}`} fill={f} opacity={g ? 0.8 : 0.3} />
          <polygon points={`${x},${y + 15} ${x + 30},${y} ${x + 30},${y + 18} ${x},${y + 33}`} fill={f} opacity={g ? 0.6 : 0.18} />
        </g>,
      );
    }
  }
  return <svg viewBox="0 0 540 300" role="img" aria-label="3D yard view" style={{ width: "100%", maxWidth: 640 }}>{cubes}</svg>;
}

export function YardMap() {
  const yard = useApp((s) => s.yard);
  const [random, setRandom] = useState(false), [threeD, setThreeD] = useState(false), [info, setInfo] = useState("");
  const heights = random ? [4, 1, 4, 2, 4, 1, 3, 4] : yard.map((s) => s.length);
  const pick = (c: number) => setInfo(`Bay ${c + 1}: ` + (yard[c].length ? `${yard[c].length} containers, top leaves on day ${yard[c][yard[c].length - 1]}` : "empty"));
  return (
    <>
      <p>
        <button className={"btn " + (random ? "" : "p")} onClick={() => setRandom(false)}>After: smart placement</button>{" "}
        <button className={"btn " + (random ? "p" : "")} onClick={() => setRandom(true)}>Before: random placement</button>
      </p>
      <p>
        <button className={"btn " + (threeD ? "" : "p")} onClick={() => setThreeD(false)}>Heatmap</button>{" "}
        <button className={"btn " + (threeD ? "p" : "")} onClick={() => setThreeD(true)}>3D view</button>
      </p>
      {threeD && <Iso heights={heights} random={random} />}
      <div className="hm" style={threeD ? { display: "none" } : undefined}>
        {heights.map((n, c) => <button key={c} aria-label={`Bay ${c + 1}`} onClick={() => pick(c)} style={{ opacity: 0.2 + n * 0.2 }}>{n}</button>)}
      </div>
      <p className="sub">Illustrative demo: {random ? "many blockers, about 18 extra moves" : "blockers avoided, about 6 extra moves"}.</p>
      <p className="sub" style={{ marginTop: 14 }}>{info || "Select a bay to see its stack. Brighter means taller."}</p>
    </>
  );
}
