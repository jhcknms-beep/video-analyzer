"""Authentication and user management routes."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.auth import create_token, verify_token, get_username
from services.user_store import create_user, list_users, change_password, authenticate, get_viewed, mark_viewed

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str = "admin"
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
async def login(req: LoginRequest):
    token = create_token(req.username, req.password)
    if not token:
        raise HTTPException(401, "Invalid username or password")
    return {"token": token, "username": req.username}

@router.post("/signup")
async def signup(req: SignupRequest):
    ok, msg = create_user(req.username, req.password)
    if not ok:
        raise HTTPException(400, msg)
    # Auto-login after signup
    token = create_token(req.username, req.password)
    return {"token": token, "username": req.username, "message": msg}

@router.get("/verify")
async def verify(request: Request):
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token or not verify_token(token):
        raise HTTPException(401, "Invalid token")
    return {"valid": True, "username": get_username(token)}

@router.get("/users")
async def users(request: Request):
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token or not verify_token(token):
        raise HTTPException(401, "Invalid token")
    return {"users": list_users()}

@router.get("/viewed")
async def api_get_viewed(request: Request):
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token or not verify_token(token):
        raise HTTPException(401, "Invalid token")
    return {"viewed": get_viewed(get_username(token))}

@router.post("/viewed/{job_id}")
async def api_mark_viewed(job_id: str, request: Request):
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token or not verify_token(token):
        raise HTTPException(401, "Invalid token")
    mark_viewed(get_username(token), job_id)
    return {"ok": True}

@router.post("/change-password")
async def change_pw(req: ChangePasswordRequest, request: Request):
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ")
    if not token or not verify_token(token):
        raise HTTPException(401, "Invalid token")
    username = get_username(token)
    ok, msg = change_password(username, req.old_password, req.new_password)
    if not ok:
        raise HTTPException(400, msg)
    return {"message": msg}
