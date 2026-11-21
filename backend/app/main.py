"""SmartPort API (FastAPI + in-memory DSA structures, no SQL). Run:  uvicorn app.main:app --reload   (docs at http://localhost:8000/docs)"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .store import store
from .routers import admin, appointments, auth, client, containers, gate, reports, state, vessels, yard


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load_or_seed()  # reload the JSON snapshot, or seed the demo data on first run
    yield
    store.save()


app = FastAPI(title="SmartPort API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origin_regex=os.environ.get("SMARTPORT_CORS", r"http://(localhost|127\.0\.0\.1)(:\d+)?"), allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def autosave(request, call_next):
    """Persist the in-memory store after every write request."""
    response = await call_next(request)
    if request.method != "GET" and response.status_code < 400:
        store.save()
    return response


for r in (auth, state, containers, yard, gate, appointments, vessels, reports, client, admin):
    app.include_router(r.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
