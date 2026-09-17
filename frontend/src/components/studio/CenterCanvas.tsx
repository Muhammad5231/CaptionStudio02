import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Gauge,
  Smartphone,
  Monitor,
  Square,
  Undo2,
  Redo2,
  Sparkles,
  Download,
} from 'lucide-react';
import type { CaptionSegment, Word } from '../../types/caption';

export const CenterCanvas: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const {
    currentProject,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isPlaying,
    setIsPlaying,
    playbackRate,
    setPlaybackRate,
    setActiveSegmentId,
    setAspectRatio,
    undo,
    redo,
    history,
    future,
    setAutoStyleOpen,
    setExportModalOpen,
  } = useProjectStore();

  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const style = currentProject?.style_config;
  const aspectRatio = currentProject?.aspect_ratio || '9:16';
  const isChromaMode = style?.canvas_background_type === 'color' || !currentProject?.video_url;
  const lastTimeRef = useRef<number>(performance.now());

  // Sync isPlaying state with video element when video is present and active
  useEffect(() => {
    if (!videoRef.current || isChromaMode) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying, isChromaMode, setIsPlaying]);

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Smooth 60fps time sync (Dual engine: video-driven OR virtual clock for chroma/subtitle-only)
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimeRef.current) / 1000) * playbackRate;
      lastTimeRef.current = now;

      if (isChromaMode || !videoRef.current) {
        // Virtual clock for Chroma Key / Subtitle-Only projects
        const next = currentTimeRef.current + deltaSec;
        if (next >= duration) {
          setIsPlaying(false);
          currentTimeRef.current = 0;
          setCurrentTime(0);
        } else {
          currentTimeRef.current = next;
          setCurrentTime(next);
        }
      } else if (videoRef.current && !videoRef.current.paused) {
        const vid = videoRef.current;
        const vidTime = vid.currentTime;
        // If video ended but subtitles are longer (e.g. 5s video with 57s subtitles)
        if (vidTime >= (vid.duration - 0.1) && duration > (vid.duration + 0.5)) {
          const next = currentTimeRef.current + deltaSec;
          if (next >= duration) {
            setIsPlaying(false);
            currentTimeRef.current = 0;
            setCurrentTime(0);
          } else {
            currentTimeRef.current = next;
            setCurrentTime(next);
          }
        } else {
          currentTimeRef.current = vidTime;
          setCurrentTime(vidTime);
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isChromaMode, duration, playbackRate, setCurrentTime, setIsPlaying]);

  // Find active segment
  const activeSegment: CaptionSegment | null = useMemo(() => {
    if (!currentProject?.captions) return null;
    return (
      currentProject.captions.find(
        (seg) => currentTime >= seg.start && currentTime <= seg.end + 0.05
      ) || null
    );
  }, [currentProject?.captions, currentTime]);

  // Update activeSegmentId in store
  useEffect(() => {
    setActiveSegmentId(activeSegment?.id || null);
  }, [activeSegment, setActiveSegmentId]);

  // Find active word in active segment
  const activeWordIndex = useMemo(() => {
    if (!activeSegment || !activeSegment.words) return -1;
    return activeSegment.words.findIndex(
      (w) => currentTime >= w.start && currentTime <= w.end + 0.05
    );
  }, [activeSegment, currentTime]);

  const togglePlay = () => {
    if (isPlaying) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (currentTime >= duration && duration > 0) {
        setCurrentTime(0);
        if (videoRef.current) videoRef.current.currentTime = 0;
      }
      if (videoRef.current && !isChromaMode) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true));
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current && !isChromaMode) {
      const maxVid = videoRef.current.duration || 0;
      videoRef.current.currentTime = Math.min(val, maxVid);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (!currentProject) return null;

  // Compute container aspect ratio class
  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-w-85 max-h-[64vh]'
      : aspectRatio === '16:9'
      ? 'aspect-video max-w-155 max-h-[64vh]'
      : 'aspect-square max-w-115 max-h-[64vh]';

  // Dynamic style calculation for active words
  const getWordStyle = (isActive: boolean, isPast: boolean) => {
    if (!style) return {};
    const anim = style.animation || 'hormozi';

    if (isActive) {
      if (anim === 'hormozi') {
        return {
          color: style.highlight_color || '#FFE600',
          transform: 'scale(1.15)',
          display: 'inline-block',
          transition: 'transform 70ms cubic-bezier(0.34, 1.56, 0.64, 1), color 70ms ease',
        };
      } else if (anim === 'pop') {
        return {
          color: style.highlight_color || '#38EF7D',
          transform: 'scale(1.22)',
          display: 'inline-block',
          transition: 'transform 80ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        };
      } else if (anim === 'glow') {
        return {
          color: style.highlight_color || '#00F0FF',
          filter: 'drop-shadow(0 0 12px #00F0FF)',
          display: 'inline-block',
        };
      } else if (anim === 'karaoke') {
        return {
          color: style.highlight_color || '#38BDF8',
          display: 'inline-block',
        };
      }
      return {
        color: style.highlight_color || '#FFE600',
        display: 'inline-block',
      };
    }

    if (anim === 'karaoke') {
      return {
        color: isPast ? style.highlight_color || '#38BDF8' : '#94A3B8',
        display: 'inline-block',
      };
    }

    return {
      color: style.text_color || '#FFFFFF',
      display: 'inline-block',
    };
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#06090F] select-none h-full overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-13 border-b border-slate-800/80 bg-slate-950/60 px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="9:16 - Reels / Shorts / TikTok"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>

          <button
            onClick={() => setAspectRatio('16:9')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="16:9 - YouTube / Landscape"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>

          <button
            onClick={() => setAspectRatio('1:1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="1:1 - Square / Feed"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoStyleOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Style</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-linear-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Center Viewport Stage */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 min-h-0 relative overflow-hidden bg-dot-grid"
      >
        {/* Video Aspect Container */}
        <div
          className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center group`}
          style={
            isChromaMode
              ? { backgroundColor: style?.canvas_background_color || '#00FF00' }
              : undefined
          }
        >
          {/* Chroma Key Mode Badge */}
          {isChromaMode && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 pointer-events-none">
              <div
                className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: style?.canvas_background_color || '#00FF00' }}
              />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Chroma Key Mode
              </span>
            </div>
          )}

          {!isChromaMode && currentProject.video_url ? (
            <video
              ref={videoRef}
              src={currentProject.video_url}
              className="w-full h-full object-cover"
              playsInline
              muted={isMuted}
              onClick={togglePlay}
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                if (vid.duration && !isNaN(vid.duration)) {
                  // Only set duration if not already expanded by subtitles
                  if (vid.duration > duration) {
                    setDuration(vid.duration);
                  }
                }
              }}
              onEnded={() => {
                if (duration <= (videoRef.current?.duration || 0) + 0.5) {
                  setIsPlaying(false);
                }
              }}
            />
          ) : !isChromaMode ? (
            <div className="flex flex-col items-center justify-center p-6 text-slate-500 text-center">
              <Smartphone className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-xs font-semibold text-slate-400">No video uploaded yet</p>
              <p className="text-[11px] text-slate-600 mt-1">Upload a video or switch to Chroma Key mode</p>
            </div>
          ) : null}

          {/* Real-Time WYSIWYG Captions Overlay */}
          {activeSegment && style && (
            <div
              className={`absolute inset-x-0 px-4 pointer-events-none transition-all duration-100 flex flex-col ${
                style.alignment === 'left'
                  ? 'items-start text-left'
                  : style.alignment === 'right'
                  ? 'items-end text-right'
                  : 'items-center text-center'
              }`}
              style={{
                top:
                  style.position === 'top'
                    ? `${style.vertical_offset || 12}%`
                    : style.position === 'center'
                    ? '50%'
                    : 'auto',
                bottom: style.position === 'bottom' ? `${style.vertical_offset || 14}%` : 'auto',
                transform: style.position === 'center' ? 'translateY(-50%)' : undefined,
              }}
            >
              <div
                className={`max-w-[92%] px-3 py-1.5 transition-all duration-150 inline-block leading-snug select-none ${
                  style.background_style === 'box'
                    ? 'rounded-md shadow-lg'
                    : style.background_style === 'rounded_box'
                    ? 'rounded-2xl shadow-xl'
                    : ''
                }`}
                style={{
                  backgroundColor:
                    style.background_style !== 'none'
                      ? `${style.background_color || '#09090B'}${Math.round(
                          (style.background_opacity ?? 0.75) * 255
                        )
                          .toString(16)
                          .padStart(2, '0')}`
                      : 'transparent',
                  textShadow:
                    style.outline_width && style.outline_width > 0
                      ? `-${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color}, ${style.outline_width}px -${style.outline_width}px 0 ${style.outline_color}, -${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color}, ${style.outline_width}px ${style.outline_width}px 0 ${style.outline_color}, 0 ${style.shadow_blur || 4}px ${style.shadow_blur || 4}px ${style.shadow_color || 'rgba(0,0,0,0.8)'}`
                      : `0 ${style.shadow_blur || 4}px ${style.shadow_blur || 4}px ${style.shadow_color || 'rgba(0,0,0,0.8)'}`,
                }}
              >
                {activeSegment.words && activeSegment.words.length > 0 ? (
                  activeSegment.words.map((word: Word, idx: number) => {
                    const isActive = idx === activeWordIndex;
                    const isPast = activeWordIndex > -1 && idx < activeWordIndex;
                    const wordStyle = getWordStyle(isActive, isPast);
                    const wordText = style.uppercase ? word.text.toUpperCase() : word.text;

                    return (
                      <span
                        key={idx}
                        className="mx-1"
                        style={{
                          fontFamily: style.font_family || 'Montserrat',
                          fontSize: `${(style.font_size || 48) * 0.58}px`,
                          fontWeight:
                            style.font_weight === 'extra-bold'
                              ? 900
                              : style.font_weight === 'bold'
                              ? 700
                              : 500,
                          letterSpacing: `${style.letter_spacing || 0}px`,
                          ...wordStyle,
                        }}
                      >
                        {wordText}
                      </span>
                    );
                  })
                ) : (
                  <span
                    style={{
                      fontFamily: style.font_family || 'Montserrat',
                      fontSize: `${(style.font_size || 48) * 0.58}px`,
                      fontWeight: 700,
                      color: style.text_color || '#FFFFFF',
                    }}
                  >
                    {style.uppercase ? activeSegment.text.toUpperCase() : activeSegment.text}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Big Center Play Button overlay when paused */}
          {!isPlaying && (currentProject.video_url || isChromaMode) && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-950/70 border border-slate-700/80 hover:bg-sky-500 text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl backdrop-blur-sm cursor-pointer z-30"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Video Controls & Scrubber Timeline */}
      <div className="shrink-0 bg-slate-950/90 border-t border-slate-800/80 px-4 py-3 flex flex-col gap-2">
        {/* Interactive Scrub Bar with Cues */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:h-2.5 transition-all"
          />

          {/* Cue block markers along timeline */}
          {duration > 0 &&
            currentProject.captions?.map((seg) => {
              const leftPct = (seg.start / duration) * 100;
              const widthPct = Math.max(0.5, ((seg.end - seg.start) / duration) * 100);
              const isActive = currentTime >= seg.start && currentTime <= seg.end;
              return (
                <div
                  key={seg.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute h-2 rounded-full pointer-events-none transition-colors ${
                    isActive ? 'bg-sky-400' : 'bg-sky-500/30'
                  }`}
                />
              );
            })}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-slate-200 hover:text-white transition cursor-pointer p-1"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => {
                setCurrentTime(0);
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
              className="text-slate-400 hover:text-slate-200 transition cursor-pointer p-1"
              title="Replay from start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Gauge className="w-3 h-3" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col min-w-17.5">
                  {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`px-3 py-1 text-left text-xs hover:bg-slate-800 ${
                        playbackRate === rate ? 'text-sky-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
