import { create } from 'zustand';
import type { Project, CaptionSegment, StyleConfig, Word } from '../types/caption';
import { api } from '../services/api';

interface ProjectState {
  currentProject: Project | null;
  activeSegmentId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  saveStatus: 'saved' | 'saving' | 'error';
  
  // UI states
  isCustomizeOpen: boolean;
  isExportModalOpen: boolean;
  isUploadModalOpen: boolean;
  isAutoStyleOpen: boolean;
  activeLeftTab: 'transcript' | 'import' | 'translate';
  currentView: 'landing' | 'dashboard' | 'editor';

  // History for Undo / Redo
  history: Project[];
  future: Project[];

  // Actions
  setCurrentView: (view: 'landing' | 'dashboard' | 'editor') => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setActiveSegmentId: (id: string | null) => void;
  setActiveLeftTab: (tab: 'transcript' | 'import' | 'translate') => void;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  setCaptions: (captions: CaptionSegment[]) => void;
  
  // Modals / Drawers
  setCustomizeOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;
  setAutoStyleOpen: (open: boolean) => void;

  // Editor Actions
  applyPreset: (presetName: string, config: Partial<StyleConfig>) => void;
  updateStyleConfig: (config: Partial<StyleConfig>) => void;
  updateSegmentText: (segmentId: string, text: string) => void;
  updateSegmentTiming: (segmentId: string, start: number, end: number) => void;
  deleteSegment: (segmentId: string) => void;
  splitSegment: (segmentId: string, wordIndex: number) => void;
  mergeSegmentWithNext: (segmentId: string) => void;
  addSegment: (start: number, end: number, text: string) => void;

  // History Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  saveProject: () => Promise<void>;
}

let saveDebounceTimer: any = null;

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  activeSegmentId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
  saveStatus: 'saved',

  isCustomizeOpen: false,
  isExportModalOpen: false,
  isUploadModalOpen: false,
  isAutoStyleOpen: false,
  activeLeftTab: 'transcript',
  currentView: 'landing',

  history: [],
  future: [],

  setCurrentView: (view) => set({ currentView: view }),
  setCurrentProject: (project) => {
    let dur = project?.duration || 0;
    if (project?.captions && project.captions.length > 0) {
      const maxCapEnd = Math.max(...project.captions.map((c) => c.end || 0));
      if (maxCapEnd > dur) dur = Math.round((maxCapEnd + 0.5) * 10) / 10;
    }
    set({ currentProject: project, duration: dur, history: [], future: [] });
  },
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),

  setAspectRatio: (ratio) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();
    const updated = {
      ...currentProject,
      aspect_ratio: ratio,
    };
    set({ currentProject: updated });
    get().saveProject();
  },

  setCaptions: (captions) => {
    const { currentProject, pushHistory, duration } = get();
    if (!currentProject) return;
    pushHistory();
    let updatedDuration = duration;
    if (captions && captions.length > 0) {
      const maxCapEnd = Math.max(...captions.map((c) => c.end || 0));
      if (maxCapEnd > updatedDuration) {
        updatedDuration = Math.round((maxCapEnd + 0.5) * 10) / 10;
      }
    }
    set({
      currentProject: {
        ...currentProject,
        captions,
        duration: Math.max(currentProject.duration || 0, updatedDuration)
      },
      duration: updatedDuration,
    });
    get().saveProject();
  },

  setCustomizeOpen: (open) => set({ isCustomizeOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
  setAutoStyleOpen: (open) => set({ isAutoStyleOpen: open }),

  pushHistory: () => {
    const { currentProject, history } = get();
    if (!currentProject) return;
    set({
      history: [...history.slice(-20), JSON.parse(JSON.stringify(currentProject))],
      future: [],
    });
  },

  undo: () => {
    const { history, currentProject, future } = get();
    if (history.length === 0 || !currentProject) return;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      future: [JSON.parse(JSON.stringify(currentProject)), ...future],
      currentProject: prev,
    });
    get().saveProject();
  },

  redo: () => {
    const { future, currentProject, history } = get();
    if (future.length === 0 || !currentProject) return;
    const next = future[0];
    set({
      future: future.slice(1),
      history: [...history, JSON.parse(JSON.stringify(currentProject))],
      currentProject: next,
    });
    get().saveProject();
  },

  applyPreset: (presetName, config) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();
    const updated = {
      ...currentProject,
      style_preset: presetName,
      style_config: {
        ...currentProject.style_config,
        ...config,
      },
    };
    set({ currentProject: updated });
    get().saveProject();
  },

  updateStyleConfig: (configUpdates) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();
    const updated = {
      ...currentProject,
      style_config: {
        ...currentProject.style_config,
        ...configUpdates,
      },
    };
    set({ currentProject: updated });
    get().saveProject();
  },

  updateSegmentText: (segmentId, text) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();

    const newCaptions = currentProject.captions.map((seg) => {
      if (seg.id !== segmentId) return seg;
      const wordsArr = text.trim().split(/\s+/).filter(Boolean);
      const segDur = Math.max(0.2, seg.end - seg.start);
      const wordDur = segDur / Math.max(1, wordsArr.length);

      const words: Word[] = wordsArr.map((w, idx) => ({
        text: w,
        start: Number((seg.start + idx * wordDur).toFixed(3)),
        end: Number((seg.start + (idx + 1) * wordDur).toFixed(3)),
        confidence: 1.0,
      }));

      return {
        ...seg,
        text,
        words,
      };
    });

    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  updateSegmentTiming: (segmentId, start, end) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();

    const newCaptions = currentProject.captions.map((seg) => {
      if (seg.id !== segmentId) return seg;
      const segDur = Math.max(0.2, end - start);
      const wordDur = segDur / Math.max(1, seg.words.length);
      const words = seg.words.map((w, idx) => ({
        ...w,
        start: Number((start + idx * wordDur).toFixed(3)),
        end: Number((start + (idx + 1) * wordDur).toFixed(3)),
      }));

      return {
        ...seg,
        start,
        end,
        words,
      };
    });

    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  deleteSegment: (segmentId) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();
    const newCaptions = currentProject.captions.filter((seg) => seg.id !== segmentId);
    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  splitSegment: (segmentId, wordIndex) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    const segIndex = currentProject.captions.findIndex((s) => s.id === segmentId);
    if (segIndex === -1) return;
    const seg = currentProject.captions[segIndex];
    if (wordIndex <= 0 || wordIndex >= seg.words.length) return;

    pushHistory();
    const words1 = seg.words.slice(0, wordIndex);
    const words2 = seg.words.slice(wordIndex);

    const seg1: CaptionSegment = {
      id: `seg-${Date.now()}-1`,
      start: words1[0].start,
      end: words1[words1.length - 1].end,
      text: words1.map((w) => w.text).join(' '),
      words: words1,
    };

    const seg2: CaptionSegment = {
      id: `seg-${Date.now()}-2`,
      start: words2[0].start,
      end: words2[words2.length - 1].end,
      text: words2.map((w) => w.text).join(' '),
      words: words2,
    };

    const newCaptions = [
      ...currentProject.captions.slice(0, segIndex),
      seg1,
      seg2,
      ...currentProject.captions.slice(segIndex + 1),
    ];

    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  mergeSegmentWithNext: (segmentId) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    const segIndex = currentProject.captions.findIndex((s) => s.id === segmentId);
    if (segIndex === -1 || segIndex >= currentProject.captions.length - 1) return;

    pushHistory();
    const seg1 = currentProject.captions[segIndex];
    const seg2 = currentProject.captions[segIndex + 1];

    const merged: CaptionSegment = {
      id: seg1.id,
      start: seg1.start,
      end: seg2.end,
      text: `${seg1.text} ${seg2.text}`,
      words: [...seg1.words, ...seg2.words],
    };

    const newCaptions = [
      ...currentProject.captions.slice(0, segIndex),
      merged,
      ...currentProject.captions.slice(segIndex + 2),
    ];

    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  addSegment: (start, end, text) => {
    const { currentProject, pushHistory } = get();
    if (!currentProject) return;
    pushHistory();

    const wordsArr = text.trim().split(/\s+/).filter(Boolean);
    const dur = Math.max(0.2, end - start);
    const wordDur = dur / Math.max(1, wordsArr.length);

    const newSeg: CaptionSegment = {
      id: `seg-${Date.now()}`,
      start,
      end,
      text,
      words: wordsArr.map((w, idx) => ({
        text: w,
        start: Number((start + idx * wordDur).toFixed(3)),
        end: Number((start + (idx + 1) * wordDur).toFixed(3)),
        confidence: 1.0,
      })),
    };

    const newCaptions = [...currentProject.captions, newSeg].sort((a, b) => a.start - b.start);
    set({ currentProject: { ...currentProject, captions: newCaptions } });
    get().saveProject();
  },

  saveProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ saveStatus: 'saving' });
    clearTimeout(saveDebounceTimer);

    saveDebounceTimer = setTimeout(async () => {
      try {
        await api.updateProject(currentProject.id, {
          name: currentProject.name,
          style_preset: currentProject.style_preset,
          style_config: currentProject.style_config,
          captions: currentProject.captions,
        });
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Autosave error:', err);
        set({ saveStatus: 'error' });
      }
    }, 700);
  },
}));
