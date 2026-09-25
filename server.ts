import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { STUDENTS_DATA } from './src/data/studentsData.ts';
import { calculateScore, QUESTIONS } from './src/data/cbtQuestions.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File persistence paths
const DATA_DIR = path.resolve(__dirname, 'data');
const SUBMISSIONS_FILE = path.resolve(DATA_DIR, 'submissions.json');
const CONFIG_FILE = path.resolve(DATA_DIR, 'config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state
interface ActiveSession {
  nisn: string;
  nipd: string;
  nama: string;
  rombel: string;
  status: 'Sedang Mengerjakan' | 'Selesai' | 'Didiskualifikasi' | 'Waktu Habis';
  currentQuestion: number;
  currentPassage: number;
  answeredCount: number;
  timeLeft: number;
  score?: number;
  violations: number;
  violationDetails: Array<{ type: string; time: string }>;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenResolution: string;
    viewport: string;
    ip?: string;
  };
  startTime: string;
  lastPing: string;
  endTime?: string;
}

let activeSessions: Record<string, ActiveSession> = {};
let submissions: any[] = [];
let serverConfig = {
  gasWebappUrl:
    process.env.GAS_WEBAPP_URL ||
    'https://script.google.com/macros/s/AKfycbwf-wV8KbUARklU8kkAwT1ZKD1bX36U5W6l2UaiD7Cm44ZKZR4tF5pC-Ng3ocwtdw1d/exec',
  examTitle: 'Try Out TKA Bahasa Inggris SMK',
  durationMinutes: 90,
  maxViolations: 3,
  activeToken: 'TKA2026',
};

// Load initial submissions from file if available
try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
    // Mark completed in activeSessions
    for (const sub of submissions) {
      if (sub.nisn) {
        activeSessions[sub.nisn] = {
          nisn: sub.nisn,
          nipd: sub.nipd,
          nama: sub.nama,
          rombel: sub.rombel,
          status: sub.status || 'Selesai',
          currentQuestion: 30,
          currentPassage: 4,
          answeredCount: 30,
          timeLeft: 0,
          score: sub.score,
          violations: sub.violations || 0,
          violationDetails: sub.violationLog || [],
          deviceInfo: sub.deviceInfo || { userAgent: '-', platform: '-', screenResolution: '-', viewport: '-' },
          startTime: sub.startTime,
          lastPing: sub.endTime || new Date().toISOString(),
          endTime: sub.endTime,
        };
      }
    }
  }
} catch (e) {
  console.error('Gagal membaca submissions.json:', e);
}

// Load config if available
try {
  if (fs.existsSync(CONFIG_FILE)) {
    serverConfig = { ...serverConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  }
} catch (e) {}

function saveSubmissionsToFile() {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
  } catch (e) {
    console.error('Gagal menyimpan submissions:', e);
  }
}

function saveConfigFile() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2));
  } catch (e) {}
}

// Helper forwarder to Google Apps Script
async function forwardToGoogleAppsScript(payload: any, url?: string) {
  const targetUrl = url || serverConfig.gasWebappUrl;
  if (!targetUrl) return;

  try {
    const fetchResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return fetchResponse;
  } catch (err) {
    console.error('Forward ke Google Apps Script gagal:', err);
  }
}

// ----------------- API ROUTES -----------------

// 1. Login / Start Exam Verification
app.post('/api/exam/login', (req: Request, res: Response) => {
  const { rombel, nisn, nipd, nama, token, deviceInfo } = req.body;

  if (!rombel || !nisn || !nama) {
    return res.status(400).json({ error: 'Rombel, Nama, dan NISN wajib diisi.' });
  }

  // Validasi Token Ujian dari Guru Pengawas
  const inputToken = String(token || '').trim().toUpperCase();
  const currentToken = String(serverConfig.activeToken || 'TKA2026').trim().toUpperCase();
  if (!inputToken || inputToken !== currentToken) {
    return res.status(400).json({
      error: 'Token Ujian salah atau belum diaktifkan oleh pengawas. Silakan masukkan token yang tepat.',
    });
  }

  // Validasi data siswa di database resmi SMK
  const student = STUDENTS_DATA.find((s) => s.nisn === nisn && s.rombel === rombel);
  if (!student) {
    return res.status(400).json({
      error: 'Data siswa tidak ditemukan pada rombel ini. Pastikan Anda memilih Rombel & Nama yang sesuai.',
    });
  }

  // Cek apakah siswa sudah pernah selesai ujian
  const existingSub = submissions.find((sub) => sub.nisn === nisn);
  if (existingSub) {
    return res.status(403).json({
      error: 'Ujian sudah diselesaikan sebelumnya oleh siswa ini. Hubungi pengawas/guru jika terjadi kesalahan.',
      alreadySubmitted: true,
      submission: {
        score: existingSub.score,
        endTime: existingSub.endTime,
        status: existingSub.status,
      },
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

  // Inisialisasi atau aktifkan sesi
  activeSessions[nisn] = {
    nisn,
    nipd: student.nipd,
    nama: student.nama,
    rombel: student.rombel,
    status: 'Sedang Mengerjakan',
    currentQuestion: 1,
    currentPassage: 0,
    answeredCount: 0,
    timeLeft: serverConfig.durationMinutes * 60,
    violations: 0,
    violationDetails: [],
    deviceInfo: {
      ...deviceInfo,
      ip: clientIp,
    },
    startTime: new Date().toISOString(),
    lastPing: new Date().toISOString(),
  };

  return res.json({
    success: true,
    message: 'Login berhasil. Selamat mengerjakan ujian.',
    session: activeSessions[nisn],
    config: serverConfig,
  });
});

// 2. Real-time Heartbeat Ping (from student devices)
app.post('/api/exam/heartbeat', (req: Request, res: Response) => {
  const { nisn, currentQuestion, currentPassage, answeredCount, timeLeft, violations, deviceInfo } = req.body;

  if (!nisn || !activeSessions[nisn]) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan atau kedaluwarsa.' });
  }

  const session = activeSessions[nisn];

  // Jangan ubah status jika sudah selesai
  if (session.status !== 'Selesai' && session.status !== 'Didiskualifikasi') {
    session.currentQuestion = currentQuestion ?? session.currentQuestion;
    session.currentPassage = currentPassage ?? session.currentPassage;
    session.answeredCount = answeredCount ?? session.answeredCount;
    session.timeLeft = timeLeft ?? session.timeLeft;
    session.violations = violations ?? session.violations;
    session.lastPing = new Date().toISOString();
    if (deviceInfo) {
      session.deviceInfo = { ...session.deviceInfo, ...deviceInfo };
    }
  }

  return res.json({ success: true, serverTime: new Date().toISOString() });
});

// 3. Real-time Anti-Cheat Violation Event
app.post('/api/exam/violation', async (req: Request, res: Response) => {
  const { nisn, violationType, timestamp, gasUrl } = req.body;

  if (nisn && activeSessions[nisn]) {
    const session = activeSessions[nisn];
    session.violations += 1;
    session.violationDetails.push({
      type: violationType,
      time: timestamp || new Date().toISOString(),
    });

    // Catat pelanggaran tanpa mengunci soal (soal tetap terbuka, jumlah pelanggaran tetap tercatat di monitoring)
  }

  // Teruskan langsung ke Google Spreadsheet sheet "Log_Pelanggaran"
  forwardToGoogleAppsScript(
    {
      action: 'log_violation',
      studentName: activeSessions[nisn]?.nama || 'Unknown',
      rombel: activeSessions[nisn]?.rombel || 'Unknown',
      nisn: nisn || 'Unknown',
      violationType: violationType || 'Pelanggaran terdeteksi',
      deviceInfo: activeSessions[nisn]?.deviceInfo
        ? `${activeSessions[nisn]?.deviceInfo.platform} | ${activeSessions[nisn]?.deviceInfo.userAgent}`
        : '-',
    },
    gasUrl
  );

  return res.json({ success: true });
});

// 4. Submit Final Exam
app.post('/api/exam/submit', async (req: Request, res: Response) => {
  const {
    nisn,
    nama,
    rombel,
    nipd,
    answers,
    status = 'Selesai',
    violations = 0,
    violationLog = [],
    startTime,
    durationSeconds = 0,
    deviceInfo,
    gasUrl,
  } = req.body;

  if (!nisn) {
    return res.status(400).json({ error: 'NISN tidak valid.' });
  }

  // Hitung skor di sisi server untuk keabsahan nilai
  const calculatedScore = calculateScore(answers || {});
  const endTime = new Date().toISOString();
  const submissionId = `SUB-${nisn}-${Date.now()}`;

  const submissionRecord = {
    submissionId,
    nisn,
    nipd,
    nama,
    rombel,
    score: calculatedScore,
    status,
    violations,
    violationLog,
    startTime: startTime || new Date().toISOString(),
    endTime,
    durationSeconds,
    deviceInfo,
  };

  // Mencegah duplikasi data: jika sudah ada, update record
  const existingIdx = submissions.findIndex((s) => s.nisn === nisn);
  if (existingIdx >= 0) {
    submissions[existingIdx] = submissionRecord;
  } else {
    submissions.push(submissionRecord);
  }
  saveSubmissionsToFile();

  // Update active session
  if (activeSessions[nisn]) {
    activeSessions[nisn].status = status;
    activeSessions[nisn].score = calculatedScore;
    activeSessions[nisn].endTime = endTime;
    activeSessions[nisn].violations = violations;
  }

  // Teruskan ke Google Apps Script secara asynchronous (tanpa memblokir respons siswa)
  forwardToGoogleAppsScript(submissionRecord, gasUrl);

  return res.json({
    success: true,
    message: 'Hasil ujian berhasil disimpan dan disinkronkan ke Google Spreadsheet.',
    submissionId,
    score: calculatedScore,
    status,
    endTime,
  });
});

// 5. Admin Monitoring Data (Real-time overview of 294 students)
app.get('/api/exam/monitoring', (req: Request, res: Response) => {
  // Gabungkan semua 294 siswa resmi dengan status terkini
  const monitoringData = STUDENTS_DATA.map((student) => {
    const session = activeSessions[student.nisn];
    const submission = submissions.find((sub) => sub.nisn === student.nisn);

    let status = 'Belum Mulai';
    let score = null;
    let answeredCount = 0;
    let violations = 0;
    let violationDetails: any[] = [];
    let lastPing = null;
    let deviceInfo = null;
    let startTime = null;
    let endTime = null;

    if (submission) {
      status = submission.status || 'Selesai';
      score = submission.score;
      violations = submission.violations || 0;
      violationDetails = submission.violationLog || [];
      deviceInfo = submission.deviceInfo;
      startTime = submission.startTime;
      endTime = submission.endTime;
      answeredCount = 30;
    } else if (session) {
      status = session.status;
      answeredCount = session.answeredCount;
      violations = session.violations;
      violationDetails = session.violationDetails;
      lastPing = session.lastPing;
      deviceInfo = session.deviceInfo;
      startTime = session.startTime;
    }

    // Cek apakah perangkat offline (ping > 30 detik yang lalu saat sedang mengerjakan)
    const isOnline =
      session &&
      status === 'Sedang Mengerjakan' &&
      new Date().getTime() - new Date(session.lastPing).getTime() < 30000;

    return {
      no: student.no,
      nama: student.nama,
      rombel: student.rombel,
      nipd: student.nipd,
      jk: student.jk,
      nisn: student.nisn,
      status,
      isOnline,
      score,
      answeredCount,
      violations,
      violationDetails,
      lastPing,
      deviceInfo,
      startTime,
      endTime,
    };
  });

  const totalStudents = STUDENTS_DATA.length;
  const completed = monitoringData.filter((d) => d.status === 'Selesai').length;
  const inProgress = monitoringData.filter((d) => d.status === 'Sedang Mengerjakan').length;
  const disqualified = monitoringData.filter((d) => d.status === 'Didiskualifikasi').length;
  const notStarted = monitoringData.filter((d) => d.status === 'Belum Mulai').length;
  const withViolations = monitoringData.filter((d) => d.violations > 0).length;

  return res.json({
    students: monitoringData,
    summary: {
      total: totalStudents,
      completed,
      inProgress,
      disqualified,
      notStarted,
      withViolations,
    },
    config: serverConfig,
  });
});

// 6. Admin Reset Session (for students whose phone battery died or restarted)
app.post('/api/exam/reset', (req: Request, res: Response) => {
  const { nisn, adminPasscode } = req.body;

  if (adminPasscode !== 'guru123') {
    return res.status(401).json({ error: 'Kata sandi pengawas tidak sesuai.' });
  }

  if (nisn) {
    delete activeSessions[nisn];
    submissions = submissions.filter((sub) => sub.nisn !== nisn);
    saveSubmissionsToFile();
    return res.json({ success: true, message: `Sesi siswa dengan NISN ${nisn} telah direset.` });
  }

  return res.status(400).json({ error: 'NISN tidak ditentukan.' });
});

// 7. Get and Update Config
app.get('/api/exam/config', (req: Request, res: Response) => {
  return res.json(serverConfig);
});

app.post('/api/exam/config', (req: Request, res: Response) => {
  const { gasWebappUrl, durationMinutes, maxViolations, activeToken, adminPasscode } = req.body;
  if (adminPasscode !== 'guru123') {
    return res.status(401).json({ error: 'Kata sandi pengawas tidak valid.' });
  }

  if (gasWebappUrl !== undefined) serverConfig.gasWebappUrl = gasWebappUrl;
  if (durationMinutes !== undefined) serverConfig.durationMinutes = Number(durationMinutes);
  if (maxViolations !== undefined) serverConfig.maxViolations = Number(maxViolations);
  if (activeToken !== undefined) serverConfig.activeToken = String(activeToken).trim().toUpperCase();

  saveConfigFile();
  return res.json({ success: true, config: serverConfig });
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server CBT berjalan di port ${PORT}`);
  });
}

startServer();
