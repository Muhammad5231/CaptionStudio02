import React, { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { LeftSidebar } from '../components/studio/LeftSidebar';
import { CenterCanvas } from '../components/studio/CenterCanvas';
import { StyleInspector } from '../components/studio/StyleInspector';
import { ExportModal } from '../components/export/ExportModal';
import { AutoStyleModal } from '../components/styles/AutoStyleModal';
import { initGlobalFonts } from '../services/fontLoader';

export const EditorPage: React.FC = () => {
  const { currentProject, undo, redo, isPlaying, setIsPlaying } = useProjectStore();

  // Preload essential Google Web Fonts
  useEffect(() => {
    initGlobalFonts();
  }, []);

  // Global Studio Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isPlaying, setIsPlaying]);

  if (!currentProject) return null;

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#080C14] text-slate-100 flex overflow-hidden w-full select-none">
      {/* 1. Left Panel: Subtitles, Manual Ingestion (.srt/.vtt/.ass), & AI Translation */}
      <LeftSidebar />

      {/* 2. Center Panel: Production Viewport, Aspect Ratio Switcher, Live Canvas, & Timeline Scrubber */}
      <CenterCanvas />

      {/* 3. Right Panel: Style Inspector with 5 Viral Presets, Typography, Highlights, & Safe Zones */}
      <StyleInspector />

      {/* Modals */}
      <ExportModal />
      <AutoStyleModal />
    </div>
  );
};
