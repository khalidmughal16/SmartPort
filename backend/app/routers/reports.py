from datetime import datetime

from fastapi import APIRouter, Depends

from ..deps import require
from ..dsa.billing import DAY_MS, FREE_DAYS
from ..dsa.simulation import compare
from ..store import now_ms, store

router = APIRouter(prefix="/api", tags=["reports"])


def _week_start(now: int) -> int:
    d = datetime.fromtimestamp(now / 1000).replace(hour=0, minute=0, second=0, microsecond=0)
    return int(d.timestamp() * 1000) - d.weekday() * DAY_MS


def _per_weekday(ts: list[int], now: int) -> list[int]:
    w0, out = _week_start(now), [0] * 7
    for t in ts:
        i = (t - w0) // DAY_MS
        if 0 <= i < 7:
            out[i] += 1
    return out


@router.get("/dashboard", dependencies=[Depends(require("A", "G", "Y", "D", "B"))])
async def dashboard():
    now = now_ms()
    cs = list(store.containers.values())
    in_yard = [c for c in cs if c["st"] == "In yard"]
    return {
        "containers_in_yard": len(in_yard), "pending": sum(c["st"] == "Pending" for c in cs),
        "past_free_days": sum(store.days_in(c) > FREE_DAYS for c in in_yard), "over_7_days": sum(store.days_in(c) > 7 for c in in_yard),
        "customs_pending": sum(c["cus"] == "Hold" for c in cs if c["st"] != "Released"),
        "storage_dues_open": sum(store.due_of(c) for c in cs if c["st"] != "Released" and not c["paid"]), "currency": "PKR",
        "occupancy_pct": round(100 * store.yard.used() / store.yard.capacity), "gate_queue": len(store.gate_queue),
        "gate_ins_per_weekday": _per_weekday([c["at"] for c in cs], now),
        "gate_outs_per_weekday": _per_weekday([c["rel"] for c in cs if c["rel"]], now),
        "yard_heights": store.yard.heights(),
    }


@router.get("/reports/placement", dependencies=[Depends(require("A", "B"))])
async def placement_report(n: int = 24, seed: int | None = None):
    """Random vs approved placement rules (General zone: 6 stacks x 4 tiers = at most 24 containers)."""
    return compare(min(max(n, 1), 24), seed=seed)


@router.get("/reports/revenue", dependencies=[Depends(require("A", "B"))])
async def revenue():
    cs = [c for c in store.containers.values() if c["st"] != "Pending"]
    total = sum(store.due_of(c) for c in cs)
    paid = sum(store.due_of(c) for c in cs if c["paid"])
    return {"currency": "PKR", "storage_accrued": total, "storage_collected": paid, "storage_open": total - paid}
