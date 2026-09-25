# CBT TKA Bahasa Inggris SMK Negeri 2 Gorontalo 2026

Aplikasi Computer Based Test (CBT) modern berbasis web yang dirancang khusus untuk ujian serentak 300+ siswa dengan sinkronisasi langsung ke Google Spreadsheet via Google Apps Script, sistem anti-kecurangan aktif, dan dashboard monitoring real-time pengawas.

---

## 🚀 Fitur Utama

1. **Sinkronisasi Langsung ke Google Spreadsheet (Google Apps Script):**
   - Hasil ujian terkirim secara otomatis saat siswa menekan tombol "Selesai & Kumpulkan".
   - Mendukung **300+ siswa serentak** dengan `LockService` di Apps Script untuk mencegah tabrakan data (race condition).
   - Validasi duplikasi berdasarkan NISN dan Nama siswa agar data spreadsheet selalu rapi tanpa baris ganda.
   - Perekaman otomatis ke sheet `Hasil_Ujian` dan sheet `Log_Pelanggaran`.

2. **Daftar 294 Peserta Didik SMK Negeri 2 Gorontalo:**
   - Memilih **Rombel** (12-APHP-1, 12-APHP-2, 12-BUSANA, 12-CANTIK-1, 12-CANTIK-2, 12-DKV-1, 12-DKV-2, 12-HOTEL-1, 12-HOTEL-2, 12-HOTEL-3, 12-KULINER) otomatis memfilter nama siswa.
   - NISN dan NIPD otomatis terverifikasi dan terkunci untuk mencegah kesalahan ketik atau kecurangan identitas.

3. **HTML CBT & Soal Lengkap:**
   - 5 Bacaan Bahasa Inggris resmi Try Out TKA 2026 Gorontalo.
   - 30 Soal lengkap dengan berbagai tipe:
     - Pilihan Ganda Tunggal (Single Choice)
     - Pilihan Ganda Kompleks (Multi-Choice)
     - Klasifikasi / Tabel Matriks (True/False & Category matching)
   - Waktu ujian: 90 menit dengan hitung mundur real-time.

4. **Desain Mobile-First (Optimal untuk Smartphone):**
   - Navigasi bacaan horizontal yang nyaman di layar HP.
   - Target sentuh tombol dan opsi yang besar dan mudah ditekan.
   - Drawer nomor soal cepat untuk melihat status soal yang sudah dan belum terjawab.
   - Dukungan safe area inset untuk perangkat berponi/notch.

5. **Sistem Keamanan & Anti-Kecurangan (Anti-Cheat):**
   - Mode layar penuh (Fullscreen) otomatis dengan peringatan jika keluar.
   - Deteksi perpindahan tab atau minimalkan browser (`visibilitychange`).
   - Deteksi beralih aplikasi, split screen, atau membuka notifikasi (`window.blur`).
   - Blokir klik kanan, salin/tempel (copy/paste), dan pintasan keyboard pengembang (F12, Inspect Element, PrintScreen).
   - Watermark keamanan dinamis berputar di layar dengan Nama dan NISN siswa untuk mencegah pemotretan/perekaman layar.
   - Laporan kecurangan terkirim langsung ke Google Spreadsheet secara real-time.
   - Diskualifikasi otomatis jika pelanggaran mencapai batas toleransi (3x).

6. **Dashboard Monitoring Real-Time (Portal Guru/Pengawas):**
   - Akses aman dengan kata sandi guru: `guru123`.
   - Ringkasan live statistik: Total Siswa, Sedang Mengerjakan, Selesai, Belum Mulai, Pelanggaran, dan Diskualifikasi.
   - Indikator status perangkat (Online / Offline) dengan refresh otomatis tiap 4 detik.
   - Log aktivitas per perangkat: Platform OS, User Agent browser, dan resolusi layar.
   - Pencarian siswa berdasarkan Nama/NISN dan filter per Rombel.
   - Tombol Reset Sesi siswa jika terjadi kendala teknis perangkat.
   - Ekspor rekap nilai lengkap ke format CSV / Excel.

7. **Privasi & Kerahasiaan Ujian:**
   - Siswa tidak dapat melihat jawaban siswa lain selama ujian berlangsung.
   - Siswa tidak dapat melihat kunci jawaban atau nilai akhirnya pada layar hasil (hanya menerima tanda terima digital).

---

## 📋 Langkah-Langkah Integrasi Google Apps Script

1. Buat Google Spreadsheet baru di [Google Sheets](https://sheets.new).
2. Beri nama file, contoh: **"Hasil CBT TKA Bahasa Inggris SMK 2026"**.
3. Di menu atas, klik **Ekstensi (Extensions)** &rarr; **Apps Script**.
4. Hapus semua kode bawaan, lalu salin dan tempelkan kode yang ada di modal **"Pengaturan Sheets"** pada aplikasi atau dari file `src/services/googleSheetsService.ts`.
5. Klik **Deploy (Terapkan)** di pojok kanan atas &rarr; pilih **New Deployment (Penerapan Baru)**.
6. Pilih jenis: **Web App (Aplikasi Web)**.
7. Konfigurasi wajib:
   - **Execute as (Jalankan sebagai):** `Me (email Anda)`
   - **Who has access (Siapa yang memiliki akses):** `Anyone (Siapa saja)`
8. Klik **Deploy**, izinkan otorisasi akun Google Anda (*Advanced* &rarr; *Go to CBT project (unsafe)*).
9. Salin URL Web App yang berakhiran `/exec`.
10. Buka aplikasi CBT, klik tombol **"Pengaturan Sheets"**, tempelkan URL tersebut, dan klik **Simpan & Uji Koneksi**.

---

## 📦 Publikasi ke GitHub & Hosting Gratis

### Upload ke Repositori GitHub:
```bash
git init
git add .
git commit -m "feat: CBT TKA Bahasa Inggris SMK Negeri 2 Gorontalo 2026"
git branch -M main
git remote add origin https://github.com/USERNAME/cbt-tka-smk.git
git push -u origin main
```

### Hosting di GitHub Pages / Vercel / Cloud Run:
- Untuk hosting statis (GitHub Pages / Vercel / Netlify):
  ```bash
  npm run build
  ```
  Folder `dist` siap di-hosting langsung. Pengiriman ke Google Spreadsheet tetap bekerja 100% menggunakan mode *direct client-side request* tanpa server backend.
- Untuk hosting full-stack dengan monitoring server:
  ```bash
  npm run build
  npm start
  ```
