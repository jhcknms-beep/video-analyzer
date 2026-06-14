"""API routes for model listing and switching."""

from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/models", tags=["models"])

# In-memory model override
_current_model: str | None = None


def get_current_model(default: str) -> str:
    return _current_model or default


@router.get("")
async def list_models():
    """List available Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get("http://localhost:11434/api/tags")
            r.raise_for_status()
            models = r.json().get("models", [])
            return {
                "models": [
                    {
                        "name": m["name"],
                        "size_gb": round(m["size"] / 1024 / 1024 / 1024, 1),
                    }
                    for m in models
                ],
                "current": _current_model,
            }
    except Exception:
        raise HTTPException(503, "Ollama not reachable")


@router.post("/switch")
async def switch_model(data: dict):
    """Switch to a different model."""
    global _current_model
    model = data.get("model", "")
    if not model:
        raise HTTPException(400, "model name required")

    # Verify model exists
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get("http://localhost:11434/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            if model not in models:
                raise HTTPException(404, f"Model '{model}' not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Ollama not reachable")

    _current_model = model
    return {"model": model, "message": f"Switched to {model}"}
