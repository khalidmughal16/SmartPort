"""Random vs approved placement over N containers (reports page). Deterministic when a seed is given.

Both yards use the real layout (General zone, 6 stacks x 4 tiers = at most 24 containers). "Extra moves" counts the
containers already in the chosen stack that leave earlier than the new one.
"""
from __future__ import annotations

import random
from typing import Optional

from .stack import DAY_MS, YardGrid, day_of


def compare(n: int = 24, seed: Optional[int] = None) -> dict:
    rng = random.Random(seed)
    rand_yard, smart_yard = YardGrid(), YardGrid()
    rand_extra = smart_extra = placed = 0
    for i in range(n):
        leave = rng.randint(1, 20) * DAY_MS
        valid = [(b, bay) for b, z in rand_yard.blocks if z == "General" for bay in range(rand_yard.n_stacks[b]) if len(rand_yard.stacks[(b, bay)]) < rand_yard.max_tier]
        s = smart_yard.suggest("General", leave)
        if not valid or s is None:
            break
        b, bay = rng.choice(valid)
        rand_extra += sum(1 for it in rand_yard.stacks[(b, bay)] if day_of(it.leave) < day_of(leave))
        rand_yard.place(b, bay, f"R{i}", leave)
        smart_extra += s.extra
        smart_yard.place(s.block, s.bay, f"S{i}", leave)
        placed += 1
    saved = rand_extra - smart_extra
    return {"containers": placed, "random_extra_moves": rand_extra, "smart_extra_moves": smart_extra,
            "moves_saved": saved, "percent_fewer": round(100 * saved / rand_extra) if rand_extra else 0}
