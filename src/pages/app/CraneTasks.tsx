import { Pill, Table } from "@/components/app/ui";
import { useApp } from "@/store/useApp";

export function CraneTasks() {
  const { tasks, escalate } = useApp();
  const sorted = tasks.map((t, i) => ({ t, i })).sort((a, b) => b.t[1] - a.t[1]);
  return (
    <Table head={["Priority", "Task", ""]} rows={sorted.map(({ t, i }) => [
      <Pill kind={t[1] >= 5 ? "x" : t[1] >= 4 ? "w" : ""}>{"P" + t[1]}</Pill>, t[0],
      <button className="btn" onClick={() => escalate(i)}>Escalate</button>,
    ])} />
  );
}
