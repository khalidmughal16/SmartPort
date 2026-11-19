import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./roles.css";
import { Component as HeroScrollAnimation } from "@/components/ui/hero-scroll-animation";
import { RoleCard } from "@/components/ui/role-card";
import { PAGES, ROLE_KEYS } from "@/lib/data";
import { Film } from "./Film";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { DashboardPreview } from "./DashboardPreview";

const FAQ: [string, string][] = [
  ["What is a dry port?", "An inland container terminal linked to a seaport by rail or road. It clears cargo away from the coast and keeps the seaport moving."],
  ["What does the optimizer do?", "It scores every free slot and picks the one that blocks the fewest containers, so later pickups need fewer extra crane moves."],
  ["Can a container leave without customs clearance?", "No. Release is blocked until customs is cleared and storage dues are paid."],
  ["Who can use SmartPort?", "Five roles: Admin, Gate Officer, Yard Supervisor, Documentation Clerk and Billing Clerk. Each one sees only the pages they need."],
  ["Is this real data?", "No. This is a frontend demo with sample data. Accounts and changes reset when the page reloads."],
];
const MODULES = ["Smart Placement", "Yard Map", "Gate-In", "Appointments", "Crane Dispatch", "A* Router", "Customs Control", "Container Tracker", "Billing", "Reports"];

/** Fixed top bar with the "Platform" dropdown. */
function Nav({ onJourney, onRoles }: { onJourney: () => void; onRoles: () => void }) {
  const [open, setOpen] = useState(false), dd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const click = (e: MouseEvent) => { if (!dd.current?.contains(e.target as Node) || (e.target as HTMLElement).closest(".menu a")) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", click); addEventListener("keydown", key);
    return () => { document.removeEventListener("click", click); removeEventListener("keydown", key); };
  }, []);
  return (
    <nav className="top" id="nav">
      <a className="logo" href="#home" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }}>SmartPort<i>.</i></a>
      <div className="nl">
        <a className="btn h" href="#journey" style={{ border: 0 }} onClick={(e) => { e.preventDefault(); onJourney(); }}>Journey</a>
        <div className={"dd h" + (open ? " open" : "")} ref={dd}>
          <button aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>Platform</button>
          <div className="menu" id="menu">{PAGES.map((p) => <Link key={p.path} to={"/" + p.path}>{p.title}<small>{p.desc}</small></Link>)}</div>
        </div>
        <a className="btn h" href="#roles" style={{ border: 0 }} onClick={(e) => { e.preventDefault(); onRoles(); }}>Roles</a>
        <Link className="btn h" to="/login">Sign in</Link>
        <Link className="btn p" to="/login">Enter Terminal</Link>
      </div>
    </nav>
  );
}

/** Scrolling strip of module names; slows down on hover. */
function Marquee() {
  const track = useRef<HTMLDivElement>(null);
  const rate = (r: number) => track.current?.getAnimations().forEach((a) => { a.playbackRate = r; });
  const items = MODULES.map((n) => <span className="lci" key={n}>{n}</span>);
  return (
    <div className="lcm">
      <div className="lct" id="lct" aria-hidden="true" ref={track} onMouseEnter={() => rate(25 / 80)} onMouseLeave={() => rate(1)}>{items}{items.map((x) => ({ ...x, key: x.key + "2" }))}</div>
    </div>
  );
}

export function Landing() {
  const { hash } = useLocation();
  const roles = useRef<HTMLElement>(null);
  const journey = () => scrollTo({ top: innerHeight * 1.02, behavior: "smooth" });
  const toRoles = () => roles.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { if (hash === "#journey") journey(); else if (hash === "#roles") toRoles(); else scrollTo(0, 0); }, [hash]);

  return (
    <>
      <a href="#features" style={{ position: "absolute", left: -999 }} onFocus={(e) => (e.currentTarget.style.left = "8px")}>Skip to content</a>
      <Nav onJourney={journey} onRoles={toRoles} />
      <div id="home">
        <Film />
        {/* hidden by the stylesheet (#film + .sec); kept so the markup matches the original page */}
        <section className="sec">
          <p className="k">Smarter moves, stronger connections</p><h2>Built for the next generation of inland logistics.</h2>
          <div className="gr">
            <div className="tile"><span className="big">68%</span><small>Fewer extra moves in the demo comparison</small></div>
            <div className="tile"><span className="big">13</span><small>Connected operational views</small></div>
            <div className="tile"><span className="big">1</span><small>Terminal for every role and every container</small></div>
          </div>
        </section>

        <HeroScrollAnimation />

        <section className="sec" id="features"><p className="k">What SmartPort does</p><h2>Everything a dry port needs, in <em>one terminal</em>.</h2><Features /></section>
        <section className="sec" id="how"><p className="k">How it works</p><h2>From arrival to release in <em>four steps</em>.</h2><HowItWorks /></section>
        <section className="sec" id="preview"><p className="k">Inside the terminal</p><h2>One dashboard. <em>Every move</em> visible.</h2><DashboardPreview /></section>
        <section className="sec" id="roles" ref={roles}>
          <h2>Five roles. One <em>shared mission</em>.</h2>
          <div className="gr tw-root" id="rg">{ROLE_KEYS.map((k) => <RoleCard key={k} k={k} />)}</div>
        </section>
        <section className="sec" id="faq">
          <h2>Questions, <em>answered</em>.</h2>
          <div className="fqs">{FAQ.map(([q, a]) => <details className="fq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>
        <section className="sec lc" aria-label="SmartPort modules">
          <h2><span>Built for every move.</span><br /><b>One platform. Every module.</b></h2>
          <div className="lcl"></div><Marquee /><div className="lcl" style={{ maxWidth: "none", marginTop: 20 }}></div>
        </section>
        <section className="sec cta">
          <h2>Ready to move <em>smarter</em>?</h2><p className="sub">Open the terminal and follow GMT-0042 yourself.</p>
          <p><Link className="btn p" to="/login">Enter Terminal</Link> <Link className="btn" to="/signup">Create account</Link></p>
        </section>
        <footer className="ft2">
          <div className="fcols">
            <div><b style={{ color: "var(--fg)" }}>SmartPort.</b><p>Smarter moves, from start to finish. A dry-port management demo.</p></div>
            <div><b style={{ color: "var(--fg)" }}>Platform</b>{PAGES.filter((p) => ["dashboard", "yard-map", "containers", "appointments", "reports"].includes(p.path)).map((p) => <Link key={p.path} to={"/" + p.path}>{p.title}</Link>)}</div>
            <div><b style={{ color: "var(--fg)" }}>Account</b><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link>
              <a href="#roles" onClick={(e) => { e.preventDefault(); toRoles(); }}>Roles</a><a href="#faq">FAQ</a></div>
          </div>
          <p style={{ marginTop: 24 }}>&copy; 2026 SmartPort. Demo project.</p>
        </footer>
      </div>
    </>
  );
}
