import { useNavigate } from "react-router-dom";
import { ROLES } from "@/lib/auth";
import { PAGES } from "@/lib/data";
import { useApp } from "@/store/useApp";

export function Profile() {
  const { role, user, signOut } = useApp(), nav = useNavigate();
  if (!role) return null;
  return (
    <div className="tile" style={{ maxWidth: 420 }}>
      <b>{user ? user.n : ROLES[role]}</b>
      <p className="sub">{user ? user.e + ", " : ""}{ROLES[role]}. Access: {PAGES.filter((p) => p.roles.includes(role)).map((p) => p.title).join(", ")}.</p>
      <button className="btn" onClick={() => { signOut(); nav("/login"); }}>Sign out</button>
    </div>
  );
}
