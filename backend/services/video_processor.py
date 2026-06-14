"""Video processing utilities — ffprobe metadata + ffmpeg frame extraction."""

from __future__ import annotations

import asyncio
import json
import math
import os
from pathlib import Path
from typing import Optional

from config import settings


async def _run_ffprobe(video_path: Path) -> dict:
    """Extract video metadata via ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(video_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {stderr.decode()}")
    return json.loads(stdout)


def get_video_duration(probe: dict) -> float:
    """Extract duration in seconds from ffprobe output."""
    fmt = probe.get("format", {})
    duration = float(fmt.get("duration", 0))
    if duration == 0:
        for stream in probe.get("streams", []):
            if stream.get("codec_type") == "video":
                tags = stream.get("tags", {})
                if "DURATION" in tags:
                    h, m, s = tags["DURATION"].split(":")
                    duration = float(h) * 3600 + float(m) * 60 + float(s)
    return duration


def get_video_resolution(probe: dict) -> tuple[int, int]:
    """Extract (width, height) from ffprobe."""
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            return stream.get("width", 0), stream.get("height", 0)
    return 0, 0


async def extract_frames(
    video_path: Path,
    output_dir: Path,
    num_frames: int = 16,
) -> list[Path]:
    """
    Extract keyframes using hybrid strategy:
    1. Scene-change detection frames (up to num_frames//2)
    2. Uniformly sampled frames to fill the rest
    Returns list of frame image paths sorted by timestamp.
    """
    probe = await _run_ffprobe(video_path)
    duration = get_video_duration(probe)

    if duration <= 0:
        # Fallback: extract first frame only
        return await _extract_uniform(video_path, output_dir, 1, 0)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Scene-change detection frames
    scene_threshold = settings.frame_min_scene_threshold
    scene_dir = output_dir / "scenes"
    scene_dir.mkdir(exist_ok=True)

    scene_cmd = [
        "ffmpeg",
        "-y",
        "-i", str(video_path),
        "-vf", f"select='gt(scene,{scene_threshold})',scale=-1:720:force_original_aspect_ratio=decrease",
        "-vsync", "vfr",
        "-q:v", str(settings.frame_jpeg_quality // 10),
        "-frame_pts", "1",
        str(scene_dir / "scene_%03d.jpg"),
    ]
    proc = await asyncio.create_subprocess_exec(
        *scene_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    scene_frames = sorted(scene_dir.glob("scene_*.jpg"))
    max_scenes = num_frames // 2
    scene_frames = scene_frames[:max_scenes]

    # Step 2: Uniform sampling to fill remaining slots
    remaining = num_frames - len(scene_frames)
    uniform_frames = await _extract_uniform(
        video_path, output_dir, remaining, duration
    )

    # Step 3: Merge, sort by timestamp in filename, deduplicate
    all_frames = scene_frames + uniform_frames
    # Sort by the timestamp encoded in the filename by -frame_pts
    all_frames.sort(key=lambda p: p.stem)

    return all_frames


async def _extract_uniform(
    video_path: Path,
    output_dir: Path,
    count: int,
    duration: float,
) -> list[Path]:
    """Extract uniformly spaced frames."""
    if count <= 0:
        return []

    uniform_dir = output_dir / "uniform"
    uniform_dir.mkdir(exist_ok=True)

    if duration > 0 and count > 1:
        interval = duration / count
        # Avoid first and last 5%
        start_offset = max(0.5, duration * 0.05)
        select_expr = f"between(t,{start_offset},{duration - start_offset})"
        fps_expr = f"fps=1/{interval}"
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-vf", f"select='{select_expr}',{fps_expr},scale=-1:720:force_original_aspect_ratio=decrease",
            "-vsync", "vfr",
            "-q:v", str(settings.frame_jpeg_quality // 10),
            "-frame_pts", "1",
            str(uniform_dir / "uniform_%03d.jpg"),
        ]
    else:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-vf", "scale=-1:720:force_original_aspect_ratio=decrease",
            "-vframes", "1",
            "-q:v", str(settings.frame_jpeg_quality // 10),
            str(uniform_dir / "uniform_001.jpg"),
        ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    return sorted(uniform_dir.glob("uniform_*.jpg"))


def encode_frame_base64(frame_path: Path) -> str:
    """Read a JPEG frame and return as base64 data URL."""
    import base64
    with open(frame_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/jpeg;base64,{data}"


async def validate_video(video_path: Path) -> tuple[bool, str]:
    """Validate video file: check format, duration, size."""
    if not video_path.exists():
        return False, "File not found"

    size_mb = video_path.stat().st_size / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        return False, f"File too large: {size_mb:.1f}MB > {settings.max_upload_size_mb}MB"

    try:
        probe = await _run_ffprobe(video_path)
        duration = get_video_duration(probe)
        if duration > settings.max_video_duration_seconds:
            return False, f"Video too long: {duration:.0f}s > {settings.max_video_duration_seconds}s"
        if duration <= 0:
            return False, "Could not determine video duration"
        has_video = any(s.get("codec_type") == "video" for s in probe.get("streams", []))
        if not has_video:
            return False, "No video stream found"
        return True, ""
    except Exception as e:
        return False, f"ffprobe error: {e}"
