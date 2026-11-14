import React, { useState, useRef, useEffect } from 'react';
import { ExportedVideo, VideoSourceType } from '../../types';
import {
  saveExportedVideoBlob,
  deleteExportedVideoBlob,
  saveActiveVideoSourceMeta,
  clearActiveVideoSourceMeta,
  checkStorageQuota,
  StorageQuotaInfo,
} from '../../utils/db';
import {
  parseYouTubeUrl,
  parseGoogleDriveUrl,
  formatVideoDuration,
  formatFileSize,
  getSourceLabel,
} from '../../utils/videoLinks';
import confetti from 'canvas-confetti';
import {
  Video,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cloud,
  Youtube,
  Laptop,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Eye,
  Info,
} from 'lucide-react';

interface StudioSectionProps {
  exportedVideo: ExportedVideo | null;
  onSetExportedVideo: (video: ExportedVideo | null) => void;
  onApplyToLesson: (video: ExportedVideo) => void;
}

type InputMethod = 'local' | 'gdrive' | 'youtube';

const MAX_RECOMMENDED_LOCAL_BYTES = 500 * 1024 * 1024; // 500 MB

export const StudioSection: React.FC<StudioSectionProps> = ({
  exportedVideo,
  onSetExportedVideo,
  onApplyToLesson,
}) => {
  const initialMethod: InputMethod =
    exportedVideo?.sourceType === 'gdrive'
      ? 'gdrive'
      : exportedVideo?.sourceType === 'youtube'
        ? 'youtube'
        : 'local';

  const [activeMethod, setActiveMethod] = useState<InputMethod>(initialMethod);

  // Local HTML5 video state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null);

  // Google Drive & YouTube input states
  const [driveInput, setDriveInput] = useState<string>(
    exportedVideo?.sourceType === 'gdrive' ? exportedVideo.originalUrl || '' : ''
  );
  const [youtubeInput, setYoutubeInput] = useState<string>(
    exportedVideo?.sourceType === 'youtube' ? exportedVideo.originalUrl || '' : ''
  );
  const [linkStatus, setLinkStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    showDriveGuide?: boolean;
  } | null>(null);

  // Inline messages & non-popup confirmation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [localDecodeError, setLocalDecodeError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const driveInputRef = useRef<HTMLInputElement>(null);
  const youtubeInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Query storage quota on mount for transparent display
  useEffect(() => {
    checkStorageQuota(0).then(setQuotaInfo).catch(() => {});
  }, []);

  // Sync tab when exportedVideo changes externally (e.g. initial load from server/IndexedDB)
  useEffect(() => {
    if (exportedVideo?.sourceType === 'gdrive') {
      setActiveMethod('gdrive');
      if (exportedVideo.originalUrl) setDriveInput(exportedVideo.originalUrl);
    } else if (exportedVideo?.sourceType === 'youtube') {
      setActiveMethod('youtube');
      if (exportedVideo.originalUrl) setYoutubeInput(exportedVideo.originalUrl);
    }
  }, [exportedVideo?.sourceType, exportedVideo?.originalUrl]);

  // Listen to browser fullscreen changes
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const currentSourceType: VideoSourceType = exportedVideo?.sourceType || 'default';
  const isEmbedPreview = currentSourceType === 'gdrive' || currentSourceType === 'youtube';
  const activeVideoUrl = exportedVideo?.embedUrl || exportedVideo?.url || '/video/default-lesson-hcm.webm';
  const displayDuration = duration > 0 ? duration : (exportedVideo?.duration || 0);

  // HTML5 Video Handlers (Local MP4/WebM & Default)
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (!isNaN(d) && isFinite(d) && d > 0) {
        setDuration(d);
        // Ensure state reflects exact real duration without truncation
        if (exportedVideo && Math.abs((exportedVideo.duration || 0) - d) > 0.5) {
          onSetExportedVideo({
            ...exportedVideo,
            duration: d,
          });
        }
      }
      setLocalDecodeError(null);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const d = videoRef.current.duration;
      if (!isNaN(d) && isFinite(d) && d > 0 && duration !== d) {
        setDuration(d);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(err => {
        console.warn('Playback notice:', err);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleFullscreen = () => {
    const el = previewFrameRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handlePreviewButtonClick = () => {
    previewFrameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!isEmbedPreview && videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      showToast('Đang hiển thị trình phát xem trước 16:9 bên dưới.');
    }
  };

  // Method 1: Local Computer Video (MP4 / WebM up to 500MB, zero Base64, zero RAM buffering, real duration)
  const processLocalVideoFile = async (file: File) => {
    setErrorMessage(null);
    setLinkStatus(null);
    setLocalDecodeError(null);
    setConfirmingDelete(false);

    const validTypes = ['video/mp4', 'video/webm'];
    const isExtValid = /\.(mp4|webm)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !isExtValid) {
      setErrorMessage('Định dạng tệp chưa được hỗ trợ. Vui lòng chọn tệp video MP4 hoặc WebM.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('Tệp video được chọn đang trống (0 byte).');
      return;
    }

    if (file.size > MAX_RECOMMENDED_LOCAL_BYTES) {
      setErrorMessage(
        `Dung lượng tệp (${formatFileSize(file.size)}) vượt quá mức khuyến nghị 500 MB cho trình duyệt. Với video quá lớn, Thầy/Cô nên tải lên Google Drive hoặc YouTube để đảm bảo phát mượt trên mọi thiết bị.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Revoke previous blob URL only if it was an uploaded local blob
      if (exportedVideo?.sourceType === 'local' && exportedVideo.url.startsWith('blob:')) {
        URL.revokeObjectURL(exportedVideo.url);
      }

      // Stream directly from disk via Object URL (no Base64, no FileReader in RAM)
      const objectUrl = URL.createObjectURL(file);

      // Probe real duration cleanly via metadata only (no time cap!)
      const probedDuration = await new Promise<number>((resolve) => {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        let settled = false;
        const finish = (val: number) => {
          if (settled) return;
          settled = true;
          tempVideo.onloadedmetadata = null;
          tempVideo.onerror = null;
          tempVideo.removeAttribute('src');
          tempVideo.load();
          resolve(val);
        };
        tempVideo.onloadedmetadata = () => {
          const d = tempVideo.duration;
          finish(d && !isNaN(d) && isFinite(d) ? d : 0);
        };
        tempVideo.onerror = () => finish(0);
        tempVideo.src = objectUrl;
        setTimeout(() => finish(0), 10000);
      });

      const now = Date.now();

      // Check browser IndexedDB quota before saving File/Blob
      const saveResult = await saveExportedVideoBlob('active-exported-video', file, {
        filename: file.name,
        duration: probedDuration,
      });

      if (saveResult.quotaInfo) {
        setQuotaInfo(saveResult.quotaInfo);
      }

      if (saveResult.saved) {
        // Save source metadata (no binary) so reload restores this local video cleanly
        await saveActiveVideoSourceMeta({
          sourceType: 'local',
          filename: file.name,
          duration: probedDuration,
          sizeBytes: file.size,
          timestamp: now,
        });
      } else {
        // Prevent any stale older blob in IndexedDB from masquerading as this video on reload
        await deleteExportedVideoBlob('active-exported-video');
        await clearActiveVideoSourceMeta();
      }

      const newVideoObj: ExportedVideo = {
        sourceType: 'local',
        url: objectUrl,
        blob: file,
        filename: file.name,
        duration: probedDuration,
        sizeBytes: file.size,
        timestamp: now,
        isUploaded: true,
        isDefault: false,
        storageNote: saveResult.saved
          ? 'Đã lưu vào bộ nhớ IndexedDB trên thiết bị để tự động mở lại khi tải lại trang.'
          : saveResult.message ||
            'Video đang phát trực tiếp từ máy tính trong phiên làm việc này (chưa lưu ngoại tuyến do hạn mức bộ nhớ trình duyệt).',
      };

      setCurrentTime(0);
      setDuration(probedDuration);
      setIsPlaying(false);
      onSetExportedVideo(newVideoObj);
      setIsProcessing(false);
      showToast(`Đã nạp video: ${file.name}`);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(`Không thể mở tệp video: ${err?.message || 'Lỗi trình duyệt'}`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLocalVideoFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLocalVideoFile(file);
    }
  };

  // Method 2: Google Drive Link
  const handleApplyGoogleDrive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setLinkStatus(null);
    setConfirmingDelete(false);

    const parsed = parseGoogleDriveUrl(driveInput);
    if (!parsed.valid) {
      setErrorMessage(parsed.error || 'Đường dẫn Google Drive không hợp lệ.');
      return;
    }

    setIsProcessing(true);
    try {
      let accessible = true;
      let title = `Video Google Drive (${parsed.id.slice(0, 8)}...)`;
      let statusMsg = 'Đã kết nối trình phát nhúng Google Drive.';
      let isWarning = false;

      try {
        const checkResp = await fetch('/api/check-video-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'gdrive', id: parsed.id, originalUrl: parsed.originalUrl }),
        });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          accessible = checkData.accessible !== false;
          if (checkData.title) title = checkData.title;
          if (checkData.message) statusMsg = checkData.message;
          isWarning = !!checkData.warning;
        }
      } catch {
        isWarning = true;
      }

      const now = Date.now();
      const newVideoObj: ExportedVideo = {
        sourceType: 'gdrive',
        url: parsed.embedUrl,
        embedUrl: parsed.embedUrl,
        originalUrl: parsed.originalUrl,
        externalId: parsed.id,
        filename: title,
        duration: 0,
        sizeBytes: 0,
        timestamp: now,
        isUploaded: true,
        isDefault: false,
        accessible,
        accessMessage: statusMsg,
      };

      // Persist URL & metadata in IndexedDB AND server JSON for multi-device access
      await saveActiveVideoSourceMeta({
        sourceType: 'gdrive',
        originalUrl: parsed.originalUrl,
        externalId: parsed.id,
        embedUrl: parsed.embedUrl,
        filename: title,
        duration: 0,
        sizeBytes: 0,
        timestamp: now,
        accessible,
        accessMessage: statusMsg,
      });

      await fetch('/api/lesson-video-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVideoObj),
      }).catch(() => {});

      setLinkStatus({
        type: !accessible ? 'error' : isWarning ? 'warning' : 'success',
        message: statusMsg,
        showDriveGuide: !accessible || isWarning,
      });

      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      onSetExportedVideo(newVideoObj);
      setIsProcessing(false);
      if (accessible) {
        showToast('Đã liên kết video Google Drive.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(`Lỗi kết nối Google Drive: ${err?.message || 'Không xác định'}`);
    }
  };

  // Method 3: YouTube Link
  const handleApplyYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setLinkStatus(null);
    setConfirmingDelete(false);

    const parsed = parseYouTubeUrl(youtubeInput);
    if (!parsed.valid) {
      setErrorMessage(parsed.error || 'Đường dẫn YouTube không hợp lệ.');
      return;
    }

    setIsProcessing(true);
    try {
      let accessible = true;
      let title = `Video YouTube (${parsed.id})`;
      let statusMsg = 'Video YouTube sẵn sàng phát (hỗ trợ Công khai & Không công khai).';
      let isWarning = false;

      try {
        const checkResp = await fetch('/api/check-video-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'youtube', id: parsed.id, originalUrl: parsed.originalUrl }),
        });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          accessible = checkData.accessible !== false;
          if (checkData.title) title = checkData.title;
          if (checkData.message) statusMsg = checkData.message;
          isWarning = !!checkData.warning;
        }
      } catch {
        isWarning = true;
      }

      const now = Date.now();
      const newVideoObj: ExportedVideo = {
        sourceType: 'youtube',
        url: parsed.embedUrl,
        embedUrl: parsed.embedUrl,
        originalUrl: parsed.originalUrl,
        externalId: parsed.id,
        filename: title,
        duration: 0,
        sizeBytes: 0,
        timestamp: now,
        isUploaded: true,
        isDefault: false,
        accessible,
        accessMessage: statusMsg,
      };

      // Persist URL & metadata in IndexedDB AND server JSON for multi-device access
      await saveActiveVideoSourceMeta({
        sourceType: 'youtube',
        originalUrl: parsed.originalUrl,
        externalId: parsed.id,
        embedUrl: parsed.embedUrl,
        filename: title,
        duration: 0,
        sizeBytes: 0,
        timestamp: now,
        accessible,
        accessMessage: statusMsg,
      });

      await fetch('/api/lesson-video-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVideoObj),
      }).catch(() => {});

      setLinkStatus({
        type: !accessible ? 'error' : isWarning ? 'warning' : 'success',
        message: statusMsg,
      });

      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      onSetExportedVideo(newVideoObj);
      setIsProcessing(false);
      if (accessible) {
        showToast('Đã liên kết video YouTube.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(`Lỗi xử lý liên kết YouTube: ${err?.message || 'Không xác định'}`);
    }
  };

  // Replace video action depending on selected method
  const handleReplaceVideo = () => {
    setErrorMessage(null);
    setConfirmingDelete(false);
    if (activeMethod === 'local') {
      fileInputRef.current?.click();
    } else if (activeMethod === 'gdrive') {
      setDriveInput('');
      setLinkStatus(null);
      driveInputRef.current?.focus();
    } else {
      setYoutubeInput('');
      setLinkStatus(null);
      youtubeInputRef.current?.focus();
    }
  };

  // Inline Delete without any popup
  const handleConfirmDeleteVideo = async () => {
    setConfirmingDelete(false);
    setErrorMessage(null);
    setLinkStatus(null);
    setLocalDecodeError(null);

    if (exportedVideo?.sourceType === 'local' && exportedVideo.url.startsWith('blob:')) {
      URL.revokeObjectURL(exportedVideo.url);
    }

    await deleteExportedVideoBlob('active-exported-video');
    await clearActiveVideoSourceMeta();
    await fetch('/api/lesson-video-link', { method: 'DELETE' }).catch(() => {});

    setDriveInput('');
    setYoutubeInput('');
    setCurrentTime(0);
    setIsPlaying(false);

    const defaultVideo: ExportedVideo = {
      sourceType: 'default',
      url: '/video/default-lesson-hcm.webm',
      filename: 'KhamPha_TPHCM_HD720p.webm',
      duration: 18.6,
      sizeBytes: 1958608,
      timestamp: Date.now(),
      isDefault: true,
      isUploaded: false,
    };

    onSetExportedVideo(defaultVideo);
    setDuration(18.6);
    showToast('Đã xóa video đã chọn và khôi phục video mẫu mặc định.');
  };

  const handleUseInKhoiDong = () => {
    if (!exportedVideo) {
      setErrorMessage('Vui lòng chọn hoặc liên kết một video trước khi sử dụng trong Khởi động.');
      return;
    }

    confetti({
      particleCount: 45,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#38bdf8', '#10b981'],
    });

    showToast('Đã gắn video vào hoạt động 1. Khởi động.');
    setTimeout(() => {
      onApplyToLesson(exportedVideo);
    }, 350);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Inline Toast Feedback (non-blocking) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl space-y-2">
          <div className="text-sky-200 text-xs font-semibold uppercase tracking-wider">
            Hoạt động 5 · Quản lý học liệu đa phương tiện · Tin học Lớp 4
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            VIDEO BÀI HỌC
          </h1>
          <p className="text-sm sm:text-base text-sky-100 leading-relaxed">
            Thầy/Cô chọn một trong ba phương thức dưới đây để đưa video bài học hoàn chỉnh vào lớp học: tải tệp trực tiếp từ máy tính, nhúng từ Google Drive hoặc nhúng từ YouTube. Video giữ nguyên thời lượng, âm thanh và chất lượng gốc.
          </p>
        </div>
      </div>

      {/* Section 1: Three Clear Input Method Choices */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
            Chọn phương thức cung cấp video
          </h2>
          {quotaInfo?.supported && (
            <span className="text-xs text-slate-500 tabular-nums">
              Bộ nhớ khả dụng trên trình duyệt: {formatFileSize(quotaInfo.availableBytes)}
            </span>
          )}
        </div>

        {/* 3 Method Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="tablist" aria-label="Phương thức cung cấp video">
          <button
            type="button"
            role="tab"
            aria-selected={activeMethod === 'local'}
            onClick={() => {
              setActiveMethod('local');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              activeMethod === 'local'
                ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-slate-900'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeMethod === 'local' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Laptop className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">1. Tải video từ máy tính</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Hỗ trợ MP4, WebM lên đến 500 MB · Phát trực tiếp giữ nguyên chất lượng
              </div>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMethod === 'gdrive'}
            onClick={() => {
              setActiveMethod('gdrive');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              activeMethod === 'gdrive'
                ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-slate-900'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeMethod === 'gdrive' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">2. Sử dụng Google Drive</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dán liên kết chia sẻ Google Drive · Phát nhúng không giới hạn dung lượng
              </div>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMethod === 'youtube'}
            onClick={() => {
              setActiveMethod('youtube');
              setErrorMessage(null);
            }}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              activeMethod === 'youtube'
                ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 text-slate-900'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeMethod === 'youtube' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Youtube className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">3. Sử dụng YouTube</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Hỗ trợ Công khai &amp; Không công khai · Không cần API Key
              </div>
            </div>
          </button>
        </div>

        {/* Active Method Input Panel */}
        {activeMethod === 'local' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDragging
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/30'
              }`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  {isProcessing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {isProcessing
                      ? 'Đang nạp thông tin video...'
                      : 'Kéo thả tệp MP4 hoặc WebM vào đây, hoặc nhấn để chọn từ máy tính'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ video bài giảng dài (2 phút, 5 phút, 10 phút+) và dung lượng lên đến 500 MB. Video được phát trực tiếp bằng <span className="font-mono">URL.createObjectURL</span>, không nén giảm chất lượng.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                className="py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs whitespace-nowrap shrink-0 pointer-events-none"
              >
                Chọn tệp video
              </button>
            </div>

            {exportedVideo?.sourceType === 'local' && exportedVideo.storageNote && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>{exportedVideo.storageNote}</span>
              </div>
            )}
          </div>
        )}

        {activeMethod === 'gdrive' && (
          <form onSubmit={handleApplyGoogleDrive} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={driveInputRef}
                type="url"
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                placeholder="Dán đường dẫn chia sẻ Google Drive (ví dụ: https://drive.google.com/file/d/.../view?usp=sharing)"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Kiểm tra &amp; Tải video Drive</span>
              </button>
            </div>

            {linkStatus && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  linkStatus.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : linkStatus.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-2.5 font-semibold">
                  {linkStatus.type === 'error' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : linkStatus.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{linkStatus.message}</span>
                </div>

                {linkStatus.showDriveGuide && (
                  <div className="pl-6 space-y-1.5 text-slate-700">
                    <p className="font-bold text-slate-900">Hướng dẫn cấp quyền xem Google Drive cho lớp học:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Mở video trên Google Drive → nhấn nút <strong>Chia sẻ (Share)</strong>.</li>
                      <li>Trong mục <strong>Quyền truy cập chung</strong>, đổi từ &ldquo;Bị hạn chế&rdquo; sang <strong>Bất kỳ ai có đường liên kết</strong>.</li>
                      <li>Đặt vai trò là <strong>Người xem (Viewer)</strong>, nhấn <strong>Xong</strong> rồi bấm lại nút kiểm tra.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </form>
        )}

        {activeMethod === 'youtube' && (
          <form onSubmit={handleApplyYouTube} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={youtubeInputRef}
                type="url"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Dán đường dẫn video YouTube (ví dụ: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                <span>Tải video YouTube</span>
              </button>
            </div>

            {linkStatus && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  linkStatus.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : linkStatus.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {linkStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : linkStatus.type === 'warning' ? (
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{linkStatus.message}</span>
              </div>
            )}
          </form>
        )}

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Thông báo: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: 16:9 Preview Player & Action Controls */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-sky-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              Khung xem trước video (16:9)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">{getSourceLabel(currentSourceType)}</span>
            <span aria-hidden="true">·</span>
            <span className="max-w-xs truncate font-medium" title={exportedVideo?.filename}>
              {exportedVideo?.filename || 'KhamPha_TPHCM_HD720p.webm'}
            </span>
            {!isEmbedPreview && (
              <>
                <span aria-hidden="true">·</span>
                <span>Thời lượng: {formatVideoDuration(displayDuration)}</span>
                <span aria-hidden="true">·</span>
                <span>Dung lượng: {formatFileSize(exportedVideo?.sizeBytes)}</span>
              </>
            )}
          </div>
        </div>

        {/* 16:9 Preview Container */}
        <div
          ref={previewFrameRef}
          className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-900 shadow-md group"
        >
          {isEmbedPreview ? (
            <iframe
              key={activeVideoUrl}
              src={activeVideoUrl}
              title={exportedVideo?.filename || 'Xem trước video bài học'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                key={activeVideoUrl}
                src={activeVideoUrl}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() =>
                  setLocalDecodeError(
                    'Trình duyệt không thể giải mã tệp video này. Vui lòng dùng định dạng MP4 (H.264/AAC) hoặc WebM (VP8/VP9).'
                  )
                }
                playsInline
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {localDecodeError && (
                <div className="absolute inset-0 bg-slate-950/90 text-white flex flex-col items-center justify-center p-6 text-center z-20">
                  <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                  <p className="text-sm font-bold mb-1">Lỗi giải mã video</p>
                  <p className="text-xs text-slate-300 max-w-md">{localDecodeError}</p>
                </div>
              )}

              {!isPlaying && !localDecodeError && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-white/95 text-sky-600 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                    <Play className="w-8 h-8 fill-current translate-x-0.5" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Custom HTML5 Control Bar when Local / Default video is loaded */}
        {!isEmbedPreview && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-slate-300 shrink-0">
                {formatVideoDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={displayDuration > 0 ? displayDuration : 100}
                step={0.1}
                value={currentTime}
                disabled={displayDuration <= 0}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                title="Tua video"
              />
              <span className="text-xs font-mono tabular-nums text-slate-300 shrink-0">
                {displayDuration > 0 ? formatVideoDuration(displayDuration) : '--:--'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                  title={isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Xem lại từ đầu"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-slate-200 hover:text-white transition-colors"
                    title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    title="Điều chỉnh âm lượng"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleFullscreen}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Helpful Google Drive permission note right below embed when Drive is active */}
        {currentSourceType === 'gdrive' && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
            <span>
              Nếu khung Google Drive báo cần quyền truy cập hoặc chưa phát được, Thầy/Cô hãy kiểm tra quyền chia sẻ tệp là <strong>Bất kỳ ai có đường liên kết (Người xem)</strong>.
            </span>
            {exportedVideo?.originalUrl && (
              <a
                href={exportedVideo.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:underline whitespace-nowrap"
              >
                <span>Mở trên Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Required Action Buttons Bar (Zero Popups) */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePreviewButtonClick}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Xem trước video</span>
            </button>

            <button
              type="button"
              onClick={handleReplaceVideo}
              disabled={isProcessing}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span>Thay thế video</span>
            </button>

            <button
              type="button"
              onClick={handleFullscreen}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-700" /> : <Maximize2 className="w-4 h-4 text-slate-700" />}
              <span>Toàn màn hình</span>
            </button>

            {exportedVideo?.isUploaded && !confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa video</span>
              </button>
            )}

            {confirmingDelete && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-rose-900">Xóa video hiện tại?</span>
                <button
                  type="button"
                  onClick={handleConfirmDeleteVideo}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUseInKhoiDong}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>SỬ DỤNG TRONG KHỞI ĐỘNG</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
