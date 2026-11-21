import time
import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.storage import MemoryStorage
from app.store import store

DAY = 86_400_000


def login(c, email, pw):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    return {"Authorization": "Bearer " + r.json()["token"]} if r.status_code == 200 else None


class TestApi(unittest.TestCase):
    def setUp(self):
        store.storage = MemoryStorage()   # nothing is written to disk during tests
        store.seed()
        self.c = TestClient(app)
        self.admin = login(self.c, "admin@smartport.pk", "Admin@123")
        self.gate = login(self.c, "gate@smartport.pk", "Gate@123")
        self.yard = login(self.c, "yard@smartport.pk", "Yard@123")
        self.docs = login(self.c, "docs@smartport.pk", "Docs@123")
        self.client = login(self.c, "client@smartport.pk", "Client@123")

    def add(self, cid, zone="General", **kw):
        return self.c.post("/api/containers", json={"id": cid, "zone": zone, **kw}, headers=self.gate)

    def place(self, cid, zone="General", **kw):
        return self.c.post("/api/containers/place", json={"id": cid, "zone": zone, **kw}, headers=self.gate)

    # ---------------------------------------------------------------- auth
    def test_terminal_starts_empty(self):
        s = self.c.get("/api/state", headers=self.admin).json()
        self.assertEqual((s["containers"], s["tasks"], s["vessels"], s["log"]), ([], [], [], []))
        self.assertEqual(len(s["users"]), 6)

    def test_auth_and_roles(self):
        self.assertEqual(self.c.post("/api/auth/login", json={"email": "admin@smartport.pk", "password": "nope"}).status_code, 401)
        self.assertEqual(self.c.get("/api/containers").status_code, 401)
        self.assertEqual(self.c.get("/api/containers", headers=self.client).status_code, 403)
        self.assertEqual(self.c.get("/api/me/shipments", headers=self.client).status_code, 200)
        self.assertEqual(self.c.get("/api/users", headers=self.gate).status_code, 403)

    def test_signup_rules(self):
        body = {"name": "Ali Khan", "email": "ali@x.pk", "password": "abcd1234", "role": "C"}
        self.assertEqual(self.c.post("/api/auth/signup", json=body).status_code, 201)
        self.assertEqual(self.c.post("/api/auth/signup", json=body).status_code, 409)
        self.assertEqual(self.c.post("/api/auth/signup", json={**body, "email": "b@x.pk", "role": "A"}).status_code, 403)
        self.assertEqual(self.c.post("/api/auth/signup", json={**body, "email": "c@x.pk", "password": "short"}).status_code, 422)

    # ---------------------------------------------------------- containers
    def test_gate_in_then_place(self):
        self.assertEqual(self.add("gmt-1").status_code, 201)
        self.assertEqual(self.add("GMT-1").status_code, 409)
        r = self.place("GMT-1").json()
        self.assertEqual(r["container"]["st"], "In yard")
        self.assertEqual(r["placement"]["slot"], "A1-B1-T1")
        self.assertEqual(self.place("GMT-1").status_code, 409)
        # one-step flow: unknown container is created and placed
        self.assertEqual(self.place("GMT-2", "Hazardous").json()["placement"]["block"], "H1")

    def test_smart_placement_avoids_blockers(self):
        now = int(time.time() * 1000)
        self.place("EARLY", leave=now + 1 * DAY)       # leaves first, lands on A1 bay 1
        r = self.place("LATE", leave=now + 9 * DAY).json()["placement"]
        self.assertEqual(r["e"], 0)                      # the optimizer must not stack LATE on top of EARLY
        self.assertNotEqual((r["block"], r["bay"]), ("A1", 0))

    def test_zone_full(self):
        for i in range(40):                              # H1 holds 10 bays x 4 tiers
            self.assertEqual(self.place(f"H-{i}", "Hazardous").status_code, 200)
        self.assertEqual(self.place("H-40", "Hazardous").status_code, 409)

    def test_release_rules_and_tier_drop(self):
        for cid in ("A-1", "A-2"):
            self.place(cid)
        self.assertEqual(self.c.post("/api/containers/A-1/release", headers=self.docs).status_code, 409)  # customs on hold
        self.c.post("/api/containers/A-1/customs/clear", headers=self.docs)
        self.assertEqual(self.c.post("/api/containers/A-1/release", headers=self.docs).status_code, 200)
        self.assertEqual(self.c.get("/api/containers/A-1", headers=self.admin).json()["st"], "Released")
        self.assertEqual(self.c.get("/api/containers/A-2", headers=self.admin).json()["slot"], "A1-B2-T1")

    def test_storage_dues_and_pay(self):
        self.add("OLD-1")
        store.containers["OLD-1"]["at"] -= 9 * DAY      # 9 days in the terminal: 4 days x $45
        self.assertEqual(self.c.get("/api/containers/OLD-1", headers=self.admin).json()["dues"], 180)
        self.c.post("/api/containers/OLD-1/pay", headers=self.admin)
        self.assertTrue(self.c.get("/api/containers/OLD-1", headers=self.admin).json()["settled"])

    def test_import_search_delete(self):
        r = self.c.post("/api/containers/import", json={"items": [{"id": "MSKU1"}, {"id": "MSKU2"}, {"id": "MSKU1"}]}, headers=self.gate).json()
        self.assertEqual((r["added"], r["skipped"]), (2, 1))
        self.assertEqual(self.c.get("/api/containers/search?q=msk", headers=self.gate).json()["matches"], ["MSKU1", "MSKU2"])
        self.assertEqual(self.c.delete("/api/containers/MSKU1", headers=self.gate).status_code, 204)
        self.assertEqual(self.c.get("/api/containers/search?q=msk", headers=self.gate).json()["matches"], ["MSKU2"])

    # ------------------------------------------------- tasks, vessels, gate
    def test_tasks_priority_heap(self):
        a = self.c.post("/api/tasks", json={"text": "Load GMT-1", "p": 2}, headers=self.yard).json()
        self.c.post("/api/tasks", json={"text": "Restack bay 3", "p": 5}, headers=self.yard)
        self.assertEqual([t["text"] for t in self.c.get("/api/tasks", headers=self.yard).json()], ["Restack bay 3", "Load GMT-1"])
        for _ in range(4):
            self.c.post(f"/api/tasks/{a['id']}/escalate", headers=self.yard)
        self.assertEqual(self.c.get("/api/tasks", headers=self.yard).json()[0]["text"], "Load GMT-1")
        self.assertEqual(self.c.post(f"/api/tasks/{a['id']}/done", headers=self.yard).status_code, 200)
        self.assertEqual(len(self.c.get("/api/tasks", headers=self.yard).json()), 1)

    def test_vessels(self):
        eta = int(time.time() * 1000) + DAY
        v = self.c.post("/api/vessels", json={"name": "MV Test", "eta": eta, "boxes": 120, "berth": "B-2"}, headers=self.gate).json()
        self.assertEqual(self.c.get("/api/vessels", headers=self.yard).json()[0]["name"], "MV Test")
        self.assertEqual(self.c.delete(f"/api/vessels/{v['id']}", headers=self.gate).status_code, 204)
        self.assertEqual(self.c.get("/api/vessels", headers=self.yard).json(), [])

    def test_gate_slots_capacity(self):
        for _ in range(3):
            self.assertEqual(self.c.post("/api/gate/slots/0/08:00/book", headers=self.gate).status_code, 200)
        self.assertEqual(self.c.post("/api/gate/slots/0/08:00/book", headers=self.gate).status_code, 409)
        self.assertEqual(self.c.get("/api/state?day=0", headers=self.gate).json()["slots"][0], ["08:00", 3])

    # ------------------------------------------------------- client portal
    def test_client_portal(self):
        self.add("GMT-9")
        self.assertEqual(self.c.get("/api/state", headers=self.client).json()["containers"], [])  # clients only see their own
        self.assertEqual(self.c.post("/api/me/shipments", json={"container_id": "gmt-9"}, headers=self.client).status_code, 201)
        self.assertEqual(self.c.post("/api/me/shipments", json={"container_id": "GMT-9"}, headers=self.client).status_code, 409)
        self.assertEqual(self.c.post("/api/me/shipments", json={"container_id": "NOPE"}, headers=self.client).status_code, 404)
        body = {"container_id": "GMT-9", "purpose": "Pickup", "date": "2026-12-01", "time_range": "08:00-09:00"}
        self.assertEqual(self.c.post("/api/me/bookings", json=body, headers=self.client).status_code, 409)   # customs on hold
        self.c.post("/api/containers/GMT-9/customs/clear", headers=self.docs)
        b = self.c.post("/api/me/bookings", json=body, headers=self.client).json()
        self.assertEqual(self.c.get("/api/state", headers=self.client).json()["bookings"][0]["id"], "GMT-9")
        self.assertEqual(self.c.delete(f"/api/me/bookings/{b['bid']}", headers=self.client).status_code, 204)
        self.assertEqual(self.c.get("/api/me/bookings", headers=self.client).json(), [])

    # -------------------------------------------------- reports, persistence
    def test_dashboard_and_log(self):
        self.place("GMT-1")
        d = self.c.get("/api/dashboard", headers=self.docs).json()
        self.assertEqual((d["containers_in_yard"], d["customs_pending"], d["occupancy_pct"]), (1, 1, 1))
        self.assertIn("placed at A1-B1-T1", self.c.get("/api/state", headers=self.admin).json()["log"][0]["m"])

    def test_snapshot_roundtrip(self):
        self.place("GMT-1")
        self.c.post("/api/tasks", json={"text": "Lift GMT-1", "p": 4}, headers=self.yard)
        snap = store.storage.data                      # autosave wrote it after the last write request
        store.reset()
        store.load_json(snap)
        self.assertEqual(store.containers["GMT-1"]["slot"], "A1-B1-T1")
        self.assertEqual(store.yard.ids("A1", 0), ["GMT-1"])
        self.assertEqual(len(store.pq), 1)

    def test_router(self):
        r = self.c.post("/api/route/astar", json={}, headers=self.yard)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.c.post("/api/route/astar", json={}, headers=self.gate).status_code, 403)


if __name__ == "__main__":
    unittest.main()
