import React from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { QUESTIONS } from '../data/cbtQuestions';

interface QuestionGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  answers: Record<number, any>;
  currentQuestionId: number;
  onSelectQuestion: (questionId: number) => void;
}

export const QuestionGridModal: React.FC<QuestionGridModalProps> = ({
  isOpen,
  onClose,
  answers,
  currentQuestionId,
  onSelectQuestion,
}) => {
  if (!isOpen) return null;

  const isQuestionAnswered = (qId: number) => {
    const a = answers[qId];
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) {
      return a.length > 0 && a.some((x) => x !== null && x !== undefined);
    }
    return String(a).trim().length > 0;
  };

  const totalAnswered = QUESTIONS.filter((q) => isQuestionAnswered(q.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Daftar Nomor Soal</h3>
            <p className="text-xs text-slate-500">
              Terjawab: <strong className="text-emerald-600">{totalAnswered}</strong> dari{' '}
              {QUESTIONS.length} Soal
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 py-2 px-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-1 text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            Sudah Terjawab
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300 inline-block"></span>
            Belum Dijawab
          </div>
          <div className="flex items-center gap-1 text-blue-700">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
            Sedang Dilihat
          </div>
        </div>

        {/* Grid */}
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
            {QUESTIONS.map((q) => {
              const answered = isQuestionAnswered(q.id);
              const isCurrent = currentQuestionId === q.id;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelectQuestion(q.id);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center h-12 rounded-xl font-bold text-sm transition-all border ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300 scale-105'
                      : answered
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{q.id}</span>
                  {answered ? (
                    <CheckCircle2 className={`w-3 h-3 ${isCurrent ? 'text-white' : 'text-emerald-600'}`} />
                  ) : (
                    <Circle className={`w-2.5 h-2.5 opacity-30 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold"
          >
            Kembali ke Ujian
          </button>
        </div>
      </div>
    </div>
  );
};
