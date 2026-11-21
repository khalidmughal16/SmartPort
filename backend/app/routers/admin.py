from fastapi import APIRouter, Depends

from ..deps import ROLE_NAMES, require
from ..store import store

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/users", dependencies=[Depends(require("A"))])
async def users():
    return [{"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "role_name": ROLE_NAMES[u["role"]], "company": u["company"]}
            for u in store.users.values()]
