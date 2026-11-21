from fastapi import APIRouter, Depends

from ..deps import require
from ..dsa.astar import astar, new_obstacles
from ..schemas import RouteIn

router = APIRouter(prefix="/api/route", tags=["router"], dependencies=[Depends(require("A", "Y"))])


@router.post("/astar")
def find_path(body: RouteIn):
    """Shortest clear path from the top-left to the bottom-right cell of the 10x6 yard grid."""
    ob = body.obstacles if body.obstacles is not None else new_obstacles()
    return {"obstacles": ob, **astar(ob)}
