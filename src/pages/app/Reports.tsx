import { useState } from "react";
import { Bars, Table } from "@/components/app/ui";
import { simulate } from "@/lib/data";

export function Reports() {
  const [tab, setTab] = useState(0), [sim, setSim] = useState<[number, number] | null>(null);
  return (
    <>
      <div className="tabs" role="tablist">
        {["Placement", "Gate activity", "Revenue"].map((n, i) => (
          <button key={n} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{n}</button>
        ))}
      </div>
      {tab === 1 && <Table head={["Day", "In", "Out"]} rows={[["Mon", 42, 38], ["Tue", 51, 47], ["Wed", 39, 44]]} />}
      {tab === 2 && <Bars max={600} rows={[["Storage", 320], ["Handling", 540, true], ["Gate fees", 180]]} />}
      {tab === 0 && (
        <div>
          <button className="btn p" onClick={() => setSim(simulate())}>{sim ? "Run again" : "Run the comparison"}</button>
          {sim ? (
            <div className="tile" style={{ marginTop: 14 }}>
              <Bars max={Math.max(1, sim[0])} rows={[["Random", sim[0]], ["Smart", sim[1], true]]} />
              <p><b>{sim[0] - sim[1]}</b> extra moves saved over 40 containers ({Math.round((1 - sim[1] / Math.max(1, sim[0])) * 100)}% fewer).</p>
            </div>
          ) : <p className="sub" style={{ marginTop: 14 }}>Compare random placement with the smart slot rule on 40 containers.</p>}
        </div>
      )}
    </>
  );
}
