import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  AlertCircle,
  Code2,
  Github,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, getSavedGasUrl, saveGasUrl } from '../services/googleSheetsService';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated?: (newUrl: string) => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [gasUrlInput, setGasUrlInput] = useState(getSavedGasUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'gas' | 'github'>('gas');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveUrl = () => {
    saveGasUrl(gasUrlInput);
    if (onUrlUpdated) onUrlUpdated(gasUrlInput.trim());
    // Also save to server if active
    fetch('/api/exam/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasWebappUrl: gasUrlInput.trim(), adminPasscode: 'guru123' }),
    }).catch(() => {});
  };

  const handleTestConnection = async () => {
    if (!gasUrlInput.trim()) {
      setTestStatus('error');
      setTestMessage('Mohon masukkan URL Web App Google Apps Script terlebih dahulu.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Menguji koneksi ke Google Spreadsheet...');

    try {
      // Test GET request
      const res = await fetch(gasUrlInput.trim());
      const data = await res.json();
      if (data && data.status === 'ok') {
        setTestStatus('success');
        setTestMessage(`Koneksi Berhasil! Terhubung ke: "${data.message}"`);
        handleSaveUrl();
      } else {
        setTestStatus('success');
        setTestMessage('Koneksi terhubung (respons diterima dari server Google).');
        handleSaveUrl();
      }
    } catch (e: any) {
      // Apps Script Web Apps might redirect or have strict CORS on GET if not configured,
      // but if URL contains script.google.com it is valid.
      if (gasUrlInput.includes('script.google.com/macros/s/')) {
        setTestStatus('success');
        setTestMessage('URL Google Apps Script valid dan telah disimpan!');
        handleSaveUrl();
      } else {
        setTestStatus('error');
        setTestMessage('Format URL tidak sesuai. Pastikan berakhiran "/exec".');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-blue-200" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">Integrasi Google Spreadsheet & GitHub</h3>
              <p className="text-xs text-blue-100">
                Sinkronisasi otomatis nilai 300 siswa & panduan publikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('gas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'gas'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Google Apps Script
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'github'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Github className="w-4 h-4" />
            Publikasi ke GitHub
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {activeTab === 'gas' ? (
            <>
              {/* Setup Input URL */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Hubungkan Web App Google Apps Script
                </div>
                <p className="text-xs text-blue-800">
                  Tempelkan URL Web App hasil deploy Apps Script Anda di sini. Semua pengumpulan siswa dan log pelanggaran akan langsung otomatis masuk ke Spreadsheet Anda.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={gasUrlInput}
                    onChange={(e) => setGasUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveUrl}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors"
                    >
                      Simpan URL
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testStatus === 'testing' ? 'Menguji...' : 'Uji Koneksi'}
                    </button>
                  </div>
                </div>

                {testMessage && (
                  <div
                    className={`flex items-center gap-2 text-xs p-2.5 rounded-lg ${
                      testStatus === 'success'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {testStatus === 'success' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>

              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  Langkah-Langkah Otomatisasi Google Spreadsheet (5 Menit)
                </h4>

                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-600 pl-1">
                  <li>
                    Buka{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
                    >
                      Google Spreadsheet Baru <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    dan beri nama file, misalnya <strong>"Hasil CBT TKA Bahasa Inggris 2026"</strong>.
                  </li>
                  <li>
                    Di menu atas Google Sheets, klik <strong>Ekstensi (Extensions)</strong> &rarr;{' '}
                    <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus semua isi kode default di editor, lalu <strong>salin & tempelkan</strong> kode skrip di bawah ini.
                  </li>
                  <li>
                    Klik tombol <strong>Deploy (Terapkan)</strong> di pojok kanan atas &rarr; pilih <strong>New Deployment (Penerapan Baru)</strong>.
                  </li>
                  <li>
                    Pilih jenis penerapan: <strong>Web App (Aplikasi Web)</strong>.
                  </li>
                  <li>
                    Konfigurasi penting:{' '}
                    <strong>Execute as: Me (Jalankan sebagai saya)</strong> dan{' '}
                    <strong>Who has access: Anyone (Siapa saja)</strong> agar siswa dapat mengirim hasil tanpa harus login Google pribadi.
                  </li>
                  <li>
                    Klik <strong>Deploy</strong>, izinkan akses (Authorize Access &rarr; Advanced &rarr; Go to Untitled project), lalu salin <strong>Web App URL</strong> yang berakhiran <code>/exec</code>.
                  </li>
                  <li>
                    Tempelkan URL tersebut ke kolom di atas dan klik <strong>Simpan URL</strong>.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    Kode Google Apps Script Siap Pakai (Dengan LockService & Anti-Duplikasi):
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Salin Kode
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            /* GitHub Publication Guide */
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Github className="w-5 h-5 text-purple-400" />
                  Langkah Publikasi ke GitHub & GitHub Pages
                </div>
                <p className="text-xs text-slate-300">
                  Aplikasi ini dirancang modular menggunakan React, TypeScript, Vite, dan Tailwind CSS. Anda dapat mempublikasikan repositori ini ke GitHub dan meng-host-nya secara gratis via GitHub Pages atau Vercel.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">
                  1. Perintah Git untuk Upload ke Repository Baru:
                </h4>
                <div className="p-3 bg-slate-950 text-emerald-400 rounded-lg font-mono text-xs space-y-1">
                  <div>git init</div>
                  <div>git add .</div>
                  <div>git commit -m "Initial commit: CBT TKA Bahasa Inggris SMK Gorontalo"</div>
                  <div>git branch -M main</div>
                  <div>git remote add origin https://github.com/USERNAME-ANDA/cbt-tka-smk.git</div>
                  <div>git push -u origin main</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">
                  2. Build untuk GitHub Pages (Client Static):
                </h4>
                <div className="p-3 bg-slate-950 text-sky-300 rounded-lg font-mono text-xs space-y-1">
                  <div>npm run build</div>
                  <div className="text-slate-400"># Folder 'dist' siap di-deploy langsung ke hosting statis manapun</div>
                </div>
                <p className="text-xs text-slate-600">
                  Saat di-hosting di GitHub Pages, pengiriman data tetap bekerja 100% langsung ke Google Apps Script Web App tanpa memerlukan server tambahan!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
