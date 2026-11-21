# Database guide (for whoever builds the database)

The backend works **without** a database: all data lives in memory (`app/store.py`) and is saved as a JSON
snapshot (`smartport_data.json`). Nothing else in the code knows how data is saved, so adding a real database
means touching **one place**.

## Option 1 (easiest, 15 minutes): snapshot storage
Implement the two methods of `app/storage.py`:

```python
class DatabaseStorage:
    def load(self) -> dict | None:   # return the last saved snapshot, or None if the DB is empty
        ...
    def save(self, data: dict) -> None:  # data = plain JSON (dicts, lists, str, int, bool, None)
        ...
```
Then, at the bottom of `app/store.py`, change one line:

```python
store = Store(JsonFileStorage(_data_path))      # now
store = Store(DatabaseStorage(...))             # after
```
`save()` is called after every successful write request (POST/PUT/PATCH/DELETE), and `load()` once at start-up.

## Option 2 (proper tables): one table per collection
Data shapes (see `Store.to_json()` in `app/store.py`):

| Collection | Key | Fields |
|---|---|---|
| users | id | name, email (unique), password (PBKDF2 hash, keep as is), role (A/G/Y/D/B/C), company |
| containers | id (container number) | size, zone (General/Hazardous/Refrigerated), cus (Hold/Cleared), paid, st (Pending/In yard/Released), block, bay, tier, slot, at, leave, rel (all times in ms since epoch), consignee, bk |
| yard | block + bay | ordered list of (container id, leave ms): the stack, bottom first |
| tasks | id | text, p (priority 1-9) |
| vessels | id | name, eta (ms), boxes, berth |
| log | (t, kind) | t (ms), kind, id (container, optional), m (message); newest first, capped at 100 |
| slots | day (0-6) + time | booked count (capacity is 3 per slot) |
| watch | user id | list of container ids a client follows |
| bookings | id | user_id, container_id, purpose (Pickup/Drop-off), date (YYYY-MM-DD), time_range |

To do this, replace the `to_json()` / `load_json()` pair (or the mutations in the routers) with queries.
The routers only use `store.<collection>` and the small helpers in `store.py`, so they keep working.

## Notes
* Passwords are stored hashed (`app/security.py`). Never store plain passwords.
* Set `SMARTPORT_SECRET` (token signing key) in the environment for production.
* Handlers are `async def` and run one at a time, so the in-memory structures need no locks. If you move to
  multiple workers (`uvicorn --workers N`), the database must become the single source of truth (Option 2).
* Tests use `MemoryStorage`; run them with `python -m unittest discover -s tests -t . -v`.
