"""In-memory terminal state built from DSA structures. The database is NOT part of this file.

  users        dict (hash map)  id -> user              + email index for O(1) login
  containers   dict (hash map)  number -> record        (lookup by container number is O(1))
  yard         YardGrid         4 blocks, 10 stacks, 4 tiers = 40 locations; stacks of (container, leave time, length, weight)
  appt_heap    MinHeap          upcoming appointments, earliest first
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

from .dsa.billing import CURRENCY, FREE_DAYS, chargeable_days, dues, dwell_days, rate_for, settled
from .dsa.gate_queue import GateQueue
from .dsa.min_heap import MinHeap
from .dsa.stack import YardGrid
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
        self.yard = YardGrid()
        self.appt_heap = MinHeap()
        self.gate_queue = GateQueue()
        self.slots: list[dict[str, int]] = [{t: 0 for t in SLOT_TIMES} for _ in range(7)]
        self.vessels: list[dict] = []
        self.log: list[dict] = []
        self.watch: dict[int, list[str]] = {}
        self.bookings: list[dict] = []
        self.next_ids = {"user": 1, "queue": 1, "booking": 1, "vessel": 1}

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
                             "block": None, "bay": None, "tier": None, "at": now_ms(), "leave": None, "rel": None, "consignee": None, "weight": None, "bk": False}
        c.update({k: v for k, v in kw.items() if v is not None or k in ("leave", "consignee", "weight")})
        self.containers[cid] = c
        return c

    def drop_container(self, cid: str) -> None:
        self.containers.pop(cid, None)
        self.yard.remove(cid)
        self.retier()
        for ids in self.watch.values():
            if cid in ids:
                ids.remove(cid)

    def retier(self) -> None:
        """After a removal, containers above it dropped one tier: refresh block / bay / tier / slot on every record."""
        for (block, bay), s in self.yard.stacks.items():
            for tier, it in enumerate(s):
                c = self.containers.get(it.cid)
                if c:
                    c.update(block=block, bay=bay, tier=tier, slot=f"{block}-B{bay + 1}-T{tier + 1}")

    def view(self, c: dict) -> dict:
        """Container as sent to the frontend, plus the computed billing fields (PKR)."""
        d = dwell_days(c["at"], c["rel"], now_ms())
        amount = dues(d, c["size"], c["zone"])
        return {**c, "dwell": d, "free_days": FREE_DAYS, "chargeable_days": chargeable_days(d), "rate": rate_for(c["size"], c["zone"]),
                "currency": CURRENCY, "dues": amount, "settled": settled(amount, c["paid"])}

    def days_in(self, c: dict) -> int:
        return dwell_days(c["at"], c["rel"], now_ms())

    def due_of(self, c: dict) -> int:
        """Storage charge in PKR for this container right now."""
        return dues(self.days_in(c), c["size"], c["zone"])

    # ----------------------------------------------------------- appointments
    @staticmethod
    def appt_key(b: dict) -> tuple[str, str]:
        """Sort key: (date, start time). "2026-12-01", "08:00-09:00" -> ("2026-12-01", "08:00")."""
        return (b["date"], b["time_range"].split("-")[0].strip())

    def add_booking(self, b: dict) -> None:
        self.bookings.append(b)
        self.appt_heap.push(b["id"], self.appt_key(b), b["id"])

    def cancel_booking(self, bid: int) -> None:
        self.bookings[:] = [b for b in self.bookings if b["id"] != bid]
        if bid in self.appt_heap:
            self.appt_heap.remove(bid)

    def upcoming_appointments(self) -> list[dict]:
        """Appointments in time order, earliest first (read from the min-heap)."""
        by_id = {b["id"]: b for b in self.bookings}
        return [by_id[k] for k, _, _ in self.appt_heap.ordered() if k in by_id]

    # --------------------------------------------------------------- vessels
    def vessel_list(self) -> list[dict]:
        return list(self.vessels)  # kept in the order they were added (no ETA sorting)

    # ------------------------------------------------------------------- seed
    def seed(self) -> None:
        """First run: only the demo accounts. Terminal data (containers, vessels) starts empty, like the frontend."""
        self.reset()
        for name, email, pw, role in DEMO_USERS:
            self.add_user(name, email, pw, role)

    # ------------------------------------------------------------ persistence
    def to_json(self) -> dict:
        return {
            "users": list(self.users.values()), "containers": list(self.containers.values()), "yard": self.yard.to_dict(),
            "gate_queue": self.gate_queue.to_list(), "slots": self.slots, "vessels": self.vessels,
            "log": self.log, "watch": self.watch, "bookings": self.bookings, "next_ids": self.next_ids,
        }

    def load_json(self, d: dict) -> None:
        self.reset()
        for u in d["users"]:
            self.users[u["id"]] = u
            self.email_idx[u["email"]] = u["id"]
        for c in d["containers"]:
            self.containers[c["id"]] = c
        self.yard = YardGrid.from_dict(d["yard"])
        for c in self.containers.values():  # a snapshot from an older yard layout: anything that no longer fits goes back to Pending
            if c["st"] == "In yard" and c["id"] not in self.yard.where:
                c.update(st="Pending", block=None, bay=None, tier=None, slot="Not placed")
        self.gate_queue = GateQueue(d.get("gate_queue", []))
        self.slots = d["slots"]
        self.vessels = d.get("vessels", [])
        self.log = d.get("log", [])
        self.watch = {int(k): v for k, v in d["watch"].items()}
        self.bookings = d["bookings"]
        for b in self.bookings:
            self.appt_heap.push(b["id"], self.appt_key(b), b["id"])
        self.next_ids = {**self.next_ids, **{k: v for k, v in d["next_ids"].items() if k in self.next_ids}}
        self.retier()

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
