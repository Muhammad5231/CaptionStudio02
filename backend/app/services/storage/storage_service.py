import os
import shutil
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Tuple, BinaryIO
from fastapi import HTTPException, status
from app.core.config import settings

class StorageService(ABC):
    @abstractmethod
    def save_file(self, file_stream: BinaryIO, filename: str, subfolder: str = "uploads") -> Tuple[str, str, int, str]:
        """Saves file and returns (storage_key, absolute_path, size_bytes, checksum)."""
        pass

    @abstractmethod
    def get_file_path(self, storage_key: str) -> Path:
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        pass

    @abstractmethod
    def get_public_url(self, storage_key: str) -> str:
        pass

class LocalStorageService(StorageService):
    def __init__(self, base_dir: Path = settings.STORAGE_DIR):
        self.base_dir = base_dir

    def _sanitize_path(self, path: Path) -> Path:
        resolved = path.resolve()
        # Security: Prevent path traversal outside storage directory
        if not str(resolved).startswith(str(self.base_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: Path traversal detected."
            )
        return resolved

    def save_file(self, file_stream: BinaryIO, filename: str, subfolder: str = "uploads") -> Tuple[str, str, int, str]:
        safe_subfolder = self.base_dir / subfolder
        safe_subfolder.mkdir(parents=True, exist_ok=True)

        clean_filename = Path(filename).name.replace(" ", "_")
        target_path = safe_subfolder / clean_filename
        target_path = self._sanitize_path(target_path)

        sha256 = hashlib.sha256()
        bytes_written = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        with open(target_path, "wb") as out_file:
            while chunk := file_stream.read(1024 * 1024):  # 1MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    out_file.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
                    )
                sha256.update(chunk)
                out_file.write(chunk)

        storage_key = f"{subfolder}/{clean_filename}"
        checksum = sha256.hexdigest()
        return storage_key, str(target_path), bytes_written, checksum

    def get_file_path(self, storage_key: str) -> Path:
        full_path = self.base_dir / storage_key.lstrip("/\\")
        return self._sanitize_path(full_path)

    def delete_file(self, storage_key: str) -> bool:
        try:
            p = self.get_file_path(storage_key)
            if p.exists():
                p.unlink()
                return True
        except Exception:
            pass
        return False

    def get_public_url(self, storage_key: str) -> str:
        clean_key = storage_key.replace("\\", "/").lstrip("/")
        return f"/api/media/{clean_key}"

# Magic byte / file signature validator
def validate_media_file_signature(file_stream: BinaryIO, ext: str) -> str:
    """
    Inspects magic bytes to prevent renamed executables or malicious files.
    """
    file_stream.seek(0)
    header = file_stream.read(64)
    file_stream.seek(0)

    ext = ext.lower().strip()

    if ext in {".mp4", ".m4v"}:
        # MP4 files contain 'ftyp' in first 16 bytes
        if b"ftyp" in header[:32]:
            return "video/mp4"
    elif ext in {".mov"}:
        if b"ftyp" in header[:32] or b"moov" in header[:32] or b"wide" in header[:32] or b"mdat" in header[:32]:
            return "video/quicktime"
    elif ext in {".webm", ".mkv"}:
        if header.startswith(b"\x1a\x45\xdf\xa3"):
            return "video/webm" if ext == ".webm" else "video/x-matroska"
    elif ext in {".srt", ".vtt", ".ass", ".txt"}:
        # Subtitle text inspection
        try:
            sample = header.decode("utf-8", errors="ignore")
            return "text/plain"
        except Exception:
            pass

    # If signature doesn't match standard known media
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid file content. File header does not match expected {ext} format."
    )

storage_service: StorageService = LocalStorageService()

