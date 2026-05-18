# 🛡️ SATPAM-Q: Smart Poultry Monitoring & Ammonia Queller

[![Status](https://img.shields.io/badge/Status-MVP%20Functional-success?style=for-the-badge)]()
[![Tech Stack](https://img.shields.io/badge/Stack-Firebase%20%7C%20ESP32%20%7C%20JS-orange?style=for-the-badge)]()
[![Architecture](https://img.shields.io/badge/Design-3--File%20Rule-blue?style=for-the-badge)]()

**SATPAM-Q** adalah ekosistem dashboard web minimalis yang dirancang khusus untuk peternak puyuh modern. Sistem ini mengintegrasikan IoT (ESP32) dengan Firebase untuk memantau kualitas udara secara *real-time* dan melakukan tindakan preventif otomatis terhadap gas amonia.

---

## 🚀 Fitur Utama

- **Real-Time Monitoring**: Pantau suhu (DHT22) dan kadar amonia (MQ-135) dengan latensi rendah (~3 detik).
- **Dual-Mode Control**: Perpindahan cerdas antara mode **Otomatis** (logika sensor) dan **Manual** (kendali pengguna) tanpa konflik instruksi.
- **Probiotic Mist Sprayer**: Kontrol aktuator untuk menyemprotkan cairan probiotik guna menetralisir amonia langsung pada sumbernya (feses).
- **Split Logic Interval**: 
    - ⚡ **3 Detik**: Update status sensor & respons kendali cepat.
    - 📊 **1 Menit**: Log riwayat untuk efisiensi database dan kelancaran grafik.
- **Early Warning System**: Integrasi Bot Telegram dengan fitur *cooldown* 10 menit untuk mencegah spam saat kondisi kritis.

---

## 🛠️ Tech Stack

### Software
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Custom CSS (Industrial-Farm Aesthetic).
- **Backend/Database**: Firebase Authentication & Realtime Database.
- **Visualisasi**: Chart.js (20 data poin terakhir).
- **Firmware**: C++ (Arduino/ESP32 Framework).

### Hardware
| Komponen | Fungsi |
| :--- | :--- |
| **ESP32** | Otak komputasi tepi & Gateway IoT |
| **DHT22** | Sensor suhu & kelembapan presisi |
| **MQ-135** | Sensor spesifik gas amonia |
| **Relay Module** | Pengendali Kipas & Mist Sprayer |

---

## 🏗️ Arsitektur "3-File Rule"

Mengikuti prinsip efisiensi maksimal, antarmuka web dibangun hanya menggunakan tiga file inti untuk memastikan kecepatan *loading* dan kemudahan pemeliharaan:

```text
SATPAM-Q-Dashboard/
├── index.html   # Struktur & Konten Semantik
├── style.css    # Custom Styling (Minimalist Industrial)
└── app.js       # Firebase Logic, Charting, & Event Handling
