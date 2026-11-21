"""Shared FastAPI dependencies: current user and role guards."""
from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .security import read_token
from .store import store

ROLE_NAMES = {"A": "Admin", "G": "Gate Officer", "Y": "Yard Supervisor", "D": "Documentation Clerk", "B": "Billing Clerk", "C": "Client"}


# HTTPBearer makes the /docs page show an "Authorize" button where you paste the login token once.
bearer = HTTPBearer(auto_error=False)


async def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    data = read_token(creds.credentials) if creds else None
    if not data:
        raise HTTPException(401, "Sign in required")
    user = store.users.get(data["uid"])
    if not user:
        raise HTTPException(401, "Account no longer exists")
    return user


def require(*roles: str) -> Callable:
    """Dependency factory: only the listed roles may call the endpoint (403 otherwise)."""
    async def guard(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"{ROLE_NAMES[user['role']]} cannot do this")
        return user
    return guard
