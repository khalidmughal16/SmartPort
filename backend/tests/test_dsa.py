import random
import unittest

from app.dsa.astar import astar, new_obstacles
from app.dsa.billing import can_release, dues
from app.dsa.gate_queue import GateQueue
from app.dsa.priority_queue import PriorityQueue
from app.dsa.simulation import compare
from app.dsa.stack import Stack, YardStacks
from app.dsa.trie import Trie


class TestStack(unittest.TestCase):
    def test_lifo(self):
        s = Stack()
        for x in (1, 2, 3):
            s.push(x)
        self.assertEqual((s.pop(), s.peek(), len(s)), (3, 2, 2))
        with self.assertRaises(IndexError):
            Stack().pop()

    def test_yard_prefers_fewest_blockers(self):
        y = YardStacks([[9, 5, 3], [7, 2], [8, 6, 4, 2], [3], [9, 7, 6], [5, 4], [8], [6, 3, 2]])
        s = y.suggest(1)            # leaves on day 1: nothing leaves earlier, so the shortest stack wins
        self.assertEqual((s.col, s.extra_moves), (3, 0))
        s = y.suggest(9)            # leaves late: every bay has blockers, pick the least
        self.assertEqual(s.extra_moves, min(y.extra_moves(c, 9) for c in range(8) if len(y.bays[c]) < 4))

    def test_full_yard_returns_none(self):
        y = YardStacks([[1, 2, 3, 4]] * 3)
        self.assertIsNone(y.suggest(5))
        with self.assertRaises(ValueError):
            y.place(0, 5)


class TestPriorityQueue(unittest.TestCase):
    def test_order_and_fifo_ties(self):
        pq = PriorityQueue()
        pq.push("a", 3); pq.push("b", 5); pq.push("c", 5); pq.push("d", 1)
        self.assertEqual([pq.pop()[0] for _ in range(4)], ["b", "c", "a", "d"])

    def test_update_priority(self):
        pq = PriorityQueue()
        pq.push("a", 3); pq.push("b", 4)
        pq.update_priority("a", 9)
        self.assertEqual(pq.pop()[:2], ("a", 9))
        self.assertEqual(len(pq), 1)

    def test_matches_sorted_on_random_data(self):
        rng = random.Random(1)
        pq, items = PriorityQueue(), []
        for i in range(200):
            p = rng.randint(1, 9)
            pq.push(i, p); items.append((-p, i))
        self.assertEqual([pq.pop()[0] for _ in range(200)], [i for _, i in sorted(items)])


class TestAStar(unittest.TestCase):
    def test_open_grid_is_manhattan(self):
        r = astar([False] * 60)
        self.assertTrue(r["found"]); self.assertEqual(r["steps"], 9 + 5)

    def test_blocked(self):
        ob = [False] * 60
        for i in (1, 10):
            ob[i] = True
        self.assertFalse(astar(ob)["found"])

    def test_path_avoids_obstacles(self):
        ob = new_obstacles(random.Random(3))
        r = astar(ob)
        if r["found"]:
            self.assertFalse(any(ob[i] for i in r["path"]))


class TestTrieQueueBilling(unittest.TestCase):
    def test_trie(self):
        t = Trie(["GMT-0017", "GMT-0019", "GMT-0021", "ABC-1"])
        self.assertEqual(t.with_prefix("gmt-001"), ["GMT-0017", "GMT-0019"])
        self.assertTrue(t.contains("abc-1")); self.assertEqual(t.with_prefix("zzz"), [])

    def test_gate_queue_fifo(self):
        q = GateQueue(); q.enqueue("T1"); q.enqueue("T2")
        self.assertEqual((q.dequeue(), q.peek(), len(q)), ("T1", "T2", 1))

    def test_billing(self):
        self.assertEqual((dues(5), dues(7)), (0, 90))
        self.assertFalse(can_release("Cleared", 7, False)); self.assertTrue(can_release("Cleared", 7, True))
        self.assertFalse(can_release("Hold", 1, False))

    def test_smart_beats_random(self):
        r = compare(32, seed=7)
        self.assertLessEqual(r["smart_extra_moves"], r["random_extra_moves"])

class TestYardGrid(unittest.TestCase):
    def test_suggest_prefers_no_blockers_then_short_stack(self):
        from app.dsa.stack import YardGrid
        g = YardGrid()
        g.place("A1", 0, "EARLY", 1)
        s = g.suggest("General", 9)           # EARLY leaves before 9, so bay 0 would create a blocker
        self.assertEqual((s.block, s.bay, s.extra), ("A1", 1, 0))
        self.assertEqual(g.suggest("General", 0).extra, 0)

    def test_zone_and_height_limits(self):
        from app.dsa.stack import YardGrid
        g = YardGrid()
        self.assertEqual(g.suggest("Hazardous").block, "H1")
        for i in range(g.bays * g.max_tier):
            s = g.suggest("Refrigerated")
            g.place(s.block, s.bay, f"R{i}")
        self.assertIsNone(g.suggest("Refrigerated"))

    def test_remove_and_roundtrip(self):
        from app.dsa.stack import YardGrid
        g = YardGrid()
        for cid in ("a", "b", "c"):
            g.place("A1", 0, cid, None)
        self.assertEqual(g.remove("b"), ("A1", 0))
        self.assertEqual(g.ids("A1", 0), ["a", "c"])
        self.assertEqual(YardGrid.from_dict(g.to_dict()).ids("A1", 0), ["a", "c"])


if __name__ == "__main__":
    unittest.main()
