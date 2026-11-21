"""A* shortest path on a grid (crane / truck routing). Uses heapq as the open set.

f = g + h with a Manhattan-distance heuristic (admissible on a 4-neighbour grid), so the path is optimal.
Complexity: O(V log V) for V cells.
"""
from __future__ import annotations

import heapq
import random
from typing import Optional

W, H = 10, 6


def new_obstacles(rng: Optional[random.Random] = None, density: float = 0.22) -> list[bool]:
    """Random obstacle map; start (0) and goal (W*H-1) are always free."""
    rng = rng or random.Random()
    ob = [rng.random() < density for _ in range(W * H)]
    ob[0] = ob[W * H - 1] = False
    return ob


def astar(obstacles: list[bool], start: int = 0, goal: Optional[int] = None, width: int = W, height: int = H) -> dict:
    goal = width * height - 1 if goal is None else goal
    n = width * height
    if len(obstacles) != n:
        raise ValueError(f"obstacle map must have {n} cells")
    if obstacles[start] or obstacles[goal]:
        return {"found": False, "steps": None, "path": []}

    gx, gy = goal % width, goal // width
    h = lambda i: abs(i % width - gx) + abs(i // width - gy)  # noqa: E731
    g = [float("inf")] * n
    came: dict[int, int] = {}
    g[start] = 0
    open_set: list[tuple[int, int, int]] = [(h(start), 0, start)]  # (f, tie, cell)
    tie = 0
    closed: set[int] = set()
    while open_set:
        _, _, cur = heapq.heappop(open_set)
        if cur in closed:
            continue
        if cur == goal:
            path = [cur]
            while path[-1] in came:
                path.append(came[path[-1]])
            path.reverse()
            return {"found": True, "steps": len(path) - 1, "path": path}
        closed.add(cur)
        x, y = cur % width, cur // width
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < width and 0 <= ny < height):
                continue
            nb = ny * width + nx
            if obstacles[nb] or g[cur] + 1 >= g[nb]:
                continue
            g[nb] = g[cur] + 1
            came[nb] = cur
            tie += 1
            heapq.heappush(open_set, (int(g[nb]) + h(nb), tie, nb))
    return {"found": False, "steps": None, "path": []}
