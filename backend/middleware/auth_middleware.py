"""Auth middleware — protects routes except login."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from services.auth import verify_token

PUBLIC_PATHS = {"/api/auth/login", "/api/auth/signup", "/health", "/api/auth/verify", "/ws/progress"}

def _is_public(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    if path.startswith("/api/auth/"):
        return True
    if path.startswith("/ws/"):
        return True
    # Frame images are served directly - allow public access
    if "/frames/" in path and path.endswith(".jpg"):
        return True
    return False

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if _is_public(path):
            return await call_next(request)

        # Also allow OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse({"detail": "Missing token"}, 401)

        token = auth.split(" ", 1)[1]
        if not verify_token(token):
            return JSONResponse({"detail": "Invalid or expired token"}, 401)

        return await call_next(request)
