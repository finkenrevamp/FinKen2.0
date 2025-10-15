"""
Basic authentication routes placeholder
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def auth_health():
    """Authentication service health check"""
    return {"status": "healthy", "service": "authentication"}

# TODO: Implement proper authentication routes after dependencies are installed