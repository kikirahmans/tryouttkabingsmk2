import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Grid,
  CheckCircle,
  HelpCircle,
  Maximize2,
  FileText,
} from 'lucide-react';
import { Student } from '../data/studentsData';
import { PASSAGES, QUESTIONS, EXAM_CONFIG, calculateScore, Question } from '../data/cbtQuestions';
import { QuestionGridModal } from './QuestionGridModal';
import {
  ExamSubmissionPayload,
  sendSubmissionToGoogleSheets,
  sendViolationToGoogleSheets,
} from '../services/googleSheetsService';

interface ExamScreenProps {
  student: Student;
  deviceInfo: any;
  onFinishExam: (result: any) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  student,
  deviceInfo,
  onFinishExam,
}) => {
  const [currentPassageIdx, setCurrentPassageIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, any>>(() => {
    // Restore answers from localStorage if student refreshed or phone died
    try {
      const saved = localStorage.getItem(`cbt_ans_${student.nisn}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const savedTime = localStorage.getItem(`cbt_time_${student.nisn}`);
      return savedTime ? parseInt(savedTime, 10) : EXAM_CONFIG.durationSeconds;
    } catch (e) {
      return EXAM_CONFIG.durationSeconds;
    }
  });

  const [violations, setViolations] = useState<Array<{ type: string; time: string }>>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [showGridModal, setShowGridModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);

  const startTimeRef = useRef<string>(new Date().toISOString());
  const lastViolationTimeRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  const currentPassage = PASSAGES[currentPassageIdx];
  const questionsInPassage = useMemo(() => {
    return QUESTIONS.filter(
      (q) => q.id >= currentPassage.range[0] && q.id <= currentPassage.range[1]
    );
  }, [currentPassageIdx]);

  // Request fullscreen on mount
  useEffect(() => {
    const enterFS = () => {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen().catch(() => {});
    };
    enterFS();
  }, []);

  // Save answers to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(`cbt_ans_${student.nisn}`, JSON.stringify(answers));
    } catch (e) {}
  }, [answers, student.nisn]);

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isFinishedRef.current) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        try {
          localStorage.setItem(`cbt_time_${student.nisn}`, String(next));
        } catch (e) {}

        if (next <= 0) {
          clearInterval(timer);
          handleFinish('Waktu Habis');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [student.nisn]);

  // Heartbeat ping to server every 12 seconds
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (isFinishedRef.current) return;

      const answeredCount = Object.keys(answers).filter((k) => {
        const val = answers[Number(k)];
        if (Array.isArray(val)) return val.length > 0;
        return val !== undefined && val !== null;
      }).length;

      fetch('/api/exam/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: student.nisn,
          currentPassage: currentPassageIdx,
          currentQuestion: currentPassage.range[0],
          answeredCount,
          timeLeft,
          violations: violations.length,
          deviceInfo,
        }),
      }).catch(() => {});
    }, 12000);

    return () => clearInterval(pingInterval);
  }, [student.nisn, currentPassageIdx, answers, timeLeft, violations.length, deviceInfo]);

  // Anti-cheat Detection
  const recordViolation = (type: string) => {
    if (isFinishedRef.current) return;
    const now = Date.now();
    // Debounce rapid multi-triggers
    if (now - lastViolationTimeRef.current < 1500) return;
    lastViolationTimeRef.current = now;

    const violationObj = { type, time: new Date().toLocaleTimeString('id-ID') };
    const updated = [...violations, violationObj];
    setViolations(updated);

    // Send immediate violation alert to Google Sheets & Server
    sendViolationToGoogleSheets({
      studentName: student.nama,
      rombel: student.rombel,
      nipd: student.nipd,
      nisn: student.nisn,
      violationType: type,
      timestamp: new Date().toISOString(),
      deviceInfo: `${deviceInfo.platform} | ${deviceInfo.userAgent}`,
    });

    setWarningMessage(
      `Peringatan Pelanggaran #${updated.length}: Terdeteksi "${type}". Catatan pelanggaran telah dikirim dan terpantau langsung di Dashboard Monitoring Guru. Soal ujian tetap dapat Anda lanjutkan.`
    );
    setShowWarningModal(true);
  };

  useEffect(() => {
    // 1. Visibility change (Switching tabs or minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden && !isFinishedRef.current) {
        recordViolation('Berpindah Tab / Minimalkan Browser');
      }
    };

    // 2. Window blur (Opening other apps or split screen)
    const handleBlur = () => {
      if (!isFinishedRef.current) {
        recordViolation('Beralih ke Aplikasi Lain / Membuka Notifikasi');
      }
    };

    // 3. Fullscreen change
    const handleFullscreenChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fsEl);
      if (!fsEl && !isFinishedRef.current) {
        recordViolation('Keluar dari Mode Layar Penuh (Fullscreen)');
      }
    };

    // 4. Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 5. Disable copy, cut, paste
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('Mencoba Menyalin / Menempel Teks Soal');
    };

    // 6. Intercept keyboard shortcuts (Devtools, PrintScreen, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinishedRef.current) return;
      const key = e.key;

      if (
        key === 'F12' ||
        key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(key.toUpperCase())) ||
        (e.ctrlKey && ['u', 'p', 's'].includes(key.toLowerCase())) ||
        (e.metaKey && e.shiftKey && ['3', '4', 's'].includes(key.toLowerCase()))
      ) {
        e.preventDefault();
        recordViolation('Mencoba Tangkapan Layar / Alat Pengembang');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [violations]);

  // Format Timer string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Answering handlers
  const handleSingleAnswer = (questionId: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleMultiAnswer = (questionId: number, letter: string, isChecked: boolean) => {
    setAnswers((prev) => {
      const currentList: string[] = prev[questionId] || [];
      const updated = isChecked
        ? [...currentList.filter((x) => x !== letter), letter]
        : currentList.filter((x) => x !== letter);
      return { ...prev, [questionId]: updated };
    });
  };

  const handleTableAnswer = (questionId: number, rowIndex: number, colValue: string) => {
    setAnswers((prev) => {
      const question = QUESTIONS.find((q) => q.id === questionId);
      const rowCount = question?.rows?.length || 3;
      const currentArr: string[] = prev[questionId]
        ? [...prev[questionId]]
        : new Array(rowCount).fill(null);
      currentArr[rowIndex] = colValue;
      return { ...prev, [questionId]: currentArr };
    });
  };

  // Submit Final Exam
  const handleFinish = async (status: 'Selesai' | 'Didiskualifikasi' | 'Waktu Habis') => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setIsSubmitting(true);

    // Exit fullscreen cleanly
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}

    const score = calculateScore(answers);
    const endTime = new Date().toISOString();
    const durationSeconds = EXAM_CONFIG.durationSeconds - timeLeft;

    const payload: ExamSubmissionPayload = {
      submissionId: `SUB-${student.nisn}-${Date.now()}`,
      nama: student.nama,
      rombel: student.rombel,
      nipd: student.nipd,
      nisn: student.nisn,
      score,
      status,
      violations: violations.length,
      violationLog: violations,
      startTime: startTimeRef.current,
      endTime,
      durationSeconds,
      deviceInfo,
    };

    // Save to local device history
    try {
      const history = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
      history.push(payload);
      localStorage.setItem('cbt_hasil', JSON.stringify(history));
    } catch (e) {}

    // Send to Google Spreadsheet (direct and/or backend queue)
    await sendSubmissionToGoogleSheets(payload);

    // Clean up current active answer caches
    try {
      localStorage.removeItem(`cbt_ans_${student.nisn}`);
      localStorage.removeItem(`cbt_time_${student.nisn}`);
    } catch (e) {}

    setIsSubmitting(false);
    onFinishExam(payload);
  };

  // Total questions answered count
  const totalAnswered = useMemo(() => {
    return Object.keys(answers).filter((k) => {
      const val = answers[Number(k)];
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null;
    }).length;
  }, [answers]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between select-none relative pb-20 sm:pb-24">
      {/* Dynamic Security Watermark to prevent screen photos & recordings */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden flex flex-wrap gap-20 p-8 opacity-[0.045] rotate-[-25deg] select-none text-slate-900 font-mono text-sm uppercase">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap">
            {student.nama} • {student.nisn} • SMK2 GORONTALO
          </div>
        ))}
      </div>

      {/* Sticky Mobile Topbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3 sm:px-6 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Student Info */}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
              {student.nama}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {student.rombel} • NISN: {student.nisn}
            </span>
          </div>

          {/* Violations Badge + Timer + Question Grid Button */}
          <div className="flex items-center gap-2">
            {violations.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {violations.length}/{EXAM_CONFIG.maxViolations}
                </span>
              </div>
            )}

            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm ${
                timeLeft < 300
                  ? 'bg-rose-600 text-white animate-pulse'
                  : timeLeft < 900
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Quick Grid Button for Mobile */}
            <button
              onClick={() => setShowGridModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
            >
              <Grid className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Soal</span>
              <span className="text-[11px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200 font-bold">
                {totalAnswered}/30
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Horizontal Passage Navigation Tabs */}
      <div className="bg-slate-200/80 border-b border-slate-300 overflow-x-auto scrollbar-none py-2 px-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex gap-1.5 whitespace-nowrap">
          {PASSAGES.map((p, idx) => {
            const isActive = currentPassageIdx === idx;
            const answeredInPassage = QUESTIONS.filter(
              (q) =>
                q.id >= p.range[0] &&
                q.id <= p.range[1] &&
                answers[q.id] !== undefined &&
                answers[q.id] !== null &&
                (!Array.isArray(answers[q.id]) || answers[q.id].length > 0)
            ).length;
            const totalInPassage = p.range[1] - p.range[0] + 1;

            return (
              <button
                key={p.id}
                onClick={() => {
                  setCurrentPassageIdx(idx);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>Bacaan {p.id}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {answeredInPassage}/{totalInPassage}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Passage & Questions */}
      <main className="max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {/* Passage Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base border-b border-slate-100 pb-2.5">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <h2>{currentPassage.title}</h2>
          </div>
          <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-80 overflow-y-auto text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">
            {currentPassage.text}
          </div>
        </div>

        {/* Questions List for this Passage */}
        <div className="space-y-4">
          {questionsInPassage.map((q) => {
            const currentAnswer = answers[q.id];

            return (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-3 scroll-mt-20"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs shrink-0 mt-0.5">
                      {q.id}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {q.text}
                    </p>
                  </div>
                </div>

                {/* Question Type: Single Choice */}
                {q.type === 'single' && q.opts && (
                  <div className="space-y-2 pt-1 pl-1 sm:pl-9">
                    {q.opts.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isSelected = currentAnswer === letter;

                      return (
                        <label
                          key={letter}
                          onClick={() => handleSingleAnswer(q.id, letter)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-400 font-medium'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={letter}
                            checked={isSelected}
                            onChange={() => handleSingleAnswer(q.id, letter)}
                            className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1">
                            <strong className="mr-1.5">{letter}.</strong> {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: Multiple Answers */}
                {q.type === 'multi' && q.opts && (
                  <div className="space-y-2 pt-1 pl-1 sm:pl-9">
                    <div className="text-[11px] text-blue-600 font-semibold mb-1">
                      ℹ️ Pilih semua pilihan yang benar (jawaban lebih dari satu).
                    </div>
                    {q.opts.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(letter);

                      return (
                        <label
                          key={letter}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-400 font-medium'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={letter}
                            checked={isChecked}
                            onChange={(e) => handleMultiAnswer(q.id, letter, e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1">
                            <strong className="mr-1.5">{letter}.</strong> {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: Matrix Table */}
                {q.type === 'table' && q.rows && q.cols && (
                  <div className="pt-2 pl-0 sm:pl-9 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="p-2.5 font-bold">Pernyataan</th>
                          {q.cols.map((col) => (
                            <th key={col} className="p-2.5 text-center font-bold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {q.rows.map((rowText, rIdx) => {
                          const rowAns = currentAnswer ? currentAnswer[rIdx] : null;

                          return (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-medium text-slate-800">{rowText}</td>
                              {q.cols?.map((col) => {
                                const checked = rowAns === col;
                                return (
                                  <td key={col} className="p-2.5 text-center">
                                    <input
                                      type="radio"
                                      name={`q-${q.id}-r-${rIdx}`}
                                      value={col}
                                      checked={checked}
                                      onChange={() => handleTableAnswer(q.id, rIdx, col)}
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Bottom Navigation Bar for Mobile */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 sm:px-6 py-2.5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Previous Passage */}
          <button
            onClick={() => {
              if (currentPassageIdx > 0) {
                setCurrentPassageIdx((prev) => prev - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            disabled={currentPassageIdx === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Submit Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kumpulkan Ujian</span>
          </button>

          {/* Next Passage */}
          <button
            onClick={() => {
              if (currentPassageIdx < PASSAGES.length - 1) {
                setCurrentPassageIdx((prev) => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            disabled={currentPassageIdx === PASSAGES.length - 1}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Question Grid Modal */}
      <QuestionGridModal
        isOpen={showGridModal}
        onClose={() => setShowGridModal(false)}
        answers={answers}
        currentQuestionId={questionsInPassage[0]?.id || 1}
        onSelectQuestion={(qId) => {
          const passage = PASSAGES.find((p) => qId >= p.range[0] && qId <= p.range[1]);
          if (passage) {
            const idx = PASSAGES.indexOf(passage);
            setCurrentPassageIdx(idx);
            setTimeout(() => {
              const el = document.getElementById(`question-${qId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 150);
          }
        }}
      />

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Konfirmasi Pengumpulan Ujian</h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda telah menjawab{' '}
                <strong className="text-blue-600 font-bold">{totalAnswered}</strong> dari{' '}
                <strong>{QUESTIONS.length}</strong> soal.
              </p>
              {totalAnswered < QUESTIONS.length && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                  ⚠️ Masih ada {QUESTIONS.length - totalAnswered} soal yang belum dijawab!
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Periksa Lagi
              </button>
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  handleFinish('Selesai');
                }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-cheat Violation Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-500 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-rose-900 text-lg">Peringatan Pelanggaran CBT</h3>
              <p className="text-xs text-rose-700 mt-1.5 leading-relaxed font-medium">
                {warningMessage}
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-xs text-rose-800 font-mono">
              Total Pelanggaran Tercatat: <strong className="text-rose-600 text-sm font-bold">{violations.length}x</strong> (Terdata di Dashboard Guru)
            </div>
            <button
              onClick={() => {
                setShowWarningModal(false);
                // re-request fullscreen if lost
                const docEl = document.documentElement as any;
                if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
                else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen().catch(() => {});
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
            >
              Saya Mengerti & Lanjutkan Mengerjakan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
