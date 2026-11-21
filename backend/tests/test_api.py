import time
import unittest

from fastapi.testclient import TestClient

from app.dsa.billing import rate_for
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
        self.assertEqual((s["containers"], s["appointments"], s["vessels"], s["log"]), ([], [], [], []))
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
        self.assertTrue(r["reason"])

    def test_placement_prefers_closest_later_leaving_top(self):
        now = int(time.time() * 1000)
        self.place("D5", leave=now + 5 * DAY)            # A1-B1
        self.place("D9", leave=now + 9 * DAY)            # top of A1-B1 leaves earlier, so it needs a new stack: A1-B2
        r = self.place("D4", leave=now + 4 * DAY).json()["placement"]
        self.assertEqual((r["block"], r["bay"], r["tier"]), ("A1", 0, 1))     # tops leave on day 5 and day 9: day 5 is the closest after day 4
        s = self.c.post("/api/yard/suggest", json={"zone": "General", "leave": now + 3 * DAY}, headers=self.gate).json()
        self.assertEqual((s["block"], s["bay"]), ("A1", 0))                    # suggest() is read-only and agrees with place()

    def test_size_filter_in_api(self):
        self.place("S20", size="20 ft")
        r = self.place("S40", size="40 ft").json()["placement"]
        self.assertNotEqual((r["block"], r["bay"]), ("A1", 0))                # never on top of a 20 ft container

    def test_zone_full(self):
        for i in range(8):                               # H1 holds 2 stacks x 4 tiers
            self.assertEqual(self.place(f"H-{i}", "Hazardous").status_code, 200)
        self.assertEqual(self.place("H-8", "Hazardous").status_code, 409)

    def test_yard_layout_endpoint(self):
        y = self.c.get("/api/yard", headers=self.gate).json()
        self.assertEqual((len(y["blocks"]), sum(b["stacks"] for b in y["blocks"]), y["max_tier"], y["capacity"]), (4, 10, 4, 40))

    def test_release_rules_and_tier_drop(self):
        for cid in ("A-1", "A-2"):
            self.place(cid)
        self.assertEqual(self.c.get("/api/containers/A-2", headers=self.admin).json()["slot"], "A1-B1-T2")
        self.assertEqual(self.c.post("/api/containers/A-1/release", headers=self.docs).status_code, 409)  # customs on hold
        self.c.post("/api/containers/A-1/customs/clear", headers=self.docs)
        self.assertEqual(self.c.post("/api/containers/A-1/release", headers=self.docs).status_code, 200)
        self.assertEqual(self.c.get("/api/containers/A-1", headers=self.admin).json()["st"], "Released")
        # no pick-up dates: A-2 stacks on A-1 (same leaving time), so when A-1 leaves A-2 drops to tier 1
        self.assertEqual(self.c.get("/api/containers/A-2", headers=self.admin).json()["slot"], "A1-B1-T1")

    def test_storage_dues_and_pay(self):
        self.add("OLD-1", size="40 ft", zone="Refrigerated")
        store.containers["OLD-1"]["at"] -= 9 * DAY      # 9 days in the terminal: 3 free, 6 chargeable days x the 40 ft refrigerated tariff
        d = self.c.get("/api/containers/OLD-1", headers=self.admin).json()
        self.assertEqual((d["free_days"], d["chargeable_days"], d["currency"]), (3, 6, "PKR"))
        self.assertEqual(d["dues"], 6 * rate_for("40 ft", "Refrigerated"))
        self.c.post("/api/containers/OLD-1/pay", headers=self.admin)
        self.assertTrue(self.c.get("/api/containers/OLD-1", headers=self.admin).json()["settled"])

    def test_no_dues_inside_free_days(self):
        self.add("NEW-1")
        store.containers["NEW-1"]["at"] -= 3 * DAY
        self.assertEqual(self.c.get("/api/containers/NEW-1", headers=self.admin).json()["dues"], 0)

    def test_import_lookup_delete(self):
        r = self.c.post("/api/containers/import", json={"items": [{"id": "MSKU1"}, {"id": "MSKU2"}, {"id": "MSKU1"}]}, headers=self.gate).json()
        self.assertEqual((r["added"], r["skipped"]), (2, 1))
        self.assertEqual(self.c.get("/api/containers/msku1", headers=self.gate).json()["id"], "MSKU1")   # dictionary lookup by number
        self.assertEqual(self.c.delete("/api/containers/MSKU1", headers=self.gate).status_code, 204)
        self.assertEqual(self.c.get("/api/containers/MSKU1", headers=self.gate).status_code, 404)

    def test_removed_features_are_gone(self):
        for path in ("/api/tasks", "/api/route/astar", "/api/containers/search?q=a"):
            self.assertIn(self.c.get(path, headers=self.admin).status_code, (404, 405, 422))
        self.assertEqual(self.c.post("/api/route/astar", json={}, headers=self.admin).status_code, 404)

    # ------------------------------------------------- tasks, vessels, gate
    def test_appointments_min_heap_earliest_first(self):
        self.add("GMT-1"); self.add("GMT-2"); self.add("GMT-3")
        for cid in ("GMT-1", "GMT-2", "GMT-3"):
            self.c.post("/api/containers/" + cid + "/customs/clear", headers=self.docs)
            self.c.post("/api/me/shipments", json={"container_id": cid}, headers=self.client)
        def book(cid, date, t):
            return self.c.post("/api/me/bookings", json={"container_id": cid, "purpose": "Pickup", "date": date, "time_range": t}, headers=self.client).json()
        book("GMT-1", "2026-12-05", "09:00-10:00"); book("GMT-2", "2026-12-01", "14:00-15:00"); b3 = book("GMT-3", "2026-12-01", "08:00-09:00")
        up = self.c.get("/api/appointments/upcoming", headers=self.gate).json()
        self.assertEqual([a["id"] for a in up], ["GMT-3", "GMT-2", "GMT-1"])                 # time order, earliest first
        self.assertEqual([a["id"] for a in self.c.get("/api/state", headers=self.gate).json()["appointments"]], ["GMT-3", "GMT-2", "GMT-1"])
        self.assertEqual(self.c.get("/api/appointments/upcoming", headers=self.yard).status_code, 403)
        self.assertEqual(self.c.post("/api/appointments/next", headers=self.gate).json()["id"], "GMT-3")   # handle the earliest
        self.c.delete(f"/api/me/bookings/{[x for x in store.bookings if x['container_id'] == 'GMT-2'][0]['id']}", headers=self.client)
        self.assertEqual([a["id"] for a in self.c.get("/api/appointments/upcoming", headers=self.gate).json()], ["GMT-1"])
        self.assertEqual(b3["id"], "GMT-3")

    def test_vessels_not_sorted_by_eta(self):
        late, early = int(time.time() * 1000) + 5 * DAY, int(time.time() * 1000) + DAY
        self.c.post("/api/vessels", json={"name": "LATE", "eta": late, "boxes": 1, "berth": "B-1"}, headers=self.gate)
        self.c.post("/api/vessels", json={"name": "EARLY", "eta": early, "boxes": 1, "berth": "B-2"}, headers=self.gate)
        self.assertEqual([v["name"] for v in self.c.get("/api/vessels", headers=self.yard).json()], ["LATE", "EARLY"])   # insertion order

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
        self.assertEqual((d["containers_in_yard"], d["customs_pending"], d["occupancy_pct"]), (1, 1, 2))   # 1 of 40 locations
        self.assertIn("placed at A1-B1-T1", self.c.get("/api/state", headers=self.admin).json()["log"][0]["m"])

    def test_snapshot_roundtrip(self):
        self.place("GMT-1", weight=9000, size="40 ft")
        store.containers["GMT-1"]["cus"] = "Cleared"
        self.c.post("/api/me/shipments", json={"container_id": "GMT-1"}, headers=self.client)
        self.c.post("/api/me/bookings", json={"container_id": "GMT-1", "purpose": "Pickup", "date": "2026-12-01", "time_range": "08:00-09:00"}, headers=self.client)
        snap = store.storage.data                      # autosave wrote it after the last write request
        store.reset()
        store.load_json(snap)
        self.assertEqual(store.containers["GMT-1"]["slot"], "A1-B1-T1")
        self.assertEqual(store.yard.ids("A1", 0), ["GMT-1"])
        self.assertEqual(len(store.appt_heap), 1)
        self.assertEqual(store.yard.stacks[("A1", 0)].peek().weight, 9000)

    def test_old_snapshot_with_unknown_stack_is_requeued(self):
        self.place("GMT-1")
        snap = store.storage.data
        snap["yard"] = {"A1:9": snap["yard"]["A1:0"]}   # an older layout had 10 bays per block; bay 10 no longer exists
        store.reset(); store.load_json(snap)
        self.assertEqual((store.containers["GMT-1"]["st"], store.containers["GMT-1"]["slot"]), ("Pending", "Not placed"))


if __name__ == "__main__":
    unittest.main()
