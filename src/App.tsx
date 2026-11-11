import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TeacherGuideDrawer } from './components/TeacherGuideDrawer';
import { KhoiDongSection } from './components/sections/KhoiDongSection';
import { KhamPhaSection } from './components/sections/KhamPhaSection';
import { LuyenTapSection } from './components/sections/LuyenTapSection';
import { VanDungSection } from './components/sections/VanDungSection';
import { StudioSection } from './components/sections/StudioSection';
import { AppMode, AppTab, ProjectData, ExportedVideo } from './types';
import { INITIAL_PROJECT } from './data/sampleData';
import { loadProjects, loadExportedVideoBlob } from './utils/db';
import { 
  PlaySquare, 
  Compass, 
  Gamepad2, 
  Users, 
  Clapperboard, 
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('khoi_dong');
  const [mode, setMode] = useState<AppMode>('classroom');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTeacherGuide, setShowTeacherGuide] = useState<boolean>(false);

  // Active Project Data
  const [currentProject, setCurrentProject] = useState<ProjectData>(INITIAL_PROJECT);
  // Exported Video (real WebM blob url)
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo | null>(null);

  // Load saved projects & video from IndexedDB on startup
  useEffect(() => {
    async function initStorage() {
      try {
        const projects = await loadProjects();
        if (projects && projects.length > 0) {
          setCurrentProject(projects[0]);
        }

        const savedVideo = await loadExportedVideoBlob('active-exported-video');
        if (savedVideo) {
          const url = URL.createObjectURL(savedVideo.blob);
          setExportedVideo({
            url,
            blob: savedVideo.blob,
            filename: savedVideo.filename,
            duration: savedVideo.duration,
            sizeBytes: savedVideo.blob.size,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn('Could not initialize from IndexedDB:', e);
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
            currentProject={currentProject}
            onUpdateProject={setCurrentProject}
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

      {/* Footer (Clean, unboxed metadata, zero-slop discipline) */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">Bài 12A: Thực hành đa phương tiện</span>
            <span>·</span>
            <span>Tin học Lớp 4</span>
            <span>·</span>
            <span>Giáo dục địa phương TP. Hồ Chí Minh</span>
            <span>·</span>
            <span>Chuẩn HTML5 / WebM</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('studio')}
              className="text-slate-600 hover:text-sky-600 font-medium transition-colors"
            >
              Studio tạo video
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
