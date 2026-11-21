from fastapi import APIRouter, Depends

from ..deps import require
from ..dsa.billing import dues
from ..dsa.simulation import compare
from ..store import store

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/dashboard", dependencies=[Depends(require("A", "G", "Y", "D", "B"))])
async def dashboard():
    in_yard = [c for c in store.containers.values() if c["st"] == "In yard"]
    return {"containers_in_yard": len(in_yard), "past_free_days": sum(c["d"] > 5 for c in in_yard), "over_7_days": sum(c["d"] > 7 for c in in_yard),
            "storage_dues_open": sum(dues(c["d"]) for c in in_yard if not c["paid"]), "gate_queue": len(store.gate_queue),
            "yard_heights": store.yard.heights()}


@router.get("/reports/placement", dependencies=[Depends(require("A", "B"))])
async def placement_report(n: int = 32, seed: int | None = None):
    """Random vs smart placement (8 bays x 4 tiers = at most 32 containers)."""
    return compare(min(max(n, 1), 32), seed=seed)


@router.get("/reports/revenue", dependencies=[Depends(require("A", "B"))])
async def revenue():
    cs = [c for c in store.containers.values() if c["st"] != "Pending"]
    return {"storage_collected": sum(dues(c["d"]) for c in cs if c["paid"]), "storage_open": sum(dues(c["d"]) for c in cs if not c["paid"])}
