import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Lock,
  AlertTriangle,
  ArrowRight,
  School,
  CheckCircle,
  KeyRound,
} from 'lucide-react';
import { ROMBEL_LIST, STUDENTS_DATA, Student } from '../data/studentsData';
import { EXAM_CONFIG } from '../data/cbtQuestions';

interface LoginScreenProps {
  onStartExam: (student: Student, deviceInfo: any) => void;
  onOpenAdmin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onStartExam,
  onOpenAdmin,
}) => {
  const [selectedRombel, setSelectedRombel] = useState<string>('');
  const [selectedNisn, setSelectedNisn] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alreadyCompletedInfo, setAlreadyCompletedInfo] = useState<any | null>(null);

  // Filter students based on selected Rombel
  const studentsInRombel = useMemo(() => {
    if (!selectedRombel) return [];
    return STUDENTS_DATA.filter((s) => s.rombel === selectedRombel).sort((a, b) =>
      a.nama.localeCompare(b.nama)
    );
  }, [selectedRombel]);

  // Current selected student details
  const selectedStudent = useMemo(() => {
    if (!selectedNisn) return null;
    return STUDENTS_DATA.find((s) => s.nisn === selectedNisn) || null;
  }, [selectedNisn]);

  // Handle Rombel selection change
  const handleRombelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRombel(e.target.value);
    setSelectedNisn('');
    setErrorMessage('');
    setAlreadyCompletedInfo(null);
  };

  // Handle Student selection change
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nisn = e.target.value;
    setSelectedNisn(nisn);
    setErrorMessage('');
    setAlreadyCompletedInfo(null);

    // Cek duplikasi di penyimpanan lokal perangkat ini
    if (nisn && typeof window !== 'undefined') {
      try {
        const localSubs = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
        const existing = localSubs.find((s: any) => s.nisn === nisn);
        if (existing) {
          setAlreadyCompletedInfo(existing);
        }
      } catch (err) {}
    }
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let platform = 'Unknown';
    if (/android/i.test(ua)) platform = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) platform = 'iOS';
    else if (/windows/i.test(ua)) platform = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) platform = 'macOS';
    else if (/linux/i.test(ua)) platform = 'Linux';

    return {
      userAgent: ua,
      platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  };

  const handleStartExam = async () => {
    if (!selectedRombel) {
      setErrorMessage('Silakan pilih Rombel terlebih dahulu.');
      return;
    }
    if (!selectedStudent) {
      setErrorMessage('Silakan pilih Nama Siswa sesuai Rombel.');
      return;
    }
    if (!tokenInput.trim()) {
      setErrorMessage('Silakan masukkan Token Ujian yang diberikan oleh pengawas.');
      return;
    }

    if (alreadyCompletedInfo) {
      setErrorMessage(
        'Siswa ini sudah tercatat menyelesaikan ujian. Pengisian duplikat tidak diizinkan.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const cleanToken = tokenInput.trim().toUpperCase();
    const devInfo = getDeviceInfo();

    // Verifikasi ke server
    try {
      const res = await fetch('/api/exam/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rombel: selectedStudent.rombel,
          nisn: selectedStudent.nisn,
          nipd: selectedStudent.nipd,
          nama: selectedStudent.nama,
          token: cleanToken,
          deviceInfo: devInfo,
        }),
      });

      if (res.status === 403) {
        const data = await res.json();
        setAlreadyCompletedInfo(data.submission || { status: 'Selesai' });
        setErrorMessage(data.error || 'Siswa ini sudah menyelesaikan ujian sebelumnya.');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || 'Token Ujian tidak valid atau data siswa tidak cocok.');
        setIsLoading(false);
        return;
      }
    } catch (e) {
      // Offline fallback: Cek token dari penyimpanan lokal atau default token
      const validLocalToken = (
        localStorage.getItem('cbt_active_token') || EXAM_CONFIG.defaultToken || 'TKA2026'
      ).trim().toUpperCase();

      if (cleanToken !== validLocalToken) {
        setErrorMessage('Token Ujian salah. Silakan tanyakan token kepada guru pengawas.');
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
    onStartExam(selectedStudent, devInfo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-between p-3 sm:p-6">
      {/* Header Bar - Pengaturan Sheets HANYA ada di Portal Guru */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm sm:text-base">
          <School className="w-5 h-5 text-blue-600" />
          <span>SMK Negeri 2 Gorontalo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Portal Guru</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-xl w-full mx-auto my-auto py-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 sm:p-6 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block py-1 px-3 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold tracking-wide uppercase mb-2 border border-blue-400/30">
                Tahun Ajaran 2026
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{EXAM_CONFIG.title}</h1>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-md mx-auto">
                {EXAM_CONFIG.subtitle}
              </p>
              <div className="flex justify-center gap-4 mt-3 text-xs text-blue-200">
                <span>⏱️ Durasi: 90 Menit</span>
                <span>•</span>
                <span>📝 Jumlah: 30 Soal</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 sm:p-7 space-y-4">
            {/* Anti-cheat Warning Card */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="font-bold block text-amber-950 mb-0.5">
                  Sistem Keamanan Ujian Aktif:
                </strong>
                Dilarang berpindah tab/aplikasi, keluar layar penuh, atau merekam layar. Setiap
                pelanggaran tercatat otomatis pada Dashboard Monitoring Guru.
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Already Completed Notification */}
            {alreadyCompletedInfo && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Ujian Sudah Selesai Dikerjakan!
                </div>
                <p className="text-xs text-emerald-700">
                  Data ujian Anda telah tersimpan rapi di sistem. Pengisian ulang dicegah untuk
                  menghindari duplikasi nilai. Hubungi guru pengawas jika butuh bantuan.
                </p>
              </div>
            )}

            {/* Field 1: Pilih Rombel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Pilih Rombel (Kelas) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedRombel}
                  onChange={handleRombelChange}
                  className="w-full pl-3 pr-10 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Rombel Saat Ini --</option>
                  {ROMBEL_LIST.map((rombel) => (
                    <option key={rombel} value={rombel}>
                      {rombel}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Nama siswa akan otomatis muncul sesuai rombel yang Anda pilih.
              </span>
            </div>

            {/* Field 2: Pilih Nama Siswa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Pilih Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedNisn}
                onChange={handleStudentChange}
                disabled={!selectedRombel}
                className="w-full px-3 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">
                  {selectedRombel
                    ? `-- Pilih Nama (${studentsInRombel.length} Siswa) --`
                    : '-- Pilih Rombel Terlebih Dahulu --'}
                </option>
                {studentsInRombel.map((student) => (
                  <option key={student.nisn} value={student.nisn}>
                    {student.no}. {student.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 3: Token Ujian */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Masukkan Token Ujian <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="Masukkan 6-karakter token ujian"
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-3 text-sm font-mono font-bold tracking-widest text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Token ujian diberikan oleh guru / pengawas di ruang ujian.
              </span>
            </div>

            {/* Verified Student Details Card */}
            {selectedStudent && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Data Peserta Terverifikasi:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      NISN Resmi
                    </span>
                    <span className="font-mono font-bold text-slate-900">{selectedStudent.nisn}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      NIPD / JK
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedStudent.nipd} ({selectedStudent.jk})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartExam}
              disabled={isLoading || !selectedStudent || !tokenInput.trim() || !!alreadyCompletedInfo}
              className="w-full mt-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <span>Menyiapkan Ujian...</span>
              ) : (
                <>
                  <span>Mulai Ujian Sekarang</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-2">
        <p>&copy; 2026 Dinas Pendidikan dan Kebudayaan Provinsi Gorontalo</p>
      </footer>
    </div>
  );
};
