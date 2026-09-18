export interface Word {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

export interface StyleConfig {
  preset?: string;
  name?: string;
  description?: string;
  font_family: string;
  font_size: number;
  font_weight: string;
  text_color: string;
  uppercase: boolean;
  alignment: 'center' | 'left' | 'right';
  position: 'bottom' | 'center' | 'top';
  vertical_offset: number;

  // Active word highlight
  highlight_color: string;
  highlight_style: 'color' | 'box' | 'scale' | 'underline' | 'glow' | 'karaoke';
  highlight_bg_color: string;

  // Word Animation
  animation: 'none' | 'smooth' | 'pop' | 'bounce' | 'wave' | 'hormozi' | 'glow' | 'karaoke';

  // Canvas / Chroma Background Mode
  canvas_background_type?: 'video' | 'color';
  canvas_background_color?: string; // e.g. '#00FF00' (Green Screen), '#000000', etc.

  // Background
  background_style: 'none' | 'box' | 'rounded_box';
  background_color: string;
  background_opacity: number;

  // Advanced
  outline_color: string;
  outline_width: number;
  shadow_color: string;
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
  letter_spacing: number;
  line_height: number;
  max_words_per_line: number;
}

export interface Project {
  id: string;
  name: string;
  video_filename?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  aspect_ratio?: '9:16' | '16:9' | '1:1';
  style_preset: string;
  style_config: StyleConfig;
  captions: CaptionSegment[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ExportJob {
  id: string;
  project_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  output_filename?: string;
  output_url?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  preview_text: string;
  style_config: StyleConfig;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  tier: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  storage_used_bytes: number;
  render_count: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CaptionTrack {
  id: string;
  project_id: string;
  name: string;
  language: string;
  is_default: boolean;
  captions: CaptionSegment[];
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  user_id: string;
  tier: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  renders_count: number;
  renders_limit: number;
  transcription_seconds: number;
  recent_records: Array<{
    id: string;
    metric_type: string;
    quantity: number;
    unit: string;
    timestamp: string;
  }>;
}

export interface AdminOverview {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_renders: number;
  failed_renders: number;
  storage_total_bytes: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  tier: string;
  is_active: boolean;
  storage_used_bytes: number;
  render_count: number;
  created_at: string;
}

export interface AdminJob {
  id: string;
  project_id: string;
  user_id?: string;
  status: string;
  progress: number;
  current_stage: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

