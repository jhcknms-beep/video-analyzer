"""Job lifecycle management with in-process asyncio Queue."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from models.schemas import JobMeta, JobStatus, Dimension
from storage.file_store import FileStore


class JobManager:
    """Manages job creation, queuing, and status updates."""

    def __init__(self, file_store: FileStore) -> None:
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self._store = file_store
        # Track current state in memory for fast WebSocket push
        self._jobs: dict[str, JobMeta] = {}
        # Cancelled job IDs (checked by worker)
        self._cancelled: set[str] = set()
        # Callback for progress broadcast
        self._on_progress: Optional[callable] = None

    def set_progress_callback(self, callback: callable) -> None:
        self._on_progress = callback

    async def create_job(
        self, filename: str, original_filename: str, file_size_bytes: int
    ) -> JobMeta:
        """Create a new job and enqueue it."""
        job_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        meta = JobMeta(
            job_id=job_id,
            filename=filename,
            original_filename=original_filename,
            file_size_bytes=file_size_bytes,
            status=JobStatus.PENDING,
            created_at=now,
        )
        self._jobs[job_id] = meta
        await self._store.save_meta(job_id, meta)
        # Don't auto-enqueue - wait for explicit start
        await self._broadcast(job_id)
        return meta

    async def update_status(
        self,
        job_id: str,
        status: JobStatus,
        progress_pct: float = 0.0,
        current_step: str = "",
        dimension: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update job status in memory and persist to disk."""
        meta = self._jobs.get(job_id)
        if meta is None:
            meta = await self._store.load_meta(job_id)
            if meta is None:
                return
            self._jobs[job_id] = meta

        meta.status = status
        meta.progress_pct = progress_pct
        meta.current_step = current_step
        meta.dimension = dimension
        if error:
            meta.error = error

        await self._store.save_progress(job_id, meta)
        await self._broadcast(job_id)

    async def get_job(self, job_id: str) -> Optional[JobMeta]:
        """Get job metadata (memory-first, disk fallback)."""
        if job_id in self._jobs:
            return self._jobs[job_id]
        meta = await self._store.load_meta(job_id)
        if meta:
            self._jobs[job_id] = meta
        return meta

    async def get_all_jobs(self) -> list[JobMeta]:
        """Get all known jobs."""
        # Load from disk if memory is sparse
        if not self._jobs:
            disk_jobs = await self._store.list_jobs()
            for meta in disk_jobs:
                if meta.job_id not in self._jobs:
                    self._jobs[meta.job_id] = meta
        return list(self._jobs.values())

    def is_cancelled(self, job_id: str) -> bool:
        """Check if a job has been cancelled."""
        return job_id in self._cancelled

    async def enqueue_job(self, job_id: str) -> bool:
        """Move a pending job to the processing queue."""
        meta = self._jobs.get(job_id)
        if meta and meta.status == JobStatus.PENDING:
            meta.status = JobStatus.QUEUED
            await self._store.save_progress(job_id, meta)
            await self.queue.put(job_id)
            await self._broadcast(job_id)
            return True
        return False

    async def pause_job(self, job_id: str) -> bool:
        """Pause a running job."""
        self.cancel_job(job_id)  # Signal worker to abort
        meta = self._jobs.get(job_id)
        if meta:
            meta.status = JobStatus.PAUSED
            await self._store.save_progress(job_id, meta)
            await self._broadcast(job_id)
        return True

    def cancel_job(self, job_id: str) -> bool:
        """Mark a job as cancelled. Worker checks this flag."""
        self._cancelled.add(job_id)
        return True

    async def delete_job(self, job_id: str) -> bool:
        """Cancel if running, then delete a job and all its data."""
        self.cancel_job(job_id)  # Signal worker to abort
        self._jobs.pop(job_id, None)
        self._cancelled.discard(job_id)
        await self._broadcast(job_id)
        return await self._store.delete_job(job_id)

    async def _broadcast(self, job_id: str) -> None:
        """Notify progress callback if registered."""
        if self._on_progress:
            meta = self._jobs.get(job_id)
            if meta:
                try:
                    await self._on_progress(meta)
                except Exception:
                    pass
