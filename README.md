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

