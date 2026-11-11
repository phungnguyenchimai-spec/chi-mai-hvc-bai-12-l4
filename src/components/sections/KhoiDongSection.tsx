import React, { useState } from 'react';
import { InteractiveVideoPlayer } from '../InteractiveVideoPlayer';
import { KHOI_DONG_QUESTIONS } from '../../data/sampleData';
import { AppMode, AppTab, ExportedVideo } from '../../types';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  HelpCircle,
  Video,
  Award
} from 'lucide-react';

interface KhoiDongSectionProps {
  exportedVideo: ExportedVideo | null;
  mode: AppMode;
  onNavigateTab: (tab: AppTab) => void;
}

export const KhoiDongSection: React.FC<KhoiDongSectionProps> = ({
  exportedVideo,
  mode,
  onNavigateTab,
}) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (submitted[questionId]) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleCheckAnswer = (questionId: string) => {
    const question = KHOI_DONG_QUESTIONS.find(q => q.id === questionId);
    if (!question || userAnswers[questionId] === undefined) return;

    setSubmitted(prev => ({ ...prev, [questionId]: true }));

    const isCorrect = userAnswers[questionId] === question.correctIndex;
    if (isCorrect) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#38bdf8', '#818cf8', '#34d399'],
      });
    }
  };

  const handleResetQuestions = () => {
    setUserAnswers({});
    setSubmitted({});
  };

  const totalQuestions = KHOI_DONG_QUESTIONS.length;
  const answeredCount = Object.keys(submitted).length;
  const correctCount = KHOI_DONG_QUESTIONS.filter(
    q => submitted[q.id] && userAnswers[q.id] === q.correctIndex
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Activity Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-sky-200 text-xs font-semibold uppercase tracking-wider">
            <span>Hoạt động 1</span>
            <span>·</span>
            <span>Khởi động cùng đa phương tiện</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-3">
            Khám phá Thành phố Hồ Chí Minh qua Video
          </h1>
          <p className="text-sm sm:text-base text-sky-100 leading-relaxed">
            Các em hãy quan sát kỹ các hình ảnh, lắng nghe âm thanh và lời thuyết minh trong đoạn video dưới đây, sau đó cùng nhau trả lời các câu hỏi thú vị nhé!
          </p>
          
          {exportedVideo && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 text-xs font-medium backdrop-blur-xs">
              <Video className="w-4 h-4 text-emerald-300" />
              <span>Đang sử dụng video do Giáo viên xuất từ Studio ({exportedVideo.filename})</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Left Video Player (60-70%), Right Question Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Video Player */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <InteractiveVideoPlayer
              videoUrl={exportedVideo?.url || null}
              title={exportedVideo ? 'Video bài học đã duyệt' : 'Dự án mẫu: Khám phá TP. Hồ Chí Minh'}
              className="w-full"
            />
          </div>

          <div className="bg-slate-100/70 p-4 rounded-xl text-xs text-slate-600 flex items-start gap-3 border border-slate-200/60">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Gợi ý quan sát:</span>
              <p className="mt-0.5">
                Chú ý thời điểm xuất hiện của các di tích lịch sử như Bến Nhà Rồng (năm 1911), Dinh Độc Lập (ngày 30/4/1975) và Bưu điện Trung tâm Thành phố để trả lời chính xác các câu hỏi bên cạnh.
              </p>
            </div>
          </div>
        </div>

        {/* Right Questions Deck */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-sky-600" />
              Câu hỏi tương tác
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-md border border-sky-200">
                Đúng {correctCount}/{totalQuestions}
              </span>
              <button
                onClick={handleResetQuestions}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Làm lại tất cả câu hỏi"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {KHOI_DONG_QUESTIONS.map((q, qIndex) => {
              const selected = userAnswers[q.id];
              const isSubmitted = submitted[q.id];
              const isCorrect = selected === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-rose-50/50 border-rose-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    <span className="text-sky-600 font-mono mr-1.5">Câu {qIndex + 1}:</span>
                    {q.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, optIndex) => {
                      const isOptionSelected = selected === optIndex;
                      let optionClasses = 'border-slate-200 text-slate-700 hover:bg-slate-50';

                      if (isSubmitted) {
                        if (optIndex === q.correctIndex) {
                          optionClasses = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold';
                        } else if (isOptionSelected) {
                          optionClasses = 'bg-rose-100 border-rose-300 text-rose-900 line-through';
                        } else {
                          optionClasses = 'opacity-60 border-slate-200';
                        }
                      } else if (isOptionSelected) {
                        optionClasses = 'bg-sky-50 border-sky-400 text-sky-900 font-medium';
                      }

                      return (
                        <button
                          key={optIndex}
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          disabled={isSubmitted}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all ${optionClasses}`}
                        >
                          <span>{opt}</span>
                          {isSubmitted && optIndex === q.correctIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                          {isSubmitted && isOptionSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit / Feedback Button */}
                  {!isSubmitted ? (
                    <button
                      onClick={() => handleCheckAnswer(q.id)}
                      disabled={selected === undefined}
                      className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Kiểm tra câu trả lời
                    </button>
                  ) : (
                    <div className="mt-2 text-xs p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-slate-700">
                      <span className="font-semibold text-slate-900">Giải thích: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completion Milestone & Transition */}
          {answeredCount === totalQuestions && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-sky-200 text-center space-y-3">
              <Award className="w-8 h-8 text-sky-600 mx-auto" />
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">
                  Chúc mừng em đã hoàn thành Khởi động!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Em đã trả lời đúng {correctCount}/{totalQuestions} câu hỏi. Bây giờ hãy cùng khám phá các nút điều khiển của công cụ đa phương tiện nhé!
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('kham_pha')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>Sang Phần 2: Khám phá</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
