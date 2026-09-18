import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Download, X, CheckCircle2, AlertCircle, RefreshCw, Film, ExternalLink } from 'lucide-react';
import type { ExportJob } from '../../types/caption';

export const ExportModal: React.FC = () => {
  const { currentProject, isExportModalOpen, setExportModalOpen, setUploadModalOpen, activeTrackId } = useProjectStore();

  const [quality, setQuality] = useState<'1080p' | '720p' | 'original'>('1080p');
  const [captionQuality, setCaptionQuality] = useState<'high' | 'standard'>('high');
  const [isExporting, setIsExporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isExportModalOpen || !currentProject) return null;

  const saveBlobLocally = (blob: Blob, filename: string) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 15000);
  };

  const handleTriggerDownload = async () => {
    if (!job) return;
    setIsDownloading(true);
    setDownloadError(null);

    const filename =
      job.output_filename ||
      job.output_url?.split('/').pop() ||
      `captionstudio_${job.id.slice(0, 8)}.mp4`;

    try {
      // 1. Fetch file into client memory as Blob
      // Static media URL (/api/media/renders/...) is the most reliable endpoint
      const targetUrl = job.output_url || `/api/download/${job.id}`;
      const response = await fetch(targetUrl);

      if (!response.ok) {
        // Fallback to /api/download/:id
        const fallbackRes = await fetch(`/api/download/${job.id}`);
        if (!fallbackRes.ok) {
          throw new Error(`Download request returned ${fallbackRes.status}`);
        }
        const blob = await fallbackRes.blob();
        saveBlobLocally(blob, filename);
      } else {
        const blob = await response.blob();
        saveBlobLocally(blob, filename);
      }

      setHasDownloaded(true);
    } catch (err: any) {
      console.error('Blob download error, falling back to direct browser link:', err);
      setDownloadError('Direct save failed. Opening download stream...');
      const a = document.createElement('a');
      a.href = job.output_url || `/api/download/${job.id}`;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setHasDownloaded(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartExport = async () => {
    try {
      setIsExporting(true);
      setErrorMsg(null);
      setHasDownloaded(false);
      setDownloadError(null);

      const newJob = await api.startExport(currentProject.id, quality, captionQuality, activeTrackId || undefined);
      setJob(newJob);

      // Poll job status every 1.5 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await api.getJobStatus(newJob.id);
          setJob(status);

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            if (status.status === 'failed') {
              setErrorMsg(status.error || 'Rendering encountered an unexpected error.');
            }
          }
        } catch (err) {
          clearInterval(pollIntervalRef.current);
          setErrorMsg('Lost connection to render worker.');
        }
      }, 1500);
    } catch (err: any) {
      setIsExporting(false);
      setErrorMsg(err.message || 'Failed to start export');
    }
  };

  const handleCancelExport = async () => {
    if (!job) return;
    setIsCancelling(true);
    try {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      await api.cancelJob(job.id);
      setIsExporting(false);
      setJob(null);
    } catch (err: any) {
      console.error('Cancel export failed:', err);
      setErrorMsg(err.message || 'Failed to cancel render');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCreateAnother = () => {
    setExportModalOpen(false);
    setIsExporting(false);
    setJob(null);
    setHasDownloaded(false);
    setDownloadError(null);
    setUploadModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        {(!isExporting || job?.status === 'completed' || job?.status === 'failed') && (
          <button
            onClick={() => {
              setExportModalOpen(false);
              setIsExporting(false);
              setJob(null);
            }}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* State 1: Configuration Form */}
        {!isExporting && (
          <div className="space-y-6">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                <Film className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Export Video</h2>
              <p className="text-xs text-slate-400 mt-1">
                Render burned-in captions with authoritative font and word animations.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quality Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Video Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1080p', label: '1080p', sub: 'Full HD' },
                  { id: '720p', label: '720p', sub: 'Standard' },
                  { id: 'original', label: 'Original', sub: 'Source' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuality(q.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center transition ${
                      quality === q.id
                        ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold block">{q.label}</span>
                    <span className="text-[10px] text-slate-500 block">{q.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Quality */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Caption Rendering
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCaptionQuality('high')}
                  className={`py-2 px-3 rounded-xl border text-left transition ${
                    captionQuality === 'high'
                      ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold block">High Quality</span>
                  <span className="text-[10px] text-slate-500 block">Smooth word highlights</span>
                </button>
                <button
                  onClick={() => setCaptionQuality('standard')}
                  className={`py-2 px-3 rounded-xl border text-left transition ${
                    captionQuality === 'standard'
                      ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold block">Standard</span>
                  <span className="text-[10px] text-slate-500 block">Fast export</span>
                </button>
              </div>
            </div>

            {/* Export Action */}
            <button
              onClick={handleStartExport}
              className="w-full py-3 rounded-xl bg-linear-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer transition hover:scale-[1.01]"
            >
              <Download className="w-4 h-4" />
              <span>Export Video</span>
            </button>
          </div>
        )}

        {/* State 2: Live Progress Screen */}
        {isExporting && job?.status !== 'completed' && job?.status !== 'failed' && (
          <div className="py-6 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {job?.current_stage || 'Preparing your video...'}
              </h3>
              <p className="text-xs text-slate-400">
                Encoding high-resolution captions with FFmpeg backend engine.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-linear-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${job?.progress || 10}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Progress</span>
                <span className="text-sky-400 font-bold">{job?.progress || 10}%</span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancelExport}
              disabled={isCancelling}
              className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isCancelling ? 'Cancelling...' : 'Cancel Render'}</span>
            </button>
          </div>
        )}

        {/* State 3: Export Completed */}
        {isExporting && job?.status === 'completed' && (
          <div className="py-6 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Your video is ready!</h3>
              <p className="text-xs text-slate-400">
                Captions have been burned into the MP4 file with precise word timing.
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              {/* Primary Download Button with in-browser blob buffer */}
              <button
                onClick={handleTriggerDownload}
                disabled={isDownloading}
                className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.01] cursor-pointer select-none ${
                  isDownloading
                    ? 'bg-sky-600 text-white shadow-sky-500/20'
                    : hasDownloaded
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-500'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Saving video to your computer...</span>
                  </>
                ) : hasDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Saved to your computer! Click to download again</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Video (MP4)</span>
                  </>
                )}
              </button>

              {downloadError && (
                <p className="text-[11px] text-amber-400 text-center font-medium">{downloadError}</p>
              )}

              {/* Watch / Preview Video Button */}
              {job.output_url && (
                <a
                  href={job.output_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 text-xs font-semibold border border-slate-800 flex items-center justify-center gap-2 transition no-underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Video in New Tab</span>
                </a>
              )}

              {/* Direct static file download link */}
              {job.output_url && (
                <div className="text-center pt-0.5">
                  <a
                    href={job.output_url}
                    download={job.output_filename || job.output_url?.split('/').pop() || `captionstudio_${job.id.slice(0, 8)}.mp4`}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
                  >
                    Direct file link (right-click &quot;Save link as&quot;)
                  </a>
                </div>
              )}

              <button
                onClick={handleCreateAnother}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer mt-2"
              >
                Create Another Video
              </button>
            </div>
          </div>
        )}

        {/* State 4: Export Failed */}
        {isExporting && job?.status === 'failed' && (
          <div className="py-6 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">Export Failed</h3>
              <p className="text-xs text-rose-300">
                {job?.error || errorMsg || 'Unable to finalize video export.'}
              </p>
            </div>

            <button
              onClick={() => setIsExporting(false)}
              className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
