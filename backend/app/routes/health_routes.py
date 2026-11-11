from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Lightweight liveness probe for container platforms."""
    return {"status": "ok"}
