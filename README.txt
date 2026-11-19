SmartPort v4 (React + TypeScript + Tailwind + zustand + react-router) - localhost
=================================================================================

Zaroori: Node.js 18+ (https://nodejs.org) aur internet (pehli baar packages ke liye).

Chalane ka tareeqa (Windows)
  1. Zip ko KHAALI naye folder mein extract karein (maslan D:\sp-react).
  2. Us folder mein CMD kholen aur:
         npm install
         npm start
     (ya sirf start.bat par double-click karein)
  3. Browser: http://localhost:3000

  Development (hot reload):   npm run dev      (server.cjs ke bina bhi chalta hai, accounts localStorage mein)
  Type check:                 npm run typecheck
  Agar port 3000 masroof ho:  set PORT=3001 && npm start

Ab poora app React hai (koi purana public/js ya public/css nahi)
  src/main.tsx, src/App.tsx            - entry aur routes (/, /login, /signup, /dashboard ... 13 pages)
  src/store/useApp.ts                  - zustand store: session, containers, yard, tasks, appointments, toast
  src/lib/data.ts                      - pages list, roles access, due(), suggest() placement, A*, simulation
  src/lib/auth.ts                      - login/signup logic (server.cjs /api ya localStorage fallback)
  src/styles/legacy.css                - purani stylesheet (design same hai)
  src/pages/landing/                   - Landing, Film (scroll story), Features, HowItWorks, DashboardPreview
  src/pages/app/                       - 13 app pages
  src/components/app/                  - AppShell (sidebar, topbar), CommandPalette (Ctrl+K), Toast, ui helpers
  src/components/ui/hero-scroll-animation.tsx - scroll par scale/rotate hone wale 2 sections (jahaz wale hero ke baad)
  src/components/ui/                   - glass-card, sign-in-card-2, sign-up-card, role-card
  server.cjs                           - localhost server + /api/login, /api/signup (+ SPA fallback)
  data/users.json                      - naye accounts (hashed passwords), pehli baar chalne par ban jata hai

Demo accounts
  admin@smartport.pk / Admin@123      gate@smartport.pk / Gate@123
  yard@smartport.pk / Yard@123        docs@smartport.pk / Docs@123
  billing@smartport.pk / Bill@123
  Admin account banane ka invite code: SMART-ADMIN

Code badalne ke baad dobara  npm start  chalayen (ye build bhi karta hai).
