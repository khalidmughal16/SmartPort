"""One call that gives the frontend everything the signed-in role is allowed to see. The frontend polls it."""
from fastapi import APIRouter, Depends, HTTPException

from ..deps import ROLE_NAMES, current_user
from ..store import store
from .client import booking_view
from .gate import slot_rows

router = APIRouter(prefix="/api", tags=["state"])


@router.get("/state")
async def state(day: int = 0, u: dict = Depends(current_user)):
    if not 0 <= day <= 6:
        raise HTTPException(404, "Day must be 0 (Mon) to 6 (Sun).")
    r = u["role"]
    out: dict = {"role": r}
    if r == "C":  # clients only see the containers they follow
        ids = store.watch.get(u["id"], [])
        out["containers"] = [store.view(store.containers[i]) for i in ids if i in store.containers]
        out["bookings"] = [booking_view(b) for b in store.bookings if b["user_id"] == u["id"]]
        return out
    out["containers"] = [store.view(c) for c in store.containers.values()]
    out["log"] = store.log
    out["tasks"] = [store.task_view(store.tasks[k]) for k, _, _ in store.pq.ordered()] if r in ("A", "Y") else []
    out["vessels"] = store.vessel_list() if r in ("A", "G", "Y") else []
    out["slots"] = slot_rows(day) if r in ("A", "G") else []
    out["day"] = day
    out["users"] = [{"id": x["id"], "name": x["name"], "email": x["email"], "role": x["role"], "role_name": ROLE_NAMES[x["role"]], "company": x["company"]}
                    for x in store.users.values()] if r == "A" else []
    return out
