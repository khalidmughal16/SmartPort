"""Random vs smart placement over N containers (reports page). Deterministic when a seed is given."""
from __future__ import annotations

import random
from typing import Optional

from .stack import MAX_TIERS, YardStacks


def compare(n: int = 40, bays: int = 8, seed: Optional[int] = None) -> dict:
    rng = random.Random(seed)
    rand_yard, smart_yard = YardStacks(n_bays=bays), YardStacks(n_bays=bays)
    rand_extra = smart_extra = 0
    placed = 0
    for _ in range(n):
        t = rng.randint(1, 20)
        free = [c for c in range(bays) if len(rand_yard.bays[c]) < MAX_TIERS]
        s = smart_yard.suggest(t)
        if not free or s is None:
            break
        col = rng.choice(free)
        rand_extra += rand_yard.extra_moves(col, t)
        rand_yard.bays[col].push(t)
        smart_extra += s.extra_moves
        smart_yard.bays[s.col].push(t)
        placed += 1
    saved = rand_extra - smart_extra
    return {"containers": placed, "random_extra_moves": rand_extra, "smart_extra_moves": smart_extra,
            "moves_saved": saved, "percent_fewer": round(100 * saved / rand_extra) if rand_extra else 0}
