import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { loadGoogleFont, FONT_MAP } from '../../services/fontLoader';
import {
  Sliders,
  Type,
  Palette,
  Move,
  Check,
  Box,
  Flame,
} from 'lucide-react';
import type { StyleConfig } from '../../types/caption';

interface PresetItem {
  id: string;
  name: string;
  description: string;
  config: StyleConfig;
}

export const StyleInspector: React.FC = () => {
  const { currentProject, applyPreset, updateStyleConfig } = useProjectStore();
  const [presets, setPresets] = useState<PresetItem[]>([]);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(console.error);
  }, []);

  if (!currentProject) return null;

  const style = currentProject.style_config;
  const currentPreset = currentProject.style_preset;

  const handleFontChange = (newFont: string) => {
    loadGoogleFont(newFont);
    updateStyleConfig({ font_family: newFont });
  };

  return (
    <aside className="w-[360px] min-w-[320px] max-w-[400px] h-full flex flex-col border-l border-slate-800/80 bg-slate-950/70 backdrop-blur-md select-none overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Style Inspector</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
          {currentPreset || 'Custom'}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* SECTION 1: VIRAL PRESET CARDS */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Viral Style Presets</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isSelected = currentPreset === preset.id;
              const cfg = preset.config;

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (cfg.font_family) loadGoogleFont(cfg.font_family);
                    applyPreset(preset.id, cfg);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all relative group cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="text-xs font-bold text-white truncate pr-4">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {preset.description}
                  </div>

                  {/* Visual sample chip */}
                  <div className="mt-2 py-1 px-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                    <span
                      className={`text-[11px] font-bold ${cfg.uppercase ? 'uppercase' : ''}`}
                      style={{
                        fontFamily: cfg.font_family || 'Montserrat',
                        color: cfg.text_color || '#FFFFFF',
                      }}
                    >
                      Make it{' '}
                      <span style={{ color: cfg.highlight_color || '#FFE600' }}>Pop</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: TYPOGRAPHY */}
        <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>Typography & Font</span>
          </div>

          {/* Font Picker */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Font Family</label>
            <select
              value={style.font_family}
              onChange={(e) => handleFontChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 outline-none cursor-pointer"
            >
              {Object.keys(FONT_MAP).map((fName) => (
                <option key={fName} value={fName}>
                  {FONT_MAP[fName].label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Size</span>
                <span className="text-slate-200 font-mono">{style.font_size}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="72"
                value={style.font_size}
                onChange={(e) => updateStyleConfig({ font_size: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Weight</label>
              <select
                value={style.font_weight}
                onChange={(e) => updateStyleConfig({ font_weight: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-sky-500 outline-none cursor-pointer"
              >
                <option value="normal">Regular</option>
                <option value="bold">Bold (700)</option>
                <option value="extra-bold">Black (900)</option>
              </select>
            </div>
          </div>

          {/* Uppercase & Max Words */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={style.uppercase}
                onChange={(e) => updateStyleConfig({ uppercase: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span>ALL CAPS (Uppercase)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Words/line</span>
              <select
                value={style.max_words_per_line || 3}
                onChange={(e) => updateStyleConfig({ max_words_per_line: parseInt(e.target.value) })}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: COLORS & ACTIVE WORD HIGHLIGHT */}
        <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span>Colors & Word Highlights</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Primary Text Color */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Text Color</label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5">
                <input
                  type="color"
                  value={style.text_color}
                  onChange={(e) => updateStyleConfig({ text_color: e.target.value })}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={style.text_color}
                  onChange={(e) => updateStyleConfig({ text_color: e.target.value })}
                  className="w-full bg-transparent text-xs text-slate-200 uppercase outline-none font-mono"
                />
              </div>
            </div>

            {/* Active Word Highlight Color */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Highlight Color</label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5">
                <input
                  type="color"
                  value={style.highlight_color}
                  onChange={(e) => updateStyleConfig({ highlight_color: e.target.value })}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={style.highlight_color}
                  onChange={(e) => updateStyleConfig({ highlight_color: e.target.value })}
                  className="w-full bg-transparent text-xs text-slate-200 uppercase outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Highlight Animation Mode */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Active Word Effect</label>
            <select
              value={style.animation || 'hormozi'}
              onChange={(e) => updateStyleConfig({ animation: e.target.value as any })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:border-sky-500 outline-none cursor-pointer"
            >
              <option value="hormozi">Hormozi Scale Pop (115% spring)</option>
              <option value="pop">MrBeast Bounce (122% high-energy)</option>
              <option value="glow">Neon Aura Glow (Cyan blur)</option>
              <option value="karaoke">Karaoke Progressive Fill</option>
              <option value="smooth">Smooth Color Highlight</option>
            </select>
          </div>
        </div>

        {/* SECTION 4: OUTLINES & BACKGROUND BOX */}
        <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Box className="w-3.5 h-3.5 text-sky-400" />
            <span>Backdrop & Border</span>
          </div>

          {/* Background Style */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'none', label: 'None' },
              { id: 'box', label: 'Solid Box' },
              { id: 'rounded_box', label: 'Rounded Pill' },
            ].map((bg) => (
              <button
                key={bg.id}
                onClick={() => updateStyleConfig({ background_style: bg.id as any })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  style.background_style === bg.id
                    ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>

          {/* Outline Stroke Width */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Text Outline Stroke</span>
              <span className="text-slate-200 font-mono">{style.outline_width || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              value={style.outline_width || 0}
              onChange={(e) => updateStyleConfig({ outline_width: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Shadow Blur */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Shadow / Glow Blur</span>
              <span className="text-slate-200 font-mono">{style.shadow_blur || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={style.shadow_blur || 0}
              onChange={(e) => updateStyleConfig({ shadow_blur: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 5: POSITIONING */}
        <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Move className="w-3.5 h-3.5 text-sky-400" />
            <span>Placement & Safe Zone</span>
          </div>

          {/* Position Selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'top', label: 'Top' },
              { id: 'center', label: 'Center' },
              { id: 'bottom', label: 'Bottom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => updateStyleConfig({ position: p.id as any })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  style.position === p.id
                    ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Vertical Offset Slider */}
          {style.position !== 'center' && (
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Vertical Offset</span>
                <span className="text-slate-200 font-mono">{style.vertical_offset}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="35"
                value={style.vertical_offset}
                onChange={(e) => updateStyleConfig({ vertical_offset: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
