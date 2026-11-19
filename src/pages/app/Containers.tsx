import { useState } from "react";
import { Overlay, Pill, Steps, Table } from "@/components/app/ui";
import { due, type Container } from "@/lib/data";
import { useApp } from "@/store/useApp";

function Details({ c }: { c: Container }) {
  const ev: [string, string][] = [
    ["Vessel discharged", "Day 0"], ["Gate-in recorded", "Day 1"],
    ["Customs " + (c.cus === "Cleared" ? "cleared" : "on hold"), "Day 2"], ["Placed at " + c.slot, "Day 2"],
  ];
  if (c.st === "Released") ev.push(["Released", "Day " + c.d]);
  return (
    <>
      <svg viewBox="0 0 240 100" width="100%" aria-hidden="true">
        <rect x="6" y="10" width="228" height="76" rx="4" fill="currentColor" opacity=".22" />
        {Array.from({ length: 19 }, (_, k) => <line key={k} x1={18 + k * 11} y1="14" x2={18 + k * 11} y2="82" stroke="currentColor" opacity=".25" />)}
        <rect x="6" y="40" width="228" height="14" fill="var(--lime)" />
        <text x="120" y="51" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0A0B0A">{c.id}</text>
        <rect x="24" y="86" width="20" height="6" fill="currentColor" /><rect x="196" y="86" width="20" height="6" fill="currentColor" />
      </svg>
      <h3>{c.id}</h3>
      <p className="sub">{c.zone} zone, {c.d} days in yard, dues ${due(c)}</p>
      <ol className="tl">{ev.map((x) => <li key={x[0]}><b>{x[0]}</b><span>{x[1]}</span></li>)}</ol>
    </>
  );
}

type Draft = { n: string; t: string; h: boolean; cn: string };
const EMPTY: Draft = { n: "", t: "40 ft HC", h: false, cn: "" };

function AddWizard({ onDone }: { onDone: () => void }) {
  const { addContainer, showToast } = useApp();
  const [step, setStep] = useState(0), [f, setF] = useState<Draft>(EMPTY);
  const set = (p: Partial<Draft>) => setF((x) => ({ ...x, ...p }));
  const next = () => { if (step === 0 && !f.n.trim()) return showToast("Enter a container number.", true); setStep(step + 1); };
  const finish = () => {
    const id = f.n.trim().toUpperCase();
    addContainer({ id, d: 0, cus: "Hold", paid: false, zone: f.h ? "Hazard" : "Standard", st: "In yard", slot: "B1-R1-T1" });
    showToast(id + " added"); onDone();
  };
  return (
    <>
      <h3>Add container</h3>
      <Steps names={["Details", "Cargo", "Review"]} cur={step} numbered />
      {step === 0 && <>
        <label htmlFor="an">Container number</label>
        <input id="an" value={f.n} onChange={(e) => set({ n: e.target.value })} placeholder="GMT-0070" />
        <label htmlFor="at">Type</label>
        <select id="at" value={f.t} onChange={(e) => set({ t: e.target.value })}>{["40 ft HC", "20 ft", "Reefer"].map((t) => <option key={t}>{t}</option>)}</select>
      </>}
      {step === 1 && <>
        <label><input type="checkbox" checked={f.h} onChange={(e) => set({ h: e.target.checked })} /> Hazardous cargo (special zone only)</label>
        <label htmlFor="ac">Consignee</label>
        <input id="ac" value={f.cn} onChange={(e) => set({ cn: e.target.value })} placeholder="Company name" />
      </>}
      {step === 2 && <>
        <p><b>{f.n.trim().toUpperCase()}</b>, {f.t}</p>
        <p className="sub">{f.h ? "Hazardous, goes to the special zone" : "Standard zone"}. Consignee: {f.cn || "not set"}.</p>
      </>}
      <p style={{ marginTop: 14 }}>
        {step > 0 && <><button className="btn" onClick={() => setStep(step - 1)}>Back</button>{" "}</>}
        {step < 2 ? <button className="btn p" onClick={next}>Next</button> : <button className="btn p" onClick={finish}>Add container</button>}
      </p>
    </>
  );
}

export function Containers() {
  const { containers, clearCustoms, showToast } = useApp();
  const [q, setQ] = useState(""), [sel, setSel] = useState<number[]>([]);
  const [detail, setDetail] = useState<number | null>(null), [adding, setAdding] = useState(false);
  const rows = containers.map((c, i) => ({ c, i })).filter(({ c }) => (c.id + c.zone + c.slot + c.st).toLowerCase().includes(q.toLowerCase()));
  const bulk = () => {
    if (!sel.length) return showToast("Select containers first.", true);
    clearCustoms(sel); setSel([]);
  };
  return (
    <>
      <input id="flt" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by number, zone or status" aria-label="Filter containers" style={{ marginBottom: 12, width: "min(360px,100%)" }} />{" "}
      <button className="btn p" onClick={() => setAdding(true)}>Add container</button>{" "}
      <button className="btn" onClick={bulk}>Clear customs for selected</button>
      <div id="ct">
        <Table head={["", "Container", "Zone", "Slot", "Dwell", "Status", ""]} rows={rows.map(({ c, i }) => [
          <input type="checkbox" className="bk" aria-label={`Select ${c.id}`} checked={sel.includes(i)} onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />,
          c.id, c.zone, c.slot, c.d + " d", <Pill kind={c.st === "Released" ? "ok" : ""}>{c.st}</Pill>,
          <button className="btn" onClick={() => setDetail(i)}>Details</button>,
        ])} />
      </div>
      <Overlay open={detail !== null} onClose={() => setDetail(null)}>{detail !== null && containers[detail] && <Details c={containers[detail]} />}</Overlay>
      <Overlay open={adding} mode="md" onClose={() => setAdding(false)}><AddWizard onDone={() => setAdding(false)} /></Overlay>
    </>
  );
}
