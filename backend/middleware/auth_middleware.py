"""Auth middleware — protects routes except login."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from services.auth import verify_token

PUBLIC_PATHS = {"/api/auth/login", "/health", "/api/auth/verify", "/ws/progress"}

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if path in PUBLIC_PATHS or path.startswith("/api/auth/") or path.startswith("/ws/"):
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
