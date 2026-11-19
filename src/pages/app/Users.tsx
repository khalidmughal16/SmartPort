import { Table } from "@/components/app/ui";
import { ROLES } from "@/lib/auth";
import { PAGES } from "@/lib/data";

export function Users() {
  const cols = PAGES.slice(0, 7);
  return (
    <Table head={["Role", "Name", ...cols.map((p) => p.title)]}
      rows={Object.keys(ROLES).map((k) => [ROLES[k], "Demo " + ROLES[k], ...cols.map((p) => (p.roles.includes(k) ? "Yes" : "-"))])} />
  );
}
