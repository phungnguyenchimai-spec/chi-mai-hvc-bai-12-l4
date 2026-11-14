import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MULTIMEDIA_CONTROLS } from '../../data/sampleData';
import { AppTab } from '../../types';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  SlidersHorizontal, 
  Volume2, 
  RotateCcw, 
  Maximize,
  CheckCircle2, 
  ArrowRight, 
  HelpCircle,
  Sparkles,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

interface KhamPhaSectionProps {
  onNavigateTab: (tab: AppTab) => void;
}

const ICON_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  Play,
  Pause,
  SlidersHorizontal,
  Volume2,
  RotateCcw,
  Maximize,
};

const SANDBOX_SUCCESS_MESSAGES: Record<string, string> = {
  play: 'Tuyệt vời! Em đã nhấn Phát (Play) để video bắt đầu chạy.',
  pause: 'Chính xác! Em đã Tạm dừng (Pause) video đúng cách.',
  progress: 'Giỏi lắm! Em đã kéo thanh tiến trình để tua đến thời điểm mới.',
  volume: 'Tuyệt vời! Em đã điều chỉnh mức âm lượng thành công.',
  replay: 'Hoan hô! Em đã thực hiện Xem lại (Replay) video từ đầu.',
  fullscreen: 'Xuất sắc! Em đã thử nghiệm chế độ Toàn màn hình (Fullscreen).',
};

export const KhamPhaSection: React.FC<KhamPhaSectionProps> = ({ onNavigateTab }) => {
  // Matching Game State
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [wrongMatch, setWrongMatch] = useState<{ iconId: string; funcId: string } | null>(null);

  // Active Sandbox Inspector
  const [activeInspectorId, setActiveInspectorId] = useState<string>('play');
  const [sandboxVolume, setSandboxVolume] = useState<number>(80);
  const [sandboxPlaying, setSandboxPlaying] = useState<boolean>(false);
  const [sandboxProgress, setSandboxProgress] = useState<number>(35);
  const [sandboxFeedback, setSandboxFeedback] = useState<string | null>(null);

  // Refs to prevent duplicate fireworks during slider drag or rapid clicks
  const lastFireworksAtRef = useRef<number>(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const volumeStartRef = useRef<number>(80);
  const volumeCurrentRef = useRef<number>(80);
  const isDraggingVolumeRef = useRef<boolean>(false);
  const volumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressStartRef = useRef<number>(35);
  const progressCurrentRef = useRef<number>(35);
  const isDraggingProgressRef = useRef<boolean>(false);
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeControl = MULTIMEDIA_CONTROLS.find(c => c.id === activeInspectorId) || MULTIMEDIA_CONTROLS[0];

  const triggerSandboxFireworks = useCallback((controlId: string) => {
    const now = Date.now();
    if (now - lastFireworksAtRef.current >= 500) {
      lastFireworksAtRef.current = now;
      confetti({
        particleCount: 45,
        spread: 68,
        startVelocity: 32,
        ticks: 115, // Tự kết thúc nhẹ nhàng sau khoảng ~1.9 - 2 giây, không che thao tác
        origin: { y: 0.72 },
        colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6'],
      });
    }

    const msg = SANDBOX_SUCCESS_MESSAGES[controlId];
    if (msg) {
      setSandboxFeedback(msg);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setSandboxFeedback(null);
      }, 2200);
    }
  }, []);

  const commitVolumePractice = useCallback(() => {
    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
      volumeDebounceRef.current = null;
    }
    const finalVal = volumeCurrentRef.current;
    if (finalVal !== volumeStartRef.current) {
      volumeStartRef.current = finalVal;
      triggerSandboxFireworks('volume');
    }
  }, [triggerSandboxFireworks]);

  const commitProgressPractice = useCallback(() => {
    if (progressDebounceRef.current) {
      clearTimeout(progressDebounceRef.current);
      progressDebounceRef.current = null;
    }
    const finalVal = progressCurrentRef.current;
    if (finalVal !== progressStartRef.current) {
      progressStartRef.current = finalVal;
      triggerSandboxFireworks('progress');
    }
  }, [triggerSandboxFireworks]);

  // Ensure slider drag release is captured even if pointer moves outside the slider track
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingVolumeRef.current) {
        isDraggingVolumeRef.current = false;
        commitVolumePractice();
      }
      if (isDraggingProgressRef.current) {
        isDraggingProgressRef.current = false;
        commitProgressPractice();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [commitVolumePractice, commitProgressPractice]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
    };
  }, []);

  const handleSelectInspectorControl = (controlId: string) => {
    // Chỉ chuyển mục xem hướng dẫn, KHÔNG bắn pháo hoa
    setActiveInspectorId(controlId);
    setSandboxFeedback(null);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const handleIconClick = (id: string) => {
    if (matchedPairs.includes(id)) return;
    setSelectedIconId(id);
    setWrongMatch(null);
  };

  const handleFunctionClick = (id: string) => {
    if (matchedPairs.includes(id)) return;
    if (!selectedIconId) return;

    if (selectedIconId === id) {
      // Correct Match!
      const nextMatched = [...matchedPairs, id];
      setMatchedPairs(nextMatched);
      setSelectedIconId(null);
      setWrongMatch(null);

      if (nextMatched.length === MULTIMEDIA_CONTROLS.length) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#f59e0b'],
        });
      }
    } else {
      // Wrong Match
      setWrongMatch({ iconId: selectedIconId, funcId: id });
      setTimeout(() => setWrongMatch(null), 900);
    }
  };

  const handleResetGame = () => {
    setMatchedPairs([]);
    setSelectedIconId(null);
    setWrongMatch(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Activity Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-teal-200 text-xs font-semibold uppercase tracking-wider">
            <span>Hoạt động 2</span>
            <span>·</span>
            <span>Khám phá công cụ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-3">
            Làm quen các nút điều khiển đa phương tiện
          </h1>
          <p className="text-sm sm:text-base text-teal-50 leading-relaxed">
            Một trình phát video chuẩn luôn có các nút chức năng quen thuộc. Em hãy tìm hiểu ý nghĩa của từng nút bấm qua trò chơi ghép nối và thử nghiệm tương tác nhé!
          </p>
        </div>
      </div>

      {/* Part A: Trò chơi ghép biểu tượng với chức năng */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Trò chơi: Ghép biểu tượng với chức năng đúng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bước 1: Chọn một biểu tượng ở cột bên trái &rarr; Bước 2: Chọn thẻ chức năng tương ứng ở cột bên phải.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              Đã ghép: {matchedPairs.length} / {MULTIMEDIA_CONTROLS.length}
            </span>
            <button
              onClick={handleResetGame}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Chơi lại từ đầu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chơi lại</span>
            </button>
          </div>
        </div>

        {/* 2-Column Matching Canvas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Icons */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cột A: Biểu tượng nút điều khiển
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {MULTIMEDIA_CONTROLS.map(item => {
                const isMatched = matchedPairs.includes(item.id);
                const isSelected = selectedIconId === item.id;
                const isWrong = wrongMatch?.iconId === item.id;
                const IconComponent = ICON_COMPONENTS[item.icon] || Play;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleIconClick(item.id)}
                    disabled={isMatched}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 relative ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 opacity-80 cursor-default'
                        : isWrong
                        ? 'bg-rose-50 border-rose-400 text-rose-700 animate-shake'
                        : isSelected
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/50 text-sky-900 shadow-sm scale-105'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      isMatched ? 'bg-emerald-200/60' : isSelected ? 'bg-sky-200' : 'bg-white shadow-2xs'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold truncate max-w-full">
                      {item.symbol} {item.name.split(' (')[0]}
                    </span>
                    {isMatched && (
                      <span className="absolute top-1.5 right-1.5 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Function Descriptions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cột B: Ý nghĩa &amp; Chức năng
            </h3>
            <div className="space-y-2">
              {MULTIMEDIA_CONTROLS.map(item => {
                const isMatched = matchedPairs.includes(item.id);
                const isWrong = wrongMatch?.funcId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleFunctionClick(item.id)}
                    disabled={isMatched}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isMatched
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 cursor-default'
                        : isWrong
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : selectedIconId
                        ? 'bg-white border-sky-300 hover:bg-sky-50/50 hover:border-sky-400 text-slate-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isMatched ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestone Card when all matched */}
        {matchedPairs.length === MULTIMEDIA_CONTROLS.length && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-2">
            <h4 className="text-sm font-bold text-emerald-900 font-display">
              Xuất sắc! Em đã ghép đúng toàn bộ các nút điều khiển đa phương tiện.
            </h4>
            <p className="text-xs text-slate-600">
              Hãy thử nghiệm phòng thí nghiệm tương tác bên dưới để xem các nút hoạt động thực tế!
            </p>
          </div>
        )}
      </div>

      {/* Part B: Phòng Thí Nghiệm Tương Tác Trực Quan */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Lightbulb className="w-4 h-4" />
            <span>Phòng thí nghiệm tương tác trực quan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display">
            Thử nghiệm trực tiếp từng nút bấm
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Nhấp vào từng nút để quan sát phản hồi trực tiếp của màn hình máy tính!
          </p>
        </div>

        {/* Control Selector Buttons */}
        <div className="flex flex-wrap gap-2">
          {MULTIMEDIA_CONTROLS.map(c => {
            const isSelected = activeInspectorId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectInspectorControl(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{c.symbol}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Simulation Sandbox Box */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Description & Guidance */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium">
              <span>Đang kiểm tra: {activeControl.name}</span>
            </div>
            <h3 className="text-lg font-bold font-display text-white">
              {activeControl.symbol} {activeControl.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {activeControl.description}
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-sky-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <span>{activeControl.actionGuide}</span>
            </div>
          </div>

          {/* Right: Live Interactive Demo Target */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mô phỏng thao tác học sinh
            </h4>

            {activeInspectorId === 'play' || activeInspectorId === 'pause' ? (
              <div className="space-y-3 text-center">
                <div className={`p-4 rounded-xl border transition-all ${sandboxPlaying ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                  <p className="text-xs font-semibold">
                    Trạng thái màn hình: {sandboxPlaying ? '▶ Đang phát video chuyển động...' : '❚❚ Đang tạm dừng'}
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxPlaying(true);
                      triggerSandboxFireworks('play');
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Thử nhấn Phát (Play)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxPlaying(false);
                      triggerSandboxFireworks('pause');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Thử Tạm dừng (Pause)</span>
                  </button>
                </div>
              </div>
            ) : activeInspectorId === 'volume' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Mức âm lượng hiện tại:</span>
                  <span className="font-mono text-sky-400 font-bold">{sandboxVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sandboxVolume}
                  onPointerDown={() => {
                    isDraggingVolumeRef.current = true;
                    volumeStartRef.current = sandboxVolume;
                  }}
                  onTouchStart={() => {
                    isDraggingVolumeRef.current = true;
                    volumeStartRef.current = sandboxVolume;
                  }}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    volumeCurrentRef.current = nextVal;
                    setSandboxVolume(nextVal);
                    if (!isDraggingVolumeRef.current) {
                      if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
                      volumeDebounceRef.current = setTimeout(() => {
                        commitVolumePractice();
                      }, 220);
                    }
                  }}
                  onPointerUp={() => {
                    isDraggingVolumeRef.current = false;
                    commitVolumePractice();
                  }}
                  onTouchEnd={() => {
                    isDraggingVolumeRef.current = false;
                    commitVolumePractice();
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <p className="text-xs text-slate-400">
                  {sandboxVolume === 0 ? '🔇 Đang tắt tiếng hoàn toàn (Mute)' : sandboxVolume > 70 ? '🔊 Âm thanh to, rõ ràng cho cả lớp nghe' : '🔉 Âm lượng vừa phải'}
                </p>
              </div>
            ) : activeInspectorId === 'progress' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                  <span>00:{sandboxProgress.toString().padStart(2, '0')}</span>
                  <span className="text-sky-400">Thời lượng: 01:40</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sandboxProgress}
                  onPointerDown={() => {
                    isDraggingProgressRef.current = true;
                    progressStartRef.current = sandboxProgress;
                  }}
                  onTouchStart={() => {
                    isDraggingProgressRef.current = true;
                    progressStartRef.current = sandboxProgress;
                  }}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    progressCurrentRef.current = nextVal;
                    setSandboxProgress(nextVal);
                    if (!isDraggingProgressRef.current) {
                      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
                      progressDebounceRef.current = setTimeout(() => {
                        commitProgressPractice();
                      }, 220);
                    }
                  }}
                  onPointerUp={() => {
                    isDraggingProgressRef.current = false;
                    commitProgressPractice();
                  }}
                  onTouchEnd={() => {
                    isDraggingProgressRef.current = false;
                    commitProgressPractice();
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <p className="text-xs text-slate-400">
                  Kéo con trượt để tua video đến giây thứ {sandboxProgress}.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-300">
                  Nhấn nút để kích hoạt tính năng {activeControl.name}:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (activeInspectorId === 'replay') {
                      setSandboxProgress(0);
                      progressStartRef.current = 0;
                      progressCurrentRef.current = 0;
                    }
                    triggerSandboxFireworks(activeInspectorId);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all"
                >
                  Kích hoạt {activeControl.name}
                </button>
              </div>
            )}

            {sandboxFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sandboxFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Transition to Practice */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => onNavigateTab('luyen_tap')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Đã hiểu bài &rarr; Sang Phần 3: Luyện tập</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
