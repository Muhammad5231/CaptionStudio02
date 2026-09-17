import re
from typing import List, Dict, Any

class SubtitleParser:
    """
    Universal Subtitle Parser supporting SRT, VTT, ASS, and TXT files.
    Extracts timestamps and provides intelligent proportional word-level interpolation
    based on character counts to drive active-word animations even on phrase-level subtitles.
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
        content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
        blocks = re.split(r'\n\s*\n', content)
        segments: List[Dict[str, Any]] = []

        for block in blocks:
            lines = [line.strip() for line in block.split("\n") if line.strip()]
            if len(lines) < 2:
                continue

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
        content = re.sub(r'^WEBVTT[^\n]*\n', '', content, flags=re.IGNORECASE)
        content = re.sub(r'NOTE\s+.*?\n\n', '', content, flags=re.DOTALL)
        return cls.parse_srt(content)

    @classmethod
    def parse_ass(cls, content: str) -> List[Dict[str, Any]]:
        """Parses Advanced SubStation Alpha (.ass) dialogue events."""
        content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
        lines = content.split("\n")
        segments: List[Dict[str, Any]] = []

        in_events = False
        format_indices = {}

        for line in lines:
            line_str = line.strip()
            if line_str.lower().startswith("[events]"):
                in_events = True
                continue
            if line_str.startswith("[") and in_events and not line_str.lower().startswith("[events]"):
                in_events = False
                continue

            if in_events:
                if line_str.lower().startswith("format:"):
                    fields = [f.strip().lower() for f in line_str[7:].split(",")]
                    format_indices = {name: i for i, name in enumerate(fields)}
                elif line_str.lower().startswith("dialogue:"):
                    raw_values = line_str[9:].split(",", len(format_indices) - 1 if format_indices else 9)
                    if len(raw_values) >= 9:
                        start_idx = format_indices.get("start", 1)
                        end_idx = format_indices.get("end", 2)
                        text_idx = format_indices.get("text", len(raw_values) - 1)

                        start_str = raw_values[start_idx].strip()
                        end_str = raw_values[end_idx].strip()
                        raw_text = raw_values[text_idx].strip()

                        start_time = round(cls._parse_timestamp(start_str), 3)
                        end_time = round(cls._parse_timestamp(end_str), 3)

                        # Check for karaoke timing tags: {\k15}word
                        karaoke_matches = re.findall(r'\{\\[kK](\d+)\}([^\{\\]+)', raw_text)
                        clean_text = re.sub(r'\{[^\}]+\}', '', raw_text).replace(r'\N', ' ').replace(r'\n', ' ').strip()

                        if not clean_text:
                            continue

                        if karaoke_matches:
                            words = []
                            cur_time = start_time
                            for cs_dur, w_txt in karaoke_matches:
                                dur = float(cs_dur) / 100.0
                                words.append({
                                    "text": w_txt.strip(),
                                    "start": round(cur_time, 3),
                                    "end": round(cur_time + dur, 3),
                                    "confidence": 1.0
                                })
                                cur_time += dur
                        else:
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
    def parse_txt(cls, content: str, default_duration: float = 3.0) -> List[Dict[str, Any]]:
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
    def parse(
        cls,
        arg1: str = "",
        arg2: str = "",
        filename: str = "",
        content: str = ""
    ) -> List[Dict[str, Any]]:
        # Resolve content and filename from positional or keyword arguments
        final_content = content or ""
        final_filename = filename or ""

        if not final_content and arg1:
            if "\n" in arg1 or "-->" in arg1 or "[Script Info]" in arg1:
                final_content = arg1
                final_filename = final_filename or arg2 or "subtitles.srt"
            else:
                final_filename = final_filename or arg1
                final_content = arg2

        if not final_content and arg2:
            final_content = arg2

        ext = final_filename.lower().split(".")[-1] if "." in final_filename else "srt"
        if ext == "vtt":
            return cls.parse_vtt(final_content)
        elif ext == "ass":
            return cls.parse_ass(final_content)
        elif ext == "srt":
            return cls.parse_srt(final_content)
        elif ext == "txt":
            return cls.parse_txt(final_content)
        else:
            return cls.parse_srt(final_content)

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

        if result:
            result[-1]["end"] = end

        return result

subtitle_parser = SubtitleParser()
