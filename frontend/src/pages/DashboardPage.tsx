import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { api } from '../services/api';
import { Plus, Video, Copy, Trash2, Play, LayoutTemplate } from 'lucide-react';
import type { Project, Template } from '../types/caption';

export const DashboardPage: React.FC = () => {
  const { setCurrentProject, setCurrentView, setUploadModalOpen } = useProjectStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projs, tmpls] = await Promise.all([api.getProjects(), api.getTemplates()]);
      setProjects(projs);
      setTemplates(tmpls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.duplicateProject(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await api.deleteProject(id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      const proj = await api.createDemoProject();
      const updated = await api.updateProject(proj.id, {
        name: `${template.name} Video`,
        style_config: template.style_config as any,
      });
      setCurrentProject(updated);
      setCurrentView('editor');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSampleProject = async () => {
    try {
      const sample = await api.createDemoProject();
      setCurrentProject(sample);
      setCurrentView('editor');
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['All', 'Trending', 'Podcast', 'Motivational', 'Gaming', 'Cinematic', 'Business'];

  const filteredTemplates =
    selectedCategory === 'All'
      ? templates
      : templates.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col">
      <div className="max-w-6xl w-full mx-auto px-6 py-10 space-y-8 flex-1">
        {/* Header & Quick Launch Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              CaptionStudio Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your video captioning projects and original design templates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSampleProject}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-sky-400 fill-current" />
              <span>Try Sample Project</span>
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Caption</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-900 pb-1">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>My Projects ({projects.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Template Library</span>
          </button>
        </div>

        {/* Tab 1: Projects Grid */}
        {activeTab === 'projects' && (
          <div>
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading projects...</div>
            ) : projects.length === 0 ? (
              /* Empty State */
              <div className="py-20 flex flex-col items-center text-center space-y-4 border border-dashed border-slate-800/80 rounded-3xl bg-slate-950/40">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Your next caption starts here</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    No projects yet. Upload a video or load a sample video to create your first captioned video.
                  </p>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Captioned Video</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="group rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-sky-500/60 transition-all p-4 flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-sky-500/5 hover:-translate-y-1"
                  >
                    {/* Thumbnail Viewport */}
                    <div className="w-full aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden relative flex items-center justify-center mb-3">
                      {proj.video_url ? (
                        <video
                          src={proj.video_url}
                          className="w-full h-full object-cover pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-slate-700" />
                      )}

                      {/* Duration Tag */}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono font-medium text-slate-200">
                        {Math.round(proj.duration || 0)}s
                      </span>

                      {/* Style Preset Pill */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-sky-500/90 text-[10px] font-bold text-slate-950">
                        {proj.style_preset}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                        {proj.name}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>{proj.captions?.length || 0} segments</span>
                        <span>•</span>
                        <span>{new Date(proj.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-900 text-xs">
                      <span className="text-sky-400 font-semibold group-hover:underline">
                        Open Project →
                      </span>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={(e) => handleDuplicate(e, proj.id)}
                          className="p-1.5 hover:text-white rounded hover:bg-slate-900 transition"
                          title="Duplicate project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, proj.id)}
                          className="p-1.5 hover:text-rose-400 rounded hover:bg-slate-900 transition"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Templates Showcase */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 shadow-lg"
                >
                  {/* Preview Banner */}
                  <div className="w-full h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 text-center">
                    <span
                      className={`text-sm font-black ${
                        t.style_config.uppercase ? 'uppercase' : ''
                      }`}
                      style={{
                        fontFamily: t.style_config.font_family || 'Inter',
                        color: t.style_config.text_color || '#FFFFFF',
                      }}
                    >
                      {t.preview_text}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{t.name}</h4>
                      <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                  </div>

                  <button
                    onClick={() => handleUseTemplate(t)}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-sky-500 text-slate-300 hover:text-slate-950 font-bold text-xs transition"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
