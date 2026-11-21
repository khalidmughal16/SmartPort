import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import YardMap from './pages/YardMap'
import Containers from './pages/Containers'
import Soon from './pages/Soon'
import Landing from './pages/Landing'
import { useAuth } from './store/auth'
import { canAccess, HOME } from './lib/roles'

function Guard({ path, children }: { path: string; children: ReactNode }) {
  const user = useAuth((s) => s.user)
  if (user && !canAccess(user.role, path)) {
    return (
      <div>
        <h1 className="font-display text-4xl font-bold uppercase text-soon">403 - No access</h1>
        <p className="mt-2 text-mute">Aap ke role ko is page ki ijazat nahi hai.</p>
      </div>
    )
  }
  return <>{children}</>
}

const later: [string, string][] = [
  ['/vessels', 'Vessels'], ['/placement', 'Placement'], ['/crane-tasks', 'Crane Tasks'],
  ['/gate', 'Gate Appointments'], ['/customs', 'Customs'], ['/billing', 'Billing'],
  ['/reports', 'Reports'], ['/users', 'Users & Settings'], ['/profile', 'Profile'],
]

function Home() {
  const user = useAuth((s) => s.user)
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Guard path="/dashboard"><Dashboard /></Guard>} />
          <Route path="/yard" element={<Guard path="/yard"><YardMap /></Guard>} />
          <Route path="/containers" element={<Guard path="/containers"><Containers /></Guard>} />
          {later.map(([p, t]) => (
            <Route key={p} path={p} element={<Guard path={p}><Soon title={t} /></Guard>} />
          ))}
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
