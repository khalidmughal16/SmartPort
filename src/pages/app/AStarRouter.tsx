import { useMemo, useState } from "react";
import { astar, randomObstacles } from "@/lib/data";

export function AStarRouter() {
  const [ob, setOb] = useState(randomObstacles);
  const r = useMemo(() => astar(ob), [ob]);
  return (
    <>
      <div className="grid">{ob.map((o, i) => <i key={i} className={o ? "o" : r.path.has(i) ? "p" : ""} />)}</div>
      <p className="sub" style={{ marginTop: 12 }}>{r.steps < 1e9 ? `Shortest clear path: ${r.steps} steps.` : "No clear path. Generate new obstacles."}</p>
      <button className="btn p" onClick={() => setOb(randomObstacles())}>New obstacles</button>
    </>
  );
}
