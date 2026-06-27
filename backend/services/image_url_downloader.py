"""Download product images from e-commerce URLs using yt-dlp."""

import asyncio
import re
import uuid
from pathlib import Path
from typing import Optional

from config import settings

SUPPORTED_PLATFORMS = {
    "amazon.com": "Amazon",
    "amazon.co.jp": "Amazon Japan",
    "amazon.co.uk": "Amazon UK",
    "shopee.com": "Shopee",
    "shopee.tw": "Shopee TW",
    "shopee.co.id": "Shopee ID",
    "shopee.vn": "Shopee VN",
    "shopee.ph": "Shopee PH",
    "taobao.com": "Taobao",
    "tmall.com": "Tmall",
    "jd.com": "JD.com",
    "vip.com": "VIP.com",
    "douyin.com": "Douyin Shop",
    "tiktok.com": "TikTok Shop",
    "xiaohongshu.com": "Xiaohongshu",
    "xhslink.com": "Xiaohongshu",
}


def detect_platform(url: str) -> str:
    url_lower = url.lower()
    for domain, name in SUPPORTED_PLATFORMS.items():
        if domain in url_lower:
            return name
    return "Unknown"


def is_supported_url(url: str) -> bool:
    return any(domain in url.lower() for domain in SUPPORTED_PLATFORMS)


async def download_product_images(
    url: str,
    output_dir: Path,
    max_images: int = 5,
    progress_callback: Optional[callable] = None,
) -> list[Path]:
    """
    Download product images from e-commerce URL.
    Returns list of image file paths.
    """
    if not is_supported_url(url):
        raise ValueError(f"Unsupported platform: {detect_platform(url)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = uuid.uuid4().hex[:8]

    ydl_opts = {
        "outtmpl": str(output_dir / f"{prefix}_%(title)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,  # Don't download video
        "writethumbnail": True,  # Extract thumbnail
        "write_all_thumbnails": True,
        "max_downloads": max_images,
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    }

    if progress_callback:
        def hook(d):
            if d.get("status") == "finished":
                progress_callback({"status": "done"})
            elif d.get("status") == "error":
                progress_callback({"status": "error"})
        ydl_opts["progress_hooks"] = [hook]

    def _run():
        import yt_dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                raise RuntimeError("Could not extract info")
            # Extract thumbnail URLs
            thumbnails = info.get("thumbnails", [])
            if not thumbnails:
                # Try to get any image
                thumbnails = [{"url": info.get("thumbnail", "")}]

            # Download thumbnails
            import urllib.request
            image_paths = []
            for i, thumb in enumerate(thumbnails[:max_images]):
                try:
                    img_url = thumb.get("url", "")
                    if not img_url or "nofollow" in img_url:
                        continue
                    ext = img_url.split("?")[0].split(".")[-1][:4]
                    if ext not in ("jpg", "jpeg", "png", "webp"):
                        ext = "jpg"
                    img_path = output_dir / f"{prefix}_{i}.{ext}"
                    urllib.request.urlretrieve(img_url, img_path)
                    if img_path.stat().st_size > 1024:  # > 1KB
                        image_paths.append(img_path)
                except Exception:
                    pass
            return image_paths

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
