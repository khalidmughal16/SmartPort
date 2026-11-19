import { useState } from "react";
import { Overlay } from "@/components/app/ui";
import { DAYS7 } from "@/lib/data";
import { useApp } from "@/store/useApp";

export function Appointments() {
  const { slotsByDay, book } = useApp();
  const [day, setDay] = useState(0), [ticket, setTicket] = useState<{ time: string; no: number; qr: boolean[] } | null>(null);
  const slots = slotsByDay[day];
  const openTicket = (i: number) => setTicket({ time: slots[i][0], no: 1000 + Math.floor(Math.random() * 9000), qr: Array.from({ length: 49 }, () => Math.random() > 0.5) });
  return (
    <>
      <div className="tabs">{DAYS7.map((d, i) => <button key={d} className={day === i ? "on" : ""} onClick={() => setDay(i)}>{d}</button>)}</div>
      <div className="gr">
        {slots.map((s, i) => (
          <div className="tile" key={s[0]}>
            <b>{s[0]}</b><p>{s[1]} of 3 trucks</p>
            <button className={"btn " + (s[1] < 3 ? "p" : "")} disabled={s[1] >= 3} onClick={() => book(day, i)}>{s[1] >= 3 ? "Full" : "Book slot"}</button>{" "}
            {s[1] > 0 && <button className="btn" onClick={() => openTicket(i)}>Ticket</button>}
          </div>
        ))}
      </div>
      <Overlay open={!!ticket} mode="md" onClose={() => setTicket(null)}>
        {ticket && (
          <div id="tick">
            <h3>Gate ticket</h3>
            <p><b>{ticket.time}</b> slot, Gate 2</p>
            <p>Ticket TK-{ticket.no}</p>
            <div className="qr">{ticket.qr.map((on, i) => <i key={i} style={{ opacity: on ? 1 : 0.1 }} />)}</div>
            <button className="btn p x" onClick={() => print()}>Print ticket</button>
          </div>
        )}
      </Overlay>
    </>
  );
}
