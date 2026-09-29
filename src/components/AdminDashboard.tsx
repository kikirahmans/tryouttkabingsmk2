import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  X,
  Smartphone,
  ArrowLeft,
  RotateCcw,
  Check,
  Eye,
  FileSpreadsheet,
  Activity,
  KeyRound,
  Copy,
  Sparkles,
  CloudDownload,
  Trash2,
} from 'lucide-react';
import { ROMBEL_LIST, STUDENTS_DATA } from '../data/studentsData';
import { EXAM_CONFIG } from '../data/cbtQuestions';
import {
  syncSubmissionsFromGoogleSheets,
  deleteSubmissionFromGoogleSheets,
  normalizeNisn,
  normalizeName,
  normalizeNipd,
} from '../services/googleSheetsService';

interface AdminDashboardProps {
  onBackToHome: () => void;
  onOpenAppsScript: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
  onOpenAppsScript,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [activeToken, setActiveToken] = useState<string>(() => {
    return (
      localStorage.getItem('cbt_active_token') || EXAM_CONFIG.defaultToken || 'TKA2026'
    ).toUpperCase();
  });
  const [isEditingToken, setIsEditingToken] = useState<boolean>(false);
  const [customTokenInput, setCustomTokenInput] = useState<string>('');
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 294,
    completed: 0,
    inProgress: 0,
    disqualified: 0,
    notStarted: 294,
    withViolations: 0,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRombelFilter, setSelectedRombelFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [selectedStudentLog, setSelectedStudentLog] = useState<any | null>(null);
  const [resetConfirmNisn, setResetConfirmNisn] = useState<string | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<any | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Password verification (Kata Sandi Baru: davi7489)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === EXAM_CONFIG.adminPasscode) {
      setIsAuthenticated(true);
      setAuthError('');
      fetchMonitoringData();
    } else {
      setAuthError('Kata sandi guru salah. Silakan coba kembali.');
    }
  };

  // Format durasi dan waktu pengerjaan siswa
  const formatStudentDuration = (student: any): { primary: string; secondary?: string } => {
    if (student.status === 'Belum Mulai') {
      return { primary: '-' };
    }

    if (
      student.status === 'Selesai' ||
      student.status === 'Didiskualifikasi' ||
      student.status === 'Waktu Habis'
    ) {
      let durSec = Number(student.durationSeconds) || 0;
      if (durSec <= 0 && student.startTime && student.endTime) {
        const s = new Date(student.startTime).getTime();
        const e = new Date(student.endTime).getTime();
        if (!isNaN(s) && !isNaN(e) && e >= s) {
          durSec = Math.round((e - s) / 1000);
        }
      }

      let timeRange = '';
      if (student.startTime && student.endTime) {
        const sDate = new Date(student.startTime);
        const eDate = new Date(student.endTime);
        if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
          const sTime = sDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const eTime = eDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          timeRange = `${sTime} - ${eTime}`;
        }
      } else if (student.endTime) {
        const eDate = new Date(student.endTime);
        if (!isNaN(eDate.getTime())) {
          timeRange = `Selesai ${eDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;
        }
      }

      if (durSec > 0) {
        const m = Math.floor(durSec / 60);
        const s = durSec % 60;
        const durText = m > 0 ? (s > 0 ? `${m}m ${s}d` : `${m} Menit`) : `${s} Detik`;
        return { primary: durText, secondary: timeRange || undefined };
      }

      return { primary: timeRange || 'Selesai' };
    }

    if (student.status === 'Sedang Mengerjakan') {
      if (student.startTime) {
        const s = new Date(student.startTime).getTime();
        if (!isNaN(s)) {
          const elapsedMin = Math.max(1, Math.floor((Date.now() - s) / 60000));
          const sTime = new Date(student.startTime).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
          return { primary: `${elapsedMin}m Berjalan`, secondary: `Mulai ${sTime}` };
        }
      }
      return { primary: 'Sedang Berjalan' };
    }

    return { primary: '-' };
  };

  // Terapkan data pengerjaan ke state antarmuka secara instan & akurat 100%
  const applySubmissionsToState = (subsList: any[]) => {
    // 1. Bangun peta indeks multi-kunci (NISN normalized, raw NISN, NIPD, dan Nama)
    const subMapByNisn = new Map<string, any>();
    const subMapByNipd = new Map<string, any>();
    const subMapByName = new Map<string, any>();
    const matchedSubs = new Set<any>();

    for (const s of subsList) {
      if (!s) continue;
      const normN = normalizeNisn(s.nisn);
      const rawN = String(s.nisn || '').trim();
      const normP = normalizeNipd(s.nipd);
      const normNm = normalizeName(s.nama);

      if (normN) subMapByNisn.set(normN, s);
      if (rawN) subMapByNisn.set(rawN, s);
      if (normP && normP !== '-') subMapByNipd.set(normP, s);
      if (normNm) subMapByName.set(normNm, s);
    }

    // 2. Petakan ke 294 siswa resmi dengan multi-layer fallback
    const merged = STUDENTS_DATA.map((student) => {
      const stdNormN = normalizeNisn(student.nisn);
      const stdRawN = student.nisn.trim();
      const stdNormP = normalizeNipd(student.nipd);
      const stdNormNm = normalizeName(student.nama);

      // Cocokkan secara berurutan: NISN 10-digit pad -> Raw NISN -> NIPD -> Nama Lengkap
      const sub =
        (stdNormN ? subMapByNisn.get(stdNormN) : null) ||
        (stdRawN ? subMapByNisn.get(stdRawN) : null) ||
        (stdNormP ? subMapByNipd.get(stdNormP) : null) ||
        (stdNormNm ? subMapByName.get(stdNormNm) : null);

      if (sub) {
        matchedSubs.add(sub);
        return {
          ...student,
          status: sub.status || 'Selesai',
          score: sub.score !== null && sub.score !== undefined ? Number(sub.score) : null,
          answeredCount: 30,
          violations: Number(sub.violations || 0),
          violationDetails: sub.violationLog || [],
          deviceInfo: sub.deviceInfo || { userAgent: '-', platform: '-' },
          isOnline: false,
          durationSeconds: sub.durationSeconds || 0,
          startTime: sub.startTime || '',
          endTime: sub.endTime || '',
        };
      }
      return {
        ...student,
        status: 'Belum Mulai',
        score: null,
        answeredCount: 0,
        violations: 0,
        violationDetails: [],
        deviceInfo: null,
        isOnline: false,
        durationSeconds: 0,
        startTime: null,
        endTime: null,
      };
    });

    // 3. JAMINAN 100%: Jika ada baris di Spreadsheet yang tidak cocok dengan daftar 294,
    // tetap tampilkan di tabel agar tidak ada satupun nilai siswa yang hilang!
    let extraIndex = STUDENTS_DATA.length + 1;
    for (const s of subsList) {
      if (s && !matchedSubs.has(s)) {
        merged.push({
          no: extraIndex++,
          nama: s.nama || 'Peserta Spreadsheet',
          rombel: s.rombel || 'Lainnya',
          nipd: s.nipd || '-',
          jk: 'L' as const,
          nisn: normalizeNisn(s.nisn) || s.nisn || `EXT-${Date.now()}`,
          status: s.status || 'Selesai',
          score: s.score !== null && s.score !== undefined ? Number(s.score) : null,
          answeredCount: 30,
          violations: Number(s.violations || 0),
          violationDetails: s.violationLog || [],
          deviceInfo: s.deviceInfo || { userAgent: '-', platform: '-' },
          isOnline: false,
          durationSeconds: s.durationSeconds || 0,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
        });
      }
    }

    const total = merged.length;
    const completed = merged.filter((d) => d.status === 'Selesai').length;
    const inProgress = merged.filter((d) => d.status === 'Sedang Mengerjakan').length;
    const notStarted = merged.filter((d) => d.status === 'Belum Mulai').length;
    const withViolations = merged.filter((d) => d.violations > 0).length;

    setStudentsData(merged);
    setSummary({ total, completed, inProgress, disqualified: 0, notStarted, withViolations });
  };

  // Fetch monitoring data from server (or fallback to local)
  const fetchMonitoringData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/exam/monitoring');
      if (res.ok) {
        const data = await res.json();
        setStudentsData(data.students);
        setSummary(data.summary);
        if (data.config && data.config.activeToken) {
          setActiveToken(data.config.activeToken);
          localStorage.setItem('cbt_active_token', data.config.activeToken);
        }
        setIsRefreshing(false);
        return;
      }
    } catch (e) {
      // Offline / Static fallback
    }

    // Fallback using localStorage dengan HashMap cepat
    try {
      const localSubs = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
      applySubmissionsToState(localSubs);
    } catch (e) {}

    setIsRefreshing(false);
  };

  // Auto-refresh timer
  useEffect(() => {
    if (!isAuthenticated || !isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 4000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAutoRefresh]);

  // SINKRONISASI DARI SPREADSHEET (MENGUNDUH DATA DARI SPREADSHEET KE DEVICE LAIN - TURBO SPEED)
  const handleSyncSpreadsheet = async () => {
    setIsSyncing(true);
    try {
      const res = await syncSubmissionsFromGoogleSheets();
      if (res.success && res.submissions) {
        // 1. Tampilkan ke tabel secara INSTAN (0 delay)
        applySubmissionsToState(res.submissions);

        const secText = (res.durationMs / 1000).toFixed(1);
        setNotification({
          type: 'success',
          message: `⚡ Sinkronisasi cepat (${secText}s): ${res.count} data siswa terunduh dari Spreadsheet.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Gagal menyinkronkan data dari Spreadsheet.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Gagal mengunduh data: ' + (err.message || String(err)),
      });
    }

    setIsSyncing(false);
    setTimeout(() => setNotification(null), 5000);
  };

  // HAPUS SISWA & HAPUS OTOMATIS PADA SPREADSHEET
  const handleDeleteStudent = async (student: any) => {
    if (!student || !student.nisn) return;
    setIsDeleting(true);
    try {
      const res = await deleteSubmissionFromGoogleSheets(student.nisn);
      setNotification({
        type: 'success',
        message:
          res.message ||
          `Data siswa ${student.nama} (${student.nisn}) berhasil dihapus dari sistem & Spreadsheet.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Gagal menghapus data: ' + (err.message || String(err)),
      });
    }

    setDeleteConfirmStudent(null);
    setIsDeleting(false);
    await fetchMonitoringData();
    setTimeout(() => setNotification(null), 5000);
  };

  // Token Management
  const handleSaveToken = async (newToken: string) => {
    const clean = newToken.trim().toUpperCase();
    if (!clean) return;

    setActiveToken(clean);
    localStorage.setItem('cbt_active_token', clean);
    setIsEditingToken(false);
    setCustomTokenInput('');

    try {
      await fetch('/api/exam/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeToken: clean, adminPasscode: EXAM_CONFIG.adminPasscode }),
      });
      setNotification({ type: 'success', message: `Token Ujian berhasil diperbarui: ${clean}` });
    } catch (e) {
      setNotification({ type: 'success', message: `Token Ujian tersimpan di perangkat: ${clean}` });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleSaveToken(res);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activeToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return studentsData.filter((student) => {
      const matchesSearch =
        searchQuery === '' ||
        student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.nisn.includes(searchQuery) ||
        student.nipd.includes(searchQuery);

      const matchesRombel =
        selectedRombelFilter === 'all' || student.rombel === selectedRombelFilter;

      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'violations'
          ? student.violations > 0
          : student.status === selectedStatusFilter);

      return matchesSearch && matchesRombel && matchesStatus;
    });
  }, [studentsData, searchQuery, selectedRombelFilter, selectedStatusFilter]);

  // Reset Student Session (Memungkinkan siswa login kembali)
  const handleResetSession = async (nisn: string) => {
    try {
      const res = await fetch('/api/exam/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn, adminPasscode: EXAM_CONFIG.adminPasscode }),
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Sesi siswa berhasil direset. Siswa dapat login kembali.`,
        });
      }
    } catch (e) {
      try {
        const localSubs = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
        const updated = localSubs.filter((s: any) => s.nisn !== nisn);
        localStorage.setItem('cbt_hasil', JSON.stringify(updated));
        setNotification({ type: 'success', message: 'Sesi lokal berhasil direset.' });
      } catch (err) {}
    }

    setResetConfirmNisn(null);
    fetchMonitoringData();
    setTimeout(() => setNotification(null), 4000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Siswa',
      'Rombel',
      'NIPD',
      'NISN',
      'Status Ujian',
      'Skor Akhir (0-100)',
      'Soal Terjawab',
      'Waktu Pengerjaan (Durasi)',
      'Waktu Mulai',
      'Waktu Selesai',
      'Jumlah Pelanggaran',
      'Platform Perangkat',
      'Browser User Agent',
    ];

    const rows = studentsData.map((s, idx) => {
      const dur = formatStudentDuration(s);
      const durStr = dur.secondary ? `${dur.primary} (${dur.secondary})` : dur.primary;
      return [
        idx + 1,
        `"${s.nama}"`,
        s.rombel,
        s.nipd,
        s.nisn,
        s.status,
        s.score !== null ? s.score : '-',
        `${s.answeredCount}/30`,
        `"${durStr}"`,
        s.startTime ? `"${new Date(s.startTime).toLocaleString('id-ID')}"` : '-',
        s.endTime ? `"${new Date(s.endTime).toLocaleString('id-ID')}"` : '-',
        s.violations,
        s.deviceInfo ? `"${s.deviceInfo.platform || '-'}"` : '-',
        s.deviceInfo ? `"${(s.deviceInfo.userAgent || '-').replace(/"/g, '""')}"` : '-',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Nilai_CBT_SMK2_Gorontalo_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Login Gate View - TIDAK MENAMPILKAN KATA SANDI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Portal Guru / Pengawas</h2>
            <p className="text-xs text-slate-400">
              Dashboard Monitoring Real-time & Log Aktivitas Perangkat Ujian SMK Negeri 2 Gorontalo
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Sandi Guru
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi guru"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-colors shadow-md"
            >
              Masuk ke Dashboard Pengawas
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onBackToHome}
              className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Layar Siswa
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Main View
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 sm:px-8 py-3.5 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm">
              CBT
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">
                Dashboard Monitoring Ujian Real-Time
              </h1>
              <p className="text-xs text-slate-400">
                SMK Negeri 2 Gorontalo • 294 Peserta Didik Terdaftar
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Tombol Singkronkan Data dari Google Spreadsheet (Unduh ke device ini) */}
            <button
              onClick={handleSyncSpreadsheet}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Unduh dan sinkronkan data hasil ujian dari Google Spreadsheet ke perangkat ini"
            >
              <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Singkronkan Data'}</span>
            </button>

            {/* Auto refresh badge */}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isAutoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-pulse' : ''}`} />
              <span>Live {isAutoRefresh ? 'ON' : 'OFF'}</span>
            </button>

            {/* Manual refresh */}
            <button
              onClick={fetchMonitoringData}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Perbarui Data Sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Apps Script setup button */}
            <button
              onClick={onOpenAppsScript}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Pengaturan Sheets</span>
            </button>

            {/* Back */}
            <button
              onClick={onBackToHome}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Keluar ke Halaman Siswa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 flex-1">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Token Management Card */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl border border-blue-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 block">
                Token Ujian Saat Ini (Wajib Untuk Siswa Login)
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-white bg-blue-950/60 px-3 py-1 rounded-xl border border-blue-700/60 select-all">
                  {activeToken}
                </span>
                <button
                  onClick={handleCopyToken}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors"
                  title="Salin Token"
                >
                  {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{tokenCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Token Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {isEditingToken ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={customTokenInput}
                  onChange={(e) => setCustomTokenInput(e.target.value.toUpperCase())}
                  placeholder="Token Baru (misal: CBT01)"
                  maxLength={10}
                  className="px-3 py-2 bg-slate-900 border border-blue-600 rounded-xl text-xs font-mono font-bold uppercase text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveToken(customTokenInput)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setIsEditingToken(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCustomTokenInput('');
                    setIsEditingToken(true);
                  }}
                  className="px-3.5 py-2 bg-blue-800/80 hover:bg-blue-700 border border-blue-600/60 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Ubah Token
                </button>
                <button
                  onClick={handleGenerateRandomToken}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
                  title="Generate Token Acak Otomatis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Acak Token Baru</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Total Peserta
            </span>
            <div className="text-2xl font-black text-slate-900">{summary.total}</div>
            <span className="text-[10px] text-slate-500">11 Rombel Terdaftar</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Sedang Mengerjakan
            </span>
            <div className="text-2xl font-black text-blue-600 flex items-center gap-2">
              <span>{summary.inProgress}</span>
              {summary.inProgress > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Perangkat Terkoneksi</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai
            </span>
            <div className="text-2xl font-black text-emerald-600">{summary.completed}</div>
            <span className="text-[10px] text-slate-500">
              {Math.round((summary.completed / (summary.total || 1)) * 100)}% Pengumpulan
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Belum Mulai
            </span>
            <div className="text-2xl font-black text-slate-700">{summary.notStarted}</div>
            <span className="text-[10px] text-slate-500">Menunggu Login</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Siswa Melanggar
            </span>
            <div className="text-2xl font-black text-rose-600">{summary.withViolations}</div>
            <span className="text-[10px] text-slate-500">Soal Tetap Berjalan</span>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama, NISN, atau NIPD..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Rombel Filter */}
            <select
              value={selectedRombelFilter}
              onChange={(e) => setSelectedRombelFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">Semua Rombel (11)</option>
              {ROMBEL_LIST.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="Sedang Mengerjakan">Sedang Mengerjakan</option>
              <option value="Selesai">Selesai</option>
              <option value="Belum Mulai">Belum Mulai</option>
              <option value="violations">Ada Catatan Pelanggaran</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap (CSV/Excel)</span>
            </button>
          </div>
        </div>

        {/* Real-time Students Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Menampilkan {filteredStudents.length} dari {studentsData.length} Peserta
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Online
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>
                Offline
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">Rombel</th>
                  <th className="py-3 px-3">NISN / NIPD</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Waktu Pengerjaan</th>
                  <th className="py-3 px-3 text-center">Terjawab</th>
                  <th className="py-3 px-3 text-center">Skor</th>
                  <th className="py-3 px-3 text-center">Pelanggaran</th>
                  <th className="py-3 px-3">Perangkat</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const isSubmitted = student.status === 'Selesai';
                  const isDoing = student.status === 'Sedang Mengerjakan';
                  const dur = formatStudentDuration(student);

                  return (
                    <tr
                      key={student.nisn}
                      className={`hover:bg-slate-50 transition-colors ${
                        student.violations > 0 ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {student.isOnline ? (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0"
                              title="Perangkat Aktif (Online)"
                            ></span>
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full bg-slate-300 shrink-0"
                              title="Offline"
                            ></span>
                          )}
                          <strong className="font-semibold text-slate-900">{student.nama}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{student.rombel}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {student.nisn}
                        <span className="block text-[10px] text-slate-400">{student.nipd}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSubmitted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDoing
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {student.status === 'Belum Mulai' ? (
                          <span className="text-slate-300 font-mono text-[11px]">-</span>
                        ) : isDoing ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                              <Clock className="w-3 h-3 text-blue-500 animate-spin" />
                              {dur.primary}
                            </span>
                            {dur.secondary && (
                              <span className="text-[9px] text-slate-400 mt-0.5 font-medium">{dur.secondary}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-800 inline-flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {dur.primary}
                            </span>
                            {dur.secondary && (
                              <span className="text-[10px] text-slate-400 font-mono">{dur.secondary}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {isDoing ? `${student.answeredCount}/30` : isSubmitted ? '30/30' : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-sm">
                        {student.score !== null ? (
                          <span
                            className={
                              student.score >= 75
                                ? 'text-emerald-600'
                                : student.score >= 50
                                ? 'text-blue-600'
                                : 'text-amber-600'
                            }
                          >
                            {student.score}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {student.violations > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {student.violations}x
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {student.deviceInfo ? (
                          <div className="flex items-center gap-1.5" title={student.deviceInfo.userAgent}>
                            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">
                              {student.deviceInfo.platform || 'Mobile'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Log Button */}
                          <button
                            onClick={() => setSelectedStudentLog(student)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Lihat Log Aktivitas & Perangkat"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Session Button */}
                          {(isDoing || isSubmitted) && (
                            <button
                              onClick={() => setResetConfirmNisn(student.nisn)}
                              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                              title="Reset Sesi Siswa (Izinkan Mulai Ulang)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Student Submission Button (Menghapus siswa dari sistem & otomatis dari Spreadsheet) */}
                          {(isDoing || isSubmitted || student.violations > 0) && (
                            <button
                              onClick={() => setDeleteConfirmStudent(student)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
                              title="Hapus Data Siswa & Hapus Baris di Spreadsheet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Device Activity & Violation Details Modal */}
      {selectedStudentLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Log Aktivitas & Perangkat Siswa
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStudentLog.nama} • {selectedStudentLog.rombel} ({selectedStudentLog.nisn})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentLog(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 text-xs">
              {/* Waktu & Durasi Pengerjaan */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2 text-blue-950">
                <span className="font-bold text-blue-900 block text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Waktu & Durasi Pengerjaan Ujian
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-700 block font-bold">Waktu Mulai:</span>
                    <span className="font-medium">
                      {selectedStudentLog.startTime
                        ? new Date(selectedStudentLog.startTime).toLocaleString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700 block font-bold">Waktu Selesai:</span>
                    <span className="font-medium">
                      {selectedStudentLog.endTime
                        ? new Date(selectedStudentLog.endTime).toLocaleString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-blue-200/80 flex items-center justify-between">
                    <span className="text-xs text-blue-900 font-bold">Total Durasi Ujian:</span>
                    <span className="font-black text-blue-950 text-sm bg-blue-100/80 px-2.5 py-0.5 rounded-lg border border-blue-300">
                      {formatStudentDuration(selectedStudentLog).primary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Telemetry info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                  Informasi Perangkat
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Platform:</span>
                    <span>{selectedStudentLog.deviceInfo?.platform || 'Tidak diketahui'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      Resolusi Layar:
                    </span>
                    <span>
                      {selectedStudentLog.deviceInfo?.screenResolution || 'Tidak diketahui'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-bold">User Agent:</span>
                    <span className="font-mono text-[10px] break-all">
                      {selectedStudentLog.deviceInfo?.userAgent || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Violation Log */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Riwayat Pelanggaran Terdeteksi</span>
                  <span className="text-rose-600 font-bold">{selectedStudentLog.violations} Kali</span>
                </span>

                {selectedStudentLog.violationDetails &&
                selectedStudentLog.violationDetails.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedStudentLog.violationDetails.map((v: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold">{v.type}</strong>
                          <span className="text-[10px] text-rose-600">{v.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tidak ada catatan pelanggaran keamanan selama ujian berlangsung.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudentLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Tutup Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirmNisn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Konfirmasi Reset Sesi Siswa</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin mereset sesi siswa ini? Siswa akan diizinkan login dan
                mengerjakan ulang ujian dari awal.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirmNisn(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleResetSession(resetConfirmNisn)}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
              >
                Ya, Reset Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Menghapus siswa & otomatis terhapus pada Spreadsheet) */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-rose-950 text-base sm:text-lg">
                Hapus Data Siswa & Spreadsheet
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus data ujian untuk siswa{' '}
                <strong className="text-slate-900 font-bold block mt-1 text-sm">
                  {deleteConfirmStudent.nama} ({deleteConfirmStudent.nisn})
                </strong>
                Data nilai, jawaban, dan log pelanggaran akan dihapus dari sistem serta{' '}
                <strong className="text-rose-700">otomatis dihapus dari baris Google Spreadsheet</strong>.
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-[11px] text-rose-800 space-y-1">
              <div>• Baris data pada sheet <strong>Hasil_Ujian</strong> akan dihapus.</div>
              <div>• Catatan pelanggaran pada sheet <strong>Log_Pelanggaran</strong> akan dihapus.</div>
              <div>• Status siswa akan kembali menjadi <strong>Belum Mulai</strong>.</div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteStudent(deleteConfirmStudent)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
