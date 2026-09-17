import re
from typing import List, Dict, Any

class SubtitleParser:
    """
    Parses SRT, VTT, and TXT subtitle files into standardized CaptionStudio segment format.
    Generates intelligent proportional word-level timing when only segment timings are provided.
    """

    @staticmethod
    def _parse_timestamp(ts_str: str) -> float:
        ts_str = ts_str.strip().replace(",", ".")
        parts = ts_str.split(":")
        if len(parts) == 3:
            h, m, s = parts
            return float(h) * 3600 + float(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return float(m) * 60 + float(s)
        return float(ts_str)

    @classmethod
    def parse_srt(cls, content: str) -> List[Dict[str, Any]]:
        # Normalize line breaks
        content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
        blocks = re.split(r'\n\s*\n', content)
        segments: List[Dict[str, Any]] = []

        for block in blocks:
            lines = [line.strip() for line in block.split("\n") if line.strip()]
            if len(lines) < 2:
                continue

            # First line might be index or timestamp line
            time_line_idx = 1 if "-->" in lines[1] else (0 if "-->" in lines[0] else -1)
            if time_line_idx == -1:
                continue

            time_parts = lines[time_line_idx].split("-->")
            if len(time_parts) != 2:
                continue

            start_time = round(cls._parse_timestamp(time_parts[0]), 3)
            end_time = round(cls._parse_timestamp(time_parts[1].split()[0]), 3)

            text_lines = lines[time_line_idx + 1:]
            raw_text = " ".join(text_lines).strip()
            # Clean HTML tags like <i></i>
            clean_text = re.sub(r'<[^>]+>', '', raw_text).strip()

            if not clean_text:
                continue

            words = cls._interpolate_words(clean_text, start_time, end_time)
            segments.append({
                "id": f"seg-{len(segments) + 1}",
                "start": start_time,
                "end": end_time,
                "text": clean_text,
                "words": words
            })

        return segments

    @classmethod
    def parse_vtt(cls, content: str) -> List[Dict[str, Any]]:
        content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
        # Strip WEBVTT header
        content = re.sub(r'^WEBVTT[^\n]*\n', '', content, flags=re.IGNORECASE)
        # Strip notes/comments
        content = re.sub(r'NOTE\s+.*?\n\n', '', content, flags=re.DOTALL)
        return cls.parse_srt(content)

    @classmethod
    def parse_txt(cls, content: str, default_duration: float = 3.0) -> List[Dict[str, Any]]:
        """Parses plain text sentences into sequential caption segments."""
        content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        segments: List[Dict[str, Any]] = []
        current_time = 0.5

        for line in lines:
            words = line.split()
            if not words:
                continue
            duration = max(1.5, len(words) * 0.35)
            end_time = round(current_time + duration, 3)
            interpolated_words = cls._interpolate_words(line, current_time, end_time)
            segments.append({
                "id": f"seg-{len(segments) + 1}",
                "start": round(current_time, 3),
                "end": end_time,
                "text": line,
                "words": interpolated_words
            })
            current_time = end_time + 0.3

        return segments

    @classmethod
    def parse(cls, filename: str, content: str) -> List[Dict[str, Any]]:
        ext = filename.lower().split(".")[-1]
        if ext == "vtt":
            return cls.parse_vtt(content)
        elif ext == "srt":
            return cls.parse_srt(content)
        elif ext == "txt":
            return cls.parse_txt(content)
        else:
            return cls.parse_srt(content)

    @staticmethod
    def _interpolate_words(text: str, start: float, end: float) -> List[Dict[str, Any]]:
        words = text.split()
        if not words:
            return []

        total_chars = sum(len(w) for w in words)
        total_duration = max(0.2, end - start)
        current_pos = start
        result = []

        for w in words:
            # Word duration proportional to character length with a baseline
            share = (len(w) / max(1, total_chars)) if total_chars > 0 else (1 / len(words))
            w_dur = max(0.12, total_duration * share)
            w_start = round(current_pos, 3)
            w_end = round(min(end, current_pos + w_dur), 3)
            current_pos = w_end
            result.append({
                "text": w,
                "start": w_start,
                "end": max(w_start + 0.1, w_end),
                "confidence": 1.0
            })

        # Ensure last word reaches end
        if result:
            result[-1]["end"] = end

        return result

subtitle_parser = SubtitleParser()

