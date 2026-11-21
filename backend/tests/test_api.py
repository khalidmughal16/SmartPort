import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.store import store


def login(c, email, pw):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    return {"Authorization": "Bearer " + r.json()["token"]} if r.status_code == 200 else None


class TestApi(unittest.TestCase):
    def setUp(self):
        store.path = None          # no snapshot file during tests
        store.seed()
        self.c = TestClient(app)
        self.admin = login(self.c, "admin@smartport.pk", "Admin@123")

    def test_auth_and_roles(self):
        self.assertEqual(self.c.post("/api/auth/login", json={"email": "admin@smartport.pk", "password": "nope"}).status_code, 401)
        self.assertEqual(self.c.get("/api/containers").status_code, 401)
        client = login(self.c, "client@smartport.pk", "Client@123")
        self.assertEqual(self.c.get("/api/containers", headers=client).status_code, 403)
        self.assertEqual(self.c.get("/api/me/shipments", headers=client).status_code, 200)

    def test_signup_rules(self):
        body = {"name": "Ali Khan", "email": "ali@x.pk", "password": "abcd1234", "role": "C"}
        self.assertEqual(self.c.post("/api/auth/signup", json=body).status_code, 201)
        self.assertEqual(self.c.post("/api/auth/signup", json=body).status_code, 409)
        self.assertEqual(self.c.post("/api/auth/signup", json={**body, "email": "b@x.pk", "password": "short"}).status_code, 422)
        self.assertEqual(self.c.post("/api/auth/signup", json={**body, "email": "c@x.pk", "role": "A"}).status_code, 403)

    def test_release_needs_customs_and_payment(self):
        h = self.admin
        cid = next(c["id"] for c in self.c.get("/api/containers", headers=h).json() if c["d"] > 5)
        self.assertEqual(self.c.post(f"/api/containers/{cid}/release", headers=h).status_code, 409)
        self.c.post(f"/api/containers/{cid}/customs/clear", headers=h)
        self.assertEqual(self.c.post(f"/api/containers/{cid}/release", headers=h).status_code, 409)
        self.c.post(f"/api/containers/{cid}/pay", headers=h)
        self.assertEqual(self.c.post(f"/api/containers/{cid}/release", headers=h).json()["st"], "Released")

    def test_placement_uses_stack(self):
        h = self.admin
        before = self.c.get("/api/yard", headers=h).json()["heights"]
        s = self.c.post("/api/yard/suggest", headers=h, json={"leave_day": 1}).json()
        r = self.c.post("/api/yard/place", headers=h, json={"leave_day": 1, "container_id": "GMT-0050"}).json()
        after = self.c.get("/api/yard", headers=h).json()["heights"]
        self.assertEqual(r["placement"]["col"], s["col"])
        self.assertEqual(after[s["col"]], before[s["col"]] + 1)
        self.assertEqual(r["container"]["st"], "In yard")

    def test_tasks_heap(self):
        h = self.admin
        self.assertEqual(self.c.get("/api/tasks", headers=h).json()[0]["priority"], 5)
        tid = self.c.get("/api/tasks", headers=h).json()[-1]["id"]
        self.assertEqual(self.c.post(f"/api/tasks/{tid}/escalate", headers=h).json()["priority"], 4)
        first = self.c.post("/api/tasks/dispatch", headers=h).json()
        self.assertEqual(first["priority"], 5)

    def test_gate_queue_and_slots(self):
        h = self.admin
        for t in ("T-1", "T-2"):
            self.c.post("/api/gate/check-in", headers=h, json={"container_id": "GMT-0099", "truck": t})
        self.assertEqual(self.c.post("/api/gate/queue/next", headers=h).json()["served"]["truck"], "T-1")
        full = next(s["time"] for s in self.c.get("/api/gate/slots?day=0", headers=h).json() if s["full"])
        self.assertEqual(self.c.post(f"/api/gate/slots/0/{full}/book", headers=h).status_code, 409)

    def test_route_search_reports(self):
        h = self.admin
        self.assertTrue(self.c.post("/api/route/astar", headers=h, json={"obstacles": [False] * 60}).json()["steps"] == 14)
        self.assertEqual(self.c.get("/api/containers/search?q=gmt-001", headers=h).json()["matches"], ["GMT-0017", "GMT-0018", "GMT-0019"])
        rep = self.c.get("/api/reports/placement?seed=3", headers=h).json()
        self.assertLessEqual(rep["smart_extra_moves"], rep["random_extra_moves"])
        self.assertIn("containers_in_yard", self.c.get("/api/dashboard", headers=h).json())

    def test_client_portal(self):
        cl = login(self.c, "client@smartport.pk", "Client@123")
        self.assertEqual(len(self.c.get("/api/me/shipments", headers=cl).json()), 3)
        self.assertEqual(self.c.post("/api/me/shipments", headers=cl, json={"container_id": "GMT-0017"}).status_code, 409)
        self.assertEqual(self.c.post("/api/me/shipments", headers=cl, json={"container_id": "NOPE-1"}).status_code, 404)
        blocked = next(s["id"] for s in self.c.get("/api/me/shipments", headers=cl).json() if not s["settled"] or s["cus"] != "Cleared")
        r = self.c.post("/api/me/bookings", headers=cl, json={"container_id": blocked, "date": "2026-12-01"})
        self.assertEqual(r.status_code, 409)


if __name__ == "__main__":
    unittest.main()
