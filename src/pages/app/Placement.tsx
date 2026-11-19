import { useState } from "react";
import { SuggestionResult } from "@/components/app/SuggestionResult";
import { Table } from "@/components/app/ui";
import { suggest, type Suggestion } from "@/lib/data";
import { useApp } from "@/store/useApp";

export function Placement() {
  const { yard, pending, place } = useApp();
  const [sugg, setSugg] = useState<Suggestion | null | undefined>(undefined);
  const ask = (p: number) => { const s = suggest(yard, 1 + Math.floor(Math.random() * 10)); setSugg(s && { ...s, p }); };
  const confirm = () => {
    if (!sugg || sugg.p == null) return;
    place({ id: pending[sugg.p], col: sugg.col, hazard: false, fromPending: sugg.p });
    setSugg(undefined);
  };
  return (
    <div className="two">
      <div>
        <Table head={["Pending", "Action"]} rows={pending.map((p, i) => [p, <button className="btn" onClick={() => ask(i)}>Suggest</button>])} empty="All pending containers are placed." />
      </div>
      <SuggestionResult sugg={sugg} empty="Pick a container to see its best slot." onConfirm={confirm} />
    </div>
  );
}
