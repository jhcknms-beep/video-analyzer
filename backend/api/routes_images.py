"""API routes for image upload, analysis, and export."""

import asyncio
import base64
import json
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import settings
from models.schemas import JobStatus
from services.llm_client import llm_client
from services.image_prompts import (
    SYSTEM_PROMPT_IMAGE_CONTENT, build_image_content_prompt,
    SYSTEM_PROMPT_IMAGE_REVERSE, build_image_reverse_prompt,
)
from services.result_parser import extract_json
from services.image_url_downloader import download_product_images, is_supported_url, detect_platform, SUPPORTED_PLATFORMS

router = APIRouter(prefix="/api/images", tags=["images"])

_job_manager = None
_file_store = None

def init(job_manager, file_store):
    global _job_manager, _file_store
    _job_manager = job_manager
    _file_store = file_store

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/svg+xml", "image/tiff"}

async def _encode_image(path: Path) -> str:
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()


@router.post("/upload")
async def upload_images(files: list[UploadFile] = File(...), mode: str = Form("content")):
    """Upload images for analysis. mode: 'content' or 'reverse'"""
    if not files:
        raise HTTPException(400, "No files")
    jobs = []
    upload_dir = _file_store.uploads_dir()
    for f in files:
        if not f.filename or f.content_type not in ALLOWED_IMAGE_TYPES:
            continue
        safe_name = f"{Path(f.filename).stem}_{Path(f.filename).suffix}"
        path = upload_dir / safe_name
        counter = 1
        while path.exists():
            path = upload_dir / f"{Path(f.filename).stem}_{counter}{Path(f.filename).suffix}"
            counter += 1
        with open(path, "wb") as dst:
            dst.write(await f.read())
        meta = await _job_manager.create_job(
            filename=path.name, original_filename=f.filename,
            file_size_bytes=path.stat().st_size,
        )
        meta.analysis_type = "image"
        meta.analysis_mode = mode
        await _file_store.save_progress(meta.job_id, meta)
        await _job_manager._broadcast(meta.job_id)  # Re-broadcast with correct type
        jobs.append(meta)
    return {"jobs": [{"job_id": j.job_id, "filename": j.original_filename, "status": "pending"} for j in jobs]}


@router.post("/analyze/{job_id}")
async def analyze_image(job_id: str, mode: str = "content"):
    """Start analysis for a pending image job."""
    meta = await _job_manager.get_job(job_id)
    if not meta:
        raise HTTPException(404, "Job not found")
    upload_dir = _file_store.uploads_dir()
    img_path = upload_dir / meta.filename
    if not img_path.exists():
        raise HTTPException(404, "Image file not found")

    await _job_manager.update_status(job_id, status=JobStatus.ANALYZING, progress_pct=20, current_step="preparing")
    start = time.time()
    b64 = await _encode_image(img_path)

    if mode == "reverse":
        prompt = build_image_reverse_prompt()
        system = SYSTEM_PROMPT_IMAGE_REVERSE
    else:
        prompt = build_image_content_prompt()
        system = SYSTEM_PROMPT_IMAGE_CONTENT

    await _job_manager.update_status(job_id, status=JobStatus.ANALYZING, progress_pct=50, current_step="llm_inference")
    try:
        resp = await llm_client.chat_with_retry(system, prompt, [b64])
        result = {"analysis": json.loads(extract_json(resp)), "mode": mode, "status": "completed", "processing_time_seconds": round(time.time() - start, 1), "video_duration_seconds": 0, "filename": meta.filename, "job_id": job_id}
        await _file_store.save_results(job_id, result)
        await _job_manager.update_status(job_id, status=JobStatus.COMPLETED, progress_pct=100, current_step="completed")
    except (ValueError, json.JSONDecodeError):
        # Retry once with stricter JSON instruction
        try:
            retry_prompt = prompt + "\n\nCRITICAL: Your previous response was not valid JSON. Output PURE JSON ONLY starting with {."
            resp2 = await llm_client.chat_with_retry(system, retry_prompt, [b64])
            result = {"analysis": json.loads(extract_json(resp2)), "mode": mode, "status": "completed", "processing_time_seconds": round(time.time() - start, 1), "video_duration_seconds": 0, "filename": meta.filename, "job_id": job_id}
            await _file_store.save_results(job_id, result)
            await _job_manager.update_status(job_id, status=JobStatus.COMPLETED, progress_pct=100, current_step="completed")
        except Exception as e2:
            await _job_manager.update_status(job_id, status=JobStatus.FAILED, progress_pct=0, current_step="error", error=str(e2))
            raise
    except Exception as e:
        await _job_manager.update_status(job_id, status=JobStatus.FAILED, progress_pct=0, current_step="error", error=str(e))
        raise


class ImgDownloadRequest(BaseModel):
    url: str

@router.post("/download")
async def download_from_url(req: ImgDownloadRequest):
    """Download product images from e-commerce URL."""
    if not req.url:
        raise HTTPException(400, "URL required")
    if not is_supported_url(req.url):
        raise HTTPException(400, f"Unsupported platform. Supported: {', '.join(SUPPORTED_PLATFORMS.values())}")
    platform = detect_platform(req.url)
    download_dir = _file_store.uploads_dir() / "image_downloads"
    download_dir.mkdir(parents=True, exist_ok=True)

    try:
        paths = await download_product_images(req.url, download_dir, max_images=5)
    except Exception as e:
        raise HTTPException(500, f"Download failed: {e}")

    if not paths:
        raise HTTPException(400, "No images found at this URL")

    jobs = []
    for p in paths:
        meta = await _job_manager.create_job(filename=p.name, original_filename=f"{platform}_{p.name}", file_size_bytes=p.stat().st_size)
        meta.analysis_type = "image"
        await _file_store.save_progress(meta.job_id, meta)
        await _job_manager._broadcast(meta.job_id)
        jobs.append({"job_id": meta.job_id, "filename": meta.original_filename, "platform": platform})

    return {"jobs": jobs, "platform": platform, "count": len(jobs)}


@router.get("/file/{filename}")
async def serve_upload(filename: str):
    """Serve uploaded image file."""
    path = _file_store.uploads_dir() / filename
    if not path.exists():
        raise HTTPException(404, "File not found")
    from fastapi.responses import FileResponse
    return FileResponse(path)


@router.post("/analyze-batch")
async def analyze_batch(data: dict):
    """Start analysis for multiple pending image jobs."""
    job_ids = data.get("job_ids", [])
    mode = data.get("mode", "content")
    results = []
    for jid in job_ids:
        try:
            r = await analyze_image(jid, mode)
            results.append({"job_id": jid, "status": "ok"})
        except Exception as e:
            results.append({"job_id": jid, "status": "error", "error": str(e)})
    return {"results": results}


class ImageExportRequest(BaseModel):
    app_id: str = ""
    app_secret: str = ""
    folder_token: str = ""


@router.post("/{job_id}/export-feishu")
async def export_image_feishu(job_id: str, req: ImageExportRequest):
    """Export image analysis to Feishu doc."""
    from services.feishu_exporter import _get_creds, FEISHU_BASE
    import httpx

    r = await _file_store.load_results(job_id)
    if not r:
        raise HTTPException(404, "No results")
    app_id, app_secret, folder_token = _get_creds(req.app_id, req.app_secret, req.folder_token)
    if not app_id or not app_secret:
        raise HTTPException(400, "Feishu credentials required")

    img_dir = _file_store.uploads_dir()
    img_path = img_dir / _file_store.job_dir(job_id).parent / ".." / ".."
    # Actually find the image in uploads
    meta = await _job_manager.get_job(job_id)
    img_file = img_dir / meta.filename if meta else None

    async with httpx.AsyncClient(timeout=30) as c:
        tr = await c.post(f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal", json={"app_id": app_id, "app_secret": app_secret})
        token = tr.json()["tenant_access_token"]
        title = (meta.original_filename if meta else "Image Analysis")[:100]
        cr = await c.post(f"{FEISHU_BASE}/docx/v1/documents", headers={"Authorization": f"Bearer {token}"}, json={"title": title})
        doc_id = cr.json()["data"]["document"]["document_id"]

        analysis = r.get("analysis", {})
        mode = r.get("mode", "content")
        blocks = _build_image_md(analysis, meta, mode)

        for i in range(0, len(blocks), 50):
            batch = blocks[i:i+50]
            await c.post(f"{FEISHU_BASE}/docx/v1/documents/{doc_id}/blocks/{doc_id}/children", headers={"Authorization": f"Bearer {token}"}, json={"children": batch, "index": -1})

        # Insert image
        if img_file and img_file.exists():
            with open(img_file, "rb") as f: img_data = f.read()
            br = await c.post(f"{FEISHU_BASE}/docx/v1/documents/{doc_id}/blocks/{doc_id}/children", headers={"Authorization": f"Bearer {token}"}, json={"children": [{"block_type": 27, "image": {}}], "index": 0})
            if br.status_code == 200:
                block_id = br.json()["data"]["children"][0]["block_id"]
                ur = await c.post(f"{FEISHU_BASE}/drive/v1/medias/upload_all", headers={"Authorization": f"Bearer {token}"}, data={"file_name": img_file.name, "parent_type": "docx_image", "parent_node": block_id, "size": str(len(img_data))}, files={"file": (img_file.name, img_data, "image/jpeg")})
                if ur.status_code == 200:
                    await c.patch(f"{FEISHU_BASE}/docx/v1/documents/{doc_id}/blocks/{block_id}", headers={"Authorization": f"Bearer {token}"}, json={"replace_image": {"token": ur.json()["data"]["file_token"]}})

        return {"url": f"https://bytedance.feishu.cn/docx/{doc_id}"}


@router.post("/export-feishu-sheet")
async def export_images_sheet(data: dict):
    """Export multiple image analyses to Feishu sheet."""
    from services.feishu_exporter import _get_creds, FEISHU_BASE
    import httpx
    job_ids = data.get("job_ids", [])
    if not job_ids:
        raise HTTPException(400, "No jobs")
    app_id, app_secret, folder_token = _get_creds(data.get("app_id",""), data.get("app_secret",""), data.get("folder_token",""))
    if not app_id or not app_secret:
        raise HTTPException(400, "Feishu credentials required")

    async with httpx.AsyncClient(timeout=30) as c:
        tr = await c.post(f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal", json={"app_id": app_id, "app_secret": app_secret})
        token = tr.json()["tenant_access_token"]
        sr = await c.post(f"{FEISHU_BASE}/sheets/v3/spreadsheets", headers={"Authorization": f"Bearer {token}"}, json={"title": f"Image Analysis Report"})
        ss_id = sr.json()["data"]["spreadsheet"]["spreadsheet_token"]
        mr = await c.get(f"{FEISHU_BASE}/sheets/v3/spreadsheets/{ss_id}/sheets/query", headers={"Authorization": f"Bearer {token}"})
        sid = mr.json()["data"]["sheets"][0]["sheet_id"]
        rows = [["Filename","Resolution","Format","Product","Platform","Score","Category","Audience"]]
        for jid in job_ids:
            r = await _file_store.load_results(jid)
            if not r: continue
            a = r.get("analysis", {})
            bp = a.get("basic_params", {})
            ec = a.get("ecommerce", {})
            mk = a.get("marketing", {})
            meta = await _job_manager.get_job(jid) if _job_manager else None
            rows.append([
                (meta.original_filename if meta else "")[:50],
                bp.get("resolution",""), bp.get("format",""),
                ec.get("product_category",""), ec.get("target_platform",""),
                str(ec.get("conversion_potential_score","")),
                mk.get("brand_positioning",""), mk.get("target_audience",""),
            ])
        range_str = f"{sid}!A1:H{len(rows)}"
        await c.put(f"{FEISHU_BASE}/sheets/v2/spreadsheets/{ss_id}/values", headers={"Authorization": f"Bearer {token}"}, json={"valueRange": {"range": range_str, "values": rows}})
        return {"url": f"https://bytedance.feishu.cn/sheets/{ss_id}", "count": len(job_ids)}


def _build_image_md(analysis: dict, meta, mode: str) -> list[dict]:
    """Build Feishu docx blocks from image analysis."""
    blocks = []
    fn = meta.original_filename if meta else "Image"
    blocks.append({"block_type": 3, "heading1": {"elements": [{"text_run": {"content": f"Image Analysis: {fn}"}}], "style": {}}})
    if mode == "reverse":
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "Prompt Reverse-Engineering Mode"}}], "style": {}}})
        for model, key in [("Nano Banana Pro","nano_banana_pro"),("GPT Image 2","gpt_image_2"),("Seedream","seedream"),("Flux","flux"),("Qwen-Image","qwen_image"),("ZImage","zimage")]:
            p = analysis.get(key, {})
            prompt = p.get("prompt","") if isinstance(p, dict) else str(p)
            neg = p.get("negative_prompt","") if isinstance(p, dict) else ""
            blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": model}}], "style": {}}})
            blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": prompt or "N/A"}}], "style": {}}})
            if neg:
                blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"Negative: {neg}"}}], "style": {}}})
    else:
        bp = analysis.get("basic_params", {})
        cd = analysis.get("content_desc", {})
        ec = analysis.get("ecommerce", {})
        mk = analysis.get("marketing", {})
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"**Resolution:** {bp.get('resolution','?')} | **Format:** {bp.get('format','?')} | **Ratio:** {bp.get('aspect_ratio','?')} | **Quality:** {bp.get('quality_assessment','?')}/5"}}], "style": {}}})
        blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "Content"}}], "style": {}}})
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": cd.get('main_subject','') + f". Scene: {cd.get('scene_type','')}. Style: {cd.get('visual_style','')}"}}], "style": {}}})
        blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "E-Commerce Assessment"}}], "style": {}}})
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"**Category:** {ec.get('product_category','?')} | **Platform:** {ec.get('target_platform','?')} | **Listing:** {ec.get('listing_type','?')} | **Score:** {ec.get('conversion_potential_score','?')}/5"}}], "style": {}}})
        for s in ec.get("improvement_suggestions", []):
            blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": s}}], "style": {}}})
        blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "Marketing"}}], "style": {}}})
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"**Brand:** {mk.get('brand_positioning','?')} | **Emotion:** {mk.get('emotional_appeal','?')} | **Audience:** {mk.get('target_audience','?')}"}}], "style": {}}})
    return blocks
