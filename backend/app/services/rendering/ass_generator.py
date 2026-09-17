import re
from typing import List, Dict, Any

class ASSGenerator:
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
            a = f"{max(0, min(255, alpha)):02X}"
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

    def _resolve_font(self, captions: List[Dict[str, Any]], requested_font: str, font_weight: str = "bold") -> str:
        all_text = " ".join(seg.get("text", "") for seg in captions)
        
        # Check for Gujarati
        if re.search(r"[\u0A80-\u0AFF]", all_text):
            return "Noto Sans Gujarati"
        
        # Check for Devanagari / Hindi
        if re.search(r"[\u0900-\u097F]", all_text):
            return "Poppins"
            
        req = (requested_font or "Montserrat").strip()
        if "montserrat" in req.lower():
            if font_weight in ["extra-bold", "black", "900"]:
                return "Montserrat Black"
            return "Montserrat"
        elif "komika" in req.lower():
            return "Bangers"
        elif "poppins" in req.lower():
            return "Poppins"
        return req

    def generate(
        self,
        captions: List[Dict[str, Any]],
        style: Dict[str, Any],
        video_width: int = 1080,
        video_height: int = 1920
    ) -> str:
        requested_font = style.get("font_family", "Montserrat")
        font_weight = style.get("font_weight", "bold")
        font_name = self._resolve_font(captions, requested_font, font_weight)
        
        # Exact WYSIWYG font size scaling:
        # In CenterCanvas.tsx: preview container is max-w-85 (340px) for 9:16
        if video_height > video_width:  # 9:16 vertical
            preview_w = 340.0
        elif video_width > video_height:  # 16:9 landscape
            preview_w = 620.0
        else:  # 1:1 square
            preview_w = 460.0

        scale_factor = (video_width * 0.70) / preview_w
        raw_font_size = float(style.get("font_size", 48))
        font_size = max(28, int(round(raw_font_size * scale_factor)))

        is_bold = -1 if font_weight in ["bold", "extra-bold", "black"] else 0
        uppercase = bool(style.get("uppercase", False))
        
        # Colors
        primary_color = self.hex_to_ass_color(style.get("text_color", "#FFFFFF"))
        highlight_color = self.hex_to_ass_color(style.get("highlight_color", "#FFE600"))
        outline_color = self.hex_to_ass_color(style.get("outline_color", "#000000"))
        
        # Background / Box style
        bg_style = style.get("background_style", "none")
        animation = str(style.get("animation", "hormozi")).lower()
        
        if bg_style in ["box", "rounded_box"]:
            border_style = 3  # Opaque box background
            # Opacity: in web CSS, background_opacity is 0.0 - 1.0 (0.6 = 60% opaque)
            opacity = float(style.get("background_opacity", 0.65))
            ass_alpha = int(round((1.0 - max(0.0, min(1.0, opacity))) * 255))
            bg_hex = style.get("background_color", "#111827")
            back_color = self.hex_to_ass_color(bg_hex, alpha=ass_alpha)
            
            # Outline defines box padding around glyphs in ASS BorderStyle 3
            box_padding = max(14, int(round(font_size * 0.28)))
            outline_width = box_padding
            shadow_dist = 0
        else:
            border_style = 1  # Outline + Drop Shadow
            back_color = self.hex_to_ass_color("#000000", alpha=140)
            outline_width = max(1, int(round(float(style.get("outline_width", 3)) * (scale_factor * 0.55))))
            shadow_dist = max(1, int(round(float(style.get("shadow_blur", 4)) * 0.45 * (scale_factor * 0.55))))

        # Alignment
        # In ASS: 1=bottom-left, 2=bottom-center, 3=bottom-right
        #         4=mid-left,    5=mid-center,    6=mid-right
        #         7=top-left,    8=top-center,    9=top-right
        horiz_align = style.get("alignment", "center")
        pos = style.get("position", "center")
        
        if pos == "top":
            base_row = 7
            margin_v = int(video_height * (float(style.get("vertical_offset", 12)) / 100.0))
        elif pos == "center":
            base_row = 4
            margin_v = 0
        else:  # bottom
            base_row = 1
            margin_v = int(video_height * (float(style.get("vertical_offset", 14)) / 100.0))
            
        if horiz_align == "left":
            alignment = base_row + 0
        elif horiz_align == "right":
            alignment = base_row + 2
        else:
            alignment = base_row + 1

        margin_h = max(30, int(video_width * 0.06))

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
Style: Default,{font_name},{font_size},{primary_color},{primary_color},{outline_color},{back_color},{is_bold},0,0,0,100,100,0,0,{border_style},{outline_width},{shadow_dist},{alignment},{margin_h},{margin_h},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events = []

        for seg in captions:
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", seg_start + 1.0))
            words = seg.get("words", [])

            if not words:
                text = seg.get("text", "")
                if uppercase:
                    text = text.upper()
                start_str = self.format_ass_time(seg_start)
                end_str = self.format_ass_time(seg_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text}")
                continue

            # Word-level timed events matching CenterCanvas getWordStyle
            for w_idx, active_word in enumerate(words):
                w_start = float(active_word.get("start", seg_start))
                # For seamless word flow without gap flickering:
                if w_idx < len(words) - 1:
                    w_end = float(words[w_idx + 1].get("start", active_word.get("end", seg_end)))
                else:
                    w_end = max(float(active_word.get("end", seg_end)), seg_end)

                styled_parts = []
                for other_idx, w_item in enumerate(words):
                    raw_w = w_item.get("text", "").strip()
                    if uppercase:
                        raw_w = raw_w.upper()

                    if other_idx == w_idx:
                        # Active word
                        if animation in ["hormozi", "pop"]:
                            scale_val = 120 if animation == "pop" else 115
                            styled_parts.append(
                                f"{{\\1c{highlight_color}\\fscx{scale_val}\\fscy{scale_val}}}{raw_w}{{\\fscx100\\fscy100\\1c{primary_color}}}"
                            )
                        elif animation == "glow":
                            styled_parts.append(
                                f"{{\\1c{highlight_color}\\blur8}}{raw_w}{{\\blur0\\1c{primary_color}}}"
                            )
                        elif animation == "bounce":
                            styled_parts.append(
                                f"{{\\1c{highlight_color}\\fscx112\\fscy112}}{raw_w}{{\\fscx100\\fscy100\\1c{primary_color}}}"
                            )
                        elif animation == "karaoke":
                            styled_parts.append(
                                f"{{\\1c{highlight_color}}}{raw_w}{{\\1c{primary_color}}}"
                            )
                        else:
                            # Standard color highlight
                            styled_parts.append(
                                f"{{\\1c{highlight_color}}}{raw_w}{{\\1c{primary_color}}}"
                            )
                    elif other_idx < w_idx:
                        # Past word
                        if animation == "karaoke":
                            styled_parts.append(f"{{\\1c{highlight_color}}}{raw_w}{{\\1c{primary_color}}}")
                        else:
                            styled_parts.append(raw_w)
                    else:
                        # Future word
                        if animation == "karaoke":
                            # In karaoke mode, unreached words are soft muted slate
                            styled_parts.append(f"{{\\1c&H00B8A394&}}{raw_w}{{\\1c{primary_color}}}")
                        else:
                            styled_parts.append(raw_w)

                dialogue_text = " ".join(styled_parts)
                start_str = self.format_ass_time(w_start)
                end_str = self.format_ass_time(w_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")

        return header + "\n".join(events) + "\n"

ass_generator = ASSGenerator()
