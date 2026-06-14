"""WebSocket endpoint for real-time progress updates."""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models.schemas import JobMeta

router = APIRouter()


class WebSocketManager:
    """Manages connected WebSocket clients and broadcasts."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)

    async def broadcast(self, message: dict) -> None:
        dead: set[WebSocket] = set()
        payload = json.dumps(message, ensure_ascii=False)
        for ws in self._connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self._connections -= dead

    async def broadcast_progress(self, meta: JobMeta) -> None:
        """Send a progress update for a specific job."""
        await self.broadcast({
            "type": "progress",
            "job_id": meta.job_id,
            "filename": meta.original_filename,
            "status": meta.status.value,
            "progress_pct": meta.progress_pct,
            "current_step": meta.current_step,
            "dimension": meta.dimension,
            "error": meta.error,
        })

    async def close_all(self) -> None:
        for ws in list(self._connections):
            try:
                await ws.close()
            except Exception:
                pass
        self._connections.clear()


# Dependency injection — set by main.py
_ws_manager: Optional[WebSocketManager] = None
_job_manager = None


def init(ws_manager: WebSocketManager, job_manager) -> None:
    global _ws_manager, _job_manager
    _ws_manager = ws_manager
    _job_manager = job_manager


@router.websocket("/ws/progress")
async def websocket_progress(ws: WebSocket):
    """WebSocket endpoint for real-time progress streaming."""
    await _ws_manager.connect(ws)

    # Send current state on connect
    jobs = await _job_manager.get_all_jobs()
    await ws.send_text(json.dumps({
        "type": "sync",
        "jobs": [
            {
                "job_id": j.job_id,
                "filename": j.original_filename,
                "status": j.status.value,
                "progress_pct": j.progress_pct,
                "current_step": j.current_step,
                "dimension": j.dimension,
                "error": j.error,
            }
            for j in jobs
        ],
    }, ensure_ascii=False))

    try:
        while True:
            # Keep connection alive, handle client pings
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _ws_manager.disconnect(ws)
