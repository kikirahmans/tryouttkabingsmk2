/**
 * Google Spreadsheet & Apps Script Integration Service
 * Mendukung pengiriman langsung dari browser (mode no-cors / form-encoded)
 * dan melalui proxy backend Express untuk ketahanan 300 siswa bersamaan.
 */

export interface ExamSubmissionPayload {
  submissionId: string;
  nama: string;
  rombel: string;
  nipd: string;
  nisn: string;
  score: number;
  status: 'Selesai' | 'Didiskualifikasi' | 'Waktu Habis';
  violations: number;
  violationLog: Array<{ type: string; time: string }>;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenResolution: string;
    viewport: string;
  };
}

export interface ViolationPayload {
  studentName: string;
  rombel: string;
  nipd: string;
  nisn: string;
  violationType: string;
  timestamp: string;
  deviceInfo: string;
}

export const DEFAULT_GAS_URL_KEY = 'cbt_gas_webapp_url';
export const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwf-wV8KbUARklU8kkAwT1ZKD1bX36U5W6l2UaiD7Cm44ZKZR4tF5pC-Ng3ocwtdw1d/exec';

export function getSavedGasUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_GAS_URL;
  return localStorage.getItem(DEFAULT_GAS_URL_KEY) || DEFAULT_GAS_URL;
}

export function saveGasUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEFAULT_GAS_URL_KEY, url.trim());
  }
}

/**
 * Kode Google Apps Script Lengkap yang Siap Dicopy & Ditempel ke Google Sheets
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ========================================================================
 * SKRIP GOOGLE APPS SCRIPT - CBT TKA BAHASA INGGRIS SMK GORONTALO 2026
 * Mendukung 300+ Siswa Bersamaan dengan LockService & Validasi Duplikasi
 * ========================================================================
 */

function setupSheetHeaders(ss) {
  // 1. Sheet Hasil Ujian
  var sheetHasil = ss.getSheetByName("Hasil_Ujian");
  if (!sheetHasil) {
    sheetHasil = ss.insertSheet("Hasil_Ujian");
    sheetHasil.appendRow([
      "Timestamp Submit",
      "ID Penyerahan",
      "Nama Siswa",
      "Rombel",
      "NIPD",
      "NISN",
      "Skor (0-100)",
      "Status Ujian",
      "Jumlah Pelanggaran",
      "Durasi (Menit)",
      "Waktu Mulai",
      "Waktu Selesai",
      "Perangkat & Browser",
      "Resolusi Layar",
      "Rincian Log Pelanggaran"
    ]);
    sheetHasil.getRange(1, 1, 1, 15).setBackground("#2563eb").setFontColor("#ffffff").setFontWeight("bold");
    sheetHasil.setFrozenRows(1);
  }

  // 2. Sheet Log Pelanggaran Real-time
  var sheetLog = ss.getSheetByName("Log_Pelanggaran");
  if (!sheetLog) {
    sheetLog = ss.insertSheet("Log_Pelanggaran");
    sheetLog.appendRow([
      "Waktu Kejadian",
      "Nama Siswa",
      "Rombel",
      "NISN",
      "Jenis Pelanggaran",
      "Detail Perangkat"
    ]);
    sheetLog.getRange(1, 1, 1, 6).setBackground("#dc2626").setFontColor("#ffffff").setFontWeight("bold");
    sheetLog.setFrozenRows(1);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script CBT SMK Negeri 2 Gorontalo Aktif & Terhubung",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // LockService mencegah tabrakan data (race condition) saat 300 siswa submit bersamaan
  var lock = LockService.getScriptLock();
  try {
    // Tunggu giliran lock sampai 30 detik
    lock.waitLock(30000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server Spreadsheet sedang sibuk, silakan coba kirim ulang dalam 5 detik."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheetHeaders(ss);

    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // KASUS 1: LAPORAN LOG KECURANGAN REAL-TIME
    if (data.action === "log_violation") {
      var sheetLog = ss.getSheetByName("Log_Pelanggaran");
      sheetLog.appendRow([
        new Date(),
        data.studentName || "-",
        data.rombel || "-",
        data.nisn || "-",
        data.violationType || "Pelanggaran tidak diketahui",
        data.deviceInfo || "-"
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Log pelanggaran berhasil dicatat"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS 2: PENGIRIMAN HASIL UJIAN AKHIR
    var sheetHasil = ss.getSheetByName("Hasil_Ujian");
    var values = sheetHasil.getDataRange().getValues();

    // Validasi Duplikasi: Cek NISN dan Nama di data yang sudah tersimpan
    var nisnBaru = String(data.nisn || "").trim();
    var namaBaru = String(data.nama || "").trim().toLowerCase();
    var existingRow = -1;

    for (var i = 1; i < values.length; i++) {
      var existingNisn = String(values[i][5] || "").trim();
      var existingNama = String(values[i][2] || "").trim().toLowerCase();
      if ((nisnBaru && existingNisn === nisnBaru) || (existingNama === namaBaru)) {
        existingRow = i + 1; // 1-indexed baris spreadsheet
        break;
      }
    }

    var durasiMenit = Math.round((data.durationSeconds || 0) / 60);
    var devInfo = data.deviceInfo ? (data.deviceInfo.platform + " | " + data.deviceInfo.userAgent) : "-";
    var screenRes = data.deviceInfo ? data.deviceInfo.screenResolution : "-";
    var rincianViol = (data.violationLog && data.violationLog.length > 0)
      ? data.violationLog.map(function(v){ return "[" + v.time + "] " + v.type; }).join(" ; ")
      : "Tidak ada pelanggaran";

    var rowData = [
      new Date(),
      data.submissionId || ("SUB-" + Date.now()),
      data.nama || "-",
      data.rombel || "-",
      data.nipd || "-",
      data.nisn || "-",
      data.score !== undefined ? data.score : 0,
      data.status || "Selesai",
      data.violations || 0,
      durasiMenit,
      data.startTime || "-",
      data.endTime || new Date().toISOString(),
      devInfo,
      screenRes,
      rincianViol
    ];

    if (existingRow > 0) {
      // Perbarui jika sudah ada agar data selalu rapi tanpa membuat baris duplikat liar
      sheetHasil.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        updated: true,
        message: "Data pembaruan nilai tersimpan rapi (menimpa duplikasi)."
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Tambahkan baris baru
      sheetHasil.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        updated: false,
        message: "Hasil ujian berhasil tersimpan ke Google Spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

/**
 * Kirim hasil ujian ke Google Spreadsheet
 */
export async function sendSubmissionToGoogleSheets(
  payload: ExamSubmissionPayload,
  gasUrl?: string
): Promise<{ success: boolean; message: string }> {
  const targetUrl = gasUrl || getSavedGasUrl();

  // 1. Coba kirim via server backend jika aplikasi berjalan full-stack
  try {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, gasUrl: targetUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Tersimpan via server & antrian Google Spreadsheet' };
    }
  } catch (e) {
    // Backend tidak aktif atau client di-host di GitHub Pages static, lanjutkan direct client
  }

  // 2. Direct client-side POST ke Apps Script
  if (!targetUrl) {
    // Simpan di local offline queue
    saveToLocalQueue(payload);
    return {
      success: true,
      message: 'Tersimpan di memori perangkat & antrian sinkronisasi (URL Apps Script belum diisi oleh Guru).',
    };
  }

  try {
    // Gunakan mode no-cors untuk memastikan request tembus dari browser tanpa terblokir proteksi CORS
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Data berhasil dikirim ke Google Spreadsheet.',
    };
  } catch (err: any) {
    saveToLocalQueue(payload);
    return {
      success: false,
      message: 'Koneksi internet bermasalah. Data telah diamankan di perangkat dan akan otomatis dikirim ulang.',
    };
  }
}

/**
 * Kirim log kecurangan langsung saat kejadian berlangsung
 */
export async function sendViolationToGoogleSheets(
  payload: ViolationPayload,
  gasUrl?: string
): Promise<void> {
  const targetUrl = gasUrl || getSavedGasUrl();
  const body = {
    action: 'log_violation',
    ...payload,
  };

  // Coba kirim via backend proxy
  try {
    await fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, gasUrl: targetUrl }),
    });
  } catch (e) {
    // Direct client fallback
    if (targetUrl) {
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(body),
        });
      } catch (err) {}
    }
  }
}

// Local offline queue management
const OFFLINE_QUEUE_KEY = 'cbt_offline_submissions';

export function saveToLocalQueue(payload: ExamSubmissionPayload) {
  if (typeof window === 'undefined') return;
  try {
    const list: ExamSubmissionPayload[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    // Cek duplikasi di queue
    const filtered = list.filter((item) => item.nisn !== payload.nisn);
    filtered.push(payload);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {}
}

export function getLocalQueue(): ExamSubmissionPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function clearLocalQueue() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}
