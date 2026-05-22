# AGENTS.md - SATPAM-Q Web Dashboard

## Project Overview
SATPAM-Q adalah dashboard web yang user-friendly untuk memantau kualitas udara kandang puyuh (suhu & amonia) dan mengendalikan aktuator (kipas & mist sprayer) secara real-time.  
Teknologi inti: Firebase Authentication + Realtime Database + ESP32 (DHT22 + MQ-135).

Tujuan utama: Sistem yang stabil, responsif, user-friendly, mudah dibaca, dan aman untuk peternak puyuh.

## Core Architecture (3-File Rule - WAJIB)
Seluruh aplikasi hanya terdiri dari **3 file inti**:
- `index.html` → struktur & konten
- `style.css` → semua styling (custom CSS, tanpa Bootstrap di kode final)
- `app.js` → semua logic, Firebase, Chart.js, event handling

**Jangan** tambah file HTML, JS, atau CSS baru kecuali benar-benar diperlukan (misal: helper kecil di folder assets nanti).

## Referensi Desain UI/UX
- Ikuti folder ./Stitch/ untuk panduan UI/UX dalam format HTML.d
- Selalu ikuti `DESIGN.md` sebagai sumber kebenaran utama untuk tampilan, warna, typography, layout, dan feel.
- Desain target: minimalis, industrial-farm, jelas, mobile-first, profesional tapi tidak kaku.
- Prioritas: Kecepatan baca data + kontrol yang jelas (khususnya di HP).

## Tech Stack & Dependencies
- Firebase JS SDK (Auth + Realtime Database)
- Chart.js untuk grafik riwayat
- Kode final harus pure custom CSS.
- Vanilla JavaScript (tidak pakai framework seperti React/Vue)

## Coding Rules & Style

### Umum
- Kode harus bersih, mudah dibaca, dan well-commented (khususnya bagian Firebase dan logic kontrol).
- Gunakan `const` dan `let` secara tepat. Hindari `var`.
- Selalu gunakan arrow function kecuali ada alasan khusus.
- Error handling yang baik, terutama pada Firebase connection dan sensor data.
- Gunakan CSS custom properties (variables) sebanyak mungkin.

### HTML
- Semantic HTML5 sebanyak mungkin.
- ID dan class yang deskriptif dan konsisten (contoh: `sensor-temp`, `control-fan`, `status-amonia`).

### CSS
- Mobile-first approach.
- Gunakan `rem` untuk ukuran, `clamp()` jika perlu.
- Transition halus (0.2–0.3s).
- Status kritis harus langsung terlihat (warna + animasi ringan).

### JavaScript
- Modular sebisa mungkin di dalam `app.js` (pisah function per section: firebase, sensors, controls, chart, telegram).
- Selalu cek koneksi Firebase sebelum operasi penting.
- Implementasikan debounce/throttle jika ada event yang sering dipicu.
- Update UI secara efisien (hindari DOM manipulation berulang).

## Fitur Penting & Aturan Khusus

**Mode Otomatis / Manual**
- Harus sinkron antara web dan ESP32.
- Saat mode Otomatis → tombol manual disabled + indikator jelas.
- Hindari "tarik tambang" antara logic ESP32 dan perintah user.

**Data Handling**
- Real-time update setiap ~3 detik untuk sensor & kontrol.
- Log riwayat di-upload lebih lambat (1 menit) agar database tidak bengkak dan grafik tetap lancar.
- Grafik hanya tampilkan data terakhir (maksimal 20-30 titik).

**Notifikasi Telegram**
- Cooldown minimal 10 menit untuk mencegah spam.
- Notifikasi hanya dikirim saat kondisi kritis (amonia tinggi).

**Keamanan**
- Firebase Auth wajib aktif.
- Jangan expose credential di client-side.
- Validasi semua input/control sebelum dikirim ke Firebase.

---

## Fitur Tambahan yang Penting

### 1. Fitur Eksport Data (PDF, Excel, CSV) Berbasis Kalender

Fitur ini akan mengekstrak data dari node `history` di Firebase berdasarkan rentang waktu yang dipilih pengguna, lalu memproses failnya langsung di browser.

* **Logika Data (`app.js`):**
* AI akan diperintahkan membuat fungsi yang menangkap nilai dari dua input kalender (Tanggal Mulai dan Tanggal Selesai).
* Tanggal tersebut diubah menjadi format *Unix Epoch Timestamp* (detik).
* Melakukan kueri spesifik ke Firebase menggunakan: `query(historyRef, orderByChild('timestamp'), startAt(mulai), endAt(selesai))`.


* **Logika Pembuatan Fail:**
* **CSV:** Menggabungkan array data menjadi string teks yang dipisahkan koma (Comma-Separated Values).
* **Excel:** Menggunakan pustaka *SheetJS (xlsx.full.min.js)* dari CDN untuk mengubah array JSON menjadi fail `.xlsx` yang rapi.
* **PDF:** Menggunakan pustaka *jsPDF* dan *jsPDF-AutoTable* untuk menyusun tabel formal. AI juga bisa diminta menggunakan *html2canvas* untuk mengambil gambar grafik *Chart.js* saat itu dan memasukkannya sebagai lampiran di halaman pertama PDF.


### 2. Heatmap Harian (Matriks Kesehatan Kandang Bulanan)

Fitur ini memberikan gambaran ringkas performa kandang selama satu bulan penuh menggunakan kotak-kotak warna, mirip seperti grafik kontribusi di profil GitHub.

* **Logika Data (`app.js`):**
* JavaScript menarik data riwayat dalam rentang 30 hari terakhir.
* Data dikelompokkan berdasarkan tanggal (`YYYY-MM-DD`).
* Untuk setiap tanggal, jalankan pengecekan kondisi kritis: Jika pada hari itu ada log di mana gas amonia menembus **> 20 PPM** atau suhu **> 27°C**, tandai hari tersebut sebagai hari dengan "Kondisi Kritis". Jika aman, hitung rata-rata hariannya untuk menentukan tingkat kesehatan.


* **Rancangan Visual (`index.html` & `style.css`):**
* Sebuah grid berisi 30 kotak kecil yang mewakili tiap hari dalam sebulan.
* **Aturan Warna Kotak:**
* *Hijau Tua:* Hari di mana kondisi kandang 100% ideal (Amonia < 20 PPM, Suhu < 27°C).
* *Kuning/Jingga:* Hari di mana sempat terjadi lonjakan parameter minor atau durasi aktuator menyala sangat lama.
* *Merah:* Hari di mana terjadi kondisi kritis (amonia tinggi) yang berlangsung lama atau berulang.


* *Efek Hover:* Saat kursor diarahkan ke salah satu kotak, muncul *tooltip* kecil yang menampilkan teks: *"18 Mei 2026 - Rata-rata Amonia: 12 PPM (Sehat)"*.

---

## Workflow Saat Mengubah Kode
1. Baca folder ./stitch/ dulu untuk UI/UX.
2. Pahami bagian yang akan diubah.
3. Buat perubahan seminimal mungkin tapi efektif.
4. Test di browser (mobile & desktop).
5. Pastikan tidak merusak existing functionality (auth, real-time, kontrol, grafik).
6. Update `AGENTS.md` kalau ada perubahan aturan baru.

## Hal yang Dilarang
- Menambah dependency berat.
- Mengubah arsitektur 3-file tanpa persetujuan jelas.
- Menggunakan Bootstrap classes di kode produksi/final.
- Mengabaikan mobile experience.
- Menambah fitur baru tanpa mempertimbangkan performa & kesederhanaan.
