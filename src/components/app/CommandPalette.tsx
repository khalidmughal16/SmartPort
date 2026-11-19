import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PAGES } from "@/lib/data";

export function CommandPalette({ role, open, onClose }: { role: string; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); input.current?.focus(); } }, [open]);
  const list = PAGES.filter((p) => p.roles.includes(role) && (p.title + p.desc).toLowerCase().includes(q.toLowerCase()));
  return (
    <div id="cp" hidden={!open} onClick={(e) => (e.target === e.currentTarget || (e.target as HTMLElement).closest("a")) && onClose()}>
      <div className="cpb" role="dialog" aria-label="Command palette">
        <input id="cpi" ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to a page" aria-label="Search pages" />
        <div id="cpl">
          {list.length ? list.map((p) => <Link key={p.path} to={"/" + p.path}>{p.title}<small>{p.desc}</small></Link>) : <p className="sub">No match</p>}
        </div>
      </div>
    </div>
  );
}
