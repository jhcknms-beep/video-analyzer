"""Simple JSON-based user store."""

import json
import hashlib
import os
from pathlib import Path

STORE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "users.json"

def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def _load() -> dict:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        # Create default admin account
        default = {"admin": {"password_hash": _hash("admin123"), "created_at": ""}}
        with open(STORE_PATH, "w") as f:
            json.dump(default, f, indent=2)
        return default
    with open(STORE_PATH, "r") as f:
        return json.load(f)

def _save(data: dict) -> None:
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)

def authenticate(username: str, password: str) -> bool:
    """Check if username/password is valid."""
    users = _load()
    user = users.get(username)
    if not user:
        return False
    return user["password_hash"] == _hash(password)

def create_user(username: str, password: str) -> tuple[bool, str]:
    """Create a new user. Returns (success, message)."""
    username = username.strip().lower()
    if not username or len(username) < 2:
        return False, "Username too short (min 2 chars)"
    if not password or len(password) < 4:
        return False, "Password too short (min 4 chars)"
    if not username.isalnum():
        return False, "Username must be alphanumeric"

    users = _load()
    if username in users:
        return False, "Username already exists"
    if len(users) >= 20:
        return False, "Max 20 users reached"

    from datetime import datetime, timezone
    users[username] = {
        "password_hash": _hash(password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(users)
    return True, f"User '{username}' created"

def list_users() -> list[str]:
    return list(_load().keys())

def get_viewed(username: str) -> list[str]:
    users = _load()
    user = users.get(username)
    if not user:
        return []
    return user.get("viewed", [])

def mark_viewed(username: str, job_id: str) -> None:
    users = _load()
    user = users.get(username)
    if user is not None:
        viewed = user.get("viewed", [])
        if job_id not in viewed:
            viewed.append(job_id)
            user["viewed"] = viewed
            _save(users)

def change_password(username: str, old_password: str, new_password: str) -> tuple[bool, str]:
    users = _load()
    user = users.get(username)
    if not user:
        return False, "User not found"
    if user["password_hash"] != _hash(old_password):
        return False, "Wrong password"
    users[username]["password_hash"] = _hash(new_password)
    _save(users)
    return True, "Password changed"
