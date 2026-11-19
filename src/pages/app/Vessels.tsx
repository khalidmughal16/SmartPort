import { useRef, useState } from "react";
import { Bars, Table } from "@/components/app/ui";
import { useApp } from "@/store/useApp";

const SAMPLE = [["Container", "Type", "Weight kg", "Consignee"], ["GMT-0101", "40 ft HC", "21400", "Indus Traders"], ["GMT-0102", "20 ft", "9800", "Sindh Foods"], ["GMT-0103", "Reefer", "18200", "Pearl Exports"]];

export function Vessels() {
  const showToast = useApp((s) => s.showToast);
  const [rows, setRows] = useState<string[][] | null>(null), [hover, setHover] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const load = (r: string[][]) => { setRows(r); showToast(`${r.length - 1} containers in manifest`); };
  const readFile = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => load(String(rd.result).trim().split(/\r?\n/).slice(0, 40).map((l) => l.split(",").map((x) => x.trim())));
    rd.readAsText(f);
  };
  return (
    <>
      <Table head={["Vessel", "ETA", "Containers", "Berth"]} rows={[["MV Karachi Star", "Mon 06:00", 412, "B-3"], ["MV Indus Trader", "Tue 14:00", 268, "B-1"], ["MV Sindh Pearl", "Thu 09:00", 530, "B-2"], ["MV Harbor Lark", "Sat 18:00", 190, "B-3"]]} />
      <h3>Schedule</h3>
      <Bars max={50} rows={[["Mon", 30], ["Tue", 20, true], ["Thu", 44], ["Sat", 14]]} />
      <h3>Manifest</h3>
      <div className={"dz" + (hover ? " hv" : "")} tabIndex={0} role="button"
        onClick={() => file.current?.click()} onKeyDown={(e) => e.key === "Enter" && file.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }} onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}>
        Drop a CSV manifest here or click to choose
      </div>
      <input ref={file} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
      <p><button className="btn" onClick={() => load(SAMPLE)}>Load sample manifest</button></p>
      {rows && <div id="mr"><Table head={rows[0]} rows={rows.slice(1)} /></div>}
    </>
  );
}
