'use client'
import { useStore } from '../lib/store'

export function Toast() {
  const { toast } = useStore()
  return (
    <div id="toast" role="status" aria-live="polite" className={toast ? 'on' : ''}
      style={toast?.bad ? { background: 'var(--bad)', color: '#0A0B0A' } : undefined}>{toast?.msg}</div>
  )
}
