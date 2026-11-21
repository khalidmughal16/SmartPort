"""Upcoming appointments for gate staff, handled in time order (earliest first) with a min-heap (APT-9)."""
from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..store import store

router = APIRouter(prefix="/api/appointments", tags=["appointments"], dependencies=[Depends(require("A", "G"))])


def appointment_view(b: dict) -> dict:
    u = store.users.get(b["user_id"])
    return {"bid": b["id"], "id": b["container_id"], "t": b["purpose"], "d": b["date"], "s": b["time_range"], "client": u["name"] if u else ""}


@router.get("/upcoming")
async def upcoming():
    return [appointment_view(b) for b in store.upcoming_appointments()]


@router.post("/next")
async def handle_next():
    """Take the earliest appointment off the heap (it has been handled at the gate)."""
    try:
        key, _, _ = store.appt_heap.pop()
    except IndexError:
        raise HTTPException(409, "No upcoming appointments.")
    b = next((x for x in store.bookings if x["id"] == key), None)
    store.bookings[:] = [x for x in store.bookings if x["id"] != key]
    if b:
        store.log_event("Appointment", f"{b['purpose']} appointment for {b['container_id']} handled ({b['date']} {b['time_range']})", b["container_id"])
    return appointment_view(b) if b else {"bid": key}
