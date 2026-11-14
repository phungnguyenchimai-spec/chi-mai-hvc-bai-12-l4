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

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('khoi_dong');
  const [mode, setMode] = useState<AppMode>('classroom');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTeacherGuide, setShowTeacherGuide] = useState<boolean>(false);

  // Active Lesson Video (local blob, Google Drive embed, YouTube embed, or default sample)
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo | null>(null);

  // Restore saved video source on startup (IndexedDB for local/device + API for multi-device links)
  useEffect(() => {
    async function initStorage() {
      try {
        const [localMeta, savedBlob, serverResp] = await Promise.all([
          loadActiveVideoSourceMeta(),
          loadExportedVideoBlob('active-exported-video'),
          fetch('/api/active-lesson-video').then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        const hasServerLink =
          serverResp &&
          serverResp.exists &&
          (serverResp.sourceType === 'youtube' || serverResp.sourceType === 'gdrive');

        const localTimestamp = localMeta?.timestamp || savedBlob?.savedAt || 0;
        const serverTimestamp = serverResp?.timestamp || 0;

        // 1. If device has a locally stored video that is newer than or equal to server link
        if (
          localMeta?.sourceType === 'local' &&
          savedBlob?.blob &&
          savedBlob.blob.size > 0 &&
          (!hasServerLink || localTimestamp >= serverTimestamp)
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
          });
          return;
        }

        // 2. If server has a saved YouTube / Google Drive link (cross-device sync)
        if (hasServerLink) {
          setExportedVideo({
            sourceType: serverResp.sourceType,
            url: serverResp.embedUrl || serverResp.url,
            embedUrl: serverResp.embedUrl || serverResp.url,
            originalUrl: serverResp.originalUrl,
            externalId: serverResp.externalId,
            filename: serverResp.filename || 'Video bài học trực tuyến',
            duration: 0,
            sizeBytes: 0,
            timestamp: serverTimestamp,
            isUploaded: true,
            isDefault: false,
            accessible: serverResp.accessible,
            accessMessage: serverResp.accessMessage,
          });
          return;
        }

        // 3. If IndexedDB has an external link metadata record
        if (localMeta && (localMeta.sourceType === 'youtube' || localMeta.sourceType === 'gdrive') && localMeta.embedUrl) {
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

        // 4. If IndexedDB has a saved local blob without meta
        if (savedBlob?.blob && savedBlob.blob.size > 0) {
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
          });
          return;
        }

        // 5. Fallback default sample video
        setExportedVideo({
          sourceType: 'default',
          url: '/video/default-lesson-hcm.webm',
          filename: 'KhamPha_TPHCM_HD720p.webm',
          duration: 18.6,
          sizeBytes: 1958608,
          timestamp: Date.now(),
          isDefault: true,
          isUploaded: false,
        });
      } catch (e) {
        console.warn('Could not initialize video storage:', e);
        setExportedVideo({
          sourceType: 'default',
          url: '/video/default-lesson-hcm.webm',
          filename: 'KhamPha_TPHCM_HD720p.webm',
          duration: 18.6,
          sizeBytes: 1958608,
          timestamp: Date.now(),
          isDefault: true,
          isUploaded: false,
        });
      }
    }

    initStorage();
  }, []);

  // Fullscreen Listener
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
      {/* Top Bar Contract Navigation */}
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

      {/* Main Educational Workspace */}
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

      {/* Teacher Guide Side Drawer */}
      <TeacherGuideDrawer
        isOpen={showTeacherGuide}
        onClose={() => setShowTeacherGuide(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">Bài 12A: Thực hành đa phương tiện</span>
            <span>·</span>
            <span>Tin học Lớp 4</span>
            <span>·</span>
            <span>Giáo dục địa phương TP. Hồ Chí Minh</span>
            <span>·</span>
            <span>Hỗ trợ MP4 / WebM / Drive / YouTube</span>
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
