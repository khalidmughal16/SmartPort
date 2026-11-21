from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import SuggestIn
from ..store import store

router = APIRouter(prefix="/api/yard", tags=["yard"])


@router.get("", dependencies=[Depends(require("A", "G", "Y"))])
async def yard():
    g = store.yard
    return {"blocks": [{"id": b, "zone": z, "stacks": g.n_stacks[b]} for b, z in g.blocks], "max_tier": g.max_tier, "capacity": g.capacity, "used": g.used(),
            "heights": g.heights(), "stacks": {f"{b}:{i}": g.ids(b, i) for b, _ in g.blocks for i in range(g.n_stacks[b]) if g.ids(b, i)}}


@router.post("/suggest", dependencies=[Depends(require("A", "G", "Y"))])
async def suggest(body: SuggestIn):
    """Preview the best slot without changing anything."""
    s = store.yard.suggest(body.zone, body.leave, body.size, body.weight)
    if s is None:
        raise HTTPException(409, f"No valid stack is free in the {body.zone} zone for a {body.size} container.")
    return s.as_dict()
