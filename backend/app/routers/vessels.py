from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import VesselIn
from ..store import store

router = APIRouter(prefix="/api/vessels", tags=["vessels"], dependencies=[Depends(require("A", "G", "Y"))])


@router.get("")
async def list_vessels():
    return store.vessel_list()


@router.post("", status_code=201)
async def add_vessel(body: VesselIn):
    v = {"id": str(store.new_id("vessel")), "name": body.name.strip(), "eta": body.eta, "boxes": body.boxes, "berth": body.berth}
    store.vessels.append(v)
    store.log_event("Vessel", f"{v['name']} scheduled for berth {v['berth']}")
    return v


@router.delete("/{vessel_id}", status_code=204)
async def remove_vessel(vessel_id: str):
    n = len(store.vessels)
    store.vessels[:] = [v for v in store.vessels if v["id"] != vessel_id]
    if len(store.vessels) == n:
        raise HTTPException(404, "No such vessel.")
