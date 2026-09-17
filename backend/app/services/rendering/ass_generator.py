import re
from typing import List, Dict, Any

class ASSGenerator:
    """
    Generates Advanced SubStation Alpha (.ass) subtitle files.
    Supports precise word-level styling, active word color highlighting, outlines,
    shadows, and vertical alignments matching the web editor preview.
    Includes automated Indic font fallback (Gujarati & Devanagari) to prevent tofu boxes.
    """

    @staticmethod
    def hex_to_ass_color(hex_str: str, alpha: int = 0) -> str:
        """Converts #RRGGBB or #RGB to ASS &HAABBGGRR format."""
        if not hex_str:
            return "&H00FFFFFF&"
        hex_clean = hex_str.strip().lstrip("#")
        if len(hex_clean) == 3:
            hex_clean = "".join(c * 2 for c in hex_clean)
        if len(hex_clean) >= 6:
            r = hex_clean[0:2]
            g = hex_clean[2:4]
            b = hex_clean[4:6]
            a = f"{alpha:02X}"
            return f"&H{a}{b}{g}{r}&"
        return "&H00FFFFFF&"

    @staticmethod
    def format_ass_time(seconds: float) -> str:
        """Converts float seconds into ASS time format H:MM:SS.cs"""
        seconds = max(0.0, float(seconds))
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int(round((seconds - int(seconds)) * 100))
        if cs >= 100:
            s += 1
            cs = 0
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    def _resolve_font(self, captions: List[Dict[str, Any]], requested_font: str) -> str:
        """
        Detects if text contains Indic characters (Hindi / Gujarati) and falls back
        to bundled fonts if the requested font cannot render Indic glyphs.
        """
        all_text = " ".join(seg.get("text", "") for seg in captions)
        
        # Check for Gujarati (U+0A80 - U+0AFF)
        if re.search(r"[\u0A80-\u0AFF]", all_text):
            return "Noto Sans Gujarati"
        
        # Check for Devanagari / Hindi (U+0900 - U+097F)
        if re.search(r"[\u0900-\u097F]", all_text):
            # Poppins has excellent Devanagari support bundled in backend/assets/fonts
            return "Poppins"
            
        return requested_font or "Montserrat"

    def generate(
        self,
        captions: List[Dict[str, Any]],
        style: Dict[str, Any],
        video_width: int = 1080,
        video_height: int = 1920
    ) -> str:
        """Builds a complete ASS script file content."""
        requested_font = style.get("font_family", "Montserrat")
        font_name = self._resolve_font(captions, requested_font)
        
        # Scale font size proportionally to 1080p height base
        ref_height = 1920 if video_height > video_width else 1080
        font_size = int(style.get("font_size", 48) * (video_height / ref_height))
        is_bold = -1 if style.get("font_weight", "bold") in ["bold", "extra-bold"] else 0
        uppercase = style.get("uppercase", False)
        
        # Colors
        primary_color = self.hex_to_ass_color(style.get("text_color", "#FFFFFF"))
        highlight_color = self.hex_to_ass_color(style.get("highlight_color", "#FFE600"))
        outline_color = self.hex_to_ass_color(style.get("outline_color", "#000000"))
        
        # Background / Shadow / Preset styles
        preset = style.get("preset", "")
        bg_style = style.get("background_style", "none")
        animation = style.get("animation", "hormozi").lower()
        
        if bg_style in ["box", "rounded_box"] or preset == "DesiClean":
            border_style = 3  # Opaque box in ASS
            bg_color = self.hex_to_ass_color(style.get("background_color", "#09090B"), alpha=50)
            back_color = bg_color
            outline_width = int(style.get("outline_width", 0) * (video_height / ref_height))
            shadow_dist = 0
        else:
            border_style = 1  # Outline + drop shadow
            back_color = self.hex_to_ass_color("#000000", alpha=140)
            outline_width = int(style.get("outline_width", 3) * (video_height / ref_height))
            shadow_dist = int(style.get("shadow_blur", 4) * 0.5 * (video_height / ref_height))

        # Position alignment (2 = Bottom Center, 5 = Middle Center, 8 = Top Center)
        pos = style.get("position", "bottom")
        if pos == "top":
            alignment = 8
            margin_v = int(video_height * 0.12)
        elif pos == "center":
            alignment = 5
            margin_v = 0
        else:
            alignment = 2
            v_offset_pct = style.get("vertical_offset", 14) / 100.0
            margin_v = int(video_height * v_offset_pct)

        header = f"""[Script Info]
Title: CaptionStudio Generated
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: {video_width}
PlayResY: {video_height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},&H000000FF&,{outline_color},{back_color},{is_bold},0,0,0,100,100,0,0,{border_style},{outline_width},{shadow_dist},{alignment},60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events = []

        for seg in captions:
            seg_start = seg.get("start", 0.0)
            seg_end = seg.get("end", seg_start + 1.0)
            words = seg.get("words", [])

            if not words:
                text = seg.get("text", "")
                if uppercase:
                    text = text.upper()
                start_str = self.format_ass_time(seg_start)
                end_str = self.format_ass_time(seg_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text}")
                continue

            # Karaoke progressive fill mode
            if animation == "karaoke" or preset == "Karaoke":
                karaoke_parts = []
                for w in words:
                    w_start = w.get("start", seg_start)
                    w_end = w.get("end", w_start + 0.3)
                    duration_cs = max(1, int(round((w_end - w_start) * 100)))
                    raw_w = w.get("text", "").strip()
                    if uppercase:
                        raw_w = raw_w.upper()
                    karaoke_parts.append(f"{{\\kf{duration_cs}}}{raw_w}")
                
                dialogue_text = " ".join(karaoke_parts)
                start_str = self.format_ass_time(seg_start)
                end_str = self.format_ass_time(seg_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")
                continue

            # Word-level timing lines for active word highlighting
            for w_idx, active_word in enumerate(words):
                w_start = active_word.get("start", seg_start)
                w_end = active_word.get("end", seg_end)
                
                styled_parts = []
                for other_idx, word in enumerate(words):
                    raw_w = word.get("text", "").strip()
                    if uppercase:
                        raw_w = raw_w.upper()
                    
                    if other_idx == w_idx:
                        # Apply animation tags to active word
                        if animation in ["hormozi", "pop"]:
                            scale_val = 120 if animation == "pop" else 115
                            styled_parts.append(
                                f"{{\\c{highlight_color}\\t(0,70,\\fscx{scale_val}\\fscy{scale_val})}}{raw_w}{{\\c{primary_color}\\t(0,70,\\fscx100\\fscy100)}}"
                            )
                        elif animation == "glow":
                            styled_parts.append(
                                f"{{\\c{highlight_color}\\blur6}}{raw_w}{{\\c{primary_color}\\blur0}}"
                            )
                        elif animation == "bounce":
                            styled_parts.append(
                                f"{{\\c{highlight_color}\\fscx112\\fscy112}}{raw_w}{{\\c{primary_color}\\fscx100\\fscy100}}"
                            )
                        else:
                            # Standard color highlight
                            styled_parts.append(f"{{\\c{highlight_color}}}{raw_w}{{\\c{primary_color}}}")
                    else:
                        styled_parts.append(raw_w)

                dialogue_text = " ".join(styled_parts)
                start_str = self.format_ass_time(w_start)
                end_str = self.format_ass_time(w_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")

        return header + "\n".join(events) + "\n"

ass_generator = ASSGenerator()
