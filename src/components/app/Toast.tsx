import { useApp } from "@/store/useApp";

export function Toast() {
  const t = useApp((s) => s.toast);
  return (
    <div id="toast" role="status" aria-live="polite" className={t.on ? "on" : ""}
      style={t.bad ? { background: "var(--bad)", color: "#0A0B0A" } : undefined}>{t.msg}</div>
  );
}
