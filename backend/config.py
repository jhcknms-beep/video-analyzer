"""Centralized configuration via Pydantic BaseSettings."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Data storage
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"

    # Ollama / vLLM (OpenAI-compatible API)
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model_name: str = "qwen3-vl:8b"
    llm_max_tokens: int = 2048
    llm_temperature: float = 0.0
    llm_timeout: int = 600

    # Video processing
    max_frames_per_video: int = 8
    frame_min_scene_threshold: float = 0.4
    frame_jpeg_quality: int = 85
    max_video_duration_seconds: int = 600  # 10 min max
    max_upload_size_mb: int = 500

    # Retry
    llm_retry_attempts: int = 3
    llm_retry_backoff_base: float = 2.0

    # Feishu export
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_folder_token: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_prefix": "VA_", "env_file": ".env"}


settings = Settings()
