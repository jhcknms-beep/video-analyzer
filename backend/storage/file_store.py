"""File-system based JSON storage for job data."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Optional

from config import settings


class FileStore:
    """Persist job metadata, progress, and results as JSON files."""

    def __init__(self) -> None:
        self._root = settings.data_dir / "jobs"
        self._root.mkdir(parents=True, exist_ok=True)

    def job_dir(self, job_id: str) -> Path:
        return self._root / job_id

    def _ensure_job_dir(self, job_id: str) -> Path:
        d = self.job_dir(job_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _read_json(self, path: Path) -> Optional[dict]:
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: Path, data: dict | object) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        if hasattr(data, "model_dump"):
            payload = data.model_dump()
        else:
            payload = data
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)

    async def save_meta(self, job_id: str, meta) -> None:
        d = self._ensure_job_dir(job_id)
        self._write_json(d / "meta.json", meta)

    async def save_progress(self, job_id: str, meta) -> None:
        d = self._ensure_job_dir(job_id)
        self._write_json(d / "progress.json", meta)

    async def save_results(self, job_id: str, result) -> None:
        d = self._ensure_job_dir(job_id)
        self._write_json(d / "results.json", result)

    async def load_meta(self, job_id: str):
        from models.schemas import JobMeta
        data = self._read_json(self.job_dir(job_id) / "meta.json")
        return JobMeta(**data) if data else None

    async def load_results(self, job_id: str) -> Optional[dict]:
        return self._read_json(self.job_dir(job_id) / "results.json")

    async def list_jobs(self) -> list:
        from models.schemas import JobMeta
        jobs = []
        for d in sorted(self._root.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if d.is_dir():
                meta_path = d / "meta.json"
                progress_path = d / "progress.json"
                data = self._read_json(meta_path)
                if data:
                    # Merge progress.json status (more up-to-date)
                    progress_data = self._read_json(progress_path)
                    if progress_data:
                        data.update({k: v for k, v in progress_data.items() if v})
                    try:
                        jobs.append(JobMeta(**data))
                    except Exception:
                        pass
        return jobs

    async def delete_job(self, job_id: str) -> bool:
        d = self.job_dir(job_id)
        if d.exists():
            shutil.rmtree(d)
            return True
        return False

    def frames_dir(self, job_id: str) -> Path:
        d = self._ensure_job_dir(job_id) / "frames"
        d.mkdir(exist_ok=True)
        return d

    def uploads_dir(self) -> Path:
        d = self._root.parent / "uploads"
        d.mkdir(parents=True, exist_ok=True)
        return d
