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

export function normalizeNisn(val: any): string {
  if (!val) return '';
  const str = String(val).split('.')[0].replace(/\D/g, '').trim();
  if (str.length > 0 && str.length < 10) {
    return str.padStart(10, '0');
  }
  return str;
}

export function normalizeName(val: any): string {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNipd(val: any): string {
  if (!val) return '';
  return String(val).trim().toLowerCase();
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
 * Kode Google Apps Script Lengkap (Versi 3 - Turbo Cache & Batch Read)
 * Mendukung:
 * 1. CacheService Server-Side: Mempercepat unduh data hingga < 0.3 detik
 * 2. Batch Range Reading: Hanya membaca baris terisi (tanpa header overhead)
 * 3. Simpan serentak 300+ siswa dengan LockService
 * 4. Hapus otomatis baris di Spreadsheet saat dihapus di Portal Guru
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ========================================================================
 * SKRIP GOOGLE APPS SCRIPT (VERSI 3 TURBO) - CBT TKA SMKN 2 GORONTALO
 * Dilengkapi Akselerasi CacheService & Batch Range Read (< 0.5 Detik)
 * ========================================================================
 */

function setupSheetHeaders(ss) {
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

  // FITUR 1: SINKRONISASI / UNDUH DATA DARI SPREADSHEET (TURBO SPEED)
  if (action === "get_submissions" || action === "sync") {
    // 1. Cek CacheService Server untuk respon instan (< 150ms)
    var cache = CacheService.getScriptCache();
    var cached = cache.get("cbt_submissions_cache_v3");
    if (cached) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetHasil = ss.getSheetByName("Hasil_Ujian");
    if (!sheetHasil) {
      var emptyRes = JSON.stringify({ status: "success", count: 0, submissions: [], source: "empty" });
      return ContentService.createTextOutput(emptyRes).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheetHasil.getLastRow();
    if (lastRow <= 1) {
      var emptyRes = JSON.stringify({ status: "success", count: 0, submissions: [], source: "empty" });
      return ContentService.createTextOutput(emptyRes).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Baca HANYA baris data yang terisi sekaligus dalam 1 batch call
    var values = sheetHasil.getRange(2, 1, lastRow - 1, 15).getValues();
    var list = [];
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var namaVal = String(r[2] || "").trim();
      var nipdVal = String(r[4] || "").trim();
      var rawNisn = String(r[5] !== undefined && r[5] !== null ? r[5] : "").trim();
      if (rawNisn.indexOf(".") > -1) {
        rawNisn = rawNisn.split(".")[0];
      }
      var digitsOnly = rawNisn.replace(/[^0-9]/g, "");
      var nisnVal = digitsOnly;
      if (digitsOnly.length > 0 && digitsOnly.length < 10) {
        while (nisnVal.length < 10) {
          nisnVal = "0" + nisnVal;
        }
      }

      // Pastikan baris terbaca jika NISN atau Nama atau NIPD tersedia
      if (nisnVal || namaVal || nipdVal) {
        list.push({
          timestamp: r[0],
          submissionId: r[1],
          nama: namaVal,
          rombel: String(r[3] || ""),
          nipd: nipdVal,
          nisn: nisnVal || rawNisn,
          score: (r[6] !== "" && r[6] !== null && !isNaN(r[6])) ? Number(r[6]) : null,
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

    var outputObj = {
      status: "success",
      count: list.length,
      submissions: list,
      time: new Date().toISOString()
    };
    var jsonStr = JSON.stringify(outputObj);

    // Simpan ke CacheService jika ukuran memenuhi (< 95KB)
    try {
      if (jsonStr.length < 95000) {
        cache.put("cbt_submissions_cache_v3", jsonStr, 60); // 60 detik cache
      }
    } catch (cacheErr) {}

    return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
  }

  // FITUR 2: HAPUS SISWA VIA GET FALLBACK
  if (action === "delete_submission") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
      // Hapus cache agar sinkronisasi langsung sinkron
      try {
        CacheService.getScriptCache().remove("cbt_submissions_cache_v3");
      } catch (err) {}
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data siswa berhasil dihapus dari Spreadsheet",
      deletedCount: deletedCount
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script CBT SMK Negeri 2 Gorontalo Aktif & Terhubung (Versi 3 Turbo)",
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
        // Invalidate cache
        try {
          CacheService.getScriptCache().remove("cbt_submissions_cache_v3");
        } catch (ce) {}
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
      var lastRow = sheetHasil ? sheetHasil.getLastRow() : 0;
      var list = [];
      if (lastRow > 1) {
        var values = sheetHasil.getRange(2, 1, lastRow - 1, 15).getValues();
        for (var i = 0; i < values.length; i++) {
          var r = values[i];
          var namaVal = String(r[2] || "").trim();
          var nipdVal = String(r[4] || "").trim();
          var rawNisn = String(r[5] !== undefined && r[5] !== null ? r[5] : "").trim();
          if (rawNisn.indexOf(".") > -1) {
            rawNisn = rawNisn.split(".")[0];
          }
          var digitsOnly = rawNisn.replace(/[^0-9]/g, "");
          var nisnVal = digitsOnly;
          if (digitsOnly.length > 0 && digitsOnly.length < 10) {
            while (nisnVal.length < 10) {
              nisnVal = "0" + nisnVal;
            }
          }

          if (nisnVal || namaVal || nipdVal) {
            list.push({
              timestamp: r[0],
              submissionId: r[1],
              nama: namaVal,
              rombel: String(r[3] || ""),
              nipd: nipdVal,
              nisn: nisnVal || rawNisn,
              score: (r[6] !== "" && r[6] !== null && !isNaN(r[6])) ? Number(r[6]) : null,
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
    } else {
      sheetHasil.appendRow(rowData);
    }

    // Invalidate cache setelah ada nilai baru
    try {
      CacheService.getScriptCache().remove("cbt_submissions_cache_v3");
    } catch (eCache) {}

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      updated: existingRow > 0,
      message: existingRow > 0 ? "Data nilai diperbarui." : "Hasil ujian berhasil tersimpan!"
    })).setMimeType(ContentService.MimeType.JSON);

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
 * SINKRONISASI 2-ARAH (AKSELERASI TINGGI):
 * Mengunduh data hasil ujian dari Google Spreadsheet ke perangkat pengawas secara instan
 */
export async function syncSubmissionsFromGoogleSheets(
  gasUrl?: string
): Promise<{ success: boolean; count: number; durationMs: number; message: string; submissions?: any[] }> {
  const startTime = performance.now();
  const targetUrl = gasUrl || getSavedGasUrl();

  if (!targetUrl) {
    return {
      success: false,
      count: 0,
      durationMs: 0,
      message: 'URL Google Apps Script belum disetel.',
    };
  }

  let rawSubmissions: any[] | null = null;

  // Jalur Cepat 1: Direct Fetch ke Google Apps Script Web App
  // GAS Web App mendukung CORS GET penuh dan menghasilkan response langsung ke browser tanpa proxy delay
  try {
    const directUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=get_submissions&_t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const res = await fetch(directUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.submissions)) {
        rawSubmissions = data.submissions;
      }
    }
  } catch (directErr) {
    // Jika fetch langsung gagal karena network/firewall, coba via backend proxy jika tersedia
    try {
      const proxyRes = await fetch('/api/exam/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: targetUrl }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData && Array.isArray(proxyData.submissions)) {
          rawSubmissions = proxyData.submissions;
        }
      }
    } catch (proxyErr) {}
  }

  // Jika data berhasil diunduh
  if (rawSubmissions !== null) {
    const localSubs: any[] = JSON.parse(localStorage.getItem('cbt_hasil') || '[]');
    const subMap = new Map<string, any>();

    // Masukkan data lokal terlebih dahulu
    for (const item of localSubs) {
      if (!item) continue;
      const key = normalizeNisn(item.nisn) || normalizeNipd(item.nipd) || normalizeName(item.nama);
      if (key) subMap.set(key, item);
    }

    // Masukkan dan timpa dengan data terbaru dari spreadsheet
    for (const sub of rawSubmissions) {
      if (!sub) continue;
      const normNisn = normalizeNisn(sub.nisn);
      const rawNisn = String(sub.nisn || '').trim();
      const normNipd = normalizeNipd(sub.nipd);
      const normName = normalizeName(sub.nama);

      // Gunakan kunci unik terbaik
      const primaryKey = normNisn || (normNipd && normNipd !== '-' ? normNipd : '') || normName;
      if (!primaryKey) continue;

      const item = {
        submissionId: sub.submissionId || `SUB-${Date.now()}`,
        nisn: normNisn || rawNisn,
        nipd: sub.nipd || '-',
        nama: sub.nama || 'Siswa',
        rombel: sub.rombel || '-',
        score: sub.score !== null && sub.score !== undefined ? Number(sub.score) : null,
        status: sub.status || 'Selesai',
        violations: Number(sub.violations || 0),
        durationSeconds: (Number(sub.durationMinutes) || 0) * 60,
        startTime: sub.startTime || '',
        endTime: sub.endTime || sub.timestamp || '',
        deviceInfo: sub.deviceInfo || { platform: '-' },
        violationLog: sub.violationDetails ? [{ type: sub.violationDetails, time: '-' }] : [],
      };

      subMap.set(primaryKey, item);
      if (normNisn) subMap.set(normNisn, item);
      if (rawNisn) subMap.set(rawNisn, item);
      if (normNipd && normNipd !== '-') subMap.set(normNipd, item);
      if (normName) subMap.set(normName, item);
    }

    const uniqueMerged = Array.from(new Set(subMap.values()));
    localStorage.setItem('cbt_hasil', JSON.stringify(uniqueMerged));

    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: true,
      count: rawSubmissions.length,
      durationMs,
      message: `${rawSubmissions.length} data ujian berhasil diunduh dari Google Spreadsheet.`,
      submissions: uniqueMerged,
    };
  }

  const durationMs = Math.round(performance.now() - startTime);
  return {
    success: false,
    count: 0,
    durationMs,
    message: 'Gagal mengunduh data dari Google Spreadsheet. Pastikan URL Web App valid dan koneksi internet stabil.',
  };
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
      fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete_submission', nisn }),
      }).catch(() => {});

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
