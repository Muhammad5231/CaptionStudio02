import type {
  Project,
  ExportJob,
  Template,
  StyleConfig,
  CaptionTrack,
  UsageSummary,
  AdminOverview,
  AdminUser,
  AdminJob,
} from '../types/caption';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'captionstudio_token';

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  },

  async createProject(
    name: string = 'Untitled Video',
    stylePreset: string = 'Hormozi',
    aspectRatio: string = '9:16'
  ): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, style_preset: stylePreset, aspect_ratio: aspectRatio }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load project details');
    return res.json();
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async duplicateProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to duplicate project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  // --- UPLOAD & MEDIA ---
  async uploadVideo(id: string, file: File): Promise<{
    video_url: string;
    thumbnail_url?: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${id}/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async importSubtitles(id: string, file: File): Promise<{
    success?: boolean;
    format: string;
    segment_count: number;
    captions: any[];
    duration?: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${id}/subtitles/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to import subtitles' }));
      throw new Error(err.detail || 'Failed to import subtitles');
    }
    return res.json();
  },

  async uploadSubtitles(id: string, file: File): Promise<any> {
    return this.importSubtitles(id, file);
  },

  async transcribeProject(id: string, language: string = 'auto'): Promise<any> {
    const query = language && language !== 'auto' ? `?language=${encodeURIComponent(language)}` : '';
    const res = await fetch(`${API_BASE}/projects/${id}/transcribe${query}`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
      throw new Error(err.detail || 'Transcription failed');
    }
    return res.json();
  },

  // --- NON-DESTRUCTIVE CAPTION TRACKS & TRANSLATION ---
  async translateCaptions(
    id: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<{
    success: boolean;
    target_language: string;
    captions: any[];
    engine_used?: string;
    track_id?: string;
    track_name?: string;
  }> {
    const res = await fetch(`${API_BASE}/projects/${id}/translate`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        target_language: targetLanguage,
        source_language: sourceLanguage || 'auto',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Translation failed' }));
      throw new Error(err.detail || 'Translation failed');
    }
    return res.json();
  },

  async getTracks(projectId: string): Promise<CaptionTrack[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tracks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load caption tracks');
    return res.json();
  },

  async activateTrack(
    projectId: string,
    trackId: string
  ): Promise<{
    success: boolean;
    message: string;
    active_track_id: string;
    captions: any[];
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tracks/${trackId}/activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to activate caption track');
    return res.json();
  },

  // --- PRESETS & TEMPLATES ---
  async getPresets(): Promise<{ id: string; name: string; description: string; config: StyleConfig }[]> {
    const res = await fetch(`${API_BASE}/presets`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load presets');
    return res.json();
  },

  async getTemplates(): Promise<Template[]> {
    const res = await fetch(`${API_BASE}/templates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load templates');
    return res.json();
  },

  async recommendStyle(category: string): Promise<{ preset: string; reason: string; config: StyleConfig }> {
    const res = await fetch(`${API_BASE}/recommend-style/${encodeURIComponent(category)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get recommendation');
    return res.json();
  },

  // --- EXPORT & RENDERING ---
  async startExport(
    id: string,
    quality: string = '1080p',
    captionQuality: string = 'high',
    trackId?: string
  ): Promise<ExportJob> {
    const res = await fetch(`${API_BASE}/projects/${id}/export`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        quality,
        caption_quality: captionQuality,
        track_id: trackId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || 'Failed to start export');
    }
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<ExportJob> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get job status');
    return res.json();
  },

  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to cancel job' }));
      throw new Error(err.detail || 'Failed to cancel job');
    }
    return res.json();
  },

  // --- USAGE & QUOTAS ---
  async getUsage(): Promise<UsageSummary> {
    const res = await fetch(`${API_BASE}/usage/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load usage metrics');
    return res.json();
  },

  // --- ADMIN ENDPOINTS ---
  async getAdminOverview(): Promise<AdminOverview> {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load admin overview');
    return res.json();
  },

  async getAdminUsers(skip: number = 0, limit: number = 50): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/admin/users?skip=${skip}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  },

  async updateAdminUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) throw new Error('Failed to update user status');
    return res.json();
  },

  async getAdminJobs(status?: string, skip: number = 0, limit: number = 50): Promise<AdminJob[]> {
    const query = status ? `?status=${encodeURIComponent(status)}&skip=${skip}&limit=${limit}` : `?skip=${skip}&limit=${limit}`;
    const res = await fetch(`${API_BASE}/admin/jobs${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load admin jobs');
    return res.json();
  },

  async retryAdminJob(jobId: string): Promise<AdminJob> {
    const res = await fetch(`${API_BASE}/admin/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retry job');
    return res.json();
  },

  async getAdminHealth(): Promise<{ status: string; database: string; timestamp: string }> {
    const res = await fetch(`${API_BASE}/admin/health`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  // --- DEMO SAMPLE ---
  async createDemoProject(): Promise<Project> {
    const res = await fetch(`${API_BASE}/demo/create-sample`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to create demo project');
    return res.json();
  },
};
