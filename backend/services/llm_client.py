"""Async LLM client that calls Ollama/vLLM OpenAI-compatible API."""

from __future__ import annotations

import asyncio
from typing import Optional

import httpx

from config import settings
from api.routes_models import get_current_model


class LLMError(Exception):
    """Wraps LLM call failures with context."""
    pass


class LLMClient:
    """Async client for Ollama/vLLM OpenAI-compatible chat completions."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.llm_base_url,
                timeout=httpx.Timeout(settings.llm_timeout),
            )
        return self._client

    async def unload_model(self, model_name: str) -> None:
        """Tell Ollama to unload model from VRAM."""
        try:
            client = await self._get_client()
            await client.post(
                "/api/generate",
                json={"model": model_name, "keep_alive": 0},
                timeout=5,
            )
        except Exception:
            pass

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        images_b64: list[str],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Send a multimodal chat request. Returns model text response."""
        content: list[dict] = []
        for img in images_b64:
            content.append({
                "type": "image_url",
                "image_url": {"url": img},
            })
        content.append({"type": "text", "text": user_prompt})

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ]

        client = await self._get_client()

        try:
            resp = await client.post(
                "/chat/completions",
                json={
                    "model": get_current_model(settings.llm_model_name),
                    "messages": messages,
                    "temperature": temperature if temperature is not None else settings.llm_temperature,
                    "max_tokens": max_tokens or settings.llm_max_tokens,
                },
            )
        except httpx.TimeoutException:
            raise LLMError(f"Timeout after {settings.llm_timeout}s - model may be loading or overloaded")
        except httpx.ConnectError:
            raise LLMError("Cannot connect to Ollama - is it running?")
        except Exception as e:
            raise LLMError(f"Request failed: {type(e).__name__}: {e}")

        if resp.status_code >= 400:
            body = resp.text[:500]
            raise LLMError(f"Ollama returned {resp.status_code}: {body}")

        data = resp.json()
        if "choices" not in data:
            raise LLMError(f"Unexpected response: {json.dumps(data)[:300]}")

        return data["choices"][0]["message"]["content"]

    async def chat_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        images_b64: list[str],
        attempts: Optional[int] = None,
    ) -> str:
        """Chat with automatic retry on failure."""
        import json as _json
        max_attempts = attempts or settings.llm_retry_attempts
        last_error: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                return await self.chat(system_prompt, user_prompt, images_b64)
            except Exception as e:
                last_error = e
                if attempt < max_attempts - 1:
                    backoff = settings.llm_retry_backoff_base ** (attempt + 1)
                    await asyncio.sleep(backoff)

        raise LLMError(f"All {max_attempts} attempts failed. Last error: {last_error}")


# Singleton
llm_client = LLMClient()
