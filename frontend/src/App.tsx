import React from 'react';
import { useProjectStore } from './store/useProjectStore';
import { Header } from './components/common/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { UploadModal } from './components/upload/UploadModal';

export const App: React.FC = () => {
  const { currentView } = useProjectStore();

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      <Header />

      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'dashboard' && <DashboardPage />}
        {currentView === 'editor' && <EditorPage />}
      </main>

      {/* Global Upload & Transcription Modal */}
      <UploadModal />
    </div>
  );
};

export default App;
