import { Pill, Table } from "@/components/app/ui";
import { due } from "@/lib/data";
import { useApp } from "@/store/useApp";

export function CustomsBilling() {
  const { containers, clearCustoms, pay, release } = useApp();
  return (
    <Table head={["Container", "Customs", "Dwell", "Dues", "Actions"]} rows={containers.map((c, i) => [
      c.id, <Pill kind={c.cus === "Cleared" ? "ok" : "w"}>{c.cus}</Pill>, c.d + " d", "$" + due(c) + (c.paid ? " (paid)" : ""),
      <>
        <button className="btn" onClick={() => clearCustoms([i])}>Clear</button>{" "}
        <button className="btn" onClick={() => pay(i)}>Pay</button>{" "}
        <button className="btn p" onClick={() => release(i)}>Release</button>
      </>,
    ])} />
  );
}
