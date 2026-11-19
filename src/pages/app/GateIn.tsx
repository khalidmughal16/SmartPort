import { useState } from "react";
import { SuggestionResult } from "@/components/app/SuggestionResult";
import { suggest, type Suggestion } from "@/lib/data";
import { useApp } from "@/store/useApp";

export function GateIn() {
  const { yard, place } = useApp();
  const [cn, setCn] = useState(""), [type, setType] = useState("40 ft HC"), [hz, setHz] = useState(false);
  const [sugg, setSugg] = useState<Suggestion | null | undefined>(undefined);
  const confirm = () => {
    if (!sugg) return;
    place({ id: cn.trim().toUpperCase() || "GMT-0060", col: sugg.col, hazard: hz });
    setSugg(undefined); setCn("");
  };
  return (
    <div className="two">
      <div>
        <label htmlFor="cn">Container number</label>
        <input id="cn" value={cn} onChange={(e) => setCn(e.target.value)} placeholder="GMT-0060" />
        <label htmlFor="ty">Type</label>
        <select id="ty" value={type} onChange={(e) => setType(e.target.value)}><option>40 ft HC</option><option>20 ft</option><option>Reefer</option></select>
        <label><input type="checkbox" checked={hz} onChange={(e) => setHz(e.target.checked)} style={{ marginRight: 8 }} />Hazardous cargo</label>
        <p><button className="btn p" onClick={() => setSugg(suggest(yard, 1 + Math.floor(Math.random() * 10), hz))}>Suggest slot</button></p>
      </div>
      <SuggestionResult sugg={sugg} empty="Suggestions appear here with the bay, tier and reason." onConfirm={confirm} />
    </div>
  );
}
