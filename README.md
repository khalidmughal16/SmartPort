# SmartPort (frontend + backend)

    smartport/
      backend/    FastAPI + DSA (stacks, min-heap, FIFO queue, hash maps), in-memory (+ JSON snapshot). Database: see backend/DATABASE_GUIDE.md
      frontend/   Next.js 14 (App Router, TypeScript, Tailwind), talks to the backend over HTTP

## Run everything (Windows)
Double-click **start-all.bat**, or in two terminals:

    cd backend
    venv\Scripts\activate          (or ..\venv\Scripts\activate)
    pip install -r requirements.txt
    uvicorn app.main:app --reload          -> http://localhost:8000/docs

    cd frontend
    npm install
    npm run dev                            -> http://localhost:3000

The frontend calls `http://localhost:8000` by default. If the backend runs elsewhere, copy
`frontend/.env.local.example` to `frontend/.env.local` and change `NEXT_PUBLIC_API_URL`.
If the backend is not running the app shows a red "Cannot reach the SmartPort server" notice and retries by itself.

## How they are connected
* Sign in / sign up -> `POST /api/auth/login|signup` -> a token is kept in the browser tab (sessionStorage).
* `frontend/src/lib/store.ts` keeps a cache of `GET /api/state`; it refreshes every 8 seconds, on window focus and after
  every action, so a gate officer's new container shows up for the yard supervisor without reloading.
* Every button (add container, place, clear customs, pay, release, vessels, slots, appointments, client bookings) is an API call.
  The server is the source of truth: the placement rules (zone, height, size, weight, leaving date), billing (3 free days, PKR) and role checks run in the backend.
* Demo logins: admin@smartport.pk / Admin@123, gate@ / Gate@123, yard@ / Yard@123, docs@ / Docs@123,
  billing@ / Bill@123, client@ / Client@123 (all @smartport.pk).
