"""Simple JWT-based authentication."""

import hashlib
import hmac
import time
import json
import base64
import os

from config import settings

SECRET = os.environ.get("VA_AUTH_SECRET", settings.auth_secret)

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)

def create_token(password: str) -> str | None:
    """Create JWT if password matches. Returns None if wrong password."""
    if password != settings.auth_password:
        return None

    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url_encode(json.dumps({
        "sub": "admin",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7 days
    }).encode())

    sig = hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    signature = _b64url_encode(sig)

    return f"{header}.{payload}.{signature}"

def verify_token(token: str) -> bool:
    """Verify JWT token. Returns True if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False

        header, payload, signature = parts
        sig = _b64url_encode(hmac.new(
            SECRET.encode(),
            f"{header}.{payload}".encode(),
            hashlib.sha256,
        ).digest())

        if not hmac.compare_digest(signature, sig):
            return False

        data = json.loads(_b64url_decode(payload))
        return data.get("exp", 0) > time.time()
    except Exception:
        return False
