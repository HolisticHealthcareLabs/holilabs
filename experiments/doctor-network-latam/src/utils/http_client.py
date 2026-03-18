"""Shared async HTTP client with rate limiting and retry logic."""

import asyncio
import time
from typing import Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from .logger import get_logger

logger = get_logger("http")


class RateLimitedClient:
    """Async HTTP client that respects per-source rate limits."""

    def __init__(
        self,
        requests_per_minute: int = 30,
        timeout: float = 30.0,
        max_retries: int = 3,
        user_agent: str = "HoliLabs-DoctorNetwork/0.1 (research; contact@holilabs.xyz)",
    ):
        self.rpm = requests_per_minute
        self.interval = 60.0 / requests_per_minute
        self._last_request_time = 0.0
        self._lock = asyncio.Lock()
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        )
        self.max_retries = max_retries

    async def _wait_for_rate_limit(self):
        """Enforce minimum interval between requests."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            self._last_request_time = time.monotonic()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    )
    async def get(
        self,
        url: str,
        params: Optional[dict] = None,
        headers: Optional[dict] = None,
    ) -> httpx.Response:
        """GET with rate limiting and retry."""
        await self._wait_for_rate_limit()
        logger.debug(f"GET {url} params={params}")
        response = await self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    )
    async def post(
        self,
        url: str,
        data: Optional[dict] = None,
        json: Optional[dict] = None,
        content: Optional[str] = None,
        headers: Optional[dict] = None,
    ) -> httpx.Response:
        """POST with rate limiting and retry."""
        await self._wait_for_rate_limit()
        logger.debug(f"POST {url}")
        response = await self.client.post(
            url, data=data, json=json, content=content, headers=headers
        )
        response.raise_for_status()
        return response

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
