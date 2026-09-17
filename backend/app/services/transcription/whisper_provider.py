import os
import asyncio
from pathlib import Path
from typing import Dict, Any, List
from app.core.config import settings
from app.services.transcription.base import TranscriptionProvider
from app.services.grouping.engine import grouping_engine

class WhisperProvider(TranscriptionProvider):
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None
        self._ensure_ffmpeg_in_path()

    def _ensure_ffmpeg_in_path(self):
        """Ensure directory containing FFmpeg is on system PATH so Whisper can invoke it."""
        if settings.FFMPEG_PATH:
            ffmpeg_dir = str(Path(settings.FFMPEG_PATH).parent)
            current_path = os.environ.get("PATH", "")
            if ffmpeg_dir not in current_path:
                os.environ["PATH"] = f"{ffmpeg_dir}{os.pathsep}{current_path}"

    def _get_model(self):
        if self._model is None:
            import whisper
            self._ensure_ffmpeg_in_path()
            # Load model on CPU or CUDA if available
            self._model = whisper.load_model(self.model_size)
        return self._model

    def preload_model(self):
        """Preloads model in background so first request is instant."""
        try:
            self._get_model()
        except Exception as e:
            print(f"Warning: Model preload failed: {e}")

    def _sync_transcribe(self, media_path: str) -> Dict[str, Any]:
        self._ensure_ffmpeg_in_path()
        model = self._get_model()
        
        # If media file has spaces or special characters, or is a complex video container,
        # extract audio to temporary 16kHz mono WAV for maximum reliability
        audio_target = media_path
        temp_wav = None
        
        try:
            from app.services.ffmpeg.wrapper import ffmpeg_wrapper
            temp_wav = str(settings.STORAGE_DIR / f"temp_{os.path.basename(media_path)}.wav")
            # Extract clean 16kHz mono WAV using ffmpeg
            extract_cmd = [
                settings.FFMPEG_PATH or "ffmpeg",
                "-y",
                "-i", media_path,
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                temp_wav
            ]
            import subprocess
            sub_res = subprocess.run(extract_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if sub_res.returncode == 0 and os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 1000:
                audio_target = temp_wav
        except Exception:
            audio_target = media_path

        try:
            # Run whisper transcription with word timestamps enabled
            result = model.transcribe(
                audio_target,
                word_timestamps=True,
                fp16=False,
                verbose=False
            )
        finally:
            if temp_wav and os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass
        
        raw_segments = result.get("segments", [])
        all_words: List[Dict[str, Any]] = []
        
        for seg in raw_segments:
            seg_words = seg.get("words", [])
            for w in seg_words:
                w_text = w.get("word", "").strip()
                if w_text:
                    all_words.append({
                        "text": w_text,
                        "start": round(float(w.get("start", 0.0)), 3),
                        "end": round(float(w.get("end", 0.0)), 3),
                        "confidence": round(float(w.get("probability", 1.0)), 2)
                    })
        
        # If words were extracted, run our smart grouping engine to build balanced captions
        if all_words:
            smart_segments = grouping_engine.group_words(all_words)
        else:
            # Fallback to segment boundaries if word level timing wasn't detected
            smart_segments = []
            for i, seg in enumerate(raw_segments):
                text = seg.get("text", "").strip()
                if not text:
                    continue
                start = round(float(seg.get("start", 0.0)), 3)
                end = round(float(seg.get("end", 0.0)), 3)
                words_in_seg = text.split()
                if not words_in_seg:
                    continue
                
                # Estimate word timing linearly across segment duration
                duration = max(0.2, end - start)
                word_dur = duration / len(words_in_seg)
                interpolated_words = []
                for w_i, w_txt in enumerate(words_in_seg):
                    w_start = round(start + (w_i * word_dur), 3)
                    w_end = round(start + ((w_i + 1) * word_dur), 3)
                    interpolated_words.append({
                        "text": w_txt,
                        "start": w_start,
                        "end": w_end,
                        "confidence": 0.95
                    })
                smart_segments.append({
                    "id": f"seg-{i+1}",
                    "start": start,
                    "end": end,
                    "text": text,
                    "words": interpolated_words
                })

        return {
            "full_text": result.get("text", "").strip(),
            "segments": smart_segments,
            "words": all_words
        }

    async def transcribe(self, audio_or_video_path: str) -> Dict[str, Any]:
        return await asyncio.to_thread(self._sync_transcribe, audio_or_video_path)

whisper_provider = WhisperProvider(model_size=settings.WHISPER_MODEL)

