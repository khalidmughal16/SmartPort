'use client'
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from "@/store/useApp";
import { Mail, Lock, Eye, EyeClosed, ArrowRight } from 'lucide-react';
import { GlassCard } from "@/components/ui/glass-card";
import { Field } from "@/components/ui/auth-field";
import { AuthShell, CardHeader, SubmitButton, FormError } from "@/components/ui/auth-shell";
import { DEMO, ROLES, EMAIL_RE, login, nextPath, type User as AuthUser } from "@/lib/auth";

export function Component() {
  const nav = useNavigate(), loc = useLocation(), signIn = useApp((s) => s.signIn);
  const finish = (u: AuthUser) => { signIn(u.r, { n: u.n, e: u.e }); nav(nextPath(loc.search), { replace: true }); };
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("sp_remember") || ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => { try { return !!localStorage.getItem("sp_remember"); } catch { return false; } });
  const [error, setError] = useState("");

  const submit = async (em: string, pw: string) => {
    em = em.trim().toLowerCase();
    if (!EMAIL_RE.test(em)) return setError("Enter a valid email address.");
    if (!pw) return setError("Enter your password.");
    setError(""); setIsLoading(true);
    const r = await login(em, pw);
    if (r.error || !r.user) { setIsLoading(false); return setError(r.error || "Sign in failed."); }
    try { rememberMe ? localStorage.setItem("sp_remember", em) : localStorage.removeItem("sp_remember"); } catch { /* ignore */ }
    finish(r.user);
  };

  return (
    <AuthShell image="/assets/scene-03.jpg">
      <GlassCard className="max-w-sm">
        <CardHeader title="Welcome Back" sub="Sign in to continue to SmartPort" />

        <form onSubmit={(e) => { e.preventDefault(); submit(email, password); }} className="space-y-4" noValidate>
          <div className="space-y-3">
            <Field icon={Mail} name="email" focused={focusedInput} setFocused={setFocusedInput} id="email" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              icon={Lock} name="password" focused={focusedInput} setFocused={setFocusedInput} id="password"
              type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              right={
                <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 cursor-pointer" role="button" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" /> : <EyeClosed className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />}
                </div>
              }
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <input
                id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)}
                className="appearance-none h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-lime-300 checked:border-lime-300 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all duration-200"
              />
              <label htmlFor="remember-me" className="text-xs text-white/60 hover:text-white/80 transition-colors duration-200">Remember me</label>
            </div>
            <button type="button" onClick={() => setError("Password reset link sent (demo).")} className="text-xs text-white/60 hover:text-white transition-colors duration-200">Forgot password?</button>
          </div>

          <FormError msg={error} />
          <SubmitButton loading={isLoading} label="Sign In" />

          <div className="relative mt-2 mb-3 flex items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="mx-3 text-xs text-white/40">or use a demo role</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <button key={d.e} type="button" onClick={() => submit(d.e, d.p)} className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-lime-300/50 text-[11px] leading-tight text-white/80 hover:text-white py-2 px-1 transition-all duration-300">
                {ROLES[d.r]}
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-white/60 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="relative inline-block group/signup">
              <span className="relative z-10 text-white group-hover/signup:text-white/70 transition-colors duration-300 font-medium">Sign up</span>
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white group-hover/signup:w-full transition-all duration-300" />
            </Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}

export default Component;
