"""Stack + YardGrid: the container yard.

Layout (matches the approved seed data): 4 yard blocks, 10 stacks in total, up to 4 tiers per stack = 40 locations.
Every stack is a LIFO Stack: a container can only leave when it is on top, so placing one on top of a container
that leaves *earlier* creates a blocker (an extra move later).

Placement rules (PLC-3 / PLC-4), see YardGrid.suggest():
  1. Keep only valid stacks: matching zone, free height, same container length (20 / 40 / 45 ft), and no
     heavier container on top of a lighter one.
  2. Prefer a stack whose top container leaves on the same day or later than the new container.
  3. Among those, choose the closest leaving date after the new container's leaving date.
  4. If tied, choose the stack with fewer containers.
  5. If no suitable stack exists, choose the valid stack with the fewest earlier-leaving blockers.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Generic, Iterator, NamedTuple, Optional, TypeVar

T = TypeVar("T")
INF = float("inf")
DAY_MS = 86_400_000


class Stack(Generic[T]):
    """LIFO stack backed by a list. push/pop/peek are O(1)."""

    def __init__(self, items: Optional[list[T]] = None) -> None:
        self._a: list[T] = list(items or [])

    def push(self, x: T) -> None:
        self._a.append(x)

    def pop(self) -> T:
        if not self._a:
            raise IndexError("pop from empty stack")
        return self._a.pop()

    def peek(self) -> T:
        if not self._a:
            raise IndexError("peek at empty stack")
        return self._a[-1]

    def __len__(self) -> int:
        return len(self._a)

    def __iter__(self) -> Iterator[T]:  # bottom -> top
        return iter(self._a)

    def to_list(self) -> list[T]:
        return list(self._a)


# (block, zone, number of stacks). 4 blocks, 10 stacks. Edit here if the approved seed data changes.
YARD_LAYOUT: list[tuple[str, str, int]] = [("A1", "General", 3), ("A2", "General", 3), ("H1", "Hazardous", 2), ("R1", "Refrigerated", 2)]
MAX_TIER = 4


def length_of(size: Optional[str]) -> Optional[int]:
    """'40 ft HC' -> 40. Containers of different lengths are never stacked together."""
    m = re.match(r"\s*(\d+)", size or "")
    return int(m.group(1)) if m else None


def day_of(ms: Optional[float]) -> float:
    """Leaving day number. No planned date means it leaves last (infinity)."""
    return INF if ms is None or ms == INF else ms // DAY_MS


class Item(NamedTuple):
    cid: str
    leave: float          # ms since epoch, INF when unknown
    length: Optional[int]  # 20 / 40 / 45
    weight: Optional[float]  # kg, None when unknown


@dataclass
class Placement:
    block: str
    bay: int      # 0-based stack number inside the block
    tier: int     # 0-based
    extra: int    # containers underneath that leave earlier (blockers)
    zone: str
    reason: str = ""

    @property
    def slot(self) -> str:
        return f"{self.block}-B{self.bay + 1}-T{self.tier + 1}"

    def as_dict(self) -> dict:
        return {"block": self.block, "bay": self.bay, "tier": self.tier, "e": self.extra, "zone": self.zone, "slot": self.slot, "reason": self.reason}


class YardGrid:
    """suggest() is O(stacks x height); place() is O(1); remove() is O(height)."""

    def __init__(self, layout: Optional[list[tuple[str, str, int]]] = None, max_tier: int = MAX_TIER) -> None:
        self.layout = list(layout or YARD_LAYOUT)
        self.blocks = [(b, z) for b, z, _ in self.layout]
        self.n_stacks = {b: n for b, _, n in self.layout}
        self.max_tier = max_tier
        self.stacks: dict[tuple[str, int], Stack[Item]] = {(b, i): Stack() for b, _, n in self.layout for i in range(n)}
        self.where: dict[str, tuple[str, int]] = {}  # container id -> (block, bay), O(1) lookup

    @property
    def capacity(self) -> int:
        return len(self.stacks) * self.max_tier

    # ------------------------------------------------------------------ rule 1: valid stacks
    def is_valid(self, block_zone: str, s: Stack[Item], zone: str, length: Optional[int], weight: Optional[float]) -> bool:
        if block_zone != zone or len(s) >= self.max_tier:
            return False
        if len(s):
            bottom, top = next(iter(s)), s.peek()
            if length is not None and bottom.length is not None and bottom.length != length:
                return False                      # different container length
            if weight is not None and top.weight is not None and weight > top.weight:
                return False                      # a heavier container must not sit on a lighter one
        return True

    def suggest(self, zone: str, leave: Optional[float] = None, size: Optional[str] = None, weight: Optional[float] = None) -> Optional[Placement]:
        length, nd = length_of(size), day_of(leave)
        best_top: Optional[tuple[float, int, int, Placement]] = None   # rules 2-4
        best_fb: Optional[tuple[int, int, Placement]] = None           # rule 5
        for block, z in self.blocks:
            for bay in range(self.n_stacks[block]):
                s = self.stacks[(block, bay)]
                if not self.is_valid(z, s, zone, length, weight):
                    continue
                blockers = sum(1 for it in s if day_of(it.leave) < nd)
                if len(s):
                    td = day_of(s.peek().leave)
                    if td >= nd:                                   # rule 2: top leaves the same day or later
                        gap = 0 if td == nd else td - nd           # rule 3: closest leaving date
                        key = (gap, len(s))                        # rule 4: fewer containers
                        if best_top is None or key < best_top[:2]:
                            why = ("The top container leaves the same day as this one." if gap == 0 else
                                   "The top container leaves later than this one" + ("" if gap == INF else f" (closest match: {int(gap)} day{'s' if gap != 1 else ''} after)") + ".")
                            best_top = (gap, len(s), bay, Placement(block, bay, len(s), blockers, zone, why))
                fb = (blockers, len(s))
                if best_fb is None or fb < best_fb[:2]:
                    why = (f"No stack has a top container leaving the same day or later, so this stack has the fewest earlier-leaving containers ({blockers}).")
                    best_fb = (blockers, len(s), Placement(block, bay, len(s), blockers, zone, why))
        if best_top:
            return best_top[3]
        return best_fb[2] if best_fb else None

    def place(self, block: str, bay: int, cid: str, leave: Optional[float] = None, size: Optional[str] = None, weight: Optional[float] = None) -> int:
        s = self.stacks.get((block, bay))
        if s is None:
            raise ValueError("no such stack")
        if len(s) >= self.max_tier:
            raise ValueError("stack is full")
        s.push(Item(cid, INF if leave is None else leave, length_of(size), weight))
        self.where[cid] = (block, bay)
        return len(s) - 1

    def remove(self, cid: str) -> Optional[tuple[str, int]]:
        """Take a container out (release / delete). Containers above it drop one tier."""
        loc = self.where.pop(cid, None)
        if loc is None:
            return None
        s = self.stacks[loc]
        s._a = [x for x in s._a if x.cid != cid]
        return loc

    def ids(self, block: str, bay: int) -> list[str]:
        return [it.cid for it in self.stacks[(block, bay)]]

    def heights(self) -> dict[str, list[int]]:
        return {b: [len(self.stacks[(b, i)]) for i in range(n)] for b, _, n in self.layout}

    def used(self) -> int:
        return sum(len(s) for s in self.stacks.values())

    def to_dict(self) -> dict:
        return {f"{b}:{i}": [[it.cid, None if it.leave == INF else it.leave, it.length, it.weight] for it in s] for (b, i), s in self.stacks.items() if len(s)}

    @classmethod
    def from_dict(cls, d: dict) -> "YardGrid":
        """Rebuild from a snapshot. Stacks that no longer exist in the layout are skipped (the store re-queues those containers)."""
        g = cls()
        for key, items in d.items():
            b, i = key.split(":")
            if (b, int(i)) not in g.stacks:
                continue
            for row in items:
                cid, lv = row[0], row[1]
                length, weight = (row[2], row[3]) if len(row) >= 4 else (None, None)
                s = g.stacks[(b, int(i))]
                if len(s) < g.max_tier:
                    s.push(Item(cid, INF if lv is None else lv, length, weight))
                    g.where[cid] = (b, int(i))
        return g
