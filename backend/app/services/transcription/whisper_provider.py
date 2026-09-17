import os
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.transcription.base import TranscriptionProvider
from app.services.grouping.engine import grouping_engine

class WhisperProvider(TranscriptionProvider):
    """
    High-performance multilingual speech-to-text provider utilizing faster-whisper
    (CTranslate2) with targeted vocabulary priming for Hinglish, Hindi, Gujarati, and English.
    """

    def __init__(self, model_size: str = None):
        self.model_size = model_size or settings.WHISPER_MODEL or "base"
        self._model = None
        self._ensure_ffmpeg_in_path()

    def _ensure_ffmpeg_in_path(self):
        """Ensure directory containing FFmpeg is on system PATH so Whisper can invoke it."""
        if settings.FFMPEG_PATH and os.path.exists(settings.FFMPEG_PATH):
            ffmpeg_dir = str(Path(settings.FFMPEG_PATH).parent)
            current_path = os.environ.get("PATH", "")
            if ffmpeg_dir not in current_path:
                os.environ["PATH"] = f"{ffmpeg_dir}{os.pathsep}{current_path}"

    def _get_device_and_compute_type(self):
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda", "float16"
        except Exception:
            pass
        return "cpu", "int8"

    def _get_model(self):
        if self._model is None:
            self._ensure_ffmpeg_in_path()
            device, compute_type = self._get_device_and_compute_type()
            try:
                from faster_whisper import WhisperModel
                self._model = WhisperModel(
                    self.model_size,
                    device=device,
                    compute_type=compute_type,
                    cpu_threads=4,
                    download_root=str(Path.home() / ".cache" / "whisper")
                )
                self._is_faster_whisper = True
            except Exception as e:
                print(f"Faster-whisper init fallback to standard whisper: {e}")
                import whisper
                self._model = whisper.load_model(self.model_size)
                self._is_faster_whisper = False
        return self._model

    def preload_model(self):
        """Preloads model in background so first request is instant."""
        try:
            self._get_model()
        except Exception as e:
            print(f"Warning: Model preload failed: {e}")

    def _sync_transcribe(self, media_path: str, language: Optional[str] = "auto") -> Dict[str, Any]:
        self._ensure_ffmpeg_in_path()
        model = self._get_model()

        # Extract audio to 16kHz mono WAV for maximum reliability across complex video containers
        audio_target = media_path
        temp_wav = None

        try:
            temp_wav = str(settings.STORAGE_DIR / f"temp_{os.path.basename(media_path)}.wav")
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

        # Language mapping & vocabulary priming
        target_lang = None
        initial_prompt = None
        lang_clean = (language or "auto").lower().strip()

        if lang_clean == "hinglish":
            # Prime model for conversational Latin-script Hinglish with creator & marketing terms
            target_lang = "en"
            initial_prompt = (
                "Yeh video Hinglish mein hai jisme content creation, viral hooks, reels, marketing, "
                "aur business terms mix hain. Transcribe spoken words in conversational Latin-script Hinglish."
            )
        elif lang_clean in ["hindi", "hi"]:
            target_lang = "hi"
            initial_prompt = "यह वीडियो हिंदी में है। साफ़, सटीक और शुद्ध हिंदी उपशीर्षक।"
        elif lang_clean in ["gujarati", "gu"]:
            target_lang = "gu"
            initial_prompt = "આ વિડિયો ગુજરાતીમાં છે. સાચા શબ્દો, જોડાક્ષરો અને વાક્યો."
        elif lang_clean in ["english", "en"]:
            target_lang = "en"
            initial_prompt = "Professional English subtitles for high-engagement viral video."
        elif lang_clean != "auto":
            target_lang = lang_clean

        all_words: List[Dict[str, Any]] = []
        full_text_parts: List[str] = []

        try:
            if getattr(self, "_is_faster_whisper", True):
                segments_generator, info = model.transcribe(
                    audio_target,
                    language=target_lang,
                    initial_prompt=initial_prompt,
                    word_timestamps=True,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=400),
                    beam_size=5
                )

                for seg in segments_generator:
                    full_text_parts.append(seg.text.strip())
                    if seg.words:
                        for w in seg.words:
                            w_text = w.word.strip()
                            if w_text:
                                all_words.append({
                                    "text": w_text,
                                    "start": round(float(w.start), 3),
                                    "end": round(float(w.end), 3),
                                    "confidence": round(float(w.probability), 2)
                                })
                    else:
                        # Fallback word interpolation if segment has no explicit words
                        seg_words = seg.text.strip().split()
                        dur = max(0.2, seg.end - seg.start)
                        w_dur = dur / max(1, len(seg_words))
                        for i, w_txt in enumerate(seg_words):
                            all_words.append({
                                "text": w_txt,
                                "start": round(seg.start + (i * w_dur), 3),
                                "end": round(seg.start + ((i + 1) * w_dur), 3),
                                "confidence": 0.95
                            })

                full_text = " ".join(full_text_parts).strip()
            else:
                # Standard openai-whisper fallback
                result = model.transcribe(
                    audio_target,
                    language=target_lang,
                    initial_prompt=initial_prompt,
                    word_timestamps=True,
                    fp16=False,
                    verbose=False
                )
                full_text = result.get("text", "").strip()
                for seg in result.get("segments", []):
                    for w in seg.get("words", []):
                        w_text = w.get("word", "").strip()
                        if w_text:
                            all_words.append({
                                "text": w_text,
                                "start": round(float(w.get("start", 0.0)), 3),
                                "end": round(float(w.get("end", 0.0)), 3),
                                "confidence": round(float(w.get("probability", 1.0)), 2)
                            })
        finally:
            if temp_wav and os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass

        # Build balanced, natural segments with intelligent grouping engine
        if all_words:
            smart_segments = grouping_engine.group_words(all_words)
        else:
            smart_segments = []

        return {
            "full_text": full_text,
            "segments": smart_segments,
            "words": all_words
        }

    async def transcribe(self, audio_or_video_path: str, language: Optional[str] = "auto") -> Dict[str, Any]:
        return await asyncio.to_thread(self._sync_transcribe, audio_or_video_path, language)

whisper_provider = WhisperProvider(model_size=settings.WHISPER_MODEL)
