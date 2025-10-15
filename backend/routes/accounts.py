"""
Accounts routes placeholder
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def accounts_health():
    """Accounts service health check"""
    return {"status": "healthy", "service": "accounts"}

# TODO: Implement chart of accounts routes after dependencies are installed