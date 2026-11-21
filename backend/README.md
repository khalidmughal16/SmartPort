# SmartPort Backend: Python + FastAPI + DSA (no SQL)

## Run (Windows)
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload

API docs (try every endpoint): http://localhost:8000/docs   |   health: /api/health
Tests: `python -m unittest discover -s tests -t . -v`

Demo logins (same as the frontend): admin@smartport.pk / Admin@123, gate@ / Gate@123, yard@ / Yard@123,
docs@ / Docs@123, billing@ / Bill@123, client@ / Client@123 (all @smartport.pk).
In /docs call `POST /api/auth/login`, then send `Authorization: Bearer <token>`.
The Next.js frontend (smartport-nextjs) talks to this API: start the backend first, then `npm run dev` in the frontend.

## Where each data structure is used
| Structure (file in `app/dsa/`) | Used for | Cost |
|---|---|---|
| `stack.py` Stack + YardStacks | 8 yard bays, max 4 tiers; smart slot suggestion | place O(1), suggest O(bays x height) |
| `priority_queue.py` max-heap (hand written) | crane tasks, escalate, dispatch | push/pop/update O(log n) |
| `astar.py` A* with `heapq` | shortest clear path on the 10x6 yard grid | O(V log V) |
| `trie.py` Trie | container-number prefix search | O(L + k) |
| `gate_queue.py` FIFO queue (deque) | trucks waiting at the gate | O(1) |
| `simulation.py` | random vs smart placement report | O(n x bays) |
| `billing.py` | 5 free days, then $45/day, release rules | O(1) |
| dicts (hash maps) in `store.py` | users by email, containers by number | O(1) lookup |

## Storage
No database. Everything lives in memory (`app/store.py`) and is saved to `smartport_data.json` after every
write request, then reloaded on start-up. Delete that file to reset to the demo data.
Handlers are `async def`, so they run one at a time on the event loop and the shared structures need no locks.

## Main endpoints
    POST /api/auth/login | /signup        GET /api/auth/me
    GET  /api/containers[?status=Pending] | /search?q=GMT-001 | /{id}      POST /api/containers
    POST /api/containers/{id}/customs/clear | /pay | /release
    GET  /api/yard      POST /api/yard/suggest | /place
    POST /api/gate/check-in    GET /api/gate/queue    POST /api/gate/queue/next
    GET  /api/gate/slots?day=0    POST /api/gate/slots/{day}/{time}/book
    GET  /api/tasks     POST /api/tasks | /{id}/escalate | /dispatch
    POST /api/route/astar        GET /api/dashboard | /reports/placement | /reports/revenue
    GET/POST /api/me/shipments, /api/me/bookings, POST /api/me/shipments/{id}/pay   (client portal)
    GET  /api/users | /vessels
