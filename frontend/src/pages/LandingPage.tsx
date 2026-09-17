import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { api } from '../services/api';
import {
  Sparkles,
  Upload,
  Play,
  ArrowRight,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, setUploadModalOpen, setCurrentProject } = useProjectStore();

  const [activePresetDemo, setActivePresetDemo] = useState<'Modern' | 'Viral' | 'Cinematic' | 'Bold' | 'Clean' | 'Minimal'>('Viral');

  const demoStyles: Record<string, { textColor: string; highlightColor: string; bg: string; font: string; anim: string }> = {
    Modern: {
      textColor: '#FFFFFF',
      highlightColor: '#38BDF8',
      bg: 'transparent',
      font: 'Inter, sans-serif',
      anim: 'scale-105 text-sky-400 font-bold',
    },
    Viral: {
      textColor: '#FFFFFF',
      highlightColor: '#FACC15',
      bg: '#DC2626',
      font: 'Impact, sans-serif',
      anim: 'bg-red-600 text-yellow-300 px-2 py-0.5 rounded shadow-lg scale-110 font-black uppercase',
    },
    Cinematic: {
      textColor: '#FEF3C7',
      highlightColor: '#F59E0B',
      bg: 'transparent',
      font: 'Georgia, serif',
      anim: 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] font-bold',
    },
    Bold: {
      textColor: '#FFFFFF',
      highlightColor: '#4ADE80',
      bg: '#000000',
      font: 'Montserrat, sans-serif',
      anim: 'scale-110 text-emerald-400 font-black uppercase',
    },
    Clean: {
      textColor: '#FFFFFF',
      highlightColor: '#60A5FA',
      bg: 'transparent',
      font: 'Inter, sans-serif',
      anim: 'text-blue-400 underline decoration-4 underline-offset-4 font-bold',
    },
    Minimal: {
      textColor: '#E2E8F0',
      highlightColor: '#CBD5E1',
      bg: 'transparent',
      font: 'Inter, sans-serif',
      anim: 'text-slate-100 font-medium',
    },
  };

  const handleTestDrive = async () => {
    try {
      const sample = await api.createDemoProject();
      setCurrentProject(sample);
      setCurrentView('editor');
    } catch (err) {
      setUploadModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 bg-linear-to-tr from-sky-600/15 via-indigo-600/20 to-purple-600/10 blur-[130px] pointer-events-none rounded-full" />

        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-sky-400 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Professional AI Subtitle Engine • Simple by Design</span>
        </div>

        {/* Main Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-balance bg-linear-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Create Professional Captions in Minutes
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl text-balance">
          Upload your video, let AI generate frame-accurate word timing, pick a cinematic style preset, and export high-resolution video in one click.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition hover:scale-105 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Create Captions</span>
          </button>

          <button
            onClick={handleTestDrive}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-4 h-4 text-sky-400 fill-current" />
            <span>Try Sample Project</span>
          </button>
        </div>

        {/* Interactive Live Style Preview Widget */}
        <div className="mt-14 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl p-6 flex flex-col items-center">
          <div className="text-xs text-slate-400 font-medium mb-3">
            Interactive Style Switcher — Click a preset below to see it live:
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {(['Modern', 'Viral', 'Cinematic', 'Bold', 'Clean', 'Minimal'] as const).map((styleName) => (
              <button
                key={styleName}
                onClick={() => setActivePresetDemo(styleName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePresetDemo === styleName
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {styleName}
              </button>
            ))}
          </div>

          {/* Rendered Sentence Box */}
          <div className="w-full h-32 rounded-xl bg-[#030712] border border-slate-800/80 flex items-center justify-center p-4">
            <p
              className="text-lg sm:text-2xl font-bold tracking-wide transition-all"
              style={{
                fontFamily: demoStyles[activePresetDemo].font,
                color: demoStyles[activePresetDemo].textColor,
              }}
            >
              You don't need{' '}
              <span className={`inline-block mx-1 transition-all ${demoStyles[activePresetDemo].anim}`}>
                MOTIVATION
              </span>{' '}
              every day.
            </p>
          </div>
        </div>
      </section>

      {/* 3-STEP CORE PRODUCT MESSAGE */}
      <section className="py-16 px-6 bg-slate-950/50 border-y border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              Three Clicks. Ready to Publish.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Upload Video</h3>
              <p className="text-xs text-slate-400">
                Drag and drop your MP4, MOV, or WebM. AI speech recognition automatically extracts high-precision word timestamps.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Choose Style</h3>
              <p className="text-xs text-slate-400">
                Pick from professionally balanced style presets (Modern, Viral, Cinematic, Bold, Clean) with active-word animations.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Export & Download</h3>
              <p className="text-xs text-slate-400">
                Authoritative FFmpeg engine renders pixel-perfect burned-in captions up to 1080p Full HD in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Engine Power</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
            Built for Viral Content Creators
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80">
            <Zap className="w-6 h-6 text-amber-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Word-Level Synchronization</h4>
            <p className="text-xs text-slate-400">
              Captions pulse and bounce in perfect harmony with every spoken word at 60 frames per second.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80">
            <Layers className="w-6 h-6 text-sky-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Smart Phrase Grouping</h4>
            <p className="text-xs text-slate-400">
              No awkward line breaks or lonely orphan words. Sentences are formatted for optimal reading speed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80">
            <Shield className="w-6 h-6 text-emerald-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Zero Quality Loss</h4>
            <p className="text-xs text-slate-400">
              Hardware-accelerated libx264 encoding with crystal-clear vector fonts and high-bitrate audio.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-slate-950/60 border-t border-slate-900">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-xs font-bold text-white mb-1">Do I need video editing experience?</h4>
              <p className="text-xs text-slate-400">
                None at all. Just upload your video, pick a preset style, and export. Progressive disclosure hides complexity until you want it.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-xs font-bold text-white mb-1">Can I edit the generated text?</h4>
              <p className="text-xs text-slate-400">
                Yes. Click any caption on the timeline to edit wording, adjust start/end timestamps, or split and merge phrases.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-xs font-bold text-white mb-1">Can I import my existing SRT or VTT files?</h4>
              <p className="text-xs text-slate-400">
                Yes. CaptionStudio imports SRT, VTT, and TXT files, automatically generating smooth word-level timing if needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 text-center border-t border-slate-900">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-3xl font-extrabold text-white">Ready to elevate your captions?</h2>
          <p className="text-xs text-slate-400">
            Start creating high-engagement social video captions right now.
          </p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-8 py-3.5 rounded-xl bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 inline-flex items-center gap-2 transition hover:scale-105 cursor-pointer"
          >
            <span>Create Captions Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 CaptionStudio. Simple UX First • Python & FFmpeg Engine.</p>
      </footer>
    </div>
  );
};
