import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Gauge } from 'lucide-react';
import type { CaptionSegment, Word } from '../../types/caption';

export const VideoPreview: React.FC = () => {
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
  } = useProjectStore();

  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Sync isPlaying state with video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Ultra-smooth 60fps time sync during playback
  useEffect(() => {
    const tick = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
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
  }, [isPlaying, setCurrentTime]);

  const style = currentProject?.style_config;

  // Find active segment
  const activeSegment: CaptionSegment | null = useMemo(() => {
    if (!currentProject?.captions) return null;
    return (
      currentProject.captions.find(
        (seg) => currentTime >= seg.start && currentTime <= seg.end + 0.1
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
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!currentProject) return null;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group"
    >
      {/* Video & Caption Viewport */}
      <div className="relative w-full aspect-video flex items-center justify-center bg-black overflow-hidden select-none">
        {currentProject.video_url ? (
          <video
            ref={videoRef}
            src={currentProject.video_url}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            playsInline
            muted={isMuted}
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration || 0;
              setDuration(dur);
            }}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <span>No video uploaded yet</span>
          </div>
        )}

        {/* Live Synchronized Caption Overlay */}
        {activeSegment && style && (
          <div
            className={`absolute left-0 right-0 px-6 flex pointer-events-none transition-all duration-75 ${
              style.position === 'top'
                ? 'top-8 justify-center'
                : style.position === 'center'
                ? 'top-1/2 -translate-y-1/2 justify-center'
                : 'bottom-12 justify-center'
            }`}
            style={{
              marginBottom:
                style.position === 'bottom' ? `${style.vertical_offset || 14}%` : undefined,
              marginTop:
                style.position === 'top' ? `${style.vertical_offset || 10}%` : undefined,
            }}
          >
            <div
              className={`inline-flex flex-wrap items-center justify-center text-center transition-all ${
                style.background_style === 'rounded_box'
                  ? 'px-4 py-2 rounded-xl backdrop-blur-sm'
                  : style.background_style === 'box'
                  ? 'px-3 py-1.5 rounded'
                  : ''
              }`}
              style={{
                backgroundColor:
                  style.background_style !== 'none'
                    ? style.background_color || '#000000'
                    : 'transparent',
                opacity: style.background_style !== 'none' ? style.background_opacity || 0.7 : 1,
              }}
            >
              {activeSegment.words && activeSegment.words.length > 0 ? (
                activeSegment.words.map((word: Word, idx: number) => {
                  const isActive = idx === activeWordIndex;
                  const wordText = style.uppercase ? word.text.toUpperCase() : word.text;

                  // Determine animation class
                  let animClass = '';
                  if (isActive) {
                    if (style.animation === 'pop') animClass = 'anim-pop';
                    else if (style.animation === 'bounce') animClass = 'anim-bounce';
                    else if (style.animation === 'wave') animClass = 'anim-wave';
                  }

                  // Determine highlight styles
                  let wordStyle: React.CSSProperties = {
                    fontFamily: style.font_family || 'Inter',
                    fontSize: `${Math.max(16, (style.font_size || 40) * 0.7)}px`,
                    fontWeight:
                      style.font_weight === 'extra-bold'
                        ? 900
                        : style.font_weight === 'bold'
                        ? 700
                        : 500,
                    letterSpacing: `${style.letter_spacing || 0}px`,
                    lineHeight: style.line_height || 1.25,
                    color: isActive ? style.highlight_color : style.text_color || '#FFFFFF',
                    WebkitTextStroke:
                      (style.outline_width || 0) > 0
                        ? `${style.outline_width}px ${style.outline_color || '#000000'}`
                        : 'none',
                    textShadow:
                      style.highlight_style === 'glow' && isActive
                        ? `0 0 16px ${style.highlight_color}, 0 0 8px ${style.highlight_color}`
                        : style.shadow_blur
                        ? `${style.shadow_offset_x || 0}px ${style.shadow_offset_y || 2}px ${
                            style.shadow_blur
                          }px ${style.shadow_color || 'rgba(0,0,0,0.8)'}`
                        : 'none',
                  };

                  return (
                    <span
                      key={idx}
                      className={`inline-block mx-1.5 transition-all duration-150 ${animClass} ${
                        isActive && style.highlight_style === 'box'
                          ? 'px-2 py-0.5 rounded-md shadow-lg scale-105'
                          : isActive && style.highlight_style === 'scale'
                          ? 'scale-110 font-black'
                          : isActive && style.highlight_style === 'underline'
                          ? 'underline decoration-4 underline-offset-4'
                          : ''
                      }`}
                      style={{
                        ...wordStyle,
                        backgroundColor:
                          isActive && style.highlight_style === 'box'
                            ? style.highlight_bg_color || '#E11D48'
                            : 'transparent',
                        color:
                          isActive && style.highlight_style === 'box'
                            ? '#FFFFFF'
                            : wordStyle.color,
                      }}
                    >
                      {wordText}
                    </span>
                  );
                })
              ) : (
                <span
                  style={{
                    fontFamily: style.font_family || 'Inter',
                    fontSize: `${(style.font_size || 40) * 0.7}px`,
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

        {/* Center Play Button Overlay when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-950/70 border border-slate-700/80 hover:bg-sky-500 text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl backdrop-blur-sm cursor-pointer"
          >
            <Play className="w-7 h-7 fill-current ml-1" />
          </button>
        )}
      </div>

      {/* Sleek Video Controls Bar */}
      <div className="w-full bg-slate-900/95 border-t border-slate-800 px-4 py-3 flex flex-col gap-2">
        {/* Timeline Scrub Bar with Segment Markers */}
        <div className="relative w-full flex items-center group/slider">
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:h-2 transition-all"
          />

          {/* Caption Segment Cue Markers along the timeline */}
          {duration > 0 &&
            currentProject.captions?.map((seg) => {
              const leftPct = (seg.start / duration) * 100;
              const widthPct = Math.max(0.5, ((seg.end - seg.start) / duration) * 100);
              const isActive = currentTime >= seg.start && currentTime <= seg.end;
              return (
                <div
                  key={seg.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute h-1.5 rounded-full pointer-events-none transition-colors ${
                    isActive ? 'bg-sky-400' : 'bg-sky-500/30'
                  }`}
                />
              );
            })}
        </div>

        {/* Bottom Bar Controls */}
        <div className="flex items-center justify-between text-xs text-slate-400 select-none">
          {/* Left: Play/Pause, Rewind, Time */}
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

          {/* Right: Audio, Speed, Fullscreen */}
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-slate-200 transition p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Playback speed selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition"
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
              className="text-slate-400 hover:text-slate-200 transition p-1"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
