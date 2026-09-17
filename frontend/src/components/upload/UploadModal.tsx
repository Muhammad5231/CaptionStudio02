import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { api } from '../../services/api';
import { Upload, FileText, Video, CheckCircle2, Loader2, Circle, AlertCircle, X, Sparkles } from 'lucide-react';

export const UploadModal: React.FC = () => {
  const { isUploadModalOpen, setUploadModalOpen, setCurrentProject, setCurrentView } = useProjectStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const steps = [
    'Uploading video',
    'Analyzing audio',
    'Generating captions',
    'Creating word timing',
    'Preparing preview',
  ];

  const handleVideoUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setCurrentStep(0); // Uploading video

      // 1. Create a project
      const project = await api.createProject(file.name.replace(/\.[^/.]+$/, ''), 'Modern');

      // 2. Upload the video file
      setCurrentStep(1); // Analyzing audio
      await api.uploadVideo(project.id, file);

      // 3. Transcribe with AI
      setCurrentStep(2); // Generating captions
      try {
        await api.transcribeProject(project.id);
      } catch (transcribeErr: any) {
        console.warn("Initial transcription warning:", transcribeErr);
      }

      setCurrentStep(3); // Creating word timing
      await new Promise((r) => setTimeout(r, 400));

      setCurrentStep(4); // Preparing preview
      await new Promise((r) => setTimeout(r, 400));

      // 4. Fetch full updated project and open editor
      const updatedProject = await api.getProject(project.id);
      setCurrentProject(updatedProject);
      setIsProcessing(false);
      setUploadModalOpen(false);
      setCurrentView('editor');
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(
        err.message || "We couldn't upload this video. Please check that the file is a supported MP4, MOV, or WebM video."
      );
    }
  };

  const handleSubtitleUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setCurrentStep(0);

      // Create a demo or new project with subtitles
      const project = await api.createDemoProject();
      await api.uploadSubtitles(project.id, file);

      const updated = await api.getProject(project.id);
      setCurrentProject(updated);
      setIsProcessing(false);
      setUploadModalOpen(false);
      setCurrentView('editor');
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to import subtitle file.');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['srt', 'vtt', 'txt'].includes(ext || '')) {
        handleSubtitleUpload(file);
      } else {
        handleVideoUpload(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={() => setUploadModalOpen(false)}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {isProcessing ? (
          /* Processing Multi-Stage Screen */
          <div className="py-6 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Generating your captions...</h3>
              <p className="text-xs text-slate-400">
                Our speech engine is analyzing words and synchronizing frame timings.
              </p>
            </div>

            {/* Step Indicators */}
            <div className="w-full max-w-xs space-y-3 text-left">
              {steps.map((label, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={label} className="flex items-center justify-between text-xs py-1">
                    <span
                      className={`font-medium ${
                        isCompleted
                          ? 'text-slate-300'
                          : isCurrent
                          ? 'text-sky-400 font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {label}
                    </span>

                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Upload Card */
          <div className="flex flex-col items-center text-center space-y-6">
            <div>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-sky-500/20">
                <Video className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Upload Your Video</h2>
              <p className="text-xs text-slate-400 mt-1">
                AI will automatically transcribe speech and generate animated captions.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-left text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Drag & Drop Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => videoInputRef.current?.click()}
              className={`w-full py-10 px-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group ${
                isDragging
                  ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
              }`}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleVideoUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:scale-110 transition-all mb-3">
                <Upload className="w-6 h-6 text-sky-400" />
              </div>

              <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                Drag & drop your video here
              </span>
              <span className="text-xs text-slate-400 mt-1">
                or <span className="text-sky-400 font-medium">browse files</span> on your device
              </span>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                <span>MP4</span> • <span>MOV</span> • <span>WEBM</span>
              </div>
            </div>

            {/* Subtitle Import Secondary Option */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
              <span className="text-slate-500">Already have subtitles?</span>
              <button
                onClick={() => subtitleInputRef.current?.click()}
                className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Upload Subtitle File (SRT, VTT)</span>
              </button>
              <input
                ref={subtitleInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSubtitleUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

