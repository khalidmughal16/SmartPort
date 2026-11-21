'use client'
import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { Drawers } from './Drawers'
import { Toast } from './Toast'

/** The demo keeps its state in the browser (session/local storage), so the app renders on the client only. */
function Client({ children }: { children: ReactNode }) {
  return <>{children}<Drawers /><Toast /></>
}
export const Shell = dynamic(() => Promise.resolve(Client), { ssr: false })
