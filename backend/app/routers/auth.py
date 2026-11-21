from fastapi import APIRouter, Depends, HTTPException

from ..deps import ROLE_NAMES, current_user
from ..schemas import LoginIn, SignupIn
from ..security import make_token, verify_password
from ..store import store

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _public(u: dict) -> dict:
    return {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"], "role_name": ROLE_NAMES[u["role"]], "company": u["company"]}


@router.post("/login")
async def login(body: LoginIn):
    u = store.user_by_email(body.email)  # hash-map lookup, O(1)
    if not u or not verify_password(body.password, u["password"]):
        raise HTTPException(401, "Email or password is incorrect.")
    return {"token": make_token(u["id"], u["role"]), "user": _public(u)}


@router.post("/signup", status_code=201)
async def signup(body: SignupIn):
    if store.user_by_email(body.email):
        raise HTTPException(409, "That email already has an account.")
    if body.role == "A" and body.invite.strip() != "SMART-ADMIN":
        raise HTTPException(403, "Admin accounts need the invite code SMART-ADMIN.")
    u = store.add_user(body.name.strip(), body.email, body.password, body.role, body.company.strip() if body.role == "C" else "")
    return {"token": make_token(u["id"], u["role"]), "user": _public(u)}


@router.get("/me")
async def me(u: dict = Depends(current_user)):
    return _public(u)
