"""In-memory data store built from DSA structures (no SQL database).

  users        dict (hash map)  id -> user            + email index for O(1) login
  containers   dict (hash map)  number -> record     + Trie for prefix search
  yard         YardStacks       8 stacks of leave-days (+ parallel container numbers)
  tasks        PriorityQueue    max-heap of crane tasks
  gate_queue   GateQueue        FIFO of waiting trucks
  slots        7 days x 8 times -> trucks booked
The store is saved to a JSON snapshot after every write request and reloaded at start-up.
"""
from __future__ import annotations

import json
import os
from typing import Any, Optional

from .dsa.billing import dues, settled
from .dsa.gate_queue import GateQueue
from .dsa.priority_queue import PriorityQueue
from .dsa.stack import YardStacks
from .dsa.trie import Trie
from .security import hash_password

SLOT_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]
DEMO_USERS = [
    ("Demo Admin", "admin@smartport.pk", "Admin@123", "A"),
    ("Demo Gate Officer", "gate@smartport.pk", "Gate@123", "G"),
    ("Demo Yard Supervisor", "yard@smartport.pk", "Yard@123", "Y"),
    ("Demo Documentation Clerk", "docs@smartport.pk", "Docs@123", "D"),
    ("Demo Billing Clerk", "billing@smartport.pk", "Bill@123", "B"),
    ("Demo Client", "client@smartport.pk", "Client@123", "C"),
]


class Store:
    def __init__(self, path: Optional[str] = None) -> None:
        self.path = path
        self.reset()

    # ------------------------------------------------------------------ state
    def reset(self) -> None:
        self.users: dict[int, dict] = {}
        self.email_idx: dict[str, int] = {}
        self.containers: dict[str, dict] = {}
        self.trie = Trie()
        self.yard = YardStacks()
        self.tasks: dict[int, dict] = {}
        self.pq = PriorityQueue()
        self.gate_queue = GateQueue()
        self.slots: list[dict[str, int]] = [{t: 0 for t in SLOT_TIMES} for _ in range(7)]
        self.watch: dict[int, list[str]] = {}
        self.bookings: list[dict] = []
        self.next_ids = {"user": 1, "task": 1, "queue": 1, "booking": 1}

    def new_id(self, kind: str) -> int:
        n = self.next_ids[kind]
        self.next_ids[kind] = n + 1
        return n

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
        c = {"id": cid, "d": 0, "cus": "Hold", "paid": False, "zone": "Standard", "st": "In yard", "slot": "", "leave_day": 5, "bk": False}
        c.update(kw)
        self.containers[cid] = c
        self.trie.insert(cid)
        return c

    def view(self, c: dict) -> dict:
        """Container as sent to the frontend, with the computed billing fields."""
        return {**c, "dues": dues(c["d"]), "settled": settled(c["d"], c["paid"])}

    # ------------------------------------------------------------------ tasks
    def add_task(self, title: str, priority: int) -> dict:
        t = {"id": self.new_id("task"), "title": title, "priority": priority, "done": False}
        self.tasks[t["id"]] = t
        self.pq.push(t["id"], priority, title)
        return t

    # ------------------------------------------------------------------- seed
    def seed(self) -> None:
        self.reset()
        seed_v = 11

        def rnd() -> float:  # same generator as the frontend, so the sample data matches
            nonlocal seed_v
            seed_v = (seed_v * 16807) % 2147483647
            return seed_v / 2147483647

        for name, email, pw, role in DEMO_USERS:
            self.add_user(name, email, pw, role)
        for i in range(14):
            d = 1 + int(rnd() * 9)
            self.add_container(f"GMT-{i + 17:04d}", d=d, cus="Hold" if rnd() > 0.6 else "Cleared", zone="Hazard" if i % 7 == 0 else "Standard",
                               slot=f"B{1 + i % 4}-R{1 + i % 3}-T{1 + i % 4}", leave_day=3 + i % 8)
        for pid in ("GMT-0050", "GMT-0051", "GMT-0052"):
            self.add_container(pid, st="Pending")
        self.yard = YardStacks([[9, 5, 3], [7, 2], [8, 6, 4, 2], [3], [9, 7, 6], [5, 4], [8], [6, 3, 2]])
        for title, pr in [("Lift GMT-0017 to truck T-88", 3), ("Restack bay 3 (blockers)", 5), ("Move reefer GMT-0021 to cold zone", 4), ("Load GMT-0031", 2)]:
            self.add_task(title, pr)
        for day in range(7):
            for t, c in zip(SLOT_TIMES, [3, 3, 1, 3, 2, 0, 3, 1]):
                self.slots[day][t] = c if day == 0 else int(rnd() * 4)
        self.watch[1 + 5] = ["GMT-0017", "GMT-0019", "GMT-0021"]  # demo client is user 6

    # ------------------------------------------------------------ persistence
    def to_json(self) -> dict:
        return {"users": list(self.users.values()), "containers": list(self.containers.values()),
                "yard": {"bays": self.yard.to_lists(), "labels": self.yard.labels}, "tasks": list(self.tasks.values()),
                "gate_queue": self.gate_queue.to_list(), "slots": self.slots, "watch": self.watch, "bookings": self.bookings, "next_ids": self.next_ids}

    def load_json(self, d: dict) -> None:
        self.reset()
        for u in d["users"]:
            self.users[u["id"]] = u
            self.email_idx[u["email"]] = u["id"]
        for c in d["containers"]:
            self.containers[c["id"]] = c
            self.trie.insert(c["id"])
        self.yard = YardStacks(d["yard"]["bays"], labels=d["yard"]["labels"])
        for t in d["tasks"]:
            self.tasks[t["id"]] = t
            if not t["done"]:
                self.pq.push(t["id"], t["priority"], t["title"])
        self.gate_queue = GateQueue(d["gate_queue"])
        self.slots = d["slots"]
        self.watch = {int(k): v for k, v in d["watch"].items()}
        self.bookings = d["bookings"]
        self.next_ids = d["next_ids"]

    def load_or_seed(self) -> None:
        if self.path and os.path.exists(self.path):
            with open(self.path, encoding="utf-8") as f:
                self.load_json(json.load(f))
        else:
            self.seed()

    def save(self) -> None:
        if not self.path:
            return
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.to_json(), f)
        os.replace(tmp, self.path)  # atomic: a crash never leaves a half-written file


store = Store(os.environ.get("SMARTPORT_DATA", os.path.join(os.path.dirname(__file__), "..", "smartport_data.json")))


def get_container(cid: str) -> dict:
    from fastapi import HTTPException
    c = store.containers.get(cid.strip().upper())
    if not c:
        raise HTTPException(404, f"Container {cid} not found")
    return c
