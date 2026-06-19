"""Authentication routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.auth import create_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    password: str

@router.post("/login")
async def login(req: LoginRequest):
    token = create_token(req.password)
    if not token:
        raise HTTPException(401, "Invalid password")
    return {"token": token}

@router.get("/verify")
async def verify():
    """Verify current session token is valid. Token passed as Bearer header by middleware."""
    return {"valid": True}
