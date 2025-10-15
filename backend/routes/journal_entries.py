"""
Journal entries routes placeholder
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def journal_entries_health():
    """Journal entries service health check"""
    return {"status": "healthy", "service": "journal_entries"}

# TODO: Implement journal entries routes after dependencies are installed