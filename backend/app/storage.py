"""Persistence seam. The rest of the backend never touches files or SQL directly: it only calls these two methods.

    load() -> dict | None     return the saved snapshot, or None when nothing has been saved yet
    save(data: dict) -> None  store the snapshot (data is plain JSON: dicts, lists, strings, numbers, bools, None)

Today the snapshot goes to a JSON file. To plug in a real database, write a class with the same two methods
(see DATABASE_GUIDE.md in the backend folder) and pick it in `app/store.py` (the last lines of that file).
"""
from __future__ import annotations

import json
import os
from typing import Optional, Protocol


class Storage(Protocol):
    def load(self) -> Optional[dict]: ...
    def save(self, data: dict) -> None: ...


class JsonFileStorage:
    """Default: one JSON file, written atomically (a crash never leaves a half-written file)."""

    def __init__(self, path: str) -> None:
        self.path = path

    def load(self) -> Optional[dict]:
        if not os.path.exists(self.path):
            return None
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def save(self, data: dict) -> None:
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f)
        os.replace(tmp, self.path)


class MemoryStorage:
    """Keeps nothing on disk. Used by the tests."""

    def __init__(self) -> None:
        self.data: Optional[dict] = None

    def load(self) -> Optional[dict]:
        return self.data

    def save(self, data: dict) -> None:
        self.data = json.loads(json.dumps(data))
