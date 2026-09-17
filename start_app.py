"""
CaptionStudio - Single Launcher Script
Runs the unified FastAPI + React frontend server on http://127.0.0.1:8000
"""
import sys
from pathlib import Path
import uvicorn

# Add backend directory to python path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  🚀 CaptionStudio — Professional AI Caption Generator")
    print("  🌐 Server running at: http://127.0.0.1:8000")
    print("  ⚡ API Docs:          http://127.0.0.1:8000/docs")
    print("="*60 + "\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

