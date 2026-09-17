import re
from typing import List, Dict, Any

class CaptionGroupingEngine:
    """
    Intelligent caption grouping engine.
    Groups individual timed words into aesthetically pleasing, readable subtitle segments.
    Considers word count, time gaps, terminal punctuation, reading duration, and line balance.
    """

    def __init__(self, max_words_per_segment: int = 4, max_duration: float = 3.2, max_pause_gap: float = 0.45):
        self.max_words_per_segment = max_words_per_segment
        self.max_duration = max_duration
        self.max_pause_gap = max_pause_gap

    def group_words(self, words: List[Dict[str, Any]], max_words_per_line: int = None) -> List[Dict[str, Any]]:
        if not words:
            return []

        limit = max_words_per_line or self.max_words_per_segment
        segments: List[Dict[str, Any]] = []
        current_words: List[Dict[str, Any]] = []

        for idx, word in enumerate(words):
            text = word.get("text", "").strip()
            if not text:
                continue

            current_words.append(word)

            # Check break conditions
            should_break = False

            # Condition 1: reached max words limit
            if len(current_words) >= limit:
                should_break = True

            # Condition 2: punctuation boundary (. ! ? ...)
            if re.search(r'[.!?]$', text):
                should_break = True

            # Condition 3: pause gap to next word
            if idx < len(words) - 1:
                next_word = words[idx + 1]
                gap = next_word.get("start", 0) - word.get("end", 0)
                if gap >= self.max_pause_gap:
                    should_break = True

            # Condition 4: segment duration exceeded
            if current_words:
                dur = word.get("end", 0) - current_words[0].get("start", 0)
                if dur >= self.max_duration:
                    should_break = True

            # If last word in list, always finish
            if idx == len(words) - 1:
                should_break = True

            if should_break and current_words:
                seg_start = round(current_words[0]["start"], 3)
                seg_end = round(current_words[-1]["end"], 3)
                seg_text = " ".join(w["text"].strip() for w in current_words)
                
                # Minimum duration safeguard (at least 0.3s)
                if seg_end - seg_start < 0.3:
                    seg_end = round(seg_start + 0.3, 3)

                segments.append({
                    "id": f"seg-{len(segments) + 1}",
                    "start": seg_start,
                    "end": seg_end,
                    "text": seg_text,
                    "words": list(current_words)
                })
                current_words = []

        return segments

grouping_engine = CaptionGroupingEngine()

