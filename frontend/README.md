# SmartPort (Next.js 14, App Router, TypeScript, Tailwind)

    npm install
    npm run dev      # http://localhost:3000
    npm run build && npm start

Open http://localhost:3000 for the landing page (hero with the opening laptop, light/dark theme). The app lives under /app (/app/login, /app/dashboard ...).

Demo logins: admin@smartport.pk / Admin@123, gate@smartport.pk / Gate@123, yard@smartport.pk / Yard@123,
docs@smartport.pk / Docs@123, billing@smartport.pk / Bill@123, client@smartport.pk / Client@123

## Structure
- `src/app/(site)`   root layout; `page.tsx` is the landing at `/`, `app/*` holds the app pages (/app/login, /app/dashboard ...)
- `_old/`            unused files from earlier experiments (Vite App.tsx, three.js Landing, WorkflowTunnel); not part of the build
- `src/components`   shell, auth, drawers, landing sections; `src/views` the app views
- `src/lib`          data, logic (dues, placement), store (state + actions), world (film SVG)

## Backend connection
The app needs the FastAPI backend (`../backend`). It calls `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set
(see `.env.local.example`). State comes from `GET /api/state` (see `src/lib/store.ts`, `src/lib/api.ts`).
Run both with `start-all.bat` in the project root.
