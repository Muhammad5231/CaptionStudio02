from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class TranscriptionProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_or_video_path: str, language: Optional[str] = "auto") -> Dict[str, Any]:
        """
        Transcribes the given audio or video file.
        Returns:
        {
            "full_text": str,
            "segments": [
                {
                    "id": str,
                    "start": float,
                    "end": float,
                    "text": str,
                    "words": [{"text": str, "start": float, "end": float}]
                }
            ],
            "words": [...]
        }
        """
        pass
