# SmartPort Backend: Python + FastAPI + DSA (no database yet)

## Run (Windows)
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload

API docs (try every endpoint): http://localhost:8000/docs   |   health: /api/health
Tests: `python -m unittest discover -s tests -t . -v`

Demo logins: admin@smartport.pk / Admin@123, gate@ / Gate@123, yard@ / Yard@123, docs@ / Docs@123,
billing@ / Bill@123, client@ / Client@123 (all @smartport.pk). In /docs call `POST /api/auth/login`, copy the token,
press **Authorize** and paste it.

The terminal starts **empty** (only the demo accounts exist). Add containers from the app (Gate-In / Containers).

## Environment variables (all optional)
| Name | Default | Meaning |
|---|---|---|
| `SMARTPORT_SECRET` | `dev-secret-change-me` | key that signs login tokens (change it in production) |
| `SMARTPORT_DATA` | `smartport_data.json` next to `app/` | where the JSON snapshot is written |
| `SMARTPORT_CORS` | any `http://localhost:*` | regex of allowed frontend origins |

## Where each data structure is used
| Structure (file in `app/dsa/`) | Used for | Cost |
|---|---|---|
| `stack.py` `YardGrid` (stacks of Stack) | 4 blocks x 10 bays x 4 tiers; smart slot suggestion by pick-up time | place O(1), suggest O(slots) |
| `priority_queue.py` max-heap (hand written) | crane tasks, escalate, dispatch | push/pop/update O(log n) |
| `trie.py` Trie | container-number prefix search | O(L + k) |
| `gate_queue.py` FIFO queue (deque) | trucks waiting at the gate | O(1) |
| `astar.py` A* with `heapq` | shortest clear path on the 10x6 yard grid | O(V log V) |
| `simulation.py` | random vs smart placement report | O(n x bays) |
| `billing.py` | 5 free days, then $45/day, release rules | O(1) |
| dicts (hash maps) in `store.py` | users by email, containers by number | O(1) lookup |

## Storage
No database. State lives in memory (`app/store.py`) and is saved through `app/storage.py` (JSON file) after every
write request. To plug in a real database see **DATABASE_GUIDE.md**: implement two methods and change one line.

## Endpoints (all under /api, JSON, `Authorization: Bearer <token>`)
| Area | Endpoints | Roles |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/signup`, `GET /auth/me` | public / any |
| State | `GET /state?day=0` (everything the signed-in role may see; the frontend polls this) | any |
| Containers | `GET /containers`, `/containers/search?q=`, `/containers/{id}`; `POST /containers` (gate-in), `/containers/import`, `/containers/place`, `/containers/customs/clear-many`; `DELETE /containers/{id}` | A G Y (write), A G Y D B (read) |
| Customs/billing | `POST /containers/{id}/customs/clear`, `/pay`, `/release` | A D B |
| Yard | `GET /yard`, `POST /yard/suggest` | A G Y |
| Crane tasks | `GET/POST /tasks`, `POST /tasks/{id}/escalate`, `/tasks/{id}/done`, `/tasks/dispatch` | A Y |
| Vessels | `GET/POST /vessels`, `DELETE /vessels/{id}` | A G Y |
| Gate | `GET /gate/slots?day=`, `POST /gate/slots/{day}/{time}/book`, `POST /gate/check-in`, `GET /gate/queue`, `POST /gate/queue/next` | A G |
| Router | `POST /route/astar` | A Y |
| Reports | `GET /dashboard`, `/reports/placement`, `/reports/revenue` | A G Y D B / A B |
| Client portal | `GET/POST /me/shipments`, `DELETE /me/shipments/{id}`, `POST /me/shipments/{id}/pay`, `GET/POST /me/bookings`, `DELETE /me/bookings/{id}` | C A |
| Admin | `GET /users` | A |
