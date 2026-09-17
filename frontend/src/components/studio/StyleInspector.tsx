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
  Layers,
  Video,
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
    <aside className="w-90 min-w-80 max-w-100 h-full flex flex-col border-l border-slate-800/80 bg-slate-950/70 backdrop-blur-md select-none overflow-y-auto custom-scrollbar">
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
                      <Check className="w-2.5 h-2.5 stroke-3" />
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

        {/* SECTION: CHROMA KEY & CANVAS BACKGROUND */}
        <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chroma Key & Background</span>
            </div>
            {style.canvas_background_type === 'color' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Chroma Active
              </span>
            )}
          </div>

          {/* Background Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateStyleConfig({ canvas_background_type: 'video' })}
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                style.canvas_background_type !== 'color'
                  ? 'bg-sky-500/15 border-sky-500 text-sky-400 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Source</span>
            </button>

            <button
              onClick={() =>
                updateStyleConfig({
                  canvas_background_type: 'color',
                  canvas_background_color: style.canvas_background_color || '#00FF00',
                })
              }
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                style.canvas_background_type === 'color'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm"
                style={{ backgroundColor: style.canvas_background_color || '#00FF00' }}
              />
              <span>Solid / Chroma</span>
            </button>
          </div>

          {/* Color Selector & Presets (Active when Solid / Chroma is selected) */}
          {style.canvas_background_type === 'color' && (
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="text-[11px] font-semibold text-slate-300">
                Chroma Key Presets:
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Green Screen', hex: '#00FF00', sub: 'Chroma Key' },
                  { name: 'Black Screen', hex: '#000000', sub: 'Screen Blend' },
                  { name: 'Blue Screen', hex: '#0000FF', sub: 'Blue Key' },
                ].map((c) => {
                  const isSelected =
                    (style.canvas_background_color || '#00FF00').toUpperCase() === c.hex;
                  return (
                    <button
                      key={c.hex}
                      onClick={() => updateStyleConfig({ canvas_background_color: c.hex })}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-sky-400 ring-1 ring-sky-400/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px] font-bold text-white truncate">{c.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-mono">{c.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400">Custom Color:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.canvas_background_color || '#00FF00'}
                    onChange={(e) => updateStyleConfig({ canvas_background_color: e.target.value })}
                    className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer p-0"
                    title="Choose custom background color"
                  />
                  <input
                    type="text"
                    value={style.canvas_background_color || '#00FF00'}
                    onChange={(e) => updateStyleConfig({ canvas_background_color: e.target.value })}
                    className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 uppercase"
                  />
                </div>
              </div>

              {/* Editing Tip */}
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-300 leading-relaxed">
                💡 <span className="font-semibold text-emerald-200">Editor Tip:</span> Export with Green Screen, drop into <strong>CapCut</strong>, <strong>Premiere Pro</strong>, or <strong>DaVinci Resolve</strong>, and apply <em>Chroma Key</em> to remove the background!
              </div>
            </div>
          )}
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
