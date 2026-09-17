import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Play, Scissors, Merge, Trash2, Plus, Edit2, Clock, Sparkles, Loader2 } from 'lucide-react';
import type { CaptionSegment } from '../../types/caption';
import { api } from '../../services/api';

export const CaptionTimeline: React.FC = () => {
  const {
    currentProject,
    setCurrentTime,
    setIsPlaying,
    activeSegmentId,
    updateSegmentText,
    deleteSegment,
    splitSegment,
    mergeSegmentWithNext,
    addSegment,
  } = useProjectStore();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  if (!currentProject) return null;

  const captions = currentProject.captions || [];

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 py-3 select-none">
      {/* Header & Actions */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Caption Transcript & Timeline
          </span>
          <span className="text-[11px] text-slate-500">
            {captions.length} segments • Click any segment to jump & edit
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentProject.video_url && (
            <button
              onClick={async () => {
                try {
                  setIsTranscribing(true);
                  await api.transcribeProject(currentProject.id);
                  const updated = await api.getProject(currentProject.id);
                  useProjectStore.getState().setCurrentProject(updated);
                } catch (e: any) {
                  alert(e.message || "Failed to generate captions");
                } finally {
                  setIsTranscribing(false);
                }
              }}
              disabled={isTranscribing}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{captions.length === 0 ? "Generate AI Captions" : "Re-transcribe AI"}</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              const lastEnd = captions.length > 0 ? captions[captions.length - 1].end : 0;
              setNewStart(lastEnd.toFixed(1));
              setNewEnd((lastEnd + 2.0).toFixed(1));
              setNewText('');
              setShowAddModal(true);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Caption</span>
          </button>
        </div>
      </div>

      {/* Segment Cards List */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {captions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center flex flex-col items-center justify-center space-y-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-white">No captions in this project yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Click below to automatically transcribe speech from the video.</p>
            </div>
            {currentProject.video_url && (
              <button
                onClick={async () => {
                  try {
                    setIsTranscribing(true);
                    await api.transcribeProject(currentProject.id);
                    const updated = await api.getProject(currentProject.id);
                    useProjectStore.getState().setCurrentProject(updated);
                  } catch (e: any) {
                    alert(e.message || "Failed to generate captions");
                  } finally {
                    setIsTranscribing(false);
                  }
                }}
                disabled={isTranscribing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isTranscribing ? "Generating AI Captions..." : "Generate AI Captions Now"}</span>
              </button>
            )}
          </div>
        ) : (
          captions.map((seg, idx) => {
            const isActive = seg.id === activeSegmentId;
            const isEditing = seg.id === editingId;

            return (
              <div
                key={seg.id}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-slate-900/95 border-sky-500/80 shadow-md shadow-sky-500/5 ring-1 ring-sky-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Left: Play button, timestamps & Text */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => jumpToSegment(seg)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Play from this caption"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatTime(seg.start)}</span>
                    <span className="text-slate-600">→</span>
                    <span>{formatTime(seg.end)}</span>
                  </div>

                  {/* Caption Text or Inline Editor */}
                  <div className="flex-1 min-w-0 ml-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editText}
                          autoFocus
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(seg.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full bg-slate-900 border border-sky-500 rounded px-2.5 py-1 text-xs text-white outline-none"
                        />
                        <button
                          onClick={() => handleSaveEdit(seg.id)}
                          className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleStartEdit(seg)}
                        className="text-xs text-slate-200 font-medium truncate block cursor-text hover:text-sky-300 transition"
                        title="Click to edit text"
                      >
                        {seg.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions (Edit, Split, Merge, Delete) */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleStartEdit(seg)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-900 transition"
                    title="Edit text"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Split at halfway words */}
                  {seg.words && seg.words.length >= 2 && (
                    <button
                      onClick={() => splitSegment(seg.id, Math.floor(seg.words.length / 2))}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-900 transition"
                      title="Split caption"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Merge with next */}
                  {idx < captions.length - 1 && (
                    <button
                      onClick={() => mergeSegmentWithNext(seg.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-900 transition"
                      title="Merge with next caption"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteSegment(seg.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 transition"
                    title="Delete caption"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Segment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Add New Caption</h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Caption Text</label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter caption text..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Start Time (sec)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">End Time (sec)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newText.trim()) {
                    addSegment(parseFloat(newStart) || 0, parseFloat(newEnd) || 2.0, newText.trim());
                    setShowAddModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950"
              >
                Add Caption
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
