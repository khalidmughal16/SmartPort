"""Trie (prefix tree) for instant container-number search. insert O(L), prefix search O(L + k)."""
from __future__ import annotations


class _Node:
    __slots__ = ("kids", "end")

    def __init__(self) -> None:
        self.kids: dict[str, _Node] = {}
        self.end = False


class Trie:
    def __init__(self, words: list[str] | None = None) -> None:
        self.root = _Node()
        self.size = 0
        for w in words or []:
            self.insert(w)

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word.upper():
            node = node.kids.setdefault(ch, _Node())
        if not node.end:
            node.end = True
            self.size += 1

    def contains(self, word: str) -> bool:
        node = self._find(word)
        return bool(node and node.end)

    def _find(self, prefix: str):
        node = self.root
        for ch in prefix.upper():
            node = node.kids.get(ch)
            if node is None:
                return None
        return node

    def with_prefix(self, prefix: str, limit: int = 10) -> list[str]:
        node = self._find(prefix)
        out: list[str] = []
        if node is None:
            return out
        stack = [(node, prefix.upper())]
        while stack and len(out) < limit:
            cur, word = stack.pop()
            if cur.end:
                out.append(word)
            for ch in sorted(cur.kids, reverse=True):  # reverse so pop() yields alphabetical order
                stack.append((cur.kids[ch], word + ch))
        return sorted(out)
