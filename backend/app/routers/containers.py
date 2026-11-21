from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import require
from ..dsa.billing import can_release
from ..schemas import ContainerIn, IdsIn, ImportIn
from ..store import get_container, store

router = APIRouter(prefix="/api/containers", tags=["containers"])
STAFF = ("A", "G", "Y", "D", "B")
INTAKE = ("A", "G", "Y")      # may register / place / remove containers
FINANCE = ("A", "D", "B")     # customs, payment, release


def _norm(v: str) -> str:
    return v.strip().upper()


def _register(body: ContainerIn) -> dict:
    cid = _norm(body.id)
    old = store.containers.get(cid)
    if old and old["st"] != "Released":
        raise HTTPException(409, f"{cid} is already in the terminal.")
    if old:  # a released number coming back: start a fresh record
        store.drop_container(cid)
    return store.add_container(cid, size=body.size, zone=body.zone, consignee=(body.consignee or "").strip() or None, leave=body.leave)


@router.get("", dependencies=[Depends(require(*STAFF))])
async def list_containers(status: str | None = None):
    return [store.view(c) for _, c in sorted(store.containers.items()) if status in (None, c["st"])]


@router.get("/search", dependencies=[Depends(require(*STAFF))])
async def search(q: str = Query(min_length=1)):
    """Prefix search with the Trie."""
    return {"query": q.upper(), "matches": store.trie.with_prefix(q, limit=10)}


@router.post("", status_code=201, dependencies=[Depends(require(*INTAKE))])
async def add_container(body: ContainerIn):
    """Gate-in: the container has arrived but is not placed yet (it shows up in Placement)."""
    c = _register(body)
    store.log_event("Gate-in", f"{c['id']} checked in ({c['size']}, {c['zone']})", c["id"])
    return store.view(c)


@router.post("/import", status_code=201, dependencies=[Depends(require(*INTAKE))])
async def import_manifest(body: ImportIn):
    added = 0
    for item in body.items:
        cid = _norm(item.id)
        if not cid or (cid in store.containers and store.containers[cid]["st"] != "Released"):
            continue
        _register(item)
        added += 1
    if added:
        store.log_event("Manifest", f"{added} containers imported from manifest")
    return {"added": added, "skipped": len(body.items) - added}


@router.post("/place", dependencies=[Depends(require(*INTAKE))])
async def place(body: ContainerIn):
    """The server runs the optimizer (YardGrid.suggest) and pushes the container onto the best stack.
    Creates the container first when it was not registered yet (the one-step Gate-In flow)."""
    cid = _norm(body.id)
    c = store.containers.get(cid)
    if c and c["st"] == "In yard":
        raise HTTPException(409, f"{cid} is already placed at {c['slot']}.")
    if c and c["st"] == "Released":
        c = None
    zone = c["zone"] if c else body.zone
    leave = c["leave"] if c and c["leave"] else body.leave
    s = store.yard.suggest(zone, leave)
    if s is None:
        raise HTTPException(409, f"The {zone} zone is full. Free a slot first.")
    created = c is None
    if created:
        c = _register(body)
    store.yard.place(s.block, s.bay, cid, leave)
    c.update(st="In yard", block=s.block, bay=s.bay, tier=s.tier, slot=s.slot)
    store.log_event("Placed", f"{cid} {'checked in and ' if created else ''}placed at {s.slot}", cid)
    return {"placement": s.as_dict(), "container": store.view(c)}


@router.post("/customs/clear-many", dependencies=[Depends(require(*FINANCE))])
async def clear_many(body: IdsIn):
    n = 0
    for raw in body.ids:
        c = store.containers.get(_norm(raw))
        if c and c["cus"] != "Cleared":
            c["cus"] = "Cleared"
            n += 1
    if n:
        store.log_event("Customs", f"{n} containers cleared by customs")
    return {"cleared": n}


@router.get("/{cid}", dependencies=[Depends(require(*STAFF))])
async def detail(cid: str):
    return store.view(get_container(cid))


@router.delete("/{cid}", status_code=204, dependencies=[Depends(require(*INTAKE))])
async def remove(cid: str):
    c = get_container(cid)
    store.drop_container(c["id"])
    store.log_event("Removed", f"{c['id']} removed from records", c["id"])


@router.post("/{cid}/customs/clear", dependencies=[Depends(require(*FINANCE))])
async def clear_customs(cid: str):
    c = get_container(cid)
    c["cus"] = "Cleared"
    store.log_event("Customs", f"{c['id']} customs cleared", c["id"])
    return store.view(c)


@router.post("/{cid}/pay", dependencies=[Depends(require(*FINANCE))])
async def pay(cid: str):
    c = get_container(cid)
    c["paid"] = True
    store.log_event("Payment", f"Payment received for {c['id']}", c["id"])
    return store.view(c)


@router.post("/{cid}/release", dependencies=[Depends(require(*FINANCE))])
async def release(cid: str):
    from ..store import now_ms
    c = get_container(cid)
    if c["st"] != "In yard":
        raise HTTPException(409, "Only containers placed in the yard can be released.")
    if not can_release(c["cus"], store.days_in(c), c["paid"]):
        raise HTTPException(409, "Release blocked: clear customs and pay dues first.")
    store.yard.remove(c["id"])
    c["st"], c["rel"] = "Released", now_ms()
    store.retier()
    store.log_event("Gate-out", f"{c['id']} released", c["id"])
    return store.view(c)
