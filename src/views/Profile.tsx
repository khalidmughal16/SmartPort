'use client'
import { useRouter } from 'next/navigation'
import { P, R } from '../lib/data'
import { actions, useStore } from '../lib/store'

export function Profile() {
  const { role, user } = useStore()
  const router = useRouter()
  if (!role) return null
  return (
    <div className="tile" style={{ maxWidth: 420 }}>
      <b>{user ? user.n : R[role]}</b>
      <p className="sub">
        {user ? user.e + ', ' : ''}{user?.co ? user.co + ', ' : ''}{R[role]}. Access: {P.filter((p) => p.roles.includes(role)).map((p) => p.label).join(', ')}.
      </p>
      <button className="btn" onClick={() => { actions.signOut(); router.push('/app/login') }}>Sign out</button>
    </div>
  )
}
