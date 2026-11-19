import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROLES } from "@/lib/auth";
import { GROUPS, PAGES } from "@/lib/data";
import { useApp } from "@/store/useApp";
import { Pill } from "@/components/app/ui";
import { CommandPalette } from "@/components/app/CommandPalette";

/** Sidebar + top bar for every signed-in page. Handles the login redirect and role-based access. */
export function AppShell() {
  const role = useApp((s) => s.role), signOut = useApp((s) => s.signOut);
  const { pathname } = useLocation(), nav = useNavigate();
  const [palette, setPalette] = useState(false), [alerts, setAlerts] = useState(false);
  const slug = pathname.replace(/^\//, "");
  const page = PAGES.find((p) => p.path === slug);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && role) { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") setPalette(false);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [role]);
  useEffect(() => setAlerts(false), [pathname]);

  if (!role) return <Navigate to={"/login?next=" + encodeURIComponent(slug)} replace />;
  if (!page) return (
    <main id="main"><h2>Page not found</h2><p className="sub">That address does not exist.</p><Link className="btn p" to="/">Back to home</Link></main>
  );
  const ok = page.roles.includes(role);
  const out = () => { signOut(); nav("/login"); };

  return (
    <div className="app">
      <aside className="side">
        <Link className="logo" to="/" style={{ display: "block" }}>SmartPort<i>.</i></Link>
        <span className="pill">{ROLES[role]}</span>
        {GROUPS.map((g) => (
          <div key={g}>
            <h4>{g}</h4>
            {PAGES.filter((x) => x.group === g && x.roles.includes(role)).map((x) => (
              <Link key={x.path} to={"/" + x.path} className={x.path === slug ? "on" : ""}>{x.title}</Link>
            ))}
          </div>
        ))}
        <h4>Account</h4>
        <Link to="/">Home</Link>
      </aside>
      <main id="main">
        <div className="tb">
          <span className="crumb">SmartPort / {page.group} / {page.title}</span>
          <span>
            <button className="btn" onClick={() => setPalette(true)}>Search  Ctrl+K</button>{" "}
            <button className="btn" onClick={() => setAlerts((v) => !v)}>Alerts</button>{" "}
            <button className="btn" onClick={out}>Sign out</button>
          </span>
        </div>
        <div id="np" hidden={!alerts}>
          <b>Notifications</b>
          <p><Pill kind="w">Customs hold</Pill> GMT-0019 awaiting clearance</p>
          <p><Pill kind="ok">Gate</Pill> Truck T-88 checked in</p>
          <p><Pill kind="x">Crane</Pill> Crane 4 in maintenance</p>
        </div>
        <h2>{ok ? page.title : "Access denied"}</h2>
        <p className="sub">{ok ? page.desc : `The ${ROLES[role]} role cannot open ${page.title}. Ask an admin for access.`}</p>
        {ok ? <Outlet /> : <Link className="btn p" to="/dashboard">Go to dashboard</Link>}
      </main>
      <CommandPalette role={role} open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
