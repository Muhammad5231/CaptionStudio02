from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# --- Core Caption Types ---

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
    
    # Canvas Chroma / Solid background
    canvas_background_type: str = "video"  # video, color
    canvas_background_color: str = "#00FF00"
    
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

# --- Authentication Schemas ---

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    email: str
    role: str
    status: str
    avatar: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

# --- Media Asset Schemas ---

class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: Optional[str] = None
    original_name: str
    mime_type: str
    size_bytes: int
    duration: float
    width: int
    height: int
    fps: float
    created_at: datetime

# --- Caption Track Schemas ---

class CaptionTrackCreate(BaseModel):
    language: str
    label: str
    source: str = "translation"  # transcription, translation, import
    is_default: bool = False
    segments: List[Dict[str, Any]] = Field(default_factory=list)

class CaptionTrackUpdate(BaseModel):
    label: Optional[str] = None
    segments: Optional[List[Dict[str, Any]]] = None
    is_default: Optional[bool] = None

class CaptionTrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    language: str
    label: str
    source: str
    is_default: bool
    segments: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

# --- Project Schemas ---

class ProjectCreate(BaseModel):
    name: Optional[str] = "Untitled Video"
    style_preset: Optional[str] = "Modern"
    aspect_ratio: Optional[str] = "9:16"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    style_preset: Optional[str] = None
    aspect_ratio: Optional[str] = None
    style_config: Optional[Dict[str, Any]] = None
    captions: Optional[List[Dict[str, Any]]] = None
    active_track_id: Optional[str] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    name: str
    aspect_ratio: str = "9:16"
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
    active_track_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

# --- Export Schemas ---

class ExportRequest(BaseModel):
    quality: str = "1080p"  # 1080p, 720p, original
    caption_quality: str = "high"  # standard, high
    track_id: Optional[str] = None

class ExportJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: Optional[str] = None
    track_id: Optional[str] = None
    status: str
    progress: int
    current_stage: str
    output_filename: Optional[str] = None
    output_url: Optional[str] = None
    error: Optional[str] = None
    retry_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None

# --- Template Schemas ---

class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    description: str
    preview_text: str
    style_config: Dict[str, Any]

# --- Usage & SaaS Quota Schemas ---

class UsageSummaryResponse(BaseModel):
    user_id: str
    plan_id: str
    transcription_minutes_used: float
    transcription_minutes_limit: float
    exports_count_used: int
    exports_count_limit: int
    storage_mb_used: float
    storage_mb_limit: float

# --- Admin Schemas ---

class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    total_projects: int
    total_exports_completed: int
    total_exports_failed: int
    storage_bytes_total: int
    queue_pending_jobs: int

class AdminUserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None
    project_count: int = 0
    exports_count: int = 0
