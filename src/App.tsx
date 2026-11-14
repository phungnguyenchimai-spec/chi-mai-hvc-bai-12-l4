import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TeacherGuideDrawer } from './components/TeacherGuideDrawer';
import { KhoiDongSection } from './components/sections/KhoiDongSection';
import { KhamPhaSection } from './components/sections/KhamPhaSection';
import { LuyenTapSection } from './components/sections/LuyenTapSection';
import { VanDungSection } from './components/sections/VanDungSection';
import { StudioSection } from './components/sections/StudioSection';
import { AppMode, AppTab, ExportedVideo } from './types';
import { loadExportedVideoBlob, loadActiveVideoSourceMeta } from './utils/db';
import { SHARED_LESSON_VIDEO_CONFIG } from './config/lessonVideoConfig';
import { parseGoogleDriveUrl, parseYouTubeUrl } from './utils/videoLinks';

function isValidSharedRemoteConfig(): boolean {
  const cfg = SHARED_LESSON_VIDEO_CONFIG;
  return (
    cfg.useInKhoiDong !== false &&
    (cfg.sourceType === 'youtube' || cfg.sourceType === 'gdrive') &&
    Boolean(cfg.embedUrl || cfg.videoId)
  );
}

function buildSharedFallbackVideo(): ExportedVideo {
  const cfg = SHARED_LESSON_VIDEO_CONFIG;
  if (isValidSharedRemoteConfig()) {
    const fallbackEmbed =
      cfg.embedUrl ||
      (cfg.sourceType === 'youtube' && cfg.videoId
        ? `https://www.youtube.com/embed/${cfg.videoId}`
        : cfg.sourceType === 'gdrive' && cfg.videoId
          ? `https://drive.google.com/file/d/${cfg.videoId}/preview`
          : '');

    return {
      sourceType: cfg.sourceType,
      url: fallbackEmbed,
      embedUrl: fallbackEmbed,
      originalUrl: cfg.originalUrl,
      externalId: cfg.videoId,
      filename: cfg.title || 'Khám phá Thành phố Hồ Chí Minh – Bài 12A',
      duration: 0,
      sizeBytes: 0,
      timestamp: cfg.updatedAt || Date.now(),
      isUploaded: true,
      isDefault: false,
      accessible: true,
    };
  }
  return {
    sourceType: 'default',
    url: cfg.embedUrl || '/video/default-lesson-hcm.webm',
    filename: cfg.title || 'KhamPha_TPHCM_HD720p.webm',
    duration: 18.6,
    sizeBytes: 1958608,
    timestamp: cfg.updatedAt || 0,
    isDefault: true,
    isUploaded: false,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('khoi_dong');
  const [mode, setMode] = useState<AppMode>('classroom');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTeacherGuide, setShowTeacherGuide] = useState<boolean>(false);

  // Khởi tạo ngay từ cấu hình dùng chung (bundled cho Vercel/GitHub)
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo | null>(() => buildSharedFallbackVideo());

  useEffect(() => {
    async function initStorage() {
      try {
        // 1. Hỗ trợ tham số chia sẻ trực tiếp qua URL (?yt=VIDEO_ID hoặc ?gd=FILE_ID) nếu có
        const params = new URLSearchParams(window.location.search);
        const ytParam = params.get('yt');
        const gdParam = params.get('gd');

        if (ytParam) {
          const parsedYt = parseYouTubeUrl(
            ytParam.length === 11 ? `https://www.youtube.com/watch?v=${ytParam}` : ytParam
          );
          if (parsedYt.valid) {
            setExportedVideo({
              sourceType: 'youtube',
              url: parsedYt.embedUrl,
              embedUrl: parsedYt.embedUrl,
              originalUrl: parsedYt.originalUrl,
              externalId: parsedYt.id,
              filename: `Video YouTube (${parsedYt.id})`,
              duration: 0,
              sizeBytes: 0,
              timestamp: Date.now(),
              isUploaded: true,
              isDefault: false,
              accessible: true,
            });
            return;
          }
        }

        if (gdParam) {
          const parsedGd = parseGoogleDriveUrl(
            gdParam.includes('drive.google.com')
              ? gdParam
              : `https://drive.google.com/file/d/${gdParam}/view`
          );
          if (parsedGd.valid) {
            setExportedVideo({
              sourceType: 'gdrive',
              url: parsedGd.embedUrl,
              embedUrl: parsedGd.embedUrl,
              originalUrl: parsedGd.originalUrl,
              externalId: parsedGd.id,
              filename: `Video Google Drive (${parsedGd.id.slice(0, 8)}...)`,
              duration: 0,
              sizeBytes: 0,
              timestamp: Date.now(),
              isUploaded: true,
              isDefault: false,
              accessible: true,
            });
            return;
          }
        }

        // 2. Đọc bộ nhớ cục bộ trình duyệt (IndexedDB) & cấu hình dev server nếu đang chạy trong AI Studio
        const [localMeta, savedBlob, serverResp] = await Promise.all([
          loadActiveVideoSourceMeta(),
          loadExportedVideoBlob('active-exported-video'),
          import.meta.env.DEV
            ? fetch('/api/active-lesson-video')
                .then(r => (r.ok ? r.json() : null))
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        const sharedConfig = SHARED_LESSON_VIDEO_CONFIG;
        const hasSharedRemoteConfig = isValidSharedRemoteConfig();

        const hasDevServerLink =
          import.meta.env.DEV &&
          serverResp &&
          serverResp.exists &&
          (serverResp.sourceType === 'youtube' || serverResp.sourceType === 'gdrive') &&
          Boolean(serverResp.embedUrl || serverResp.url);

        const localTimestamp = localMeta?.timestamp || savedBlob?.savedAt || 0;
        const sharedTimestamp = Math.max(
          hasSharedRemoteConfig ? sharedConfig.updatedAt || 1 : 0,
          hasDevServerLink ? serverResp.timestamp || 1 : 0
        );

        // Nếu trên thiết bị hiện tại có video cục bộ mới hơn rõ rệt so với cấu hình dùng chung
        if (
          localMeta?.sourceType === 'local' &&
          savedBlob?.blob &&
          savedBlob.blob.size > 0 &&
          localTimestamp > sharedTimestamp
        ) {
          const url = URL.createObjectURL(savedBlob.blob);
          setExportedVideo({
            sourceType: 'local',
            url,
            blob: savedBlob.blob,
            filename: savedBlob.filename || localMeta.filename || 'video-bai-hoc.mp4',
            duration: savedBlob.duration || localMeta.duration || 0,
            sizeBytes: savedBlob.blob.size,
            timestamp: localTimestamp,
            isUploaded: true,
            isDefault: false,
            storageNote:
              'Video đang lưu cục bộ trong IndexedDB của trình duyệt này (không tự đồng bộ sang thiết bị khác hoặc máy chủ Vercel).',
          });
          return;
        }

        // Nếu cấu hình trong IndexedDB trên trình duyệt là link YouTube/Drive mới hơn
        if (
          localMeta &&
          (localMeta.sourceType === 'youtube' || localMeta.sourceType === 'gdrive') &&
          localMeta.embedUrl &&
          localTimestamp > sharedTimestamp
        ) {
          setExportedVideo({
            sourceType: localMeta.sourceType,
            url: localMeta.embedUrl,
            embedUrl: localMeta.embedUrl,
            originalUrl: localMeta.originalUrl,
            externalId: localMeta.externalId,
            filename: localMeta.filename,
            duration: 0,
            sizeBytes: 0,
            timestamp: localMeta.timestamp,
            isUploaded: true,
            isDefault: false,
            accessible: localMeta.accessible,
            accessMessage: localMeta.accessMessage,
          });
          return;
        }

        // Trong môi trường phát triển (AI Studio), nếu dev server có liên kết mới hơn bản bundle
        if (hasDevServerLink && (serverResp.timestamp || 0) > (sharedConfig.updatedAt || 0)) {
          setExportedVideo({
            sourceType: serverResp.sourceType,
            url: serverResp.embedUrl || serverResp.url,
            embedUrl: serverResp.embedUrl || serverResp.url,
            originalUrl: serverResp.originalUrl,
            externalId: serverResp.externalId,
            filename: serverResp.filename || 'Video bài học trực tuyến',
            duration: 0,
            sizeBytes: 0,
            timestamp: serverResp.timestamp || Date.now(),
            isUploaded: true,
            isDefault: false,
            accessible: serverResp.accessible,
            accessMessage: serverResp.accessMessage,
          });
          return;
        }

        // Ưu tiên cấu hình dùng chung cố định trong mã nguồn (src/config/lessonVideoConfig.ts)
        if (hasSharedRemoteConfig) {
          setExportedVideo(buildSharedFallbackVideo());
          return;
        }

        // Video cục bộ chưa có meta nhưng còn blob trong IndexedDB (chỉ khi không có cấu hình dùng chung)
        if (savedBlob?.blob && savedBlob.blob.size > 0 && (savedBlob.savedAt || 0) > sharedTimestamp) {
          const url = URL.createObjectURL(savedBlob.blob);
          setExportedVideo({
            sourceType: 'local',
            url,
            blob: savedBlob.blob,
            filename: savedBlob.filename || 'video-bai-hoc.mp4',
            duration: savedBlob.duration || 0,
            sizeBytes: savedBlob.blob.size,
            timestamp: savedBlob.savedAt || Date.now(),
            isUploaded: true,
            isDefault: false,
            storageNote:
              'Video đang lưu cục bộ trong IndexedDB của trình duyệt này (không tự đồng bộ sang thiết bị khác hoặc máy chủ Vercel).',
          });
          return;
        }

        setExportedVideo(buildSharedFallbackVideo());
      } catch (e) {
        console.warn('Could not initialize video storage:', e);
        setExportedVideo(buildSharedFallbackVideo());
      }
    }

    initStorage();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleApplyExportedVideoToLesson = (video: ExportedVideo) => {
    setExportedVideo(video);
    setActiveTab('khoi_dong');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mode={mode}
        onModeChange={setMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showTeacherGuide={showTeacherGuide}
        onToggleTeacherGuide={() => setShowTeacherGuide(prev => !prev)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'khoi_dong' && (
          <KhoiDongSection
            exportedVideo={exportedVideo}
            mode={mode}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'kham_pha' && (
          <KhamPhaSection
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'luyen_tap' && (
          <LuyenTapSection
            exportedVideo={exportedVideo}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'van_dung' && (
          <VanDungSection
            mode={mode}
          />
        )}

        {activeTab === 'studio' && (
          <StudioSection
            exportedVideo={exportedVideo}
            onSetExportedVideo={setExportedVideo}
            onApplyToLesson={handleApplyExportedVideoToLesson}
          />
        )}
      </main>

      <TeacherGuideDrawer
        isOpen={showTeacherGuide}
        onClose={() => setShowTeacherGuide(false)}
      />

      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">Bài 12A: Thực hành đa phương tiện</span>
            <span>·</span>
            <span>Tin học Lớp 4</span>
            <span>·</span>
            <span>Giáo dục địa phương TP. Hồ Chí Minh</span>
            <span>·</span>
            <span>Hỗ trợ YouTube / Google Drive / MP4 / WebM</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('studio')}
              className="text-slate-600 hover:text-sky-600 font-medium transition-colors"
            >
              Video bài học
            </button>
            <button
              onClick={() => setShowTeacherGuide(true)}
              className="text-slate-600 hover:text-sky-600 font-medium transition-colors"
            >
              Xem giáo án
            </button>
            <button
              onClick={() => {
                setActiveTab('khoi_dong');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sky-600 hover:text-sky-800 font-bold transition-colors"
            >
              Làm lại từ đầu
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
