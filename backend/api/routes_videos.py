"""REST API routes for video upload, status, results, and export."""

from __future__ import annotations

import csv
import io
import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from pydantic import BaseModel

from config import settings
from models.schemas import (
    JobStatus,
    UploadResponse,
    StatusResponse,
)
from services.video_processor import validate_video
from services.url_downloader import download_video, detect_platform, is_supported_url


class DownloadRequest(BaseModel):
    url: str


class DownloadResponse(BaseModel):
    job_id: str
    platform: str
    title: str
    duration: int
    uploader: str
    resolution: str
    status: str
    message: str
    view_count: int | None = None
    like_count: int | None = None
    comment_count: int | None = None
    share_count: int | None = None

router = APIRouter(prefix="/api/videos", tags=["videos"])


# Dependency injection placeholder — set by main.py on startup
_job_manager = None
_file_store = None


def init(job_manager, file_store) -> None:
    global _job_manager, _file_store
    _job_manager = job_manager
    _file_store = file_store


# ── Upload ───────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_videos(files: list[UploadFile] = File(...)):
    """Upload one or more video files. Returns created job metadata."""
    if not files:
        raise HTTPException(400, "No files provided")

    jobs = []
    for f in files:
        if not f.filename:
            continue

        # Save to uploads directory
        safe_name = f"{Path(f.filename).stem}_{Path(f.filename).suffix}"
        upload_dir = _file_store.uploads_dir()
        upload_path = upload_dir / safe_name

        # Avoid overwrites by appending counter
        counter = 1
        while upload_path.exists():
            upload_path = upload_dir / f"{Path(f.filename).stem}_{counter}{Path(f.filename).suffix}"
            counter += 1

        with open(upload_path, "wb") as dst:
            content = await f.read()
            dst.write(content)

        # Validate
        valid, err_msg = await validate_video(upload_path)
        if not valid:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(400, f"Invalid video '{f.filename}': {err_msg}")

        # Create job
        file_size = upload_path.stat().st_size
        meta = await _job_manager.create_job(
            filename=upload_path.name,
            original_filename=f.filename,
            file_size_bytes=file_size,
        )
        jobs.append(meta)

    return UploadResponse(jobs=jobs)


# ── Status ────────────────────────────────────────────

@router.get("/status", response_model=StatusResponse)
async def get_status(ids: Optional[str] = Query(None)):
    """Get status of all jobs, or filter by comma-separated IDs."""
    all_jobs = await _job_manager.get_all_jobs()
    if ids:
        id_set = set(ids.split(","))
        all_jobs = [j for j in all_jobs if j.job_id in id_set]
    # Enrich with results data for completed jobs
    for job in all_jobs:
        if job.status == JobStatus.COMPLETED and job.video_duration_seconds is None:
            r = await _file_store.load_results(job.job_id)
            if r:
                if r.get("video_duration_seconds"):
                    job.video_duration_seconds = r["video_duration_seconds"]
                if r.get("processing_time_seconds"):
                    job.processing_time_seconds = r["processing_time_seconds"]
    return StatusResponse(jobs=all_jobs)


# ── Results ───────────────────────────────────────────

@router.get("/{job_id}/results")
async def get_results(job_id: str):
    """Get full analysis results for a completed job."""
    meta = await _job_manager.get_job(job_id)
    if meta is None:
        raise HTTPException(404, "Job not found")

    if meta.status == JobStatus.FAILED:
        return JSONResponse({
            "job_id": job_id,
            "status": "failed",
            "error": meta.error,
        })

    results = await _file_store.load_results(job_id)
    if results is None:
        return JSONResponse({
            "job_id": job_id,
            "status": meta.status.value,
            "progress_pct": meta.progress_pct,
            "current_step": meta.current_step,
        })

    return JSONResponse(results)


# ── Export ────────────────────────────────────────────

@router.get("/{job_id}/export")
async def export_results(job_id: str, format: str = Query("json")):
    """Export analysis results as JSON or CSV."""
    results = await _file_store.load_results(job_id)
    if results is None:
        raise HTTPException(404, "Results not found or job not complete")

    if format == "json":
        return JSONResponse(results, headers={
            "Content-Disposition": f"attachment; filename=analysis_{job_id}.json"
        })

    if format == "csv":
        return _export_csv(results, job_id)

    raise HTTPException(400, f"Unsupported format: {format}")


def _export_csv(results: dict, job_id: str):
    """Flatten results to CSV row(s) and return streaming response."""
    # Flatten dot-notation
    flat = {}
    def flatten(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                flatten(v, f"{prefix}{k}.")
        elif isinstance(obj, list):
            flat[prefix.rstrip(".")] = "; ".join(str(x) for x in obj)
        else:
            flat[prefix.rstrip(".")] = str(obj) if obj is not None else ""

    flatten(results)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=flat.keys())
    writer.writeheader()
    writer.writerow(flat)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analysis_{job_id}.csv"},
    )


# ── Download from URL ───────────────────────────────────

@router.post("/download", response_model=DownloadResponse)
async def download_from_url(req: DownloadRequest):
    """Download a video from a supported platform URL, then queue for analysis."""
    if not req.url or not req.url.strip():
        raise HTTPException(400, "URL is required")

    url = req.url.strip()

    if not is_supported_url(url):
        raise HTTPException(400, f"不支持的视频平台。支持: 抖音, TikTok, 小红书, B站, YouTube, 快手")

    platform = detect_platform(url)

    # Download the video
    downloads_dir = _file_store.uploads_dir() / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    try:
        file_path, info = await download_video(url, downloads_dir)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"下载失败: {str(e)}")

    # Validate downloaded video
    valid, err_msg = await validate_video(file_path)
    if not valid:
        file_path.unlink(missing_ok=True)
        raise HTTPException(400, f"下载的视频无效: {err_msg}")

    # Move to uploads directory and create job
    upload_dir = _file_store.uploads_dir()
    final_path = upload_dir / file_path.name
    file_path.rename(final_path)

    file_size = final_path.stat().st_size
    meta = await _job_manager.create_job(
        filename=final_path.name,
        original_filename=f"{info['title']}.mp4",
        file_size_bytes=file_size,
    )

    return DownloadResponse(
        job_id=meta.job_id,
        platform=platform,
        title=info["title"],
        duration=info.get("duration", 0),
        uploader=info.get("uploader", ""),
        resolution=info.get("resolution", ""),
        status="pending",
        message=f"Downloaded: {info['title']}",
        view_count=info.get("view_count"),
        like_count=info.get("like_count"),
        comment_count=info.get("comment_count"),
        share_count=info.get("share_count"),
    )


# ── Start / Pause ─────────────────────────────────────

@router.post("/{job_id}/start")
async def start_job(job_id: str):
    """Start analysis for a pending job."""
    ok = await _job_manager.enqueue_job(job_id)
    if not ok:
        raise HTTPException(400, "Job not in pending state")
    return {"job_id": job_id, "status": "queued"}

@router.post("/start-batch")
async def start_batch(data: dict):
    """Start multiple pending jobs."""
    ids = data.get("job_ids", [])
    if not ids:
        raise HTTPException(400, "No job_ids provided")
    count = 0
    for jid in ids:
        if await _job_manager.enqueue_job(jid):
            count += 1
    return {"started": count}

@router.post("/{job_id}/pause")
async def pause_job(job_id: str):
    """Pause a running job."""
    await _job_manager.pause_job(job_id)
    return {"job_id": job_id, "status": "paused"}


# ── Rename ────────────────────────────────────────────

class RenameRequest(BaseModel):
    name: str

@router.patch("/{job_id}/rename")
async def rename_job(job_id: str, req: RenameRequest):
    """Rename a job's display name."""
    meta = await _job_manager.get_job(job_id)
    if meta is None:
        raise HTTPException(404, "Job not found")
    meta.original_filename = req.name
    await _job_manager.update_status(
        job_id, meta.status, meta.progress_pct,
        meta.current_step, meta.dimension, meta.error,
    )
    return {"job_id": job_id, "name": req.name}


# ── Feishu Export ──────────────────────────────────────

class FeishuExportRequest(BaseModel):
    app_id: str = ""
    app_secret: str = ""
    folder_token: str = ""

@router.post("/{job_id}/export-feishu")
async def export_to_feishu(job_id: str, req: FeishuExportRequest):
    """Export analysis results to Feishu cloud document via lark-cli."""
    from services.feishu_exporter import export_to_feishu as do_export

    results = await _file_store.load_results(job_id)
    if results is None:
        raise HTTPException(404, "Results not found")

    if not results.get("analysis"):
        raise HTTPException(400, "No analysis data")

    frames_dir = _file_store.frames_dir(job_id)
    try:
        doc_url = await do_export(
            job_id, results, frames_dir,
            app_id=req.app_id, app_secret=req.app_secret, folder_token=req.folder_token,
        )
        return {"url": doc_url, "message": "Feishu document created"}
    except RuntimeError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")


# ── Batch Feishu Sheet Export ──────────────────────────

class BatchExportRequest(BaseModel):
    job_ids: list[str]

@router.post("/export-feishu-sheet")
async def export_feishu_sheet(req: BatchExportRequest):
    """Export selected analyses to a Feishu spreadsheet."""
    import httpx
    from config import settings as s

    if not req.job_ids:
        raise HTTPException(400, "No jobs selected")

    app_id = s.feishu_app_id
    app_secret = s.feishu_app_secret

    if not app_id or not app_secret:
        raise HTTPException(400, "Feishu credentials not configured")

    async with httpx.AsyncClient(timeout=30) as c:
        # Get token
        tr = await c.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": app_id, "app_secret": app_secret})
        token = tr.json()["tenant_access_token"]

        # Create spreadsheet
        sr = await c.post("https://open.feishu.cn/open-apis/sheets/v3/spreadsheets",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": f"Video Analysis Report - {len(req.job_ids)} videos"})
        sr.raise_for_status()
        ss_id = sr.json()["data"]["spreadsheet"]["spreadsheet_token"]

        # Get first sheet ID
        mr = await c.get(
            f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{ss_id}/sheets/query",
            headers={"Authorization": f"Bearer {token}"},
        )
        mr.raise_for_status()
        sheets = mr.json().get("data", {}).get("sheets", [])
        sheet_id = sheets[0]["sheet_id"] if sheets else "0"

        # Build rows: header + one row per job
        header = ["Title", "Duration", "Score", "Content", "Tags", "Audience", "CTA", "Suggestions"]
        rows = [header]

        for jid in req.job_ids:
            r = await _file_store.load_results(jid)
            if not r:
                continue
            a = r.get("analysis", {})
            ct = a.get("content_and_tags", {})
            au = a.get("target_audience", {})
            ca = a.get("cta_analysis", {})
            rows.append([
                r.get("filename", "")[:80],
                str(r.get("video_duration_seconds", "")),
                str(ct.get("marketing_copy", {}).get("persuasiveness_score", "")),
                ct.get("content_description", "")[:200],
                ", ".join(ct.get("auto_tags", [])[:5]),
                au.get("primary_audience", "")[:100],
                ca.get("primary_cta", "")[:100],
                "; ".join(ca.get("cta_improvement_suggestions", [])[:3])[:200],
            ])

        # Write rows using PUT
        range_str = f"{sheet_id}!A1:H{len(rows)}"
        wr = await c.put(
            f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{ss_id}/values",
            headers={"Authorization": f"Bearer {token}"},
            json={"valueRange": {"range": range_str, "values": rows}},
        )
        if wr.status_code >= 400:
            raise HTTPException(500, f"Sheet write failed: {wr.text[:300]}")

        url = f"https://bytedance.feishu.cn/sheets/{ss_id}"
        return {"url": url, "count": len(req.job_ids)}


# ── Delete ────────────────────────────────────────────

@router.delete("/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its data. Cancels in-progress tasks first."""
    # Cancel any running work
    _job_manager.cancel_job(job_id)
    # Brief wait for worker to abort
    import asyncio
    await asyncio.sleep(0.5)
    # Delete job data
    deleted = await _job_manager.delete_job(job_id)
    return {"deleted": deleted, "job_id": job_id}


# ── Frames ────────────────────────────────────────────

def _read_jpeg_dims(path: Path) -> tuple[int, int]:
    """Read JPEG dimensions from file header. Returns (width, height)."""
    with open(path, "rb") as f:
        soi = f.read(2)
        if soi != b'\xff\xd8':
            return 0, 0
        while True:
            b = f.read(1)
            while b != b'\xff':
                b = f.read(1)
            marker = f.read(1)[0]
            while marker == 0xFF:
                marker = f.read(1)[0]
            if marker == 0xD9:  # EOI
                break
            if marker in (0xC0, 0xC1, 0xC2):  # SOF
                f.read(1)  # precision
                h = int.from_bytes(f.read(2), "big")
                w = int.from_bytes(f.read(2), "big")
                return w, h
            length = int.from_bytes(f.read(2), "big")
            f.seek(length - 2, 1)
    return 0, 0


@router.get("/{job_id}/frames")
async def list_frames(job_id: str):
    """List extracted frame info for a job."""
    frames_dir = _file_store.frames_dir(job_id)
    if not frames_dir.exists():
        return {"frames": []}

    frames = []
    for p in sorted(frames_dir.rglob("*.jpg")):
        rel = p.relative_to(frames_dir)
        w, h = _read_jpeg_dims(p)
        parts = p.stem.split("_")
        try:
            ts = float(parts[-1]) / 90000  # PTS to seconds (90kHz clock)
        except (ValueError, IndexError):
            ts = 0.0
        frames.append({
            "index": len(frames),
            "timestamp_seconds": round(ts, 1),
            "url": f"/api/videos/{job_id}/frames/{rel.as_posix()}",
            "width": w,
            "height": h,
        })
    return {"frames": frames}


@router.get("/{job_id}/frames/{filename:path}")
async def get_frame(job_id: str, filename: str):
    """Serve a specific frame image (supports subdirectories)."""
    path = _file_store.frames_dir(job_id) / filename
    if not path.exists():
        raise HTTPException(404, f"Frame not found: {filename}")
    return FileResponse(path, media_type="image/jpeg")
