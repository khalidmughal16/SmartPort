from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..dsa.billing import can_release, settled
from ..schemas import BookingIn, ShipmentIn
from ..store import get_container, store

router = APIRouter(prefix="/api/me", tags=["client portal"])
client = require("C", "A")


def _owns(u: dict, cid: str) -> bool:
    return cid in store.watch.get(u["id"], [])


@router.get("/shipments")
async def shipments(u: dict = Depends(client)):
    return [store.view(store.containers[i]) for i in store.watch.get(u["id"], []) if i in store.containers]


@router.post("/shipments", status_code=201)
async def add_shipment(body: ShipmentIn, u: dict = Depends(client)):
    c = get_container(body.container_id)
    if _owns(u, c["id"]):
        raise HTTPException(409, f"{c['id']} is already in your list.")
    store.watch.setdefault(u["id"], []).append(c["id"])
    return store.view(c)


@router.delete("/shipments/{cid}", status_code=204)
async def remove_shipment(cid: str, u: dict = Depends(client)):
    if _owns(u, cid.upper()):
        store.watch[u["id"]].remove(cid.upper())


@router.get("/bookings")
async def bookings(u: dict = Depends(client)):
    return sorted((b for b in store.bookings if b["user_id"] == u["id"]), key=lambda b: b["date"])


@router.post("/bookings", status_code=201)
async def book(body: BookingIn, u: dict = Depends(client)):
    c = get_container(body.container_id)
    if not _owns(u, c["id"]):
        raise HTTPException(403, "Add the container to your shipments first.")
    if body.purpose == "Pickup" and not can_release(c["cus"], c["d"], c["paid"]):
        raise HTTPException(409, "Pickup needs customs cleared and dues paid.")
    b = {"id": store.new_id("booking"), "user_id": u["id"], "container_id": c["id"], **body.model_dump(exclude={"container_id"})}
    store.bookings.append(b)
    if body.purpose == "Pickup":
        c["bk"] = True
    return b


@router.delete("/bookings/{booking_id}", status_code=204)
async def cancel(booking_id: int, u: dict = Depends(client)):
    store.bookings[:] = [b for b in store.bookings if not (b["id"] == booking_id and b["user_id"] == u["id"])]


@router.post("/shipments/{cid}/pay")
async def pay(cid: str, u: dict = Depends(client)):
    c = get_container(cid)
    if not _owns(u, c["id"]):
        raise HTTPException(403, "That container is not in your shipments.")
    if settled(c["d"], c["paid"]):
        raise HTTPException(409, "Nothing to pay.")
    c["paid"] = True
    return store.view(c)
