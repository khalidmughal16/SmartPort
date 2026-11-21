from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import PlaceIn, SuggestIn
from ..store import get_container, store

router = APIRouter(prefix="/api/yard", tags=["yard"])


@router.get("", dependencies=[Depends(require("A", "Y"))])
async def yard():
    return {"stacks": store.yard.to_lists(), "containers": store.yard.labels, "heights": store.yard.heights(), "max_tiers": 4}


@router.post("/suggest", dependencies=[Depends(require("A", "G", "Y"))])
async def suggest(body: SuggestIn):
    """Preview the best slot without changing anything."""
    s = store.yard.suggest(body.leave_day, body.hazard)
    if s is None:
        raise HTTPException(409, "All stacks are at maximum height. Free a slot first.")
    return s.as_dict()


@router.post("/place", dependencies=[Depends(require("A", "G", "Y"))])
async def place(body: PlaceIn):
    """The server re-runs the optimizer and pushes the container onto the best stack."""
    c = get_container(body.container_id)
    if c["st"] == "Released":
        raise HTTPException(409, "That container has already left.")
    s = store.yard.suggest(body.leave_day, body.hazard)
    if s is None:
        raise HTTPException(409, "All stacks are at maximum height. Free a slot first.")
    store.yard.place(s.col, body.leave_day, c["id"])
    c.update(st="In yard", slot=f"B{s.col + 1}-T{s.tier + 1}", zone="Hazard" if body.hazard else "Standard", leave_day=body.leave_day)
    return {"placement": s.as_dict(), "container": store.view(c)}
