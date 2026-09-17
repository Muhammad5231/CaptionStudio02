import re
from typing import List, Dict, Any

class ASSGenerator:
    """
    Generates Advanced SubStation Alpha (.ass) subtitle files.
    Supports precise word-level styling, active word color highlighting, outlines,
    shadows, and vertical alignments matching the web editor preview.
    """

    @staticmethod
    def hex_to_ass_color(hex_str: str, alpha: int = 0) -> str:
        """Converts #RRGGBB or #RGB to ASS &HAABBGGRR format."""
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
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int(round((seconds - int(seconds)) * 100))
        if cs >= 100:
            s += 1
            cs = 0
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    def generate(
        self,
        captions: List[Dict[str, Any]],
        style: Dict[str, Any],
        video_width: int = 1920,
        video_height: int = 1080
    ) -> str:
        """Builds a complete ASS script file content."""
        font_name = style.get("font_family", "Arial")
        font_size = int(style.get("font_size", 44) * (video_height / 1080.0))
        is_bold = -1 if style.get("font_weight", "bold") in ["bold", "extra-bold"] else 0
        uppercase = style.get("uppercase", False)
        
        # Colors
        primary_color = self.hex_to_ass_color(style.get("text_color", "#FFFFFF"))
        highlight_color = self.hex_to_ass_color(style.get("highlight_color", "#38BDF8"))
        outline_color = self.hex_to_ass_color(style.get("outline_color", "#000000"))
        
        # Background / Shadow
        bg_style = style.get("background_style", "none")
        if bg_style in ["box", "rounded_box"]:
            border_style = 3  # Opaque box in ASS
            bg_color = self.hex_to_ass_color(style.get("background_color", "#000000"), alpha=60)
            back_color = bg_color
        else:
            border_style = 1  # Outline + drop shadow
            back_color = self.hex_to_ass_color("#000000", alpha=128)

        outline_width = int(style.get("outline_width", 2) * (video_height / 1080.0))
        shadow_dist = int(style.get("shadow_blur", 4) * 0.5 * (video_height / 1080.0))

        # Position alignment (2 = Bottom Center, 5 = Middle Center, 8 = Top Center)
        pos = style.get("position", "bottom")
        if pos == "top":
            alignment = 8
            margin_v = int(video_height * 0.1)
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
                # Simple segment line
                text = seg.get("text", "")
                if uppercase:
                    text = text.upper()
                start_str = self.format_ass_time(seg_start)
                end_str = self.format_ass_time(seg_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text}")
                continue

            # Word-level timing lines for active word highlighting
            for w_idx, active_word in enumerate(words):
                w_start = active_word.get("start", seg_start)
                w_end = active_word.get("end", seg_end)
                
                # Render the segment text where the active word has highlight formatting
                styled_parts = []
                for other_idx, word in enumerate(words):
                    raw_w = word.get("text", "").strip()
                    if uppercase:
                        raw_w = raw_w.upper()
                    
                    if other_idx == w_idx:
                        # Highlight active word with color + optional bold/scale
                        styled_parts.append(f"{{\\c{highlight_color}\\fscx108\\fscy108}}{raw_w}{{\\c{primary_color}\\fscx100\\fscy100}}")
                    else:
                        styled_parts.append(raw_w)

                dialogue_text = " ".join(styled_parts)
                start_str = self.format_ass_time(w_start)
                end_str = self.format_ass_time(w_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")

        return header + "\n".join(events) + "\n"

ass_generator = ASSGenerator()

