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
  Rewind
} from 'lucide-react';

interface InteractiveVideoPlayerProps {
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Fallback demo video synthesizer if no exported video URL exists yet
  // This uses a canvas loop that renders the sample lesson visuals so the player is never empty!
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.(video.currentTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      onTimeUpdate?.(video.currentTime, video.duration || 0);
    };

    const handleVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
      onVolumeChange?.(video.volume, video.muted);
    };

    const handleSeeking = () => {
      onSeeking?.(video.currentTime);
    };

    const handleSeeked = () => {
      onSeeked?.(video.currentTime);
      onSeek?.(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('volumechange', handleVolume);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('volumechange', handleVolume);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onSeeking, onSeeked, onSeek, onVolumeChange, onTimeUpdate, onEnded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(e => console.warn('Play interrupted:', e));
    } else {
      video.pause();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    const video = videoRef.current;
    if (video) {
      video.currentTime = targetTime;
    }
    onSeeking?.(targetTime);
    onSeeked?.(targetTime);
    onSeek?.(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    video.muted = newVol === 0;
    setVolume(newVol);
    setIsMuted(video.muted);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleReplay = () => {
    const video = videoRef.current;
    setCurrentTime(0);
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  const skipSeconds = (sec: number) => {
    const video = videoRef.current;
    const maxDur = duration || video?.duration || 100;
    const newTime = Math.max(0, Math.min(currentTime + sec, maxDur));
    setCurrentTime(newTime);
    if (video) {
      video.currentTime = newTime;
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-slate-950 rounded-2xl overflow-hidden shadow-xl aspect-video flex flex-col justify-end select-none ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      {/* Video Element */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          autoPlay={autoPlay}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />
      ) : (
        /* Fallback Interactive Player with Sample Visuals */
        <DefaultSampleCanvasPlayer
          ref={videoRef}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          duration={duration}
          setDuration={setDuration}
          volume={volume}
          isMuted={isMuted}
          onPlay={onPlay}
          onPause={onPause}
          onSeeking={onSeeking}
          onSeeked={onSeeked}
          onSeek={onSeek}
          onEnded={onEnded}
          togglePlay={togglePlay}
        />
      )}

      {/* Top Banner on Hover */}
      <div className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm sm:text-base font-semibold font-display truncate max-w-md">
              {title}
            </h3>
          </div>
          <span className="text-xs text-white/80 hidden sm:inline">
            Tin học 4 · Bài 12A
          </span>
        </div>
      </div>

      {/* Center Big Play Button (when paused) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-500/90 text-white flex items-center justify-center hover:bg-sky-400 hover:scale-105 active:scale-95 transition-all shadow-2xl z-10"
          title="Nhấn để phát video"
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
        </button>
      )}

      {/* Bottom Controls Bar */}
      <div className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar (Seek) */}
        <div className="flex items-center gap-3 mb-2 sm:mb-3">
          <span className="text-xs font-mono tabular-nums text-white/90 shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group/seek">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:h-2.5 transition-all"
              title="Kéo tua video"
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-white/70 shrink-0">
            {formatTime(duration || 100)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
              title={isPlaying ? 'Tạm dừng (Pause)' : 'Phát (Play)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Replay */}
            <button
              onClick={handleReplay}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
              title="Xem lại từ đầu (Replay)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip -5s / +5s */}
            <button
              onClick={() => skipSeconds(-5)}
              className="hidden sm:inline-flex p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
              title="Lùi lại 5 giây"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => skipSeconds(5)}
              className="hidden sm:inline-flex p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
              title="Tua tới 5 giây"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 ml-2 group/vol">
              <button
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

          {/* Right Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (Fullscreen)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Default Player that animates when no external video file has been exported yet
const DefaultSampleCanvasPlayer = React.forwardRef<HTMLVideoElement, any>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const scenes = [
    {
      title: '1. Giới thiệu Thành phố Hồ Chí Minh',
      desc: 'Thành phố trẻ trung, năng động bên dòng sông Sài Gòn',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Ho_Chi_Minh_City_skyline_%282022%29.jpg/800px-Ho_Chi_Minh_City_skyline_%282022%29.jpg',
      color: '#0284c7',
      duration: 15,
    },
    {
      title: '2. Bến Nhà Rồng lịch sử (Bảo tàng Hồ Chí Minh)',
      desc: 'Nơi Bác Hồ ra đi tìm đường cứu nước ngày 5/6/1911',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Nha_Rong_Harbour_02.jpg/800px-Nha_Rong_Harbour_02.jpg',
      color: '#b91c1c',
      duration: 15,
    },
    {
      title: '3. Dinh Độc Lập - Mốc son Thống nhất 30/4/1975',
      desc: 'Di tích Lịch sử Quốc gia Đặc biệt ghi dấu ngày non sông thu về một mối',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Reunification_Palace%2C_Ho_Chi_Minh_City_%285%29.jpg/800px-Reunification_Palace%2C_Ho_Chi_Minh_City_%285%29.jpg',
      color: '#d97706',
      duration: 15,
    },
    {
      title: '4. Bưu điện Trung tâm Thành phố Hồ Chí Minh',
      desc: 'Kiến trúc di sản cổ kính hơn 130 năm tuổi với mái vòm châu Âu',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Saigon_Central_Post_Office_in_2020.jpg/800px-Saigon_Central_Post_Office_in_2020.jpg',
      color: '#4f46e5',
      duration: 15,
    },
    {
      title: '5. Em yêu Thành phố Hồ Chí Minh',
      desc: 'Sử dụng công cụ đa phương tiện để học tập và khám phá thế giới',
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Saigon_Opera_House_by_night.jpg/800px-Saigon_Opera_House_by_night.jpg',
      color: '#059669',
      duration: 15,
    },
  ];

  const totalDuration = scenes.reduce((a, b) => a + b.duration, 0);

  useEffect(() => {
    props.setDuration(totalDuration);
  }, [totalDuration]);

  // Preload images
  const loadedImgsRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    scenes.forEach((s, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = s.img;
      img.onload = () => {
        loadedImgsRef.current[idx] = img;
      };
    });
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTick = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      if (props.isPlaying) {
        let nextTime = props.currentTime + dt;
        if (nextTime >= totalDuration) {
          nextTime = 0;
          props.setIsPlaying(false);
          props.onEnded?.();
        }
        props.setCurrentTime(nextTime);
      }

      // Draw Current Scene on Canvas
      drawFrame(ctx, canvas.width, canvas.height, props.currentTime);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [props.isPlaying, props.currentTime, totalDuration]);

  const drawFrame = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    ctx.clearRect(0, 0, w, h);

    // Find active scene
    let accumulated = 0;
    let activeIndex = 0;
    let sceneTime = 0;

    for (let i = 0; i < scenes.length; i++) {
      if (time >= accumulated && time < accumulated + scenes[i].duration) {
        activeIndex = i;
        sceneTime = time - accumulated;
        break;
      }
      accumulated += scenes[i].duration;
    }

    const scene = scenes[activeIndex];
    const img = loadedImgsRef.current[activeIndex];
    const progress = sceneTime / scene.duration;

    // Draw background image or stylized background
    if (img && img.complete && img.naturalWidth > 0) {
      const zoom = 1.0 + progress * 0.06;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      // Fallback gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, scene.color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Gradient Scrim
    const scrim = ctx.createLinearGradient(0, h * 0.4, 0, h);
    scrim.addColorStop(0, 'rgba(15, 23, 42, 0)');
    scrim.addColorStop(0.6, 'rgba(15, 23, 42, 0.7)');
    scrim.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);

    // Title & Scene description
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(scene.title, 40, h - 130);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(scene.desc, 40, h - 90);

    // Attribution
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Tư liệu lịch sử & văn hóa TP.HCM · Bài 12A Tin học Lớp 4', 40, h - 60);
  };

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={props.togglePlay}>
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-contain"
      />
      {/* Hidden dummy video tag so standard video refs don't crash */}
      <video ref={ref} className="hidden" />
    </div>
  );
});
