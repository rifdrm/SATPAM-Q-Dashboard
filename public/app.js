import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  query,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// =========================================================
// 1. KONFIGURASI FIREBASE (GANTI DENGAN DATA DARI NOTEPAD)
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDbcAFV9XL5L6n2ne76u_zy5q_hcFpNnrM",
  authDomain: "satpam-q-app.firebaseapp.com",
  databaseURL:
    "https://satpam-q-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "satpam-q-app",
  storageBucket: "satpam-q-app.firebasestorage.app",
  messagingSenderId: "108583466155",
  appId: "1:108583466155:web:b54d8e52a7afb3379473ee",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// =========================================================
// 2. REFERENSI ELEMEN ANTARMUKA (DOM)
// =========================================================
const loginSection = document.getElementById("login-section");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("login-error");

const dashboardSection = document.getElementById("dashboard-section");
const btnLogout = document.getElementById("btnLogout");

const valSuhu = document.getElementById("val-suhu");
const valAmonia = document.getElementById("val-amonia");

const modeSwitch = document.getElementById("mode-switch");
const modeLabel = document.getElementById("mode-label");

const statusKipas = document.getElementById("status-kipas");
const btnKipas = document.getElementById("btn-kipas");
const statusSprayer = document.getElementById("status-sprayer");
const btnSprayer = document.getElementById("btn-sprayer");

let currentModeState = 0;
let currentKipasState = 0;
let currentSprayerState = 0;
let userUid = null;
let myChart = null; // Menyimpan objek grafik

// =========================================================
// 3. LOGIKA AUTENTIKASI
// =========================================================
btnLogin.addEventListener("click", () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  btnLogin.innerText = "Memproses...";
  btnLogin.disabled = true;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => loginError.classList.add("hidden"))
    .catch((error) => {
      btnLogin.innerText = "Masuk Dashboard";
      btnLogin.disabled = false;
      loginError.innerText =
        "Gagal masuk: Periksa kembali email dan kata sandi Anda.";
      loginError.classList.remove("hidden");
    });
});

btnLogout.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    userUid = user.uid;
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    btnLogout.classList.remove("hidden");

    // Inisialisasi Grafik Kosong Pertama Kali
    initChart();
    // Mulai Dengar Data Database
    startDatabaseListener(userUid);
  } else {
    userUid = null;
    btnLogin.innerText = "Masuk Dashboard";
    btnLogin.disabled = false;
    emailInput.value = "";
    passwordInput.value = "";
    dashboardSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    if (myChart) {
      myChart.destroy();
      myChart = null;
    } // Hapus grafik saat logout
  }
});

// =========================================================
// 4. INISIALISASI GRAFIK (CHART.JS)
// =========================================================
function initChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");

  // Menerapkan font Raleway dan warna teks global untuk Chart.js
  Chart.defaults.font.family = "'Raleway', sans-serif";
  Chart.defaults.color = "#57534E"; // var(--color-neutral-text-light)

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], // Sumbu X (Waktu Jam:Menit)
      datasets: [
        {
          label: "Suhu (°C)",
          data: [],
          borderColor: "#A47148", // GreenLeaf Tertiary (Clay)
          backgroundColor: "rgba(164, 113, 72, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y-suhu",
          pointBackgroundColor: "#A47148",
          pointRadius: 3,
        },
        {
          label: "Amonia (PPM)",
          data: [],
          borderColor: "#86A873", // GreenLeaf Secondary (Sage)
          backgroundColor: "rgba(134, 168, 115, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y-amonia",
          pointBackgroundColor: "#86A873",
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "#1C1917", // var(--color-neutral-text)
          titleFont: { family: "'Raleway', sans-serif", size: 13 },
          bodyFont: { family: "'Raleway', sans-serif", size: 13 },
          padding: 12,
          cornerRadius: 4,
          displayColors: true,
        },
      },
      scales: {
        x: {
          grid: {
            color: "#E7E5E4", // var(--color-neutral-divider)
            drawBorder: false,
          },
        },
        "y-suhu": {
          type: "linear",
          position: "left",
          title: { display: true, text: "Suhu (°C)", font: { weight: 600 } },
          grid: {
            color: "#E7E5E4",
            drawBorder: false,
          },
        },
        "y-amonia": {
          type: "linear",
          position: "right",
          title: { display: true, text: "Amonia (PPM)", font: { weight: 600 } },
          grid: { drawOnChartArea: false }, // Agar garis grid tidak bertumpuk
        },
      },
    },
  });
}

// =========================================================
// 5. LOGIKA DATABASE (REAL-TIME & HISTORICAL QUERY)
// =========================================================
function startDatabaseListener(uid) {
  const dbRef = ref(database, "UsersData/" + uid);

  // --- LISTENER 1: Data Tunggal Real-Time ---
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.suhu !== undefined)
        valSuhu.innerHTML = `${data.suhu}<span class="data-unit">°C</span>`;
      if (data.amonia !== undefined)
        valAmonia.innerHTML = `${data.amonia}<span class="data-unit"> PPM</span>`;

      if (data.mode !== undefined) {
        currentModeState = data.mode;
        modeSwitch.checked = currentModeState === 1;
        if (currentModeState === 1) {
          modeLabel.innerText = "Mode: MANUAL";
          modeLabel.className = "mode-label manual-mode";
        } else {
          modeLabel.innerText = "Mode: OTOMATIS";
          modeLabel.className = "mode-label auto-mode";
        }
      }

      if (data.kipas !== undefined) {
        currentKipasState = data.kipas;
        if (currentKipasState === 1) {
          statusKipas.innerText = "MENYALA";
          statusKipas.className = "chip chip-on";
          btnKipas.innerText = "Matikan Kipas";
          btnKipas.className = "btn btn-destructive btn-large w-full";
        } else {
          statusKipas.innerText = "MATI";
          statusKipas.className = "chip chip-off";
          btnKipas.innerText = "Nyalakan Kipas";
          btnKipas.className = "btn btn-primary btn-large w-full";
        }
        btnKipas.disabled = currentModeState === 0;
      }

      if (data.sprayer !== undefined) {
        currentSprayerState = data.sprayer;
        if (currentSprayerState === 1) {
          statusSprayer.innerText = "MENYALA";
          statusSprayer.className = "chip chip-on";
          btnSprayer.innerText = "Matikan Sprayer";
          btnSprayer.className = "btn btn-destructive btn-large w-full";
        } else {
          statusSprayer.innerText = "MATI";
          statusSprayer.className = "chip chip-off";
          btnSprayer.innerText = "Nyalakan Sprayer";
          btnSprayer.className = "btn btn-primary btn-large w-full";
        }
        btnSprayer.disabled = currentModeState === 0;
      }
    }
  });

  // --- LISTENER 2: Riwayat Data (Dibatasi 20 Terakhir) ---
  const historyRef = ref(database, "UsersData/" + uid + "/history");
  const recentHistoryQuery = query(historyRef, limitToLast(20));

  onValue(recentHistoryQuery, (snapshot) => {
    if (snapshot.exists() && myChart) {
      const timeLabels = [];
      const suhuData = [];
      const amoniaData = [];

      snapshot.forEach((childSnapshot) => {
        const log = childSnapshot.val();

        // Mengubah Epoch Timestamp Unix ke Format Jam:Menit lokal komputer
        if (log.timestamp) {
          const date = new Date(log.timestamp * 1000);
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          timeLabels.push(`${hours}:${minutes}`);
        } else {
          timeLabels.push("--:--");
        }

        suhuData.push(log.suhu || 0);
        amoniaData.push(log.amonia || 0);
      });

      // Menyuntikkan array data baru ke dalam Chart.js
      myChart.data.labels = timeLabels;
      myChart.data.datasets[0].data = suhuData;
      myChart.data.datasets[1].data = amoniaData;

      // Segarkan visual grafik
      myChart.update();
    }
  });
}

// =========================================================
// 6. KENDALI MANUAL & SAKELAR MODE
// =========================================================
modeSwitch.addEventListener("change", (e) => {
  if (userUid) {
    const newMode = e.target.checked ? 1 : 0;
    set(ref(database, "UsersData/" + userUid + "/mode"), newMode);
    modeLabel.innerText = "Mengubah...";
  }
});

btnKipas.addEventListener("click", () => {
  if (userUid && currentModeState === 1) {
    const newState = currentKipasState === 1 ? 0 : 1;
    set(ref(database, "UsersData/" + userUid + "/kipas"), newState);
    btnKipas.disabled = true;
    btnKipas.innerText = "Mengirim...";
  }
});

btnSprayer.addEventListener("click", () => {
  if (userUid && currentModeState === 1) {
    const newState = currentSprayerState === 1 ? 0 : 1;
    set(ref(database, "UsersData/" + userUid + "/sprayer"), newState);
    btnSprayer.disabled = true;
    btnSprayer.innerText = "Mengirim...";
  }
});
