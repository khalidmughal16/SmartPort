"""Stack + YardStacks: the container yard modelled as 8 bays, each bay a stack (max 4 tiers high).

A container can only leave when it is on top. Each stack item is the day its container will leave, so
placing a container on top of one that leaves *earlier* creates a blocker (an "extra crane move" later).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Iterator, Optional, TypeVar

T = TypeVar("T")
MAX_TIERS = 4


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
