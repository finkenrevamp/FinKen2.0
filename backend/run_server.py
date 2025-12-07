#!/usr/bin/env python3
"""
FinKen 2.0 Backend Startup Script
Run this from the backend directory
"""

import sys
import os
import uvicorn

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    try:
        # Test import to check dependencies
        import fastapi
        import supabase
        
        # Get port from environment variable (required for Koyeb/cloud deployment)
        port = int(os.environ.get("PORT", 8000))
        # Disable reload in production
        is_dev = os.environ.get("DEBUG", "True").lower() == "true"
        
        print("=" * 60)
        print("Starting FinKen 2.0 API Server...")
        print("=" * 60)
        print(f"API Documentation: http://localhost:{port}/api/docs")
        print(f"API Root:          http://localhost:{port}")
        print(f"Health Check:      http://localhost:{port}/api/health")
        print(f"Environment:       {'Development' if is_dev else 'Production'}")
        print("=" * 60)
        print("\nPress CTRL+C to stop the server\n")
        
        # Run with import string for reload to work
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=is_dev,
            log_level="info",
            access_log=True
        )
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("\nDependencies not installed. Please run:")
        print("  pip install -r requirements.txt")
        print("\nThen start the server with:")
        print("  python run_server.py")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        sys.exit(0)
