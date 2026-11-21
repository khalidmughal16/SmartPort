from fastapi import APIRouter, Depends, HTTPException

from ..deps import require
from ..schemas import TaskIn
from ..store import store

router = APIRouter(prefix="/api/tasks", tags=["crane tasks"], dependencies=[Depends(require("A", "Y"))])


def _live(task_id: int) -> dict:
    if task_id not in store.pq:
        raise HTTPException(404, "No open task with that id.")
    return store.tasks[task_id]


@router.get("")
async def list_tasks():
    return [store.task_view(store.tasks[k]) for k, _, _ in store.pq.ordered()]


@router.post("", status_code=201)
async def add_task(body: TaskIn):
    t = store.add_task(body.text.strip(), body.p)
    store.log_event("Task", f"Crane task added: {t['text']}")
    return store.task_view(t)


@router.post("/{task_id}/escalate")
async def escalate(task_id: int):
    t = _live(task_id)
    t["p"] = min(9, t["p"] + 1)
    store.pq.update_priority(task_id, t["p"])  # lazy-deletion heap update, O(log n)
    return store.task_view(t)


@router.post("/{task_id}/done")
async def finish(task_id: int):
    t = _live(task_id)
    store.pq.remove(task_id)
    del store.tasks[task_id]
    store.log_event("Task", f"Crane task done: {t['text']}")
    return {"done": str(task_id)}


@router.post("/dispatch")
async def dispatch():
    """Pop the highest-priority task from the heap."""
    try:
        key, pr, text = store.pq.pop()
    except IndexError:
        raise HTTPException(409, "No open tasks.")
    store.tasks.pop(key, None)
    store.log_event("Task", f"Crane task done: {text}")
    return {"id": str(key), "p": pr, "text": text}
