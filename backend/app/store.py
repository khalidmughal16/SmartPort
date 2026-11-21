"""In-memory terminal state built from DSA structures. The database is NOT part of this file.

  users        dict (hash map)  id -> user              + email index for O(1) login
  containers   dict (hash map)  number -> record        + Trie for prefix search
  yard         YardGrid         blocks x bays x tiers   stacks of (container, leave time)
  pq           PriorityQueue    max-heap of crane tasks
  gate_queue   GateQueue        FIFO of waiting trucks
  slots        7 days x 8 times -> trucks booked
  vessels, log, watch (client shipments), bookings

Persistence goes through `app/storage.py` (two methods: load / save). The database owner only has to implement
that interface; nothing else in the backend changes.
"""
from __future__ import annotations

import os
import time
from typing import Any, Optional

from .dsa.billing import dues, dwell_days, settled
from .dsa.gate_queue import GateQueue
from .dsa.priority_queue import PriorityQueue
from .dsa.stack import YardGrid
from .dsa.trie import Trie
from .security import hash_password
from .storage import JsonFileStorage, Storage

SLOT_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]
DEMO_USERS = [
    ("Demo Admin", "admin@smartport.pk", "Admin@123", "A"),
    ("Demo Gate Officer", "gate@smartport.pk", "Gate@123", "G"),
    ("Demo Yard Supervisor", "yard@smartport.pk", "Yard@123", "Y"),
    ("Demo Documentation Clerk", "docs@smartport.pk", "Docs@123", "D"),
    ("Demo Billing Clerk", "billing@smartport.pk", "Bill@123", "B"),
    ("Demo Client", "client@smartport.pk", "Client@123", "C"),
]
LOG_CAP = 100


def now_ms() -> int:
    return int(time.time() * 1000)


class Store:
    def __init__(self, storage: Optional[Storage] = None) -> None:
        self.storage = storage
        self.reset()

    # ------------------------------------------------------------------ state
    def reset(self) -> None:
        self.users: dict[int, dict] = {}
        self.email_idx: dict[str, int] = {}
        self.containers: dict[str, dict] = {}
        self.trie = Trie()
        self.yard = YardGrid()
        self.tasks: dict[int, dict] = {}
        self.pq = PriorityQueue()
        self.gate_queue = GateQueue()
        self.slots: list[dict[str, int]] = [{t: 0 for t in SLOT_TIMES} for _ in range(7)]
        self.vessels: list[dict] = []
        self.log: list[dict] = []
        self.watch: dict[int, list[str]] = {}
        self.bookings: list[dict] = []
        self.next_ids = {"user": 1, "task": 1, "queue": 1, "booking": 1, "vessel": 1}

    def new_id(self, kind: str) -> int:
        n = self.next_ids[kind]
        self.next_ids[kind] = n + 1
        return n

    # -------------------------------------------------------------------- log
    def log_event(self, kind: str, msg: str, cid: Optional[str] = None) -> None:
        entry = {"t": now_ms(), "kind": kind, "m": msg}
        if cid:
            entry["id"] = cid
        self.log.insert(0, entry)  # newest first
        del self.log[LOG_CAP:]

    # ------------------------------------------------------------------ users
    def add_user(self, name: str, email: str, password: str, role: str, company: str = "") -> dict:
        u = {"id": self.new_id("user"), "name": name, "email": email, "password": hash_password(password), "role": role, "company": company}
        self.users[u["id"]] = u
        self.email_idx[email] = u["id"]
        return u

    def user_by_email(self, email: str) -> Optional[dict]:
        uid = self.email_idx.get(email)
        return self.users.get(uid) if uid else None

    # ------------------------------------------------------------- containers
    def add_container(self, cid: str, **kw: Any) -> dict:
        c: dict[str, Any] = {"id": cid, "size": "40 ft", "zone": "General", "cus": "Hold", "paid": False, "st": "Pending", "slot": "Not placed",
                             "block": None, "bay": None, "tier": None, "at": now_ms(), "leave": None, "rel": None, "consignee": None, "bk": False}
        c.update({k: v for k, v in kw.items() if v is not None or k in ("leave", "consignee")})
        self.containers[cid] = c
        self.trie.insert(cid)
        return c

    def drop_container(self, cid: str) -> None:
        self.containers.pop(cid, None)
        self.yard.remove(cid)
        self.retier()
        # the trie has no delete: rebuild it (O(total letters), fine at terminal scale)
        self.trie = Trie(list(self.containers))
        for ids in self.watch.values():
            if cid in ids:
                ids.remove(cid)

    def retier(self) -> None:
        """After a removal, containers above it dropped one tier: refresh block / bay / tier / slot on every record."""
        for (block, bay), s in self.yard.stacks.items():
            for tier, (cid, _) in enumerate(s):
                c = self.containers.get(cid)
                if c:
                    c.update(block=block, bay=bay, tier=tier, slot=f"{block}-B{bay + 1}-T{tier + 1}")

    def view(self, c: dict) -> dict:
        """Container as sent to the frontend, plus the computed billing fields."""
        d = dwell_days(c["at"], c["rel"], now_ms())
        return {**c, "dwell": d, "dues": dues(d), "settled": settled(d, c["paid"])}

    def days_in(self, c: dict) -> int:
        return dwell_days(c["at"], c["rel"], now_ms())

    # ------------------------------------------------------------------ tasks
    def add_task(self, text: str, p: int) -> dict:
        t = {"id": self.new_id("task"), "text": text, "p": p}
        self.tasks[t["id"]] = t
        self.pq.push(t["id"], p, text)
        return t

    def task_view(self, t: dict) -> dict:
        return {"id": str(t["id"]), "text": t["text"], "p": t["p"]}

    # --------------------------------------------------------------- vessels
    def vessel_list(self) -> list[dict]:
        return sorted(self.vessels, key=lambda v: v["eta"])

    # ------------------------------------------------------------------- seed
    def seed(self) -> None:
        """First run: only the demo accounts. Terminal data (containers, vessels, tasks) starts empty, like the frontend."""
        self.reset()
        for name, email, pw, role in DEMO_USERS:
            self.add_user(name, email, pw, role)

    # ------------------------------------------------------------ persistence
    def to_json(self) -> dict:
        return {
            "users": list(self.users.values()), "containers": list(self.containers.values()), "yard": self.yard.to_dict(),
            "tasks": list(self.tasks.values()), "gate_queue": self.gate_queue.to_list(), "slots": self.slots, "vessels": self.vessels,
            "log": self.log, "watch": self.watch, "bookings": self.bookings, "next_ids": self.next_ids,
        }

    def load_json(self, d: dict) -> None:
        self.reset()
        for u in d["users"]:
            self.users[u["id"]] = u
            self.email_idx[u["email"]] = u["id"]
        for c in d["containers"]:
            self.containers[c["id"]] = c
            self.trie.insert(c["id"])
        self.yard = YardGrid.from_dict(d["yard"])
        for t in d["tasks"]:
            self.tasks[t["id"]] = t
            self.pq.push(t["id"], t["p"], t["text"])
        self.gate_queue = GateQueue(d.get("gate_queue", []))
        self.slots = d["slots"]
        self.vessels = d.get("vessels", [])
        self.log = d.get("log", [])
        self.watch = {int(k): v for k, v in d["watch"].items()}
        self.bookings = d["bookings"]
        self.next_ids = {**self.next_ids, **d["next_ids"]}

    def load_or_seed(self) -> None:
        data = self.storage.load() if self.storage else None
        if data:
            self.load_json(data)
        else:
            self.seed()
            self.save()

    def save(self) -> None:
        if self.storage:
            self.storage.save(self.to_json())


# ---- choose the storage here. The database owner swaps JsonFileStorage for their own class (see DATABASE_GUIDE.md).
_data_path = os.environ.get("SMARTPORT_DATA", os.path.join(os.path.dirname(__file__), "..", "smartport_data.json"))
store = Store(JsonFileStorage(_data_path))


def get_container(cid: str) -> dict:
    from fastapi import HTTPException
    c = store.containers.get(cid.strip().upper())
    if not c:
        raise HTTPException(404, f"Container {cid.strip().upper()} not found")
    return c
