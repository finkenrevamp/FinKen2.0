"""
FinKen 2.0 - Financial Management System
FastAPI Backend Application
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
import os

from routes import auth, accounts, journal_entries, profiles

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="FinKen 2.0 API",
    description="Financial Management System API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Chart of Accounts"])
app.include_router(journal_entries.router, prefix="/api/journal-entries", tags=["Journal Entries"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["User Profiles"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "FinKen 2.0 API - Financial Management System"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FinKen 2.0 API"}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )