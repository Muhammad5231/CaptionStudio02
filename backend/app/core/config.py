import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CaptionStudio"
    API_V1_STR: str = "/api"
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    RENDER_DIR: Path = STORAGE_DIR / "renders"
    THUMBNAIL_DIR: Path = STORAGE_DIR / "thumbnails"
    SAMPLE_DIR: Path = STORAGE_DIR / "samples"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'storage' / 'captionstudio.db'}"
    
    # FFmpeg executable detection
    FFMPEG_PATH: str = ""
    
    # Whisper settings
    WHISPER_MODEL: str = "base"  # base, tiny, small
    DEVICE: str = "cpu"
    
    class Config:
        case_sensitive = True

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

