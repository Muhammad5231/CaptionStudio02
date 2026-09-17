import os
import re
import cv2
import asyncio
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from app.core.config import settings

class FFmpegWrapper:
    def __init__(self):
        self.ffmpeg_bin = settings.FFMPEG_PATH or "ffmpeg"

    def probe_video(self, video_path: str) -> Dict[str, Any]:
        """Probes video file to extract width, height, duration, and fps."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "width": 1920,
                "height": 1080,
                "duration": 10.0,
                "fps": 30.0
            }

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        frame_count = float(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = round(frame_count / fps, 3) if fps > 0 else 10.0
        cap.release()

        return {
            "width": width or 1920,
            "height": height or 1080,
            "fps": round(fps, 2) if fps > 0 else 30.0,
            "duration": max(1.0, duration)
        }

    def generate_thumbnail(self, video_path: str, output_path: str, timestamp: float = 1.0) -> bool:
        """Captures a video thumbnail at the given timestamp."""
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            frame_no = int(timestamp * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
            ret, frame = cap.read()
            if not ret:
                # Fallback to first frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
            if ret:
                cv2.imwrite(output_path, frame)
                cap.release()
                return True
            cap.release()
        except Exception:
            pass
        return False

    async def render_video_with_ass(
        self,
        input_video: str,
        ass_subtitles_path: str,
        output_video: str,
        target_resolution: str = "1080p",
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> bool:
        """
        Renders the video with burned-in ASS subtitles using FFmpeg libass filter.
        Tracks real-time progress.
        """
        # Escape path for FFmpeg filter on Windows
        # ASS filter format: ass='filename.ass'
        clean_ass_path = ass_subtitles_path.replace("\\", "/").replace(":", "\\:")
        
        fonts_dir = settings.BASE_DIR / "assets" / "fonts"
        fonts_param = ""
        if fonts_dir.exists():
            clean_fonts_dir = str(fonts_dir).replace("\\", "/").replace(":", "\\:")
            fonts_param = f":fontsdir='{clean_fonts_dir}'"
        
        # Probe dimensions and duration for scaling and progress
        probe = self.probe_video(input_video)
        src_w = probe.get("width", 1920)
        src_h = probe.get("height", 1080)
        total_duration = max(1.0, probe.get("duration", 10.0))

        # Resolution filter: maintain aspect ratio correctly for portrait vs landscape
        scale_filter = ""
        if target_resolution == "720p":
            scale_filter = "scale=720:-2," if src_h > src_w else "scale=-2:720,"
        elif target_resolution == "1080p":
            if src_h > src_w and src_w != 1080:
                scale_filter = "scale=1080:-2,"
            elif src_h <= src_w and src_h != 1080:
                scale_filter = "scale=-2:1080,"

        video_filter = f"{scale_filter}ass='{clean_ass_path}'{fonts_param}"

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-nostats",
            "-loglevel", "error",
            "-i", input_video,
            "-vf", video_filter,
            "-map", "0:v",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-progress", "pipe:1",
            output_video
        ]

        if progress_callback:
            progress_callback(10, "Starting video encoder...")

        def _run_ffmpeg():
            creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=1,
                universal_newlines=True,
                encoding="utf-8",
                errors="ignore",
                creationflags=creation_flags
            )

            stderr_lines = []
            def _drain_stderr():
                if process.stderr:
                    for l in iter(process.stderr.readline, ''):
                        stderr_lines.append(l)
                    process.stderr.close()

            err_thread = threading.Thread(target=_drain_stderr, daemon=True)
            err_thread.start()

            # Parse progress stream in real time from stdout
            if process.stdout:
                for line in iter(process.stdout.readline, ''):
                    line_str = line.strip()
                    if line_str.startswith("out_time_us="):
                        try:
                            time_us = int(line_str.split("=")[1])
                            curr_time = time_us / 1_000_000.0
                            pct = min(98, int(15 + (curr_time / total_duration) * 80))
                            if progress_callback:
                                progress_callback(pct, f"Rendering captions... {pct}%")
                        except (ValueError, IndexError):
                            pass

                process.stdout.close()

            process.wait()
            err_thread.join(timeout=2.0)

            if process.returncode != 0:
                err_msg = "".join(stderr_lines).strip()
                raise RuntimeError(f"FFmpeg render failed: {err_msg[-400:] if err_msg else f'Exit code {process.returncode}'}")

            return True

        await asyncio.to_thread(_run_ffmpeg)

        if progress_callback:
            progress_callback(100, "Render complete!")

        return True

ffmpeg_wrapper = FFmpegWrapper()

