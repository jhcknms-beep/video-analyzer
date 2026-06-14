"""Download videos from URLs using yt-dlp."""

from __future__ import annotations

import asyncio
import os
import uuid
from pathlib import Path
from typing import Optional

from config import settings


SUPPORTED_PLATFORMS = {
    "douyin.com": "抖音",
    "tiktok.com": "TikTok",
    "xiaohongshu.com": "小红书",
    "xhslink.com": "小红书",
}


def detect_platform(url: str) -> str:
    """Detect which platform a URL belongs to."""
    url_lower = url.lower()
    for domain, name in SUPPORTED_PLATFORMS.items():
        if domain in url_lower:
            return name
    return "未知平台"


def is_supported_url(url: str) -> bool:
    """Check if URL is from a supported platform."""
    return any(domain in url.lower() for domain in SUPPORTED_PLATFORMS)


async def download_video(
    url: str,
    output_dir: Path,
    progress_callback: Optional[callable] = None,
) -> tuple[Path, dict]:
    """
    Download a video from URL using yt-dlp.
    Returns (file_path, video_info_dict).

    Raises ValueError if platform not supported.
    Raises RuntimeError if download fails.
    """
    if not is_supported_url(url):
        platform = detect_platform(url)
        raise ValueError(f"不支持的视频平台: {platform}。支持: 抖音, TikTok, 小红书, B站, YouTube, 快手")

    output_dir.mkdir(parents=True, exist_ok=True)
    video_id = uuid.uuid4().hex[:8]
    output_template = str(output_dir / f"{video_id}_%(title)s.%(ext)s")

    info: dict = {}

    def progress_hook(d):
        if progress_callback and d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            speed = d.get("speed") or 0
            pct = (downloaded / total * 100) if total > 0 else 0
            progress_callback({
                "status": "downloading",
                "percent": round(pct, 1),
                "speed_mbps": round(speed / 1024 / 1024, 1),
                "downloaded_mb": round(downloaded / 1024 / 1024, 1),
                "total_mb": round(total / 1024 / 1024, 1) if total else None,
            })

    def post_process_hook(d):
        if progress_callback and d.get("status") == "started":
            progress_callback({"status": "processing", "postprocessor": d.get("postprocessor", "")})

    ydl_opts = {
        "outtmpl": output_template,
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "max_filesize": settings.max_upload_size_mb * 1024 * 1024,
        "progress_hooks": [progress_hook],
        "postprocessor_hooks": [post_process_hook],
        "quiet": True,
        "no_warnings": True,
        # Browser-like headers to bypass anti-bot
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Sec-Ch-Ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "\"Windows\"",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        },
        "extractor_args": {
            "bilibili": {"prefer_mobile": True},
        },
    }

    def _run():
        import yt_dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if info is None:
                raise RuntimeError("yt-dlp returned no info")
            return info

    loop = asyncio.get_event_loop()
    info = await loop.run_in_executor(None, _run)

    if progress_callback:
        progress_callback({"status": "complete"})

    # Find the downloaded file
    # yt-dlp uses the template, so we need to find the actual file
    import glob as glob_mod
    pattern = str(output_dir / f"{video_id}_*")
    matches = glob_mod.glob(pattern)
    if not matches:
        raise RuntimeError(f"Downloaded file not found matching: {pattern}")

    file_path = Path(matches[0])

    return file_path, {
        "title": info.get("title", "未知"),
        "duration": info.get("duration", 0),
        "uploader": info.get("uploader", ""),
        "platform": detect_platform(url),
        "description": (info.get("description") or "")[:500],
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "comment_count": info.get("comment_count"),
        "favorite_count": info.get("favorite_count"),
        "share_count": info.get("repost_count"),
        "resolution": f"{info.get('width', '?')}x{info.get('height', '?')}",
    }
