import os
import shutil
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True, extra="allow")

    APP_ENV: str = "development"
    PROJECT_NAME: str = "CaptionStudio"
    API_V1_STR: str = "/api/v1"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    RENDER_DIR: Path = STORAGE_DIR / "renders"
    THUMBNAIL_DIR: Path = STORAGE_DIR / "thumbnails"
    SAMPLE_DIR: Path = STORAGE_DIR / "samples"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'storage' / 'captionstudio.db'}"
    
    # Redis / Queue
    REDIS_URL: Optional[str] = None
    
    # Security & JWT
    SECRET_KEY: str = "captionstudio-super-secure-production-jwt-key-2026-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Storage
    STORAGE_PROVIDER: str = "local"  # "local" or "s3"
    S3_BUCKET: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT_URL: Optional[str] = None
    
    # Quotas & Limits
    MAX_UPLOAD_SIZE_MB: int = 500
    MAX_VIDEO_DURATION_SECONDS: int = 7200  # 2 hours
    
    # Initial Admin Seed
    DEFAULT_ADMIN_EMAIL: str = "admin@captionstudio.com"
    DEFAULT_ADMIN_PASSWORD: str = "Admin12345!"
    
    # FFmpeg executable detection
    FFMPEG_PATH: str = ""
    
    # Whisper settings
    WHISPER_MODEL: str = "base"  # base, tiny, small
    DEVICE: str = "cpu"

    def __init__(self, **values):
        super().__init__(**values)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.RENDER_DIR.mkdir(parents=True, exist_ok=True)
        self.THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
        self.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Locate ffmpeg
        if not self.FFMPEG_PATH:
            # Check workspace root first (CaptionStudio/ffmpeg.exe)
            root_ffmpeg = self.BASE_DIR.parent / "ffmpeg.exe"
            if root_ffmpeg.exists():
                self.FFMPEG_PATH = str(root_ffmpeg)
            else:
                system_ffmpeg = shutil.which("ffmpeg")
                if system_ffmpeg:
                    self.FFMPEG_PATH = system_ffmpeg
                else:
                    try:
                        import imageio_ffmpeg
                        self.FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
                    except Exception:
                        self.FFMPEG_PATH = "ffmpeg"

        # Ensure ffmpeg binary directory is at the front of system PATH
        if self.FFMPEG_PATH and os.path.exists(self.FFMPEG_PATH):
            ffmpeg_dir = str(Path(self.FFMPEG_PATH).parent)
            current_path = os.environ.get("PATH", "")
            if ffmpeg_dir not in current_path:
                os.environ["PATH"] = f"{ffmpeg_dir}{os.pathsep}{current_path}"

settings = Settings()
