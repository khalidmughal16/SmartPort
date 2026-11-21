from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import CheckInIn
from ..store import store

router = APIRouter(prefix="/api/gate", tags=["gate"], dependencies=[Depends(require("A", "G"))])
CAPACITY = 3  # trucks per slot


@router.post("/check-in", status_code=201)
async def check_in(body: CheckInIn):
    """Truck arrives: register the container as Pending and enqueue the truck (FIFO)."""
    cid = body.container_id.strip().upper()
    if cid not in store.containers:
        store.add_container(cid, st="Pending", zone="Hazard" if body.hazard else "Standard")
    store.gate_queue.enqueue({"id": store.new_id("queue"), "truck": body.truck, "container_id": cid})
    return {"container_id": cid, "queue_position": len(store.gate_queue)}


@router.get("/queue")
async def queue():
    q = store.gate_queue
    return {"length": len(q), "next": q.peek(), "trucks": q.to_list()}


@router.post("/queue/next")
async def serve_next():
    try:
        served = store.gate_queue.dequeue()
    except IndexError:
        raise HTTPException(409, "The gate queue is empty.")
    return {"served": served, "remaining": len(store.gate_queue)}


@router.get("/slots")
async def slots(day: int = 0):
    if not 0 <= day <= 6:
        raise HTTPException(404, "Day must be 0 (Mon) to 6 (Sun).")
    return [{"time": t, "booked": n, "capacity": CAPACITY, "full": n >= CAPACITY} for t, n in store.slots[day].items()]


@router.post("/slots/{day}/{time}/book")
async def book(day: int, time: str):
    if not 0 <= day <= 6 or time not in store.slots[day]:
        raise HTTPException(404, "No such slot.")
    if store.slots[day][time] >= CAPACITY:
        raise HTTPException(409, "Slot full: three trucks per slot.")
    store.slots[day][time] += 1
    return {"time": time, "booked": store.slots[day][time], "capacity": CAPACITY}
