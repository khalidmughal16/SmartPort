import random
import unittest

from app.dsa.billing import FREE_DAYS, can_release, dues, rate_for
from app.dsa.gate_queue import GateQueue
from app.dsa.min_heap import MinHeap
from app.dsa.simulation import compare
from app.dsa.stack import DAY_MS, Stack, YardGrid

D = DAY_MS


class TestStack(unittest.TestCase):
    def test_lifo(self):
        s = Stack()
        for x in (1, 2, 3):
            s.push(x)
        self.assertEqual((s.pop(), s.peek(), len(s)), (3, 2, 2))
        with self.assertRaises(IndexError):
            Stack().pop()


class TestMinHeap(unittest.TestCase):
    def test_earliest_first_and_fifo_ties(self):
        h = MinHeap()
        h.push("a", ("2026-12-02", "08:00")); h.push("b", ("2026-12-01", "09:00")); h.push("c", ("2026-12-01", "09:00")); h.push("d", ("2026-12-01", "08:00"))
        self.assertEqual([h.pop()[0] for _ in range(4)], ["d", "b", "c", "a"])

    def test_remove_is_lazy_and_skipped(self):
        h = MinHeap()
        h.push("a", 1); h.push("b", 2); h.push("c", 3)
        h.remove("a")
        self.assertEqual((len(h), h.peek()[0]), (2, "b"))
        self.assertEqual([k for k, _, _ in h.ordered()], ["b", "c"])

    def test_matches_sorted_on_random_data(self):
        rng = random.Random(1)
        h, items = MinHeap(), []
        for i in range(200):
            t = rng.randint(1, 50)
            h.push(i, t); items.append((t, i))
        self.assertEqual([h.pop()[0] for _ in range(200)], [i for _, i in sorted(items)])
        with self.assertRaises(IndexError):
            h.pop()


class TestQueueAndBilling(unittest.TestCase):
    def test_gate_queue_fifo(self):
        q = GateQueue(); q.enqueue("T1"); q.enqueue("T2")
        self.assertEqual((q.dequeue(), q.peek(), len(q)), ("T1", "T2", 1))

    def test_billing_three_free_days_and_tariff(self):
        self.assertEqual(FREE_DAYS, 3)
        self.assertEqual((dues(3, "40 ft", "General"), dues(4, "40 ft", "General")), (0, rate_for("40 ft", "General")))
        # charge = chargeable days x tariff, and the tariff depends on size and cargo type
        self.assertEqual(dues(7, "20 ft", "General"), 4 * rate_for("20 ft", "General"))
        self.assertGreater(rate_for("40 ft", "Refrigerated"), rate_for("40 ft", "General"))
        self.assertGreater(rate_for("40 ft", "General"), rate_for("20 ft", "General"))

    def test_release_rules(self):
        self.assertFalse(can_release("Cleared", 5000, False)); self.assertTrue(can_release("Cleared", 5000, True))
        self.assertTrue(can_release("Cleared", 0, False)); self.assertFalse(can_release("Hold", 0, False))


class TestYardLayout(unittest.TestCase):
    def test_ten_stacks_four_tiers_forty_locations(self):
        g = YardGrid()
        self.assertEqual((len(g.blocks), len(g.stacks), g.max_tier, g.capacity), (4, 10, 4, 40))


class TestPlacementRules(unittest.TestCase):
    def test_rule2_3_prefers_top_that_leaves_closest_after(self):
        g = YardGrid()
        g.place("A1", 0, "X", 5 * D); g.place("A1", 1, "Y", 9 * D); g.place("A1", 2, "Z", 7 * D)
        s = g.suggest("General", 4 * D)           # tops leave on days 5, 9, 7: day 5 is the closest after day 4
        self.assertEqual((s.block, s.bay, s.extra), ("A1", 0, 0))

    def test_same_day_counts_as_suitable(self):
        g = YardGrid()
        g.place("A1", 0, "X", 5 * D + 1000)
        self.assertEqual(g.suggest("General", 5 * D).bay, 0)

    def test_rule4_tie_goes_to_fewer_containers(self):
        g = YardGrid()
        g.place("A1", 0, "B1", 9 * D); g.place("A1", 0, "T1", 6 * D)      # stack 0: 2 containers, top leaves day 6
        g.place("A1", 1, "T2", 6 * D)                                      # stack 1: 1 container, top leaves day 6
        s = g.suggest("General", 5 * D)
        self.assertEqual((s.block, s.bay), ("A1", 1))

    def test_rule5_fewest_blockers_when_no_top_is_suitable(self):
        g = YardGrid()
        # every occupied stack has a top that leaves EARLIER than the new container, and empty stacks are not "suitable tops"
        for block, n in (("A1", 3), ("A2", 3)):
            for i in range(n):
                g.place(block, i, f"{block}{i}", 1 * D)
        g.place("A1", 0, "extra", 2 * D)                                   # A1 stack 0 now has 2 blockers
        s = g.suggest("General", 9 * D)
        self.assertEqual(s.extra, 1)                                       # best remaining stack has one blocker
        self.assertIn("fewest", s.reason)

    def test_rule1_zone_height_size_weight_filters(self):
        g = YardGrid()
        self.assertEqual(g.suggest("Hazardous").block, "H1")
        # height: fill every refrigerated stack
        for i in range(8):
            s = g.suggest("Refrigerated"); g.place(s.block, s.bay, f"R{i}")
        self.assertIsNone(g.suggest("Refrigerated"))
        # size: a 20 ft container is never put on a 40 ft stack
        g2 = YardGrid()
        for b in range(3):
            g2.place("A1", b, f"F{b}", None, "40 ft")
        for b in range(3):
            g2.place("A2", b, f"G{b}", None, "40 ft")
        self.assertIsNone(g2.suggest("General", None, "20 ft"))
        self.assertIsNotNone(g2.suggest("General", None, "40 ft HC"))      # same length as 40 ft
        # weight: a heavier container never goes on a lighter one
        g3 = YardGrid()
        for blk in ("A1", "A2"):
            for b in range(3):
                g3.place(blk, b, f"{blk}{b}", None, "40 ft", 10000)
        self.assertIsNone(g3.suggest("General", None, "40 ft", 20000))
        self.assertIsNotNone(g3.suggest("General", None, "40 ft", 8000))

    def test_remove_and_roundtrip(self):
        g = YardGrid()
        for cid in ("a", "b", "c"):
            g.place("A1", 0, cid, None, "40 ft", 9000)
        self.assertEqual(g.remove("b"), ("A1", 0))
        self.assertEqual(g.ids("A1", 0), ["a", "c"])
        g2 = YardGrid.from_dict(g.to_dict())
        self.assertEqual(g2.ids("A1", 0), ["a", "c"])
        self.assertEqual(g2.stacks[("A1", 0)].peek().weight, 9000)

    def test_approved_rules_beat_random(self):
        r = compare(24, seed=7)
        self.assertLessEqual(r["smart_extra_moves"], r["random_extra_moves"])


if __name__ == "__main__":
    unittest.main()
