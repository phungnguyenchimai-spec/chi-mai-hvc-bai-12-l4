import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  Rewind,
  AlertCircle
} from 'lucide-react';
import { ExportedVideo, VideoSourceType } from '../types';
import { formatVideoDuration, normalizeYouTubeEmbedUrl } from '../utils/videoLinks';

interface InteractiveVideoPlayerProps {
  video?: ExportedVideo | null;
  videoUrl?: string | null;
  title?: string;
  onPlay?: () => void;
  onPause?: (currentTime: number) => void;
  onSeeking?: (currentTime: number) => void;
  onSeeked?: (currentTime: number) => void;
  onSeek?: (currentTime: number) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export const InteractiveVideoPlayer: React.FC<InteractiveVideoPlayerProps> = ({
  video,
  videoUrl,
  title = 'Khám phá Thành phố Hồ Chí Minh',
  onPlay,
  onPause,
  onSeeking,
  onSeeked,
  onSeek,
  onVolumeChange,
  onTimeUpdate,
  onEnded,
  className = '',
  autoPlay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const rawSrc = video?.embedUrl || video?.url || videoUrl || '/video/default-lesson-hcm.webm';
  const resolvedSourceType: VideoSourceType =
    video?.sourceType ||
    (rawSrc.includes('youtube.com/embed') || rawSrc.includes('youtu.be/')
      ? 'youtube'
      : rawSrc.includes('drive.google.com/file/')
        ? 'gdrive'
        : 'local');

  const resolvedSrc =
    resolvedSourceType === 'youtube'
      ? normalizeYouTubeEmbedUrl(rawSrc, video?.externalId)
      : rawSrc;
  const isEmbed = resolvedSourceType === 'youtube' || resolvedSourceType === 'gdrive';

  // Reset player state cleanly when source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(video?.duration && video.duration > 0 ? video.duration : 0);
    setMediaError(null);
  }, [resolvedSrc, video?.duration]);

  // Listen to fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Native HTML5 <video> event bindings
  useEffect(() => {
    if (isEmbed) return;
    const vidEl = videoRef.current;
    if (!vidEl) return;

    const handleLoadedMetadata = () => {
      if (vidEl.duration && !isNaN(vidEl.duration) && isFinite(vidEl.duration)) {
        setDuration(vidEl.duration);
        onTimeUpdate?.(vidEl.currentTime, vidEl.duration);
      }
      setMediaError(null);
    };

    const handleDurationChange = () => {
      if (vidEl.duration && !isNaN(vidEl.duration) && isFinite(vidEl.duration)) {
        setDuration(vidEl.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.(vidEl.currentTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(vidEl.currentTime);
      const realDur = vidEl.duration && !isNaN(vidEl.duration) && isFinite(vidEl.duration) ? vidEl.duration : 0;
      if (realDur > 0) setDuration(realDur);
      onTimeUpdate?.(vidEl.currentTime, realDur);
    };

    const handleVolume = () => {
      setVolume(vidEl.volume);
      setIsMuted(vidEl.muted);
      onVolumeChange?.(vidEl.volume, vidEl.muted);
    };

    const handleSeeking = () => {
      onSeeking?.(vidEl.currentTime);
    };

    const handleSeeked = () => {
      onSeeked?.(vidEl.currentTime);
      onSeek?.(vidEl.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = () => {
      setIsPlaying(false);
      setMediaError('Trình duyệt không thể giải mã hoặc tải video này. Vui lòng kiểm tra định dạng (MP4 H.264/AAC hoặc WebM VP8/VP9) hoặc thay thế bằng tệp khác.');
    };

    vidEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    vidEl.addEventListener('durationchange', handleDurationChange);
    vidEl.addEventListener('play', handlePlay);
    vidEl.addEventListener('pause', handlePause);
    vidEl.addEventListener('timeupdate', handleTimeUpdate);
    vidEl.addEventListener('volumechange', handleVolume);
    vidEl.addEventListener('seeking', handleSeeking);
    vidEl.addEventListener('seeked', handleSeeked);
    vidEl.addEventListener('ended', handleEnded);
    vidEl.addEventListener('error', handleError);

    return () => {
      vidEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vidEl.removeEventListener('durationchange', handleDurationChange);
      vidEl.removeEventListener('play', handlePlay);
      vidEl.removeEventListener('pause', handlePause);
      vidEl.removeEventListener('timeupdate', handleTimeUpdate);
      vidEl.removeEventListener('volumechange', handleVolume);
      vidEl.removeEventListener('seeking', handleSeeking);
      vidEl.removeEventListener('seeked', handleSeeked);
      vidEl.removeEventListener('ended', handleEnded);
      vidEl.removeEventListener('error', handleError);
    };
  }, [isEmbed, resolvedSrc, onPlay, onPause, onSeeking, onSeeked, onSeek, onVolumeChange, onTimeUpdate, onEnded]);

  // YouTube postMessage telemetry listener (for LuyenTap practice tracking when a YouTube video is active)
  useEffect(() => {
    if (resolvedSourceType !== 'youtube') return;

    let lastYtTime = 0;
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.info) return;

        const info = data.info;
        if (typeof info.playerState === 'number') {
          if (info.playerState === 1) {
            setIsPlaying(true);
            onPlay?.();
          } else if (info.playerState === 2) {
            setIsPlaying(false);
            onPause?.(info.currentTime ?? lastYtTime);
          } else if (info.playerState === 0) {
            setIsPlaying(false);
            onEnded?.();
          }
        }
        if (typeof info.currentTime === 'number') {
          const jump = Math.abs(info.currentTime - lastYtTime);
          if (jump > 2.2) {
            onSeeking?.(info.currentTime);
            onSeeked?.(info.currentTime);
            onSeek?.(info.currentTime);
          }
          lastYtTime = info.currentTime;
          setCurrentTime(info.currentTime);
          onTimeUpdate?.(info.currentTime, info.duration || 0);
        }
        if (typeof info.volume === 'number' || typeof info.muted === 'boolean') {
          onVolumeChange?.((info.volume ?? 100) / 100, !!info.muted);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [resolvedSourceType, onPlay, onPause, onSeeking, onSeeked, onSeek, onVolumeChange, onTimeUpdate, onEnded]);

  const handleIframeLoad = () => {
    if (resolvedSourceType === 'youtube' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 'lesson-yt-player' }),
          '*'
        );
      } catch {
        // Ignore
      }
    }
  };

  const togglePlay = () => {
    const vidEl = videoRef.current;
    if (!vidEl) return;
    if (vidEl.paused || vidEl.ended) {
      vidEl.play().catch(e => console.warn('Play interrupted:', e));
    } else {
      vidEl.pause();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    const vidEl = videoRef.current;
    if (vidEl) {
      vidEl.currentTime = targetTime;
    }
    onSeeking?.(targetTime);
    onSeeked?.(targetTime);
    onSeek?.(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const vidEl = videoRef.current;
    if (!vidEl) return;
    vidEl.volume = newVol;
    vidEl.muted = newVol === 0;
    setVolume(newVol);
    setIsMuted(vidEl.muted);
  };

  const toggleMute = () => {
    const vidEl = videoRef.current;
    if (!vidEl) return;
    vidEl.muted = !vidEl.muted;
    setIsMuted(vidEl.muted);
  };

  const handleReplay = () => {
    const vidEl = videoRef.current;
    setCurrentTime(0);
    if (vidEl) {
      vidEl.currentTime = 0;
      vidEl.play().catch(() => {});
    }
  };

  const skipSeconds = (sec: number) => {
    const vidEl = videoRef.current;
    const maxDur = duration || vidEl?.duration || 0;
    const newTime = Math.max(0, maxDur > 0 ? Math.min(currentTime + sec, maxDur) : currentTime + sec);
    setCurrentTime(newTime);
    if (vidEl) {
      vidEl.currentTime = newTime;
    }
    onSeeking?.(newTime);
    onSeeked?.(newTime);
    onSeek?.(newTime);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const displayDuration = duration > 0 ? duration : (video?.duration && video.duration > 0 ? video.duration : 0);

  return (
    <div
      ref={containerRef}
      className={`relative group bg-slate-950 rounded-2xl overflow-hidden shadow-xl aspect-video flex flex-col justify-end select-none ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      {/* Embed Player for YouTube / Google Drive */}
      {isEmbed ? (
        <>
          <iframe
            ref={iframeRef}
            key={resolvedSrc}
            src={resolvedSrc}
            title={title}
            onLoad={handleIframeLoad}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            className="w-full h-full border-0"
          />
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/15 transition-colors"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (Fullscreen)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Native HTML5 <video> Player (Local computer MP4/WebM or default) */}
          <video
            ref={videoRef}
            key={resolvedSrc}
            src={resolvedSrc}
            preload="metadata"
            playsInline
            autoPlay={autoPlay}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Error overlay if codec / file fails */}
          {mediaError && (
            <div className="absolute inset-0 bg-slate-950/90 text-white flex flex-col items-center justify-center p-6 text-center z-20">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-sm font-bold mb-1">Không thể phát tệp video này</p>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">{mediaError}</p>
            </div>
          )}

          {/* Top Banner on Hover */}
          <div
            className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center justify-between text-white">
              <h3 className="text-sm sm:text-base font-semibold font-display truncate max-w-md">
                {title}
              </h3>
              <span className="text-xs text-white/80 hidden sm:inline">
                Tin học 4 · Bài 12A
              </span>
            </div>
          </div>

          {/* Center Big Play Button (when paused and no error) */}
          {!isPlaying && !mediaError && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-500/90 text-white flex items-center justify-center hover:bg-sky-400 hover:scale-105 active:scale-95 transition-all shadow-2xl z-10"
              title="Nhấn để phát video"
            >
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
            </button>
          )}

          {/* Bottom Controls Bar */}
          <div
            className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress Bar (Seek) */}
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <span className="text-xs font-mono tabular-nums text-white/90 shrink-0">
                {formatVideoDuration(currentTime)}
              </span>
              <div className="relative flex-1 flex items-center group/seek">
                <input
                  type="range"
                  min={0}
                  max={displayDuration > 0 ? displayDuration : 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeekChange}
                  disabled={displayDuration <= 0}
                  className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:h-2.5 transition-all"
                  title="Kéo tua video"
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-white/70 shrink-0">
                {displayDuration > 0 ? formatVideoDuration(displayDuration) : '--:--'}
              </span>
            </div>

            {/* Buttons Row */}
            <div className="flex items-center justify-between gap-2 text-white">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  title={isPlaying ? 'Tạm dừng (Pause)' : 'Phát (Play)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  title="Xem lại từ đầu (Replay)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => skipSeconds(-5)}
                  className="hidden sm:inline-flex p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  title="Lùi lại 5 giây"
                >
                  <Rewind className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => skipSeconds(5)}
                  className="hidden sm:inline-flex p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  title="Tua tới 5 giây"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                {/* Volume Control */}
                <div className="flex items-center gap-1.5 ml-2 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 rounded-xl hover:bg-white/20 transition-all"
                    title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng (Mute)'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-24 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (Fullscreen)'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
