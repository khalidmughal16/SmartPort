import type { ReactNode } from 'react'
import '../../styles/app.css'
import '../../styles/tailwind.css'
import { Shell } from '../../components/Shell'
import { ThemeScript } from '../../components/ThemeScript'

export const metadata = { title: 'SmartPort | Every move, connected.' }

// Second root layout: the app has its own <html>, so its stylesheet never touches the laptop intro.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;800&family=Inter:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&display=swap" rel="stylesheet" />
      </head>
      <body><Shell>{children}</Shell></body>
    </html>
  )
}
