"""FIFO queue for trucks waiting at the gate. enqueue/dequeue are O(1) (linked via deque)."""
from __future__ import annotations

from collections import deque
from typing import Generic, Optional, TypeVar

T = TypeVar("T")


class GateQueue(Generic[T]):
    def __init__(self, items: Optional[list[T]] = None) -> None:
        self._q: deque[T] = deque(items or [])

    def enqueue(self, x: T) -> None:
        self._q.append(x)

    def dequeue(self) -> T:
        if not self._q:
            raise IndexError("gate queue is empty")
        return self._q.popleft()

    def peek(self) -> Optional[T]:
        return self._q[0] if self._q else None

    def __len__(self) -> int:
        return len(self._q)

    def to_list(self) -> list[T]:
        return list(self._q)
