import logging
import time
from fastapi import Request

logger = logging.getLogger("inquira.api")


async def request_timing_middleware(request: Request, call_next):
    """Measure request latency and append X-Process-Time-Ms response header."""
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error during %s %s", request.method, request.url.path)
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    return response
