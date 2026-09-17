import type { Project, ExportJob, Template, StyleConfig } from '../types/caption';

const API_BASE = '/api';

export const api = {
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  },

  async createProject(name: string = 'Untitled Video', stylePreset: string = 'Modern'): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, style_preset: stylePreset }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to load project details');
    return res.json();
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async duplicateProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  },

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
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadSubtitles(id: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${id}/subtitles`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to import subtitles' }));
      throw new Error(err.detail || 'Failed to import subtitles');
    }
    return res.json();
  },

  async transcribeProject(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${id}/transcribe`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
      throw new Error(err.detail || 'Transcription failed');
    }
    return res.json();
  },

  async getPresets(): Promise<{ id: string; name: string; description: string; config: StyleConfig }[]> {
    const res = await fetch(`${API_BASE}/presets`);
    if (!res.ok) throw new Error('Failed to load presets');
    return res.json();
  },

  async getTemplates(): Promise<Template[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Failed to load templates');
    return res.json();
  },

  async recommendStyle(category: string): Promise<{ preset: string; reason: string; config: StyleConfig }> {
    const res = await fetch(`${API_BASE}/recommend-style/${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error('Failed to get recommendation');
    return res.json();
  },

  async startExport(id: string, quality: string = '1080p', captionQuality: string = 'high'): Promise<ExportJob> {
    const res = await fetch(`${API_BASE}/projects/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality, caption_quality: captionQuality }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || 'Failed to start export');
    }
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<ExportJob> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to get job status');
    return res.json();
  },

  async createDemoProject(): Promise<Project> {
    const res = await fetch(`${API_BASE}/demo/create-sample`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create demo project');
    return res.json();
  },
};
