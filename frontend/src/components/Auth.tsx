'use client'
import { KeyboardEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Role } from '../lib/data'
import { actions, toast } from '../lib/store'
import loginImg from '../assets/login.jpg'
import signupImg from '../assets/signup.jpg'

export function Auth({ signup, as }: { signup: boolean; as?: string }) {
  const router = useRouter()
  const [f, setF] = useState({ n: '', e: '', p: '', p2: '', r: 'C' as Role, invite: '', co: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (busy) return
    setBusy(true); setErr('')
    const res = await (signup ? actions.signUp(f) : actions.signIn(f.e, f.p))
    setBusy(false)
    if (res.error) setErr(res.error)
    else router.push('/app/' + res.to)
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }
  return (
    <div className="login split" id="main">
      <div className="sp-img" role="img"
        style={{ backgroundImage: `url(${signup ? signupImg.src : loginImg.src})`, backgroundPosition: signup ? '58% center' : '62% center' }}
        aria-label={signup ? 'A container terminal at night with green gantry cranes, a ship and trucks' : 'The SmartPort terminal gate at night with a truck entering'}>
        <Link className="logo" href="/app/">SmartPort<i>.</i></Link>
        <div className="sp-photo" />
        <div className="sp-cap">
          <h3>{signup ? <>Join <em>SmartPort</em>.</> : <>Every move, <em>connected</em>.</>}</h3>
          <p>{signup ? 'Track containers, book gate slots and pay dues online.' : 'Sign in to follow every container from vessel to gate-out.'}</p>
        </div>
      </div>
      <div className="sp-form">
        <Link className="sp-back" href="/app/">&larr; Back to home</Link>
        <div className="auth">
          {as && !signup && <p className="as-badge">Signing in to <b>{as}</b></p>}
          <h2>{signup ? <>Create your <em>account</em></> : <>Welcome <em>back</em></>}</h2>
          <p className="sub">{signup ? 'Create a client account to track your containers.' : 'Sign in to your SmartPort terminal.'}</p>
          <form id="af" className={signup ? 'su' : ''} noValidate onKeyDown={onKey} onSubmit={(e) => e.preventDefault()}>
            {signup && <div className="f"><label htmlFor="fn">Full name</label><input id="fn" autoComplete="name" value={f.n} onChange={set('n')} /></div>}
            <div className="f"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" placeholder="you@company.com" value={f.e} onChange={set('e')} /></div>
            <div className="f">
              <label htmlFor="pw">Password</label>
              <div className="pwr">
                <input id="pw" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={f.p} onChange={set('p')} />
                <button type="button" className="btn" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {signup && (
              <>
                <div className="f"><label htmlFor="p2">Confirm password</label><input id="p2" type="password" autoComplete="new-password" value={f.p2} onChange={set('p2')} /></div>
                <div className="f" id="co"><label htmlFor="cn">Company (optional)</label><input id="cn" autoComplete="organization" placeholder="Your company" value={f.co} onChange={set('co')} /></div>
              </>
            )}
            <p id="er" className="er" role="alert">{err}</p>
            <button type="button" className="btn p" style={{ width: '100%', justifyContent: 'center' }} onClick={submit} disabled={busy}>{busy ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}</button>
          </form>
          <p className="sub" style={{ marginTop: 14 }}>
            {signup ? <>Already have an account? <Link className="ul" href="/app/login">Sign in</Link></> : (
              <>No account? <Link className="ul" href="/app/signup">Create one</Link> &middot;{' '}
                <button type="button" className="ul" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => toast('Password reset link sent (demo).')}>Forgot password?</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
