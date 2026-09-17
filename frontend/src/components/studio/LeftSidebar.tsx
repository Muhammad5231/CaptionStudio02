import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import {
  FileText,
  UploadCloud,
  Languages,
  Sparkles,
  Loader2,
  Trash2,
  Scissors,
  Merge,
  Plus,
  Edit2,
  Check,
  Globe2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import type { CaptionSegment } from '../../types/caption';

export const LeftSidebar: React.FC = () => {
  const {
    currentProject,
    activeSegmentId,
    setCurrentTime,
    setIsPlaying,
    updateSegmentText,
    deleteSegment,
    splitSegment,
    mergeSegmentWithNext,
    addSegment,
    setCaptions,
    setDuration,
    activeLeftTab,
    setActiveLeftTab,
  } = useProjectStore();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Add Segment state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  // Subtitle File Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Translation & Multilingual AI state
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('hi');
  const [sourceLang] = useState('auto');
  const [transcribeLang, setTranscribeLang] = useState('auto');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [translateSuccessMsg, setTranslateSuccessMsg] = useState<string | null>(null);

  if (!currentProject) return null;

  const captions = currentProject.captions || [];

  const filteredCaptions = captions.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleStartEdit = (seg: CaptionSegment) => {
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const handleSaveEdit = (segId: string) => {
    if (editText.trim()) {
      updateSegmentText(segId, editText.trim());
    }
    setEditingId(null);
  };

  const jumpToSegment = (seg: CaptionSegment) => {
    setCurrentTime(seg.start);
    setIsPlaying(true);
  };

  // Subtitle File Import Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportError(null);
      setImportStatus('Parsing subtitles & interpolating word timings...');

      const result = await api.importSubtitles(currentProject.id, file);
      if (result.captions && result.captions.length > 0) {
        setCaptions(result.captions);
        if (result.duration) {
          setDuration(result.duration);
        }
        setImportStatus(`Successfully imported ${result.segment_count} segments (${(result.format || 'SRT').toUpperCase()})`);
        setActiveLeftTab('transcript');
      } else {
        setImportError('No subtitle segments found in file.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import subtitle file');
    } finally {
      setIsImporting(false);
      // Reset input value so same file can be re-uploaded
      e.target.value = '';
    }
  };

  // Translation Handler
  const handleTranslate = async () => {
    try {
      setIsTranslating(true);
      setTranslateSuccessMsg(null);
      setImportError(null);

      const res = await api.translateCaptions(currentProject.id, targetLang, sourceLang);
      if (res.captions && res.captions.length > 0) {
        setCaptions(res.captions);
        setTranslateSuccessMsg(`Captions translated to ${targetLang.toUpperCase()} (${res.engine_used || 'Neural Engine'})`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Multilingual Re-transcription Handler
  const handleTranscribe = async () => {
    try {
      setIsTranscribing(true);
      setImportError(null);
      await api.transcribeProject(currentProject.id, transcribeLang);
      const updated = await api.getProject(currentProject.id);
      useProjectStore.getState().setCurrentProject(updated);
    } catch (err: any) {
      setImportError(err.message || 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <aside className="w-95 min-w-85 max-w-105 h-full flex flex-col border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-md select-none">
      {/* 3 Tab Switcher */}
      <div className="flex border-b border-slate-800/80 bg-slate-900/50 p-1.5 gap-1">
        <button
          onClick={() => setActiveLeftTab('transcript')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeLeftTab === 'transcript'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Subtitles</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
            {captions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveLeftTab('import')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeLeftTab === 'import'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <button
          onClick={() => setActiveLeftTab('translate')}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeLeftTab === 'translate'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>AI / Translate</span>
        </button>
      </div>

      {/* TAB 1: TRANSCRIPT */}
      {activeLeftTab === 'transcript' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-header with search and add segment */}
          <div className="p-3 border-b border-slate-800/60 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search captions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 outline-none"
            />
            <button
              onClick={() => {
                setNewStart('0.0');
                setNewEnd('2.0');
                setNewText('');
                setShowAddModal(true);
              }}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Add Segment"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Caption Segments List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredCaptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <FileText className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No captions found</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  Import an SRT/VTT file or generate with Multilingual AI
                </p>
              </div>
            ) : (
              filteredCaptions.map((seg, idx) => {
                const isActive = activeSegmentId === seg.id;
                const isEditing = editingId === seg.id;

                return (
                  <div
                    key={seg.id}
                    className={`group relative rounded-xl border p-2.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-950/30 border-sky-500/60 ring-1 ring-sky-500/30 shadow-md'
                        : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Timestamp Header */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <button
                        onClick={() => jumpToSegment(seg)}
                        className="font-mono text-sky-400/90 hover:text-sky-300 font-semibold cursor-pointer"
                      >
                        {formatTime(seg.start)} - {formatTime(seg.end)}
                      </button>

                      {/* Action buttons (Show on hover or active) */}
                      <div className="opacity-70 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(seg)}
                          className="p-1 hover:text-white text-slate-400 rounded hover:bg-slate-800 transition"
                          title="Edit text"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {idx < captions.length - 1 && (
                          <button
                            onClick={() => mergeSegmentWithNext(seg.id)}
                            className="p-1 hover:text-white text-slate-400 rounded hover:bg-slate-800 transition"
                            title="Merge with next segment"
                          >
                            <Merge className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSegment(seg.id)}
                          className="p-1 hover:text-red-400 text-slate-400 rounded hover:bg-slate-800 transition"
                          title="Delete segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Content / Edit Box */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(seg.id);
                            }
                          }}
                          autoFocus
                          rows={2}
                          className="w-full bg-slate-950 border border-sky-500 rounded-lg p-2 text-xs text-white focus:outline-none resize-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(seg.id)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        onClick={() => jumpToSegment(seg)}
                        className="text-xs text-slate-200 font-medium leading-relaxed cursor-pointer"
                      >
                        {seg.text}
                      </p>
                    )}

                    {/* Word tags for quick splitting */}
                    {seg.words && seg.words.length > 1 && !isEditing && (
                      <div className="mt-2 pt-2 border-t border-slate-800/40 flex flex-wrap gap-1">
                        {seg.words.map((w, wIdx) => (
                          <span
                            key={wIdx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/70 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 transition cursor-default group/word relative"
                          >
                            {w.text}
                            {wIdx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  splitSegment(seg.id, wIdx);
                                }}
                                className="hidden group-hover/word:inline-block ml-1 text-sky-400 hover:text-sky-300"
                                title={`Split before "${w.text}"`}
                              >
                                <Scissors className="w-2.5 h-2.5 inline" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL SUBTITLE IMPORT */}
      {activeLeftTab === 'import' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              <span>Import Subtitles</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload existing subtitles from Adobe Premiere, CapCut, YouTube, or Aegisub.
            </p>
          </div>

          {/* Supported Formats Grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { format: '.SRT', desc: 'SubRip' },
              { format: '.VTT', desc: 'WebVTT' },
              { format: '.ASS', desc: 'Karaoke / SSA' },
            ].map((f) => (
              <div
                key={f.format}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center"
              >
                <div className="text-xs font-mono font-bold text-sky-400">{f.format}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Upload Drop Zone */}
          <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group">
            <input
              type="file"
              accept=".srt,.vtt,.ass,.ssa,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isImporting}
            />
            {isImporting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                <span className="text-xs font-medium text-slate-300">
                  {importStatus || 'Importing...'}
                </span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Click or drag & drop</span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Supports .srt, .vtt, .ass, and .txt files
                </span>
                <span className="text-[10px] text-sky-400/80 mt-2 font-medium">
                  Auto-interpolates word-level timestamps
                </span>
              </>
            )}
          </label>

          {/* Feedback & Error Alerts */}
          {importStatus && !isImporting && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300">How word interpolation works:</div>
            <p>
              Even if your .srt or .vtt only has phrase timestamps, CaptionStudio proportionally
              calculates word-level timestamps based on phonetic length. This powers Alex Hormozi
              and MrBeast bouncy word pop animations immediately!
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: AI TRANSLATION & MULTILINGUAL WHISPER */}
      {activeLeftTab === 'translate' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-5">
          {/* Multilingual Translation Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-400" />
                <span>Video Translation Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Translate your captions while strictly preserving word timings and short-form punchiness.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none cursor-pointer"
              >
                <option value="hi">Hindi (हिंदी - Devanagari)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="hinglish">Hinglish (Hindi in Roman Latin script)</option>
                <option value="en">English (US / UK)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
              </select>
            </div>

            <button
              onClick={handleTranslate}
              disabled={isTranslating || captions.length === 0}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Translating Captions...</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>Translate All Captions</span>
                </>
              )}
            </button>

            {translateSuccessMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{translateSuccessMsg}</span>
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Multilingual Speech-to-Text Transcription */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Multilingual Speech-to-Text</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Transcribe with faster-whisper (large-v3) vocabulary priming for code-switching.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Spoken Language</label>
              <select
                value={transcribeLang}
                onChange={(e) => setTranscribeLang(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-400 outline-none cursor-pointer"
              >
                <option value="auto">Auto Detect Language</option>
                <option value="hinglish">Hinglish (Hindi + English)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="en">English</option>
              </select>
            </div>

            {currentProject.video_url && (
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-400 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Running faster-whisper AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transcribe Video with AI</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Segment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">Add New Caption Segment</h4>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Start (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">End (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Caption Text</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter caption line..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const s = parseFloat(newStart);
                  const e = parseFloat(newEnd);
                  if (!isNaN(s) && !isNaN(e) && newText.trim()) {
                    addSegment(s, e, newText.trim());
                    setShowAddModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-500 text-slate-950 hover:bg-sky-400"
              >
                Add Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
