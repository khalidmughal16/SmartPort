from fastapi import APIRouter, Depends

from ..deps import ROLE_NAMES, require
from ..store import store

router = APIRouter(prefix="/api", tags=["admin"])

VESSELS = [
    {"name": "MV Karachi Star", "eta": "Mon 06:00", "containers": 412, "berth": "B-3"},
    {"name": "MV Indus Trader", "eta": "Tue 14:00", "containers": 268, "berth": "B-1"},
    {"name": "MV Sindh Pearl", "eta": "Thu 09:00", "containers": 530, "berth": "B-2"},
    {"name": "MV Harbor Lark", "eta": "Sat 18:00", "containers": 190, "berth": "B-3"},
]


@router.get("/users", dependencies=[Depends(require("A"))])
async def users():
    return [{"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "role_name": ROLE_NAMES[u["role"]], "company": u["company"]}
            for u in store.users.values()]


@router.get("/vessels", dependencies=[Depends(require("A", "G", "Y"))])
async def vessels():
    return VESSELS
