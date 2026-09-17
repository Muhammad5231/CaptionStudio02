from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class Word(BaseModel):
    text: str
    start: float
    end: float
    confidence: Optional[float] = 1.0

class CaptionSegment(BaseModel):
    id: Optional[str] = None
    start: float
    end: float
    text: str
    words: List[Word] = Field(default_factory=list)

class StyleConfig(BaseModel):
    font_family: str = "Inter"
    font_size: int = 42
    font_weight: str = "bold"
    text_color: str = "#FFFFFF"
    uppercase: bool = False
    alignment: str = "center"
    position: str = "bottom"  # bottom, center, top
    vertical_offset: int = 15  # % offset from border
    
    # Active word highlight
    highlight_color: str = "#38BDF8"  # cyan
    highlight_style: str = "color"  # color, box, scale, underline, glow
    highlight_bg_color: str = "#0284C7"
    
    # Word Animation
    animation: str = "pop"  # none, smooth, pop, bounce, wave
    
    # Background
    background_style: str = "none"  # none, box, rounded_box
    background_color: str = "#000000"
    background_opacity: float = 0.5
    
    # Advanced typography & effects
    outline_color: str = "#000000"
    outline_width: int = 2
    shadow_color: str = "#000000"
    shadow_blur: int = 4
    shadow_offset_x: int = 2
    shadow_offset_y: int = 2
    letter_spacing: int = 0
    line_height: float = 1.2
    max_words_per_line: int = 4

class ProjectCreate(BaseModel):
    name: Optional[str] = "Untitled Video"
    style_preset: Optional[str] = "Modern"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    style_preset: Optional[str] = None
    style_config: Optional[Dict[str, Any]] = None
    captions: Optional[List[Dict[str, Any]]] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    video_filename: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: float
    width: int
    height: int
    fps: float
    style_preset: str
    style_config: Dict[str, Any]
    captions: List[Dict[str, Any]]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExportRequest(BaseModel):
    quality: str = "1080p"  # 1080p, 720p, original
    caption_quality: str = "high"  # standard, high

class ExportJobResponse(BaseModel):
    id: str
    project_id: str
    status: str
    progress: int
    current_stage: str
    output_filename: Optional[str] = None
    output_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    preview_text: str
    style_config: Dict[str, Any]

    class Config:
        from_attributes = True

