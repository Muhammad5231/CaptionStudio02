import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Sparkles,
  Undo2,
  Redo2,
  Download,
  Video,
  FolderKanban,
  Wand2,
  Sun,
  Moon,
  Shield,
  User as UserIcon,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout, setAuthModalOpen } = useAuthStore();
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

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-lg tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'editor'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Editor
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-rose-500/15 text-rose-400 font-semibold border border-rose-500/30'
                  : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Smart AI Style suggestions"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Style</span>
            </button>

            {/* Export CTA */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </>
        )}

        {currentView !== 'editor' && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
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

        {/* Auth / Profile Area */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 max-w-[100px] truncate">
                  {user.full_name || user.email.split('@')[0]}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {user.tier}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{user.full_name || 'User'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>

                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      setCurrentView('admin');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:bg-slate-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>My Projects</span>
                </button>

                <div className="my-1 border-t border-slate-800/80" />

                <button
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true, 'login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
