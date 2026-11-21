"""Storage billing rules: 5 free days, then $45 per day."""
FREE_DAYS = 5
RATE_PER_DAY = 45


def dues(days_in_yard: int) -> int:
    return max(0, days_in_yard - FREE_DAYS) * RATE_PER_DAY


def settled(days_in_yard: int, paid: bool) -> bool:
    return dues(days_in_yard) == 0 or paid


def can_release(customs: str, days_in_yard: int, paid: bool) -> bool:
    return customs == "Cleared" and settled(days_in_yard, paid)


DAY_MS = 86_400_000


def dwell_days(at_ms: float, rel_ms: float | None, now_ms: float) -> int:
    """Whole days a container has been in the terminal (until release, if released)."""
    return max(0, int(((rel_ms if rel_ms is not None else now_ms) - at_ms) // DAY_MS))
