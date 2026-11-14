import React from 'react';
import { AppMode, AppTab } from '../types';
import { 
  PlaySquare, 
  Compass, 
  Gamepad2, 
  Users, 
  Clapperboard, 
  BookOpen, 
  Maximize2, 
  Minimize2,
  GraduationCap,
  Home
} from 'lucide-react';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleTeacherGuide: () => void;
  showTeacherGuide: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  mode,
  onModeChange,
  isFullscreen,
  onToggleFullscreen,
  onToggleTeacherGuide,
  showTeacherGuide,
}) => {
  const tabs: { id: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'khoi_dong', label: '1. Khởi động', icon: PlaySquare },
    { id: 'kham_pha', label: '2. Khám phá', icon: Compass },
    { id: 'luyen_tap', label: '3. Luyện tập', icon: Gamepad2 },
    { id: 'van_dung', label: '4. Vận dụng', icon: Users },
    { id: 'studio', label: '5. Video bài học', icon: Clapperboard },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); onTabChange('khoi_dong'); }}
                className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight font-display hover:text-sky-600 transition-colors"
              >
                Bài 12A: Thực hành đa phương tiện
              </a>
              <span className="text-xs text-slate-500 hidden sm:inline">Tin học Lớp 4 · TP. Hồ Chí Minh</span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-line, clean segmented buttons) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Utilities */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mode switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => onModeChange('classroom')}
                title="Chế độ giảng dạy trên lớp (Trình chiếu, hướng dẫn sư phạm)"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  mode === 'classroom'
                    ? 'bg-sky-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trên lớp</span>
              </button>
              <button
                onClick={() => onModeChange('self_study')}
                title="Chế độ tự học ở nhà (Gợi ý từng bước, tự đánh giá)"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  mode === 'self_study'
                    ? 'bg-sky-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tự học</span>
              </button>
            </div>

            {/* Teacher Guide Drawer toggle */}
            <button
              onClick={onToggleTeacherGuide}
              title="Xem hướng dẫn giáo viên & mục tiêu bài học"
              className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                showTeacherGuide
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">Giáo án</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình máy chiếu'}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
