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

## Project rules this backend follows
| Rule | Where |
|---|---|
| Yard: 4 blocks (A1 3 stacks, A2 3, H1 2, R1 2) = **10 stacks x 4 tiers = 40 locations** | `app/dsa/stack.py` `YARD_LAYOUT` |
| Placement (PLC-3 / PLC-4): 1) keep valid stacks (zone, height, size, weight), 2) prefer a stack whose top container leaves the same day or later, 3) closest leaving date after the new one, 4) tie: fewer containers, 5) none suitable: fewest earlier-leaving blockers | `YardGrid.suggest()` |
| Appointments handled earliest first: hand-written **Min-Heap** | `app/dsa/min_heap.py`, `GET /api/appointments/upcoming`, `POST /api/appointments/next` |
| Billing: **3 free days**, currency **PKR**, storage charge = chargeable days x daily tariff (by container size and cargo type) | `app/dsa/billing.py` (`TARIFF` holds placeholder rates: replace with the approved tariff) |
| Container lookup by number: dictionary (hash map) | `store.containers`, `GET /api/containers/{id}` |
| Gate trucks: FIFO queue | `app/dsa/gate_queue.py` |
| **Removed** (out of scope): Trie / prefix search, A* path finding, crane task scheduling (max-heap), vessel ETA sorting | |

Assumptions to confirm: the size rule is "same container length in one stack" (20 / 40 / 45 ft; 40 ft HC counts as 40), the weight rule is
"a heavier container is never put on a lighter one", and "cargo type" is the yard zone (General / Hazardous / Refrigerated).

## Storage
No database. State lives in memory (`app/store.py`) and is saved through `app/storage.py` (JSON file) after every
write request. To plug in a real database see **DATABASE_GUIDE.md**: implement two methods and change one line.

## Endpoints (all under /api, JSON, `Authorization: Bearer <token>`)
| Area | Endpoints | Roles |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/signup`, `GET /auth/me` | public / any |
| State | `GET /state?day=0` (everything the signed-in role may see; the frontend polls this) | any |
| Containers | `GET /containers`, `/containers/{id}`; `POST /containers` (gate-in), `/containers/import`, `/containers/place`, `/containers/customs/clear-many`; `DELETE /containers/{id}` | A G Y (write), A G Y D B (read) |
| Customs/billing | `POST /containers/{id}/customs/clear`, `/pay`, `/release` | A D B |
| Yard | `GET /yard`, `POST /yard/suggest` | A G Y |
| Appointments | `GET /appointments/upcoming`, `POST /appointments/next` (earliest first) | A G |
| Vessels | `GET/POST /vessels`, `DELETE /vessels/{id}` | A G Y |
| Gate | `GET /gate/slots?day=`, `POST /gate/slots/{day}/{time}/book`, `POST /gate/check-in`, `GET /gate/queue`, `POST /gate/queue/next` | A G |
| Reports | `GET /dashboard`, `/reports/placement`, `/reports/revenue` | A G Y D B / A B |
| Client portal | `GET/POST /me/shipments`, `DELETE /me/shipments/{id}`, `POST /me/shipments/{id}/pay`, `GET/POST /me/bookings`, `DELETE /me/bookings/{id}` | C A |
| Admin | `GET /users` | A |
