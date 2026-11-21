from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import require
from ..dsa.billing import can_release
from ..schemas import ContainerIn
from ..store import get_container, store

router = APIRouter(prefix="/api/containers", tags=["containers"])
STAFF = ("A", "G", "Y", "D", "B")


@router.get("", dependencies=[Depends(require(*STAFF))])
async def list_containers(status: str | None = None):
    return [store.view(c) for _, c in sorted(store.containers.items()) if status in (None, c["st"])]


@router.get("/search", dependencies=[Depends(require(*STAFF))])
async def search(q: str = Query(min_length=1)):
    """Prefix search with the Trie."""
    return {"query": q.upper(), "matches": store.trie.with_prefix(q, limit=10)}


@router.post("", status_code=201, dependencies=[Depends(require("A", "G", "Y"))])
async def add_container(body: ContainerIn):
    cid = body.id.strip().upper()
    if cid in store.containers:
        raise HTTPException(409, f"{cid} already exists")
    return store.view(store.add_container(cid, zone="Hazard" if body.hazard else "Standard", slot="B1-R1-T1"))


@router.get("/{cid}", dependencies=[Depends(require(*STAFF))])
async def detail(cid: str):
    return store.view(get_container(cid))


@router.post("/{cid}/customs/clear", dependencies=[Depends(require("A", "D", "B"))])
async def clear_customs(cid: str):
    c = get_container(cid)
    c["cus"] = "Cleared"
    return store.view(c)


@router.post("/{cid}/pay", dependencies=[Depends(require("A", "B"))])
async def pay(cid: str):
    c = get_container(cid)
    c["paid"] = True
    return store.view(c)


@router.post("/{cid}/release", dependencies=[Depends(require("A", "D", "B"))])
async def release(cid: str):
    c = get_container(cid)
    if not can_release(c["cus"], c["d"], c["paid"]):
        raise HTTPException(409, "Release blocked: clear customs and pay dues first.")
    c["st"] = "Released"
    return store.view(c)
