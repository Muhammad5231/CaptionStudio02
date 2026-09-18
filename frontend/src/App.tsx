import React, { useEffect } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { Header } from './components/common/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { AdminPage } from './pages/AdminPage';
import { UploadModal } from './components/upload/UploadModal';
import { AuthModal } from './components/auth/AuthModal';

export const App: React.FC = () => {
  const { currentView } = useProjectStore();
  const { theme } = useThemeStore();
  const { initAuth } = useAuthStore();

  // Initialize Auth state from localStorage
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Sync theme class to document root
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-sky-500 selection:text-slate-950 transition-colors duration-200 ${
        theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#080C14] text-slate-100'
      }`}
    >
      <Header />

      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'dashboard' && <DashboardPage />}
        {currentView === 'editor' && <EditorPage />}
        {currentView === 'admin' && <AdminPage />}
      </main>

      {/* Global Upload & Transcription Modal */}
      <UploadModal />

      {/* Global SaaS Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default App;
