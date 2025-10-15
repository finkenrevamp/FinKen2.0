"""
Profiles routes placeholder
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def profiles_health():
    """Profiles service health check"""
    return {"status": "healthy", "service": "profiles"}

# TODO: Implement profiles routes after dependencies are installed