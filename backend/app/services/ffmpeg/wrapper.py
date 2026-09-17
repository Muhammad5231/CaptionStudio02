import os
import re
import cv2
import asyncio
import subprocess
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
        
        # Resolution filter
        scale_filter = ""
        if target_resolution == "720p":
            scale_filter = "scale=-2:720,"
        elif target_resolution == "1080p":
            scale_filter = "scale=-2:1080,"

        video_filter = f"{scale_filter}ass='{clean_ass_path}'"

        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-i", input_video,
            "-vf", video_filter,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-progress", "pipe:1",
            output_video
        ]

        # Probe total duration for progress calculation
        probe = self.probe_video(input_video)
        total_duration = max(1.0, probe.get("duration", 10.0))

        if progress_callback:
            progress_callback(10, "Starting video encoder...")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Parse progress stream
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_str = line.decode("utf-8", errors="ignore").strip()
            
            # Look for out_time_us or out_time
            if line_str.startswith("out_time_us="):
                try:
                    time_us = int(line_str.split("=")[1])
                    curr_time = time_us / 1_000_000.0
                    pct = min(98, int(15 + (curr_time / total_duration) * 80))
                    if progress_callback:
                        progress_callback(pct, f"Rendering captions... {pct}%")
                except (ValueError, IndexError):
                    pass

        await process.wait()

        if process.returncode != 0:
            stderr = await process.stderr.read()
            err_msg = stderr.decode("utf-8", errors="ignore")
            # If libass failed due to font or filter, attempt fallback text filter
            raise RuntimeError(f"FFmpeg render failed: {err_msg[-400:]}")

        if progress_callback:
            progress_callback(100, "Render complete!")

        return True

ffmpeg_wrapper = FFmpegWrapper()

