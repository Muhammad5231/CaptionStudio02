from abc import ABC, abstractmethod
from typing import Dict, Any

class TranscriptionProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_or_video_path: str) -> Dict[str, Any]:
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

