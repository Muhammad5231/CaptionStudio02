import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Wand2, X, Check } from 'lucide-react';

export const AutoStyleModal: React.FC = () => {
  const { isAutoStyleOpen, setAutoStyleOpen, applyPreset } = useProjectStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<{ preset: string; reason: string; config: any } | null>(null);

  if (!isAutoStyleOpen) return null;

  const categories = [
    { id: 'motivational', name: 'Motivational / Gym', desc: 'Heavy contrast, bold pop emphasis' },
    { id: 'podcast', name: 'Podcast / Interview', desc: 'Clean, balanced conversational bar' },
    { id: 'gaming', name: 'Gaming / Twitch', desc: 'Punchy vibrant styling with bounce animation' },
    { id: 'educational', name: 'Educational / Tech', desc: 'Understated, readable sans-serif' },
    { id: 'cinematic', name: 'Cinematic / Film', desc: 'Warm golden glow, elegant serif pacing' },
    { id: 'social', name: 'Viral Reel / Shorts', desc: 'Fast-paced bold uppercase highlight' },
  ];

  const handleSelectCategory = async (catId: string) => {
    setSelectedCategory(catId);
    try {
      const rec = await api.recommendStyle(catId);
      setRecommendation(rec);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApply = () => {
    if (recommendation) {
      applyPreset(recommendation.preset, recommendation.config);
      setAutoStyleOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Auto Style</h3>
              <p className="text-xs text-slate-400">Choose your content theme for optimal captioning</p>
            </div>
          </div>

          <button
            onClick={() => setAutoStyleOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedCategory === cat.id
                  ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold text-slate-200">{cat.name}</span>
              <span className="text-[11px] text-slate-500 mt-1">{cat.desc}</span>
            </button>
          ))}
        </div>

        {/* Recommendation Result */}
        {recommendation && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Recommended Preset</span>
              <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {recommendation.preset}
              </span>
            </div>
            <p className="text-xs text-slate-300">{recommendation.reason}</p>

            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              <span>Apply {recommendation.preset} Style</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
