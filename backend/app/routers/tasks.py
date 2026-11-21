from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import TaskIn
from ..store import store

router = APIRouter(prefix="/api/tasks", tags=["crane tasks"], dependencies=[Depends(require("A", "Y"))])


@router.get("")
async def list_tasks():
    return [{"id": k, "priority": p, "title": t} for k, p, t in store.pq.ordered()]


@router.post("", status_code=201)
async def add_task(body: TaskIn):
    t = store.add_task(body.title, body.priority)
    return {"id": t["id"], "priority": t["priority"], "title": t["title"]}


@router.post("/{task_id}/escalate")
async def escalate(task_id: int):
    if task_id not in store.pq:
        raise HTTPException(404, "No open task with that id.")
    new = store.pq.priority_of(task_id) + 2
    store.pq.update_priority(task_id, new)  # lazy-deletion heap update, O(log n)
    store.tasks[task_id]["priority"] = new
    return {"id": task_id, "priority": new}


@router.post("/dispatch")
async def dispatch():
    """Pop the highest-priority task from the heap."""
    try:
        key, pr, title = store.pq.pop()
    except IndexError:
        raise HTTPException(409, "No open tasks.")
    store.tasks[key]["done"] = True
    return {"id": key, "priority": pr, "title": title}
