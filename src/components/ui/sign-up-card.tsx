'use client'
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from "@/store/useApp";
import { Mail, Lock, Eye, EyeClosed, User, ShieldCheck, KeyRound } from 'lucide-react';
import { GlassCard } from "@/components/ui/glass-card";
import { Field } from "@/components/ui/auth-field";
import { AuthShell, CardHeader, SubmitButton, FormError } from "@/components/ui/auth-shell";
import { ROLES, ADMIN_CODE, EMAIL_RE, signup, nextPath, strength, type User as AuthUser } from "@/lib/auth";

const LABEL = ["", "Weak", "Okay", "Good", "Strong"];

export function Component() {
  const nav = useNavigate(), loc = useLocation(), signIn = useApp((s) => s.signIn);
  const finish = (u: AuthUser) => { signIn(u.r, { n: u.n, e: u.e }); nav(nextPath(loc.search), { replace: true }); };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("G");
  const [invite, setInvite] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const s = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase(), nm = name.trim();
    if (nm.length < 2) return setError("Enter your full name.");
    if (!EMAIL_RE.test(em)) return setError("Enter a valid email address.");
    if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) return setError("Use 8+ characters with a letter and a number.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (role === "A" && invite.trim() !== ADMIN_CODE) return setError("Admin accounts need the invite code " + ADMIN_CODE + ".");
    setError(""); setIsLoading(true);
    const r = await signup({ name: nm, email: em, password, role, invite: invite.trim() });
    if (r.error || !r.user) { setIsLoading(false); return setError(r.error || "Could not create account."); }
    finish(r.user);
  };

  return (
    <AuthShell image="/assets/scene-06.jpg">
      <GlassCard className="max-w-sm">
        <CardHeader title="Create your account" sub="Join your terminal team" />

        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field icon={User} name="name" focused={focusedInput} setFocused={setFocusedInput} id="name" autoComplete="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field icon={Mail} name="email" focused={focusedInput} setFocused={setFocusedInput} id="email" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Field
              icon={Lock} name="password" focused={focusedInput} setFocused={setFocusedInput} id="password"
              type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              right={
                <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 cursor-pointer" role="button" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" /> : <EyeClosed className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />}
                </div>
              }
            />
            <div className="flex gap-1 mt-2" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <i key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i <= s ? (s === 1 ? "bg-red-400" : s === 2 ? "bg-amber-400" : "bg-lime-300") : "bg-white/10"}`} />
              ))}
            </div>
            <p className="text-[11px] text-white/50 mt-1">{s ? "Password strength: " + LABEL[s] : "Use 8+ characters with a letter and a number."}</p>
          </div>
          <Field icon={Lock} name="confirm" focused={focusedInput} setFocused={setFocusedInput} id="confirm" type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

          <div className="relative flex items-center rounded-lg overflow-hidden">
            <ShieldCheck className="absolute left-3 w-4 h-4 text-white/40 pointer-events-none" />
            <select
              id="role" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full appearance-none h-10 pl-10 pr-3 rounded-lg bg-white/5 text-white text-sm outline-none border border-transparent focus:border-white/20 focus:bg-white/10 transition-all duration-300 cursor-pointer"
            >
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k} className="bg-neutral-900 text-white">{v}</option>)}
            </select>
          </div>

          {role === "A" && (
            <Field icon={KeyRound} name="invite" focused={focusedInput} setFocused={setFocusedInput} id="invite" placeholder="Admin invite code (SMART-ADMIN)" value={invite} onChange={(e) => setInvite(e.target.value)} />
          )}

          <FormError msg={error} />
          <SubmitButton loading={isLoading} label="Create account" />

          <p className="text-center text-xs text-white/60 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="relative inline-block group/signin">
              <span className="relative z-10 text-white group-hover/signin:text-white/70 transition-colors duration-300 font-medium">Sign in</span>
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white group-hover/signin:w-full transition-all duration-300" />
            </Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}

export default Component;
