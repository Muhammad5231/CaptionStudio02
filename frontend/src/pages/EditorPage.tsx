import React, { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { VideoPreview } from '../components/preview/VideoPreview';
import { StylePresetCards } from '../components/styles/StylePresetCards';
import { CaptionTimeline } from '../components/timeline/CaptionTimeline';
import { CustomizeDrawer } from '../components/customize/CustomizeDrawer';
import { ExportModal } from '../components/export/ExportModal';
import { AutoStyleModal } from '../components/styles/AutoStyleModal';

export const EditorPage: React.FC = () => {
  const { currentProject, undo, redo, isPlaying, setIsPlaying } = useProjectStore();

  // Keyboard Shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo), Space (play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
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
    <div className="min-h-[calc(100vh-4rem)] bg-[#080C14] text-slate-100 flex flex-col items-center px-4 sm:px-6 py-6 space-y-4">
      {/* 1. Large Center Video Preview (The visual focus) */}
      <VideoPreview />

      {/* 2. Visual Style Preset Cards (Modern, Bold, Minimal, Viral, Cinematic, Clean) */}
      <StylePresetCards />

      {/* 3. Caption Transcript & Simple Timeline */}
      <CaptionTimeline />

      {/* Modals & Drawers */}
      <CustomizeDrawer />
      <ExportModal />
      <AutoStyleModal />
    </div>
  );
};
