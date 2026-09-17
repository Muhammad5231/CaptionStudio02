import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Sparkles, Undo2, Redo2, Download, Video, FolderKanban, Wand2, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const {
    currentView,
    setCurrentView,
    currentProject,
    saveStatus,
    undo,
    redo,
    history,
    future,
    setExportModalOpen,
    setUploadModalOpen,
    setAutoStyleOpen,
  } = useProjectStore();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              CaptionStudio
            </span>
            <span className="text-[10px] text-sky-400 font-medium tracking-wide uppercase -mt-1">
              AI Video Engine
            </span>
          </div>
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'dashboard'
                ? 'bg-slate-800 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Projects
          </button>
          {currentProject && (
            <button
              onClick={() => setCurrentView('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'editor'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Editor
            </button>
          )}
        </nav>
      </div>

      {/* Editor Center Title & Autosave */}
      {currentView === 'editor' && currentProject && (
        <div className="hidden sm:flex items-center gap-3">
          <input
            type="text"
            value={currentProject.name}
            onChange={(e) => {
              const val = e.target.value;
              useProjectStore.setState((state) => ({
                currentProject: state.currentProject ? { ...state.currentProject, name: val } : null,
              }));
              useProjectStore.getState().saveProject();
            }}
            className="bg-transparent hover:bg-slate-900/60 focus:bg-slate-900 px-2.5 py-1 rounded-md text-sm font-medium text-slate-200 border border-transparent focus:border-slate-700 outline-none max-w-xs text-center transition-colors"
          />

          <span
            className={`text-xs px-2 py-0.5 rounded-full transition-opacity ${
              saveStatus === 'saving'
                ? 'text-amber-400 bg-amber-400/10'
                : saveStatus === 'saved'
                ? 'text-emerald-400/80 bg-emerald-400/10'
                : 'text-rose-400 bg-rose-400/10'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error saving'}
          </span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {currentView === 'editor' && (
          <>
            {/* Undo / Redo */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 mr-1">
              <button
                onClick={undo}
                disabled={history.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800 transition"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-800 transition"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* AI Auto Style Recommendation */}
            <button
              onClick={() => setAutoStyleOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5"
              title="Smart AI Style suggestions"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Style</span>
            </button>

            {/* Export CTA */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </>
        )}

        {currentView !== 'editor' && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Create Captions</span>
          </button>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};

