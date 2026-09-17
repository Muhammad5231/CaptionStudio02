import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { SlidersHorizontal, Check } from 'lucide-react';
import type { StyleConfig } from '../../types/caption';

interface PresetItem {
  id: string;
  name: string;
  description: string;
  config: StyleConfig;
}

export const StylePresetCards: React.FC = () => {
  const { currentProject, applyPreset, setCustomizeOpen } = useProjectStore();
  const [presets, setPresets] = useState<PresetItem[]>([]);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(console.error);
  }, []);

  if (!currentProject) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 py-4">
      {/* Bar Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Caption Styles
          </span>
          <span className="text-[11px] text-slate-500">
            One-click presets with word animations
          </span>
        </div>

        <button
          onClick={() => setCustomizeOpen(true)}
          className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
          <span>Customize</span>
        </button>
      </div>

      {/* 6 Core Presets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {presets.map((preset) => {
          const isSelected = currentProject.style_preset === preset.id;
          const cfg = preset.config;

          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id, cfg)}
              className={`relative flex flex-col items-center justify-between p-3 rounded-xl border transition-all duration-200 text-center cursor-pointer group select-none ${
                isSelected
                  ? 'bg-slate-900 border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Mini Preview Box */}
              <div className="w-full h-14 rounded-lg bg-slate-950/90 border border-slate-800/80 flex items-center justify-center p-1.5 mb-2 overflow-hidden">
                <span
                  className={`text-xs font-bold leading-tight ${
                    cfg.uppercase ? 'uppercase' : ''
                  }`}
                  style={{
                    fontFamily: cfg.font_family || 'Inter',
                    color: cfg.text_color || '#FFFFFF',
                  }}
                >
                  Make it{' '}
                  <span
                    className={`inline-block transition-transform ${
                      cfg.highlight_style === 'box'
                        ? 'px-1 rounded text-white'
                        : ''
                    }`}
                    style={{
                      color:
                        cfg.highlight_style === 'box'
                          ? '#FFFFFF'
                          : cfg.highlight_color,
                      backgroundColor:
                        cfg.highlight_style === 'box'
                          ? cfg.highlight_bg_color
                          : 'transparent',
                      textDecoration:
                        cfg.highlight_style === 'underline'
                          ? 'underline'
                          : 'none',
                    }}
                  >
                    POP
                  </span>
                </span>
              </div>

              {/* Name & Short description */}
              <span
                className={`text-xs font-semibold tracking-wide transition-colors ${
                  isSelected ? 'text-sky-400' : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
