import React, { useState } from 'react';
import { InteractiveVideoPlayer } from '../InteractiveVideoPlayer';
import { ExportedVideo, AppTab } from '../../types';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  RotateCcw, 
  AlertCircle,
  Trophy,
  HelpCircle,
  Sparkles,
  Play,
  Pause,
  Volume2,
  SlidersHorizontal
} from 'lucide-react';

interface LuyenTapSectionProps {
  exportedVideo: ExportedVideo | null;
  onNavigateTab: (tab: AppTab) => void;
}

interface Mission {
  id: number;
  title: string;
  description: string;
  guide: string;
  completed: boolean;
  feedback?: string;
  hint?: string;
}

export const LuyenTapSection: React.FC<LuyenTapSectionProps> = ({
  exportedVideo,
  onNavigateTab,
}) => {
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 1,
      title: 'Nhiệm vụ 1: Phát video (Play)',
      description: 'Nhấn vào nút Phát (tam giác) để bắt đầu xem video chuyển động và nghe tiếng.',
      guide: 'Nhấn nút tam giác ▶ ở giữa màn hình hoặc ở góc trái thanh điều khiển.',
      completed: false,
    },
    {
      id: 2,
      title: 'Nhiệm vụ 2: Tạm dừng video đúng yêu cầu (Pause)',
      description: 'Khi video đang chạy, hãy nhấn nút Tạm dừng (❚❚) khi video ở đoạn từ 5 đến 15 giây.',
      guide: 'Quan sát đồng hồ thời gian bên dưới, khi đến khoảng 5s - 15s, hãy nhấn nút tạm dừng ❚❚.',
      completed: false,
    },
    {
      id: 3,
      title: 'Nhiệm vụ 3: Điều chỉnh âm lượng (Volume)',
      description: 'Kéo thanh âm lượng hoặc bấm nút tắt/bật loa để thay đổi mức âm thanh.',
      guide: 'Tìm biểu tượng chiếc loa 🔊 ở thanh dưới và kéo con trượt sang trái hoặc phải.',
      completed: false,
    },
    {
      id: 4,
      title: 'Nhiệm vụ 4: Tua đến đoạn cần xem (Seek)',
      description: 'Kéo nút tròn trên thanh tiến trình tua tới sau mốc 15 giây của video.',
      guide: 'Nhấp chuột hoặc kéo nút tròn trên thanh thời gian sang phía bên phải qua giây thứ 15.',
      completed: false,
    },
    {
      id: 5,
      title: 'Nhiệm vụ 5: Trả lời câu hỏi thực hành',
      description: 'Khi muốn xem lại một chi tiết lịch sử quan trọng mà vừa bị trôi qua, em sẽ dùng nút nào?',
      guide: 'Chọn câu trả lời đúng bên dưới để hoàn tất bài thực hành.',
      completed: false,
    },
  ]);

  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(100);
  const [mission5Selected, setMission5Selected] = useState<number | null>(null);
  const [mission5Checked, setMission5Checked] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Hãy bắt đầu với Nhiệm vụ 1: Nhấn Phát video!');

  const markMissionComplete = (id: number, feedbackMsg: string) => {
    setMissions(prev =>
      prev.map(m => {
        if (m.id === id && !m.completed) {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.6 },
          });
          return { ...m, completed: true, feedback: feedbackMsg, hint: undefined };
        }
        return m;
      })
    );
    setStatusMessage(`Tuyệt vời! ${feedbackMsg}`);
  };

  // Real JS Event Handlers tracking HTML5 video events
  const handlePlayerPlay = () => {
    if (!missions[0].completed) {
      markMissionComplete(1, 'Đã ghi nhận thao tác Phát video thành công!');
    }
  };

  const handlePlayerPause = (time: number) => {
    if (!missions[1].completed) {
      if (time >= 4.5 && time <= 16.0) {
        markMissionComplete(2, `Chính xác! Em đã tạm dừng ở giây thứ ${Math.round(time)} đúng yêu cầu.`);
      } else {
        setStatusMessage(`Em đã tạm dừng ở giây thứ ${Math.round(time)}. Hãy nhấn Phát tiếp và thử tạm dừng trong đoạn 5s - 15s nhé!`);
      }
    }
  };

  const handlePlayerVolume = (vol: number, muted: boolean) => {
    if (!missions[2].completed) {
      markMissionComplete(3, `Đã ghi nhận thao tác chỉnh âm lượng: ${muted ? 'Tắt tiếng (Mute)' : Math.round(vol * 100) + '%'}.`);
    }
  };

  // Seeking & Seeked Event Handlers for HTML5 video
  const processSeekAttempt = (time: number) => {
    if (isNaN(time) || time < 0) {
      setMissions(prev =>
        prev.map(m =>
          m.id === 4
            ? { ...m, hint: 'Thời lượng video không hợp lệ hoặc dữ liệu chưa sẵn sàng.' }
            : m
        )
      );
      return;
    }

    if (time >= 15.0) {
      // Completed successfully
      markMissionComplete(4, '✓ Chính xác! Em đã biết sử dụng thanh tiến trình để tua đến đoạn video cần xem.');
      setMissions(prev =>
        prev.map(m =>
          m.id === 4
            ? {
                ...m,
                completed: true,
                feedback: '✓ Chính xác! Em đã biết sử dụng thanh tiến trình để tua đến đoạn video cần xem.',
                hint: undefined,
              }
            : m
        )
      );
      setStatusMessage('✓ Chính xác! Em đã biết sử dụng thanh tiến trình để tua đến đoạn video cần xem.');
    } else {
      // Seeked to < 15s (e.g. 10s)
      setMissions(prev =>
        prev.map(m =>
          m.id === 4 && !m.completed
            ? {
                ...m,
                completed: false,
                hint: 'Em hãy kéo thanh thời gian đến vị trí từ giây thứ 15 trở đi nhé!',
                feedback: undefined,
              }
            : m
        )
      );
      setStatusMessage(`Em đã tua đến giây thứ ${Math.round(time)}. Em hãy kéo thanh thời gian đến vị trí từ giây thứ 15 trở đi nhé!`);
    }
  };

  const handlePlayerSeeking = (time: number) => {
    // Recorded seeking event from HTML5 video element
    processSeekAttempt(time);
  };

  const handlePlayerSeeked = (time: number) => {
    // Recorded seeked event from HTML5 video element
    processSeekAttempt(time);
  };

  const handlePlayerSeek = (time: number) => {
    processSeekAttempt(time);
  };

  const handlePlayerTimeUpdate = (time: number, dur?: number) => {
    setCurrentVideoTime(time);
    if (dur && !isNaN(dur) && dur > 0) {
      setVideoDuration(dur);
    }
    // Normal playback NEVER modifies Mission 4 status!
  };

  const handleCheckMission5 = () => {
    if (mission5Selected === 1) { // Correct: Nút Xem lại hoặc kéo thanh tiến trình lùi lại
      setMission5Checked(true);
      markMissionComplete(5, 'Chính xác! Ta có thể dùng nút Xem lại (Replay) hoặc kéo thanh tiến trình lùi lại.');
    } else {
      setMission5Checked(true);
      setStatusMessage('Chưa đúng rồi! Nếu muốn xem lại chi tiết vừa trôi qua, ta nên kéo lùi thanh tiến trình hoặc bấm nút Xem lại.');
    }
  };

  const handleResetAllMissions = () => {
    setMissions(prev =>
      prev.map(m => ({
        ...m,
        completed: false,
        feedback: undefined,
        hint: undefined,
      }))
    );
    setMission5Selected(null);
    setMission5Checked(false);
    setStatusMessage('Đã làm lại. Hãy nhấn Phát video để bắt đầu Nhiệm vụ 1!');
  };

  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Activity Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <span>Hoạt động 3</span>
            <span>·</span>
            <span>Luyện tập thực hành thật</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-3">
            Thử tài điều khiển trình phát video
          </h1>
          <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
            Hệ thống sẽ trực tiếp ghi nhận từng hành động bấm chuột của em trên trình phát video HTML5. Hãy hoàn thành lần lượt 5 nhiệm vụ thực hành dưới đây!
          </p>
        </div>
      </div>

      {/* Grid: Left Video Player, Right Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Video Player */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <InteractiveVideoPlayer
              videoUrl={exportedVideo?.url || null}
              title="Khu vực thực hành điều khiển video"
              onPlay={handlePlayerPlay}
              onPause={handlePlayerPause}
              onSeeking={handlePlayerSeeking}
              onSeeked={handlePlayerSeeked}
              onSeek={handlePlayerSeek}
              onVolumeChange={handlePlayerVolume}
              onTimeUpdate={handlePlayerTimeUpdate}
              className="w-full"
            />
          </div>

          {/* Real-time Telemetry / Guidance feedback */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Hệ thống đang theo dõi:</span>
              <span className="text-sky-300 font-sans">{statusMessage}</span>
            </div>
            <span className="text-slate-400 tabular-nums">
              Thời gian hiện tại: {Math.round(currentVideoTime)}s
            </span>
          </div>
        </div>

        {/* Right 5 Missions Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Nhiệm vụ thực hành ({completedCount}/5)
            </h2>
            <button
              onClick={handleResetAllMissions}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Làm lại từ đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>

          <div className="space-y-3">
            {missions.map(m => (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all ${
                  m.completed
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                    : m.hint
                    ? 'bg-amber-50/40 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {m.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className={`text-xs sm:text-sm font-bold ${m.completed ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {m.description}
                    </p>
                    
                    {!m.completed ? (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-sky-700 italic flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span>{m.guide}</span>
                        </p>
                        {m.hint && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2 mt-1.5 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{m.hint}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{m.feedback || '✓ Chính xác! Em đã biết sử dụng thanh tiến trình để tua đến đoạn video cần xem.'}</span>
                      </div>
                    )}

                    {/* Mission 5 Quiz Options */}
                    {m.id === 5 && !m.completed && (
                      <div className="pt-2 space-y-2">
                        {[
                          'Tắt màn hình máy tính',
                          'Kéo thanh tiến trình lùi lại hoặc nhấn nút Xem lại (Replay)',
                          'Bấm nút tăng âm lượng lên tối đa',
                        ].map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => setMission5Selected(optIdx)}
                            className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                              mission5Selected === optIdx
                                ? 'bg-sky-50 border-sky-400 font-medium text-sky-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                        <button
                          onClick={handleCheckMission5}
                          disabled={mission5Selected === null}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
                        >
                          Xác nhận câu trả lời
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* All Missions Complete Celebration */}
          {completedCount === 5 && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-center space-y-3 shadow-xl">
              <Trophy className="w-10 h-10 text-amber-300 mx-auto animate-bounce" />
              <div>
                <h3 className="text-lg font-extrabold font-display">
                  Hoan hô! Em đã trở thành Bậc thầy điều khiển Video!
                </h3>
                <p className="text-xs text-emerald-100 mt-1">
                  Em đã thành thạo toàn bộ các kỹ năng đa phương tiện của Bài 12A. Hãy cùng các bạn bắt tay vào Dự án nhóm khám phá TP.HCM nhé!
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('van_dung')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <span>Sang Phần 4: Vận dụng (Dự án nhóm)</span>
                <ArrowRight className="w-4 h-4 text-emerald-800" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
