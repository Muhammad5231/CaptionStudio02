import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, ChevronDown, ChevronUp, Type, Sparkles, Move, Sliders } from 'lucide-react';

export const CustomizeDrawer: React.FC = () => {
  const { currentProject, isCustomizeOpen, setCustomizeOpen, updateStyleConfig } = useProjectStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isCustomizeOpen || !currentProject) return null;

  const style = currentProject.style_config;

  const fontOptions = [
    'Inter',
    'Montserrat',
    'Impact',
    'Georgia',
    'Arial',
    'Roboto',
    'Helvetica',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setCustomizeOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Customize Caption</h2>
              </div>
              <button
                onClick={() => setCustomizeOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simple Category 1: Text */}
            <div className="py-5 border-b border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Type className="w-4 h-4 text-sky-400" />
                <span>Text</span>
              </div>

              {/* Font Family & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Font</label>
                  <select
                    value={style.font_family}
                    onChange={(e) => updateStyleConfig({ font_family: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sky-500 outline-none"
                  >
                    {fontOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Size</span>
                    <span className="text-slate-300">{style.font_size}px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="64"
                    value={style.font_size}
                    onChange={(e) => updateStyleConfig({ font_size: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Color & Uppercase */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Color</label>
                  <input
                    type="color"
                    value={style.text_color}
                    onChange={(e) => updateStyleConfig({ text_color: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">All Caps</label>
                  <input
                    type="checkbox"
                    checked={style.uppercase}
                    onChange={(e) => updateStyleConfig({ uppercase: e.target.checked })}
                    className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateStyleConfig({ alignment: align })}
                      className={`px-2 py-0.5 text-xs rounded capitalize transition ${
                        style.alignment === align
                          ? 'bg-sky-500 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Simple Category 2: Highlight */}
            <div className="py-5 border-b border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Active Word Highlight</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-400">Accent</label>
                  <input
                    type="color"
                    value={style.highlight_color}
                    onChange={(e) => updateStyleConfig({ highlight_color: e.target.value })}
                    className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              {/* Highlight Style Choice */}
              <div className="grid grid-cols-5 gap-1.5">
                {(['color', 'box', 'scale', 'underline', 'glow'] as const).map((hStyle) => (
                  <button
                    key={hStyle}
                    onClick={() => updateStyleConfig({ highlight_style: hStyle })}
                    className={`py-1.5 text-center text-xs rounded-lg border capitalize transition ${
                      style.highlight_style === hStyle
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {hStyle}
                  </button>
                ))}
              </div>

              {style.highlight_style === 'box' && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Badge Background Color</span>
                  <input
                    type="color"
                    value={style.highlight_bg_color || '#E11D48'}
                    onChange={(e) => updateStyleConfig({ highlight_bg_color: e.target.value })}
                    className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Simple Category 3: Word Animation */}
            <div className="py-5 border-b border-slate-800/80 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Animation
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(['none', 'smooth', 'pop', 'bounce', 'wave'] as const).map((anim) => (
                  <button
                    key={anim}
                    onClick={() => updateStyleConfig({ animation: anim })}
                    className={`py-1.5 text-center text-xs rounded-lg border capitalize transition ${
                      style.animation === anim
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {anim}
                  </button>
                ))}
              </div>
            </div>

            {/* Simple Category 4: Position & Background */}
            <div className="py-5 border-b border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Move className="w-4 h-4 text-emerald-400" />
                <span>Position</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateStyleConfig({ position: pos })}
                    className={`py-1.5 text-center text-xs rounded-lg border capitalize transition ${
                      style.position === pos
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {style.position !== 'center' && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Vertical Margin</span>
                    <span className="text-slate-300">{style.vertical_offset}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={style.vertical_offset}
                    onChange={(e) => updateStyleConfig({ vertical_offset: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Background Box */}
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1.5">Caption Backdrop</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'box', 'rounded_box'] as const).map((bg) => (
                    <button
                      key={bg}
                      onClick={() => updateStyleConfig({ background_style: bg })}
                      className={`py-1.5 text-center text-xs rounded-lg border capitalize transition ${
                        style.background_style === bg
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {bg.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PROGRESSIVE DISCLOSURE: Advanced Accordion */}
            <div className="py-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-2 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 flex items-center justify-between border border-slate-800 transition cursor-pointer"
              >
                <span>Advanced Controls</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                  {/* Outline Width */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Outline Thickness</span>
                      <span className="text-slate-300">{style.outline_width}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={style.outline_width}
                      onChange={(e) => updateStyleConfig({ outline_width: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Shadow Blur */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Shadow Blur</span>
                      <span className="text-slate-300">{style.shadow_blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      value={style.shadow_blur}
                      onChange={(e) => updateStyleConfig({ shadow_blur: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Letter Spacing</span>
                      <span className="text-slate-300">{style.letter_spacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="6"
                      value={style.letter_spacing}
                      onChange={(e) => updateStyleConfig({ letter_spacing: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Max words per line */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Target Words Per Segment</span>
                      <span className="text-slate-300">{style.max_words_per_line}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={style.max_words_per_line}
                      onChange={(e) => updateStyleConfig({ max_words_per_line: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Close CTA */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setCustomizeOpen(false)}
              className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
