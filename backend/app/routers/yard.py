from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import SuggestIn
from ..store import store

router = APIRouter(prefix="/api/yard", tags=["yard"])


@router.get("", dependencies=[Depends(require("A", "G", "Y"))])
async def yard():
    g = store.yard
    return {"blocks": [{"id": b, "zone": z} for b, z in g.blocks], "bays": g.bays, "max_tier": g.max_tier, "capacity": g.capacity, "used": g.used(),
            "heights": g.heights(), "stacks": {f"{b}:{i}": g.ids(b, i) for b, _ in g.blocks for i in range(g.bays) if g.ids(b, i)}}


@router.post("/suggest", dependencies=[Depends(require("A", "G", "Y"))])
async def suggest(body: SuggestIn):
    """Preview the best slot without changing anything."""
    s = store.yard.suggest(body.zone, body.leave)
    if s is None:
        raise HTTPException(409, f"The {body.zone} zone is full. Free a slot first.")
    return s.as_dict()
