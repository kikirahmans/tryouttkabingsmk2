import { Student } from '../data/studentsData';

export interface ExamSubmissionPayload {
  submissionId: string;
  nama: string;
  studentName?: string;
  rombel: string;
  nipd: string;
  nisn: string;
  score: number;
  status: 'Selesai' | 'Didiskualifikasi' | 'Waktu Habis';
  violations: number;
  durationSeconds: number;
  startTime: string;
  endTime: string;
  answers?: Record<number, any>;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenResolution?: string;
    viewport?: string;
  };
  violationLog: Array<{
    type: string;
    time: string;
  }>;
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
 * Kode Google Apps Script Lengkap (Versi 2)
 * Mendukung:
 * 1. Simpan hasil ujian serentak 300+ siswa (LockService)
 * 2. Log pelanggaran real-time
 * 3. Unduh data sinkronisasi ke perangkat lain (get_submissions)
 * 4. Hapus data siswa yang otomatis terhapus dari baris Spreadsheet (delete_submission)
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ========================================================================
 * SKRIP GOOGLE APPS SCRIPT (VERSI 2) - CBT TKA SMKN 2 GORONTALO
 * Mendukung 300+ Siswa, Sinkronisasi Multi-Device, & Hapus Otomatis
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
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

  // FITUR 1: SINKRONISASI / UNDUH DATA DARI SPREADSHEET
  if (action === "get_submissions" || action === "sync") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheetHeaders(ss);
    var sheetHasil = ss.getSheetByName("Hasil_Ujian");
    var values = sheetHasil ? sheetHasil.getDataRange().getValues() : [];
    var list = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (r[5]) { // NISN ada
        list.push({
          timestamp: r[0],
          submissionId: r[1],
          nama: String(r[2] || ""),
          rombel: String(r[3] || ""),
          nipd: String(r[4] || ""),
          nisn: String(r[5] || "").trim(),
          score: r[6] !== "" && r[6] !== null ? Number(r[6]) : null,
          status: String(r[7] || "Selesai"),
          violations: Number(r[8] || 0),
          durationMinutes: r[9],
          startTime: r[10],
          endTime: r[11],
          deviceInfo: { platform: String(r[12] || "-"), userAgent: String(r[12] || "-") },
          screenResolution: String(r[13] || "-"),
          violationDetails: String(r[14] || "")
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: list.length,
      submissions: list,
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // FITUR 2: HAPUS SISWA VIA GET FALLBACK
  if (action === "delete_submission") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheetHeaders(ss);
    var targetNisn = String(e.parameter.nisn || "").trim();
    var deletedCount = 0;
    if (targetNisn) {
      var sheetHasil = ss.getSheetByName("Hasil_Ujian");
      if (sheetHasil) {
        var vals = sheetHasil.getDataRange().getValues();
        for (var i = vals.length - 1; i >= 1; i--) {
          if (String(vals[i][5] || "").trim() === targetNisn) {
            sheetHasil.deleteRow(i + 1);
            deletedCount++;
          }
        }
      }
      var sheetLog = ss.getSheetByName("Log_Pelanggaran");
      if (sheetLog) {
        var logVals = sheetLog.getDataRange().getValues();
        for (var j = logVals.length - 1; j >= 1; j--) {
          if (String(logVals[j][3] || "").trim() === targetNisn) {
            sheetLog.deleteRow(j + 1);
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data siswa berhasil dihapus dari Spreadsheet",
      deletedCount: deletedCount
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script CBT SMK Negeri 2 Gorontalo Aktif & Terhubung",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server Spreadsheet sedang sibuk, silakan coba kirim ulang."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheetHeaders(ss);

    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // KASUS 1: HAPUS DATA SISWA DARI SPREADSHEET
    if (data.action === "delete_submission") {
      var targetNisn = String(data.nisn || "").trim();
      var delCount = 0;
      if (targetNisn) {
        var sheetHasil = ss.getSheetByName("Hasil_Ujian");
        if (sheetHasil) {
          var vals = sheetHasil.getDataRange().getValues();
          for (var i = vals.length - 1; i >= 1; i--) {
            if (String(vals[i][5] || "").trim() === targetNisn) {
              sheetHasil.deleteRow(i + 1);
              delCount++;
            }
          }
        }
        var sheetLog = ss.getSheetByName("Log_Pelanggaran");
        if (sheetLog) {
          var logVals = sheetLog.getDataRange().getValues();
          for (var j = logVals.length - 1; j >= 1; j--) {
            if (String(logVals[j][3] || "").trim() === targetNisn) {
              sheetLog.deleteRow(j + 1);
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data siswa berhasil dihapus dari Spreadsheet.",
        deletedCount: delCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS 2: UNDUH DATA SINKRONISASI
    if (data.action === "get_submissions" || data.action === "sync") {
      var sheetHasil = ss.getSheetByName("Hasil_Ujian");
      var values = sheetHasil ? sheetHasil.getDataRange().getValues() : [];
      var list = [];
      for (var i = 1; i < values.length; i++) {
        var r = values[i];
        if (r[5]) {
          list.push({
            timestamp: r[0],
            submissionId: r[1],
            nama: String(r[2] || ""),
            rombel: String(r[3] || ""),
            nipd: String(r[4] || ""),
            nisn: String(r[5] || "").trim(),
            score: r[6] !== "" && r[6] !== null ? Number(r[6]) : null,
            status: String(r[7] || "Selesai"),
            violations: Number(r[8] || 0),
            durationMinutes: r[9],
            startTime: r[10],
            endTime: r[11],
            deviceInfo: { platform: String(r[12] || "-"), userAgent: String(r[12] || "-") },
            screenResolution: String(r[13] || "-"),
            violationDetails: String(r[14] || "")
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: list.length,
        submissions: list
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // KASUS 3: LAPORAN LOG KECURANGAN REAL-TIME
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

    // KASUS 4: PENGIRIMAN HASIL UJIAN AKHIR
    var sheetHasil = ss.getSheetByName("Hasil_Ujian");
    var values = sheetHasil.getDataRange().getValues();

    var nisnBaru = String(data.nisn || "").trim();
    var namaBaru = String(data.nama || "").trim().toLowerCase();
    var existingRow = -1;

    for (var i = 1; i < values.length; i++) {
      var existingNisn = String(values[i][5] || "").trim();
      var existingNama = String(values[i][2] || "").trim().toLowerCase();
      if ((nisnBaru && existingNisn === nisnBaru) || (existingNama === namaBaru)) {
        existingRow = i + 1;
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
      sheetHasil.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        updated: true,
        message: "Data pembaruan nilai tersimpan rapi (menimpa duplikasi)."
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
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
    // Client static / GitHub Pages
  }

  // 2. Direct client-side POST ke Apps Script
  if (!targetUrl) {
    saveToLocalQueue(payload);
    return {
      success: true,
      message: 'Tersimpan di antrian lokal perangkat.',
    };
  }

  try {
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
      message: 'Koneksi bermasalah. Data tersimpan di perangkat.',
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

  try {
    await fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, gasUrl: targetUrl }),
    });
  } catch (e) {
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

/**
 * SINKRONISASI 2-ARAH: Mengunduh data hasil ujian dari Google Spreadsheet ke perangkat pengawas
 */
export async function syncSubmissionsFromGoogleSheets(
  gasUrl?: string
): Promise<{ success: boolean; count: number; message: string; submissions?: any[] }> {
  const targetUrl = gasUrl || getSavedGasUrl();

  // 1. Coba via backend server jika ada
  try {
    const res = await fetch('/api/exam/sync-spreadsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl: targetUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        count: data.count || 0,
        message: data.message || 'Sinkronisasi berhasil.',
      };
    }
  } catch (e) {
    // Client static fallback
  }

  // 2. Direct client-side fetch dari Google Apps Script Web App
  if (!targetUrl) {
    return {
      success: false,
      count: 0,
      message: 'URL Google Apps Script belum disetel.',
    };
  }

  try {
    const res = await fetch(`${targetUrl}?action=get_submissions`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.submissions && Array.isArray(data.submissions)) {
        // Simpan ke localStorage agar perangkat ini dapat melihatnya langsung
        const localSubs = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
        const merged = [...localSubs];

        for (const sub of data.submissions) {
          if (!sub.nisn) continue;
          const idx = merged.findIndex((m: any) => m.nisn === sub.nisn);
          const item = {
            submissionId: sub.submissionId || `SUB-${Date.now()}`,
            nisn: sub.nisn,
            nipd: sub.nipd,
            nama: sub.nama,
            rombel: sub.rombel,
            score: sub.score,
            status: sub.status || 'Selesai',
            violations: sub.violations || 0,
            durationSeconds: (Number(sub.durationMinutes) || 0) * 60,
            startTime: sub.startTime,
            endTime: sub.endTime || sub.timestamp,
            deviceInfo: sub.deviceInfo || { platform: '-' },
            violationLog: sub.violationDetails ? [{ type: sub.violationDetails, time: '-' }] : [],
          };
          if (idx >= 0) {
            merged[idx] = item;
          } else {
            merged.push(item);
          }
        }

        localStorage.setItem('cbt_hasil', JSON.stringify(merged));

        return {
          success: true,
          count: data.submissions.length,
          message: `${data.submissions.length} data pengerjaan berhasil diunduh dari Google Spreadsheet.`,
          submissions: data.submissions,
        };
      }
    }

    return {
      success: true,
      count: 0,
      message: 'Koneksi ke Google Spreadsheet berhasil, belum ada baris data baru.',
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: 'Gagal terhubung ke Google Spreadsheet: ' + (err.message || String(err)),
    };
  }
}

/**
 * HAPUS DATA SISWA: Menghapus data ujian siswa dan otomatis menghapus baris dari Google Spreadsheet
 */
export async function deleteSubmissionFromGoogleSheets(
  nisn: string,
  gasUrl?: string
): Promise<{ success: boolean; message: string }> {
  const targetUrl = gasUrl || getSavedGasUrl();

  // 1. Hapus dari localStorage perangkat ini
  try {
    const localSubs = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
    const updated = localSubs.filter((s: any) => s.nisn !== nisn);
    localStorage.setItem('cbt_hasil', JSON.stringify(updated));
  } catch (e) {}

  // 2. Kirim hapus via server backend
  try {
    const res = await fetch('/api/exam/delete-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nisn, adminPasscode: 'davi7489', gasUrl: targetUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Data berhasil dihapus.' };
    }
  } catch (e) {
    // Client static fallback
  }

  // 3. Kirim hapus langsung ke Google Apps Script
  if (targetUrl) {
    try {
      // POST no-cors
      fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete_submission', nisn }),
      }).catch(() => {});

      // GET trigger
      fetch(`${targetUrl}?action=delete_submission&nisn=${encodeURIComponent(nisn)}`).catch(() => {});
    } catch (err) {}
  }

  return {
    success: true,
    message: `Data siswa dengan NISN ${nisn} berhasil dihapus dari sistem dan Spreadsheet.`,
  };
}

// Local offline queue management
const OFFLINE_QUEUE_KEY = 'cbt_offline_submissions';

export function saveToLocalQueue(payload: ExamSubmissionPayload) {
  if (typeof window === 'undefined') return;
  try {
    const list: ExamSubmissionPayload[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
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
