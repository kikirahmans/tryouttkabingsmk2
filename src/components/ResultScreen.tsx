import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  ShieldCheck,
  Clock,
  User,
  School,
  AlertOctagon,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import { ExamSubmissionPayload } from '../services/googleSheetsService';

interface ResultScreenProps {
  result: ExamSubmissionPayload;
  onBackToHome: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onBackToHome }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadReceipt = () => {
    const dataStr = JSON.stringify(
      {
        tandaTerimaUjian: 'CBT Try Out TKA Bahasa Inggris SMK Gorontalo 2026',
        submissionId: result.submissionId,
        nama: result.nama,
        rombel: result.rombel,
        nisn: result.nisn,
        nipd: result.nipd,
        status: result.status,
        waktuSelesai: result.endTime,
        durasiMenit: Math.round(result.durationSeconds / 60),
        statusSinkronisasi: 'Terkirim ke Database Spreadsheet Sekolah',
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bukti_CBT_${result.rombel}_${result.nama.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const isDisqualified = result.status === 'Didiskualifikasi';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-between p-4 sm:p-6 select-none">
      <header className="max-w-md w-full mx-auto py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-blue-700 font-bold text-sm">
          <School className="w-5 h-5 text-blue-600" />
          <span>SMK Negeri 2 Gorontalo</span>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div
            className={`p-6 text-center text-white ${
              isDisqualified
                ? 'bg-gradient-to-r from-rose-600 to-red-700'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3">
              {isDisqualified ? (
                <AlertOctagon className="w-10 h-10 text-white" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              {isDisqualified ? 'Ujian Dihentikan' : 'Ujian Berhasil Dikumpulkan'}
            </h1>
            <p className="text-xs text-white/90 mt-1 max-w-xs mx-auto">
              {isDisqualified
                ? 'Terdeteksi pelanggaran melebihi batas yang diizinkan.'
                : 'Jawaban Anda telah tersimpan rapi dan disinkronkan ke Google Spreadsheet.'}
            </p>
          </div>

          {/* Submission Details */}
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Student Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Nama Peserta</span>
                <strong className="text-slate-900 font-bold text-sm">{result.nama}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Rombel</span>
                <span className="font-semibold text-slate-800">{result.rombel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">NISN / NIPD</span>
                <span className="font-mono font-semibold text-slate-800">
                  {result.nisn} / {result.nipd}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Waktu Selesai</span>
                <span className="font-medium text-slate-700">
                  {new Date(result.endTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status Pengumpulan</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    isDisqualified
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {result.status}
                </span>
              </div>
            </div>

            {/* Security Notice: Strict Requirement 8 - Siswa tidak melihat jawaban */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Catatan Kerahasiaan Ujian:
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                Sesuai kebijakan ujian TKA SMK, kunci jawaban dan rincian nilai akhir dikirim langsung
                ke sistem Google Spreadsheet pengawas dan tidak ditampilkan di layar siswa.
              </p>
            </div>

            {/* Receipt Verification Code */}
            <div className="p-3 bg-slate-100 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Nomor Tanda Terima Digital
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 select-all">
                {result.submissionId}
              </span>
            </div>

            {/* Download Receipt Button */}
            <button
              onClick={handleDownloadReceipt}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>{downloaded ? 'Tanda Terima Telah Diunduh' : 'Unduh Bukti Tanda Terima (JSON)'}</span>
            </button>

            {/* Return to Home */}
            <button
              onClick={onBackToHome}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Selesai & Keluar</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-2">
        <p>&copy; 2026 Dinas Pendidikan dan Kebudayaan Provinsi Gorontalo</p>
      </footer>
    </div>
  );
};
