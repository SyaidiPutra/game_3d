import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Question } from '../types/game.ts';
import { sound } from '../audio/soundEffects.ts';
import { Sparkles, HelpCircle, X, CheckCircle2, AlertCircle, ArrowRight, Award } from 'lucide-react';

interface RiddleModalProps {
  question: Question;
  isAlreadySolvedByMe: boolean;
  isSolvedInRoom: boolean;
  onClose: () => void;
  onSubmitAnswer: (answer: string, timeTaken: number) => Promise<{ isCorrect: boolean; message: string; explanation?: string; hint?: string }>;
}

export const RiddleModal: React.FC<RiddleModalProps> = ({
  question,
  isAlreadySolvedByMe,
  isSolvedInRoom,
  onClose,
  onSubmitAnswer,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    explanation?: string;
  }>({
    status: isAlreadySolvedByMe ? 'success' : 'idle',
    message: isAlreadySolvedByMe ? 'Teka-teki ini sudah berhasil kamu pecahkan!' : '',
    explanation: question.explanation,
  });

  const [startTime] = useState<number>(Date.now());

  const handleSelectOption = (opt: string) => {
    if (feedback.status === 'success') return;
    sound.playClick();
    setSelectedOption(opt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    const timeTaken = Math.max(3, Math.round((Date.now() - startTime) / 1000));

    try {
      const res = await onSubmitAnswer(selectedOption, timeTaken);
      if (res.isCorrect) {
        sound.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#f59e0b', '#10b981', '#ec4899'],
        });
        setFeedback({
          status: 'success',
          message: res.message || 'Luar biasa! Teka-teki kuno terpecahkan!',
          explanation: res.explanation || question.explanation,
        });
      } else {
        sound.playError();
        setFeedback({
          status: 'error',
          message: res.message || 'Jawaban belum tepat. Coba diskusikan dengan rekan tim!',
        });
      }
    } catch {
      setFeedback({
        status: 'error',
        message: 'Gagal mengirim jawaban ke server. Coba beberapa saat lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/60 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-5 overflow-hidden">
        
        {/* Ancient decorative corner runes */}
        <div className="absolute top-2 left-2 text-cyan-600/30 text-xs font-mono select-none">ᛝ ᚛ ᛟ</div>
        <div className="absolute top-2 right-12 text-cyan-600/30 text-xs font-mono select-none">ᛏ ᚨ ᛊ</div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Stasiun #{question.stationId} &bull; {question.stationName}</span>
              {isSolvedInRoom && (
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700">
                  Energi Kuil Aktif
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white font-serif tracking-wide">
              {question.title}
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lore / Riddle Quote Banner */}
        {question.riddle && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-900/60 text-cyan-200/90 text-sm italic font-serif leading-relaxed">
            &ldquo;{question.riddle}&rdquo;
          </div>
        )}

        {/* Main Question Statement */}
        <div className="text-white text-base md:text-lg font-semibold leading-snug">
          {question.question}
        </div>

        {/* Options Selection */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {question.options?.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = selectedOption === opt;
            const isSuccess = feedback.status === 'success';

            return (
              <button
                key={opt}
                type="button"
                disabled={isSuccess}
                onClick={() => handleSelectOption(opt)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 text-white shadow-md shadow-cyan-500/20'
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                } ${isSuccess ? 'cursor-default opacity-85' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {letter}
                </div>
                <div className="text-sm font-medium leading-relaxed">{opt}</div>
              </button>
            );
          })}

          {/* Feedback & Explanation Alert */}
          {feedback.status === 'success' && (
            <div className="mt-2 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-300 mb-1">{feedback.message}</p>
                {feedback.explanation && (
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                    <strong>Penjelasan Arkana:</strong> {feedback.explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          {feedback.status === 'error' && (
            <div className="mt-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm text-rose-200 leading-relaxed">{feedback.message}</p>
            </div>
          )}

          {/* Hint Disclosure */}
          {question.hint && (
            <div className="mt-1">
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowHint(true);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Butuh Petunjuk Kuno? (+Lihat Petunjuk)</span>
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs leading-relaxed">
                  <strong>💡 Petunjuk Guru:</strong> {question.hint}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Award className="w-4 h-4" />
              <span>Nilai: +{question.points} Poin</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup Altar
              </button>

              {feedback.status !== 'success' && (
                <button
                  type="submit"
                  disabled={!selectedOption || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>{isSubmitting ? 'Memeriksa...' : 'Sumpahkan Jawaban'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
