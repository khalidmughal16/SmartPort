"""Storage billing rules: 5 free days, then $45 per day."""
FREE_DAYS = 5
RATE_PER_DAY = 45


def dues(days_in_yard: int) -> int:
    return max(0, days_in_yard - FREE_DAYS) * RATE_PER_DAY


def settled(days_in_yard: int, paid: bool) -> bool:
    return dues(days_in_yard) == 0 or paid


def can_release(customs: str, days_in_yard: int, paid: bool) -> bool:
    return customs == "Cleared" and settled(days_in_yard, paid)
