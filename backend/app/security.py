"""Password hashing (PBKDF2) and signed access tokens, using only the standard library."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

SECRET = os.environ.get("SMARTPORT_SECRET", "dev-secret-change-me").encode()
TOKEN_TTL = 60 * 60 * 8  # 8 hours


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000)
    return salt.hex() + "$" + digest.hex()


def verify_password(pw: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$")
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), 120_000)
    return hmac.compare_digest(digest.hex(), digest_hex)


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def make_token(user_id: int, role: str) -> str:
    body = _b64(json.dumps({"uid": user_id, "role": role, "exp": int(time.time()) + TOKEN_TTL}).encode())
    return body + "." + _b64(hmac.new(SECRET, body.encode(), hashlib.sha256).digest())


def read_token(token: str) -> Optional[dict]:
    try:
        body, sig = token.split(".")
        if not hmac.compare_digest(sig, _b64(hmac.new(SECRET, body.encode(), hashlib.sha256).digest())):
            return None
        data = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return data if data["exp"] > time.time() else None
    except Exception:
        return None
