"""Storage billing rules.

* 3 free days (assumed project setting), then every chargeable day is billed.
* The daily rate depends on the container size and the cargo type (the yard zone). Currency: PKR.
* Storage charge = chargeable days x applicable daily tariff.

TARIFF below holds PLACEHOLDER rates (PKR per day): replace the numbers with the approved tariff.
"""
FREE_DAYS = 3
CURRENCY = "PKR"

#            General  Hazardous  Refrigerated   (PKR per chargeable day)
TARIFF: dict[str, dict[str, int]] = {
    "20 ft":    {"General": 1500, "Hazardous": 2500, "Refrigerated": 3000},
    "40 ft":    {"General": 2500, "Hazardous": 4000, "Refrigerated": 5000},
    "40 ft HC": {"General": 2750, "Hazardous": 4400, "Refrigerated": 5500},
    "45 ft":    {"General": 3000, "Hazardous": 4800, "Refrigerated": 6000},
}
DEFAULT_SIZE = "40 ft"


def rate_for(size: str, zone: str) -> int:
    """Daily tariff for this size and cargo type (unknown values fall back to a 40 ft / General rate)."""
    row = TARIFF.get(size) or TARIFF[DEFAULT_SIZE]
    return row.get(zone, row["General"])


def chargeable_days(days_in_yard: int) -> int:
    return max(0, days_in_yard - FREE_DAYS)


def dues(days_in_yard: int, size: str = DEFAULT_SIZE, zone: str = "General") -> int:
    """Storage charge in PKR = chargeable days x daily tariff."""
    return chargeable_days(days_in_yard) * rate_for(size, zone)


def settled(dues_amount: int, paid: bool) -> bool:
    return dues_amount == 0 or paid


def can_release(customs: str, dues_amount: int, paid: bool) -> bool:
    return customs == "Cleared" and settled(dues_amount, paid)


DAY_MS = 86_400_000


def dwell_days(at_ms: float, rel_ms: float | None, now_ms: float) -> int:
    """Whole days a container has been in the terminal (until release, if released)."""
    return max(0, int(((rel_ms if rel_ms is not None else now_ms) - at_ms) // DAY_MS))
