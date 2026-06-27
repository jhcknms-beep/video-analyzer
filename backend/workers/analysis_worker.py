"""Asyncio worker: dequeues jobs, processes videos, calls LLM, saves results."""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone

from config import settings
from models.schemas import JobStatus, AnalysisResult, JobResult
from services.llm_client import llm_client
from api.routes_models import get_current_model
from services.prompt_builder import PROMPT_GROUPS
from services.result_parser import (
    extract_json,
    parse_group1_result,
    parse_group2_result,
    parse_group3_result,
    merge_results,
)
from services.video_processor import (
    extract_frames,
    encode_frame_base64,
    get_video_duration,
    _run_ffprobe,
)
from services.job_manager import JobManager
from storage.file_store import FileStore


class JobCancelledError(Exception):
    """Raised when a job is cancelled mid-processing."""


async def run_worker(
    job_manager: JobManager,
    file_store: FileStore,
) -> None:
    """Main worker loop — processes one job at a time."""
    while True:
        job_id = await job_manager.queue.get()
        try:
            await process_job(job_id, job_manager, file_store)
        except JobCancelledError:
            await job_manager.update_status(
                job_id, status=JobStatus.FAILED,
                progress_pct=0, current_step="cancelled",
                error="Task cancelled",
            )
            # Free VRAM on cancel
            await llm_client.unload_model(get_current_model(settings.llm_model_name))
        except Exception as exc:
            await job_manager.update_status(
                job_id, status=JobStatus.FAILED,
                progress_pct=0, current_step="error",
                error=str(exc),
            )
            # Free VRAM on error (model may be in bad state)
            await llm_client.unload_model(get_current_model(settings.llm_model_name))
        finally:
            job_manager.queue.task_done()


def _check_cancelled(job_manager: JobManager, job_id: str) -> None:
    if job_manager.is_cancelled(job_id):
        raise JobCancelledError(f"Job {job_id} cancelled")


async def process_job(
    job_id: str,
    job_manager: JobManager,
    file_store: FileStore,
) -> None:
    _check_cancelled(job_manager, job_id)
    start_time = time.time()

    meta = await job_manager.get_job(job_id)
    if meta is None:
        return

    uploads_dir = file_store.uploads_dir()
    video_path = uploads_dir / meta.filename
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # ── Step 1: Metadata ──
    _check_cancelled(job_manager, job_id)
    await job_manager.update_status(
        job_id, status=JobStatus.EXTRACTING_FRAMES,
        progress_pct=5, current_step="extracting_metadata",
        dimension=None,
    )
    probe = await _run_ffprobe(video_path)
    duration = get_video_duration(probe)
    estimated_seconds = duration * 1.5 + 60  # rough ETA: 1.5x video duration + 60s overhead

    # ── Step 2: Extract frames ──
    _check_cancelled(job_manager, job_id)
    await job_manager.update_status(
        job_id, status=JobStatus.EXTRACTING_FRAMES,
        progress_pct=10, current_step="extracting_frames",
        dimension=None,
    )
    frames_dir = file_store.frames_dir(job_id)
    frame_paths = await extract_frames(
        video_path, frames_dir, min(settings.max_frames_per_video, 10)
    )
    if not frame_paths:
        raise RuntimeError("No frames extracted from video")
    images_b64 = [encode_frame_base64(p) for p in frame_paths]
    analysis_mode = getattr(meta, "analysis_mode", "") or "content"

    # ── Step 3: Check if reverse prompt mode ──
    if analysis_mode == "reverse":
        _check_cancelled(job_manager, job_id)
        from services.image_prompts import SYSTEM_PROMPT_VIDEO_REVERSE, build_video_reverse_prompt
        resp = await llm_client.chat_with_retry(
            SYSTEM_PROMPT_VIDEO_REVERSE, build_video_reverse_prompt(), images_b64,
        )
        result = {"analysis": json.loads(extract_json(resp)), "mode": "reverse", "type": "video", "status": "completed", "job_id": job_id, "filename": meta.filename, "video_duration_seconds": duration, "processing_time_seconds": round(time.time() - start_time, 1)}
        await file_store.save_results(job_id, result)
        await job_manager.update_status(job_id, status=JobStatus.COMPLETED, progress_pct=100, current_step="completed")
        return

    # ── Step 3: Run 3 LLM groups sequentially ──
    _check_cancelled(job_manager, job_id)
    parsed: dict = {}

    for idx, pct, step_label in [
        (0, 25, "analyzing_group_1_content"),
        (1, 55, "analyzing_group_2_audience"),
        (2, 85, "analyzing_group_3_conversion"),
    ]:
        _check_cancelled(job_manager, job_id)
        await job_manager.update_status(
            job_id, status=JobStatus.ANALYZING,
            progress_pct=pct, current_step=step_label,
        )
        g = PROMPT_GROUPS[idx]
        try:
            resp = await llm_client.chat_with_retry(
                system_prompt=g["system"],
                user_prompt=g["user"](),
                images_b64=images_b64,
            )
            json_str = extract_json(resp)
            if idx == 0:
                parsed["content_and_tags"] = parse_group1_result(json_str)
            elif idx == 1:
                parsed["audience"], parsed["needs"] = parse_group2_result(json_str)
            elif idx == 2:
                parsed["value"], parsed["cta"] = parse_group3_result(json_str)
        except Exception as e:
            raise RuntimeError(f"LLM call failed (group {idx+1}/3): {e}")

    # ── Step 4: Merge & save ──
    _check_cancelled(job_manager, job_id)
    await job_manager.update_status(
        job_id, status=JobStatus.ANALYZING,
        progress_pct=90, current_step="saving_results",
    )

    result = merge_results(
        parsed["content_and_tags"],
        parsed["audience"], parsed["needs"],
        parsed["value"], parsed["cta"],
    )
    elapsed = time.time() - start_time

    job_result = JobResult(
        job_id=job_id,
        filename=meta.filename,
        status=JobStatus.COMPLETED,
        video_duration_seconds=duration,
        analysis=result,
        processing_time_seconds=round(elapsed, 1),
    )
    await file_store.save_results(job_id, job_result)

    # Save completion timestamp to meta
    completed_at = datetime.now(timezone.utc).isoformat()
    meta.completed_at = completed_at
    await file_store.save_progress(job_id, meta)

    await job_manager.update_status(
        job_id, status=JobStatus.COMPLETED,
        progress_pct=100, current_step="completed",
    )
