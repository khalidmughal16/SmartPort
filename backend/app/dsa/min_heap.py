"""Binary MIN-heap (hand-written) used for upcoming appointments (APT-9: earliest first).

push / pop: O(log n). remove() uses *lazy deletion* (the entry is marked stale and skipped later), so cancelling an
appointment is O(1). Equal times are served first-in-first-out.
"""
from __future__ import annotations

from typing import Any, Optional

_REMOVED = object()


class MinHeap:
    def __init__(self) -> None:
        self._heap: list[list] = []          # entries: [time_key, seq, key, payload]
        self._entries: dict[Any, list] = {}  # key -> live entry
        self._seq = 0

    @staticmethod
    def _before(a: list, b: list) -> bool:
        return (a[0], a[1]) < (b[0], b[1])    # earlier time first, then older entry first

    def _up(self, i: int) -> None:
        h = self._heap
        while i > 0:
            p = (i - 1) // 2
            if not self._before(h[i], h[p]):
                break
            h[i], h[p] = h[p], h[i]
            i = p

    def _down(self, i: int) -> None:
        h, n = self._heap, len(self._heap)
        while True:
            l, r, best = 2 * i + 1, 2 * i + 2, i
            if l < n and self._before(h[l], h[best]):
                best = l
            if r < n and self._before(h[r], h[best]):
                best = r
            if best == i:
                return
            h[i], h[best] = h[best], h[i]
            i = best

    def push(self, key: Any, time_key: Any, payload: Any = None) -> None:
        """time_key is anything sortable, e.g. ("2026-12-01", "08:00")."""
        if key in self._entries:
            self.remove(key)
        self._seq += 1
        entry = [time_key, self._seq, key, payload]
        self._entries[key] = entry
        self._heap.append(entry)
        self._up(len(self._heap) - 1)

    def remove(self, key: Any) -> None:
        entry = self._entries.pop(key)
        entry[2] = _REMOVED

    def _drop_stale(self) -> None:
        h = self._heap
        while h and h[0][2] is _REMOVED:
            h[0] = h[-1]
            h.pop()
            if h:
                self._down(0)

    def pop(self) -> tuple[Any, Any, Any]:
        """Remove and return (key, time_key, payload) of the earliest item."""
        self._drop_stale()
        if not self._heap:
            raise IndexError("pop from empty heap")
        top = self._heap[0]
        self._heap[0] = self._heap[-1]
        self._heap.pop()
        if self._heap:
            self._down(0)
        del self._entries[top[2]]
        return top[2], top[0], top[3]

    def peek(self) -> Optional[tuple[Any, Any, Any]]:
        self._drop_stale()
        return (self._heap[0][2], self._heap[0][0], self._heap[0][3]) if self._heap else None

    def __len__(self) -> int:
        return len(self._entries)

    def __contains__(self, key: Any) -> bool:
        return key in self._entries

    def ordered(self) -> list[tuple[Any, Any, Any]]:
        """All live items, earliest first (non-destructive, O(n log n))."""
        live = sorted(self._entries.values(), key=lambda e: (e[0], e[1]))
        return [(e[2], e[0], e[3]) for e in live]
