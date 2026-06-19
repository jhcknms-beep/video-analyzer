"""
FastAPI application entry point.

Start with:
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models.schemas import JobStatus
from storage.file_store import FileStore
from services.job_manager import JobManager
from services.llm_client import llm_client
from api.routes_videos import router as videos_router, init as videos_init
from api.routes_ws import router as ws_router, init as ws_init, WebSocketManager
from api.routes_models import router as models_router
from api.routes_auth import router as auth_router
from middleware.auth_middleware import AuthMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # ── Startup ──
    app.state.file_store = FileStore()
    app.state.ws_manager = WebSocketManager()
    app.state.job_manager = JobManager(app.state.file_store)

    # Wire progress callback: WS broadcasts on every status change
    async def on_progress(meta):
        await app.state.ws_manager.broadcast_progress(meta)

    app.state.job_manager.set_progress_callback(on_progress)

    # Inject dependencies into route modules
    videos_init(app.state.job_manager, app.state.file_store)
    ws_init(app.state.ws_manager, app.state.job_manager)

    # Recover jobs that were interrupted by previous shutdown
    all_jobs = await app.state.job_manager.get_all_jobs()
    for job in all_jobs:
        if job.status in (JobStatus.QUEUED, JobStatus.EXTRACTING_FRAMES, JobStatus.ANALYZING):
            await app.state.job_manager.queue.put(job.job_id)
        elif job.status == JobStatus.PAUSED:
            # Reset paused jobs to pending
            job.status = JobStatus.PENDING
            await app.state.job_manager._store.save_progress(job.job_id, job)
    print(f"Recovered {sum(1 for j in all_jobs if j.status in (JobStatus.QUEUED, JobStatus.EXTRACTING_FRAMES, JobStatus.ANALYZING))} pending jobs")

    # Start background worker
    from workers.analysis_worker import run_worker
    worker_task = asyncio.create_task(
        run_worker(app.state.job_manager, app.state.file_store)
    )

    print(f"Video Analyzer Backend: http://{settings.host}:{settings.port}")
    print(f"LLM: {settings.llm_base_url} -> {settings.llm_model_name}")

    yield

    # ── Shutdown ──
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await app.state.ws_manager.close_all()
    await llm_client.close()


app = FastAPI(
    title="Video Analyzer API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow LAN access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth (protects non-public routes)
app.add_middleware(AuthMiddleware)

# Routes
app.include_router(videos_router)
app.include_router(ws_router)
app.include_router(models_router)
app.include_router(auth_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
