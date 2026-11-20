# SmartPort (Next.js 14, App Router, TypeScript, Tailwind)

    npm install
    npm run dev      # http://localhost:3000
    npm run build && npm start

Open http://localhost:3000 for the laptop intro; the app itself lives under /app (/app/login, /app/dashboard ...).

Demo logins: admin@smartport.pk / Admin@123, gate@smartport.pk / Gate@123, yard@smartport.pk / Yard@123,
docs@smartport.pk / Docs@123, billing@smartport.pk / Bill@123, client@smartport.pk / Client@123

## Structure
- `src/app/(intro)`  root layout + page for `/` (scroll-driven 3D laptop; embeds `/app` in an iframe)
- `src/app/(site)`   second root layout for `/app/*` (own <html>, so its CSS never touches the intro)
- `src/components`   shell, auth, drawers, landing sections; `src/views` the 17 app views
- `src/lib`          data, logic (dues, placement, A*), store (state + actions), world (film SVG)
