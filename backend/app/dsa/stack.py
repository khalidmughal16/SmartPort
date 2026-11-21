"""Stack + YardStacks: the container yard modelled as 8 bays, each bay a stack (max 4 tiers high).

A container can only leave when it is on top. Each stack item is the day its container will leave, so
placing a container on top of one that leaves *earlier* creates a blocker (an "extra crane move" later).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Iterator, Optional, TypeVar

T = TypeVar("T")
MAX_TIERS = 4
INF = float("inf")


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


@dataclass
class Suggestion:
    col: int          # bay index, 0-based
    tier: int         # tier the container will sit on, 0-based
    extra_moves: int  # containers underneath that leave earlier (blockers)
    zone: str

    def as_dict(self) -> dict:
        return {"col": self.col, "tier": self.tier, "extra_moves": self.extra_moves, "zone": self.zone,
                "bay": self.col + 1, "tier_no": self.tier + 1}


class YardStacks:
    """A row of bays. suggest() is O(bays * height); place() is O(1)."""

    def __init__(self, bays: Optional[list[list[int]]] = None, n_bays: int = 8, labels: Optional[list[list[Optional[str]]]] = None) -> None:
        self.bays: list[Stack[int]] = [Stack(b) for b in bays] if bays else [Stack() for _ in range(n_bays)]
        # container number sitting at each tier (None for anonymous demo containers); parallel to self.bays
        self.labels: list[list[Optional[str]]] = labels or [[None] * len(b) for b in self.bays]

    def extra_moves(self, col: int, leave_day: int) -> int:
        """How many containers already in the bay leave before this one (they would be blocked)."""
        return sum(1 for x in self.bays[col] if x < leave_day)

    def suggest(self, leave_day: int, hazard: bool = False) -> Optional[Suggestion]:
        """Best free bay: fewest blockers, ties broken by the shorter stack. None if every bay is full."""
        best: Optional[tuple[int, int, int]] = None  # (extra, height, col)
        for col, s in enumerate(self.bays):
            if len(s) >= MAX_TIERS:
                continue
            cand = (self.extra_moves(col, leave_day), len(s), col)
            if best is None or cand < best:
                best = cand
        if best is None:
            return None
        extra, height, col = best
        return Suggestion(col, height, extra, "Hazard zone" if hazard else "Standard zone")

    def place(self, col: int, leave_day: int, container_id: Optional[str] = None) -> Suggestion:
        if not 0 <= col < len(self.bays):
            raise ValueError("no such bay")
        if len(self.bays[col]) >= MAX_TIERS:
            raise ValueError("bay is full")
        s = Suggestion(col, len(self.bays[col]), self.extra_moves(col, leave_day), "Standard zone")
        self.bays[col].push(leave_day)
        self.labels[col].append(container_id)
        return s

    def heights(self) -> list[int]:
        return [len(b) for b in self.bays]

    def to_lists(self) -> list[list[int]]:
        return [b.to_list() for b in self.bays]


# ---------------------------------------------------------------------------------------------------------------
# YardGrid: the real terminal layout used by the frontend: blocks (A1, A2, H1, R1) x 10 bays x up to 4 tiers.
# Every (block, bay) is a Stack of (container_id, leave_ms). A container can only leave when it is on top, so
# placing one on top of a container that leaves *earlier* creates a blocker (an extra crane move later).
# ---------------------------------------------------------------------------------------------------------------
YARD_BLOCKS: list[tuple[str, str]] = [("A1", "General"), ("A2", "General"), ("H1", "Hazardous"), ("R1", "Refrigerated")]
BAYS = 10
MAX_TIER = 4


@dataclass
class Placement:
    block: str
    bay: int      # 0-based
    tier: int     # 0-based
    extra: int    # containers underneath that leave earlier
    zone: str

    @property
    def slot(self) -> str:
        return f"{self.block}-B{self.bay + 1}-T{self.tier + 1}"

    def as_dict(self) -> dict:
        return {"block": self.block, "bay": self.bay, "tier": self.tier, "e": self.extra, "zone": self.zone, "slot": self.slot}


class YardGrid:
    """suggest() is O(blocks x bays x height); place() is O(1); remove() is O(height)."""

    def __init__(self, blocks: Optional[list[tuple[str, str]]] = None, bays: int = BAYS, max_tier: int = MAX_TIER) -> None:
        self.blocks = list(blocks or YARD_BLOCKS)
        self.bays, self.max_tier = bays, max_tier
        self.stacks: dict[tuple[str, int], Stack[tuple[str, float]]] = {(b, i): Stack() for b, _ in self.blocks for i in range(bays)}
        self.where: dict[str, tuple[str, int]] = {}  # container id -> (block, bay), O(1) lookup

    @property
    def capacity(self) -> int:
        return len(self.blocks) * self.bays * self.max_tier

    def suggest(self, zone: str, leave: Optional[float] = None) -> Optional[Placement]:
        """Best stack in the matching zone: fewest blockers, ties broken by the shorter stack."""
        lv = INF if leave is None else leave
        best: Optional[tuple[int, int, Placement]] = None
        for block, z in self.blocks:
            if z != zone:
                continue
            for bay in range(self.bays):
                s = self.stacks[(block, bay)]
                if len(s) >= self.max_tier:
                    continue
                e = sum(1 for _, lv2 in s if lv2 < lv)
                if best is None or (e, len(s)) < (best[0], best[1]):
                    best = (e, len(s), Placement(block, bay, len(s), e, zone))
        return best[2] if best else None

    def place(self, block: str, bay: int, cid: str, leave: Optional[float] = None) -> int:
        s = self.stacks.get((block, bay))
        if s is None:
            raise ValueError("no such stack")
        if len(s) >= self.max_tier:
            raise ValueError("stack is full")
        s.push((cid, INF if leave is None else leave))
        self.where[cid] = (block, bay)
        return len(s) - 1

    def remove(self, cid: str) -> Optional[tuple[str, int]]:
        """Take a container out (release / delete). Containers above it drop one tier."""
        loc = self.where.pop(cid, None)
        if loc is None:
            return None
        s = self.stacks[loc]
        s._a = [x for x in s._a if x[0] != cid]
        return loc

    def ids(self, block: str, bay: int) -> list[str]:
        return [c for c, _ in self.stacks[(block, bay)]]

    def heights(self) -> dict[str, list[int]]:
        return {b: [len(self.stacks[(b, i)]) for i in range(self.bays)] for b, _ in self.blocks}

    def used(self) -> int:
        return sum(len(s) for s in self.stacks.values())

    def to_dict(self) -> dict:
        return {f"{b}:{i}": [[c, None if lv == INF else lv] for c, lv in s] for (b, i), s in self.stacks.items() if len(s)}

    @classmethod
    def from_dict(cls, d: dict) -> "YardGrid":
        g = cls()
        for key, items in d.items():
            b, i = key.split(":")
            for cid, lv in items:
                g.place(b, int(i), cid, lv)
        return g
