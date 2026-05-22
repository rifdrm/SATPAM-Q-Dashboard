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
  orderByChild,
  startAt,
  endAt,
  get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// =========================================================
// 1. KONFIGURASI FIREBASE
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDbcAFV9XL5L6n2ne76u_zy5q_hcFpNnrM",
  authDomain: "satpam-q-app.firebaseapp.com",
  databaseURL: "https://satpam-q-app-default-rtdb.asia-southeast1.firebasedatabase.app",
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
const appLayout = document.getElementById("app-layout");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loginError = document.getElementById("login-error");
const btnLogout = document.getElementById("btnLogout");
const userEmailDisplay = document.getElementById("user-email-display");

// Data Elements
const valSuhu = document.getElementById("val-suhu");
const valAmonia = document.getElementById("val-amonia");
const badgeSuhu = document.getElementById("badge-suhu");
const badgeAmonia = document.getElementById("badge-amonia");
const barSuhu = document.getElementById("bar-suhu");
const barAmonia = document.getElementById("bar-amonia");

// Control Elements
const modeSwitch = document.getElementById("mode-switch");
const modeText = document.getElementById("mode-text");
const toggleKipas = document.getElementById("toggle-kipas");
const toggleSprayer = document.getElementById("toggle-sprayer");
const statusKipas = document.getElementById("status-kipas");
const statusSprayer = document.getElementById("status-sprayer");
const cardKipas = document.getElementById("card-kipas");
const cardSprayer = document.getElementById("card-sprayer");

// Export Elements
const exportModal = document.getElementById("export-modal");
const btnShowExport = document.getElementById("btn-show-export");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnExportCSV = document.getElementById("btn-export-csv");
const btnExportExcel = document.getElementById("btn-export-excel");
const btnExportPDF = document.getElementById("btn-export-pdf");

// Mobile Sidebar Elements
const btnMenu = document.getElementById("btn-menu");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

// Analytics & SPA Navigation Elements
const navOverview = document.getElementById("nav-overview");
const navAnalytics = document.getElementById("nav-analytics");
const overviewSection = document.getElementById("overview-section");
const analyticsSection = document.getElementById("analytics-section");

const btnPrevMonth = document.getElementById("btn-prev-month");
const btnNextMonth = document.getElementById("btn-next-month");
const heatmapMonthLabel = document.getElementById("heatmap-month-label");
const heatmapGrid = document.getElementById("heatmap-grid");

let currentHeatmapDate = new Date();

let currentModeState = 0;
let currentKipasState = 0;
let currentSprayerState = 0;
let userUid = null;
let myChart = null; 

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
      loginError.innerText = "Gagal masuk: Periksa kembali email dan kata sandi Anda.";
      loginError.classList.remove("hidden");
    });
});

btnLogout.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    userUid = user.uid;
    if (userEmailDisplay) userEmailDisplay.innerText = user.email;
    loginSection.classList.add("hidden");
    appLayout.classList.remove("hidden");
    initChart();
    startDatabaseListener(userUid);
  } else {
    userUid = null;
    btnLogin.innerText = "Masuk Dashboard";
    btnLogin.disabled = false;
    emailInput.value = "";
    passwordInput.value = "";
    appLayout.classList.add("hidden");
    loginSection.classList.remove("hidden");
    if (myChart) {
      myChart.destroy();
      myChart = null;
    }
  }
});

// =========================================================
// 4. INISIALISASI GRAFIK (CHART.JS)
// =========================================================
function initChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");
  Chart.defaults.font.family = "'Raleway', sans-serif";
  Chart.defaults.color = "#57534E"; 

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], 
      datasets: [
        {
          label: "Suhu (°C)",
          data: [],
          borderColor: "#CA8A04", 
          backgroundColor: "rgba(202, 138, 4, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y-suhu",
          pointBackgroundColor: "#CA8A04",
          pointRadius: 3,
        },
        {
          label: "Amonia (PPM)",
          data: [],
          borderColor: "#004c22", 
          backgroundColor: "rgba(0, 76, 34, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y-amonia",
          pointBackgroundColor: "#004c22",
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          backgroundColor: "#1C1917",
          titleFont: { family: "'Raleway', sans-serif", size: 13 },
          bodyFont: { family: "'Raleway', sans-serif", size: 13 },
          padding: 12,
          cornerRadius: 4,
          displayColors: true,
        },
      },
      scales: {
        x: { grid: { display: false } },
        "y-suhu": {
          type: "linear", position: "left",
          title: { display: true, text: "Suhu (°C)", font: { weight: 600 } },
          grid: { color: "#E7E5E4" },
        },
        "y-amonia": {
          type: "linear", position: "right",
          title: { display: true, text: "Amonia (PPM)", font: { weight: 600 } },
          grid: { drawOnChartArea: false }, 
        },
      },
    },
  });
}

// =========================================================
// 5. LOGIKA DATABASE (REAL-TIME & HISTORICAL)
// =========================================================
function startDatabaseListener(uid) {
  const dbRef = ref(database, "UsersData/" + uid);

  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.suhu !== undefined) {
        valSuhu.innerText = data.suhu;
        const progressSuhu = Math.min((data.suhu / 50) * 100, 100);
        barSuhu.style.width = `${progressSuhu}%`;
        
        if(data.suhu > 27) {
            badgeSuhu.innerText = "Warning";
            badgeSuhu.className = "badge badge-warning";
            barSuhu.className = "progress-bar bg-warning";
        } else {
            badgeSuhu.innerText = "Optimal";
            badgeSuhu.className = "badge badge-success";
            barSuhu.className = "progress-bar bg-success";
        }
      }

      if (data.amonia !== undefined) {
        valAmonia.innerText = data.amonia;
        const progressAmonia = Math.min((data.amonia / 100) * 100, 100);
        barAmonia.style.width = `${progressAmonia}%`;

        if(data.amonia > 20) {
            badgeAmonia.innerText = "Warning";
            badgeAmonia.className = "badge badge-warning";
            barAmonia.className = "progress-bar bg-warning";
        } else {
            badgeAmonia.innerText = "Optimal";
            badgeAmonia.className = "badge badge-success";
            barAmonia.className = "progress-bar bg-success";
        }
      }

      if (data.mode !== undefined) {
        currentModeState = data.mode;
        modeSwitch.checked = currentModeState === 1;
        modeText.innerText = currentModeState === 1 ? "Mode: MANUAL" : "Mode: OTOMATIS";
        
        // Atur status aktif/nonaktif dari toggle aktuator
        toggleKipas.disabled = currentModeState === 0;
        toggleSprayer.disabled = currentModeState === 0;

        if (currentModeState === 0) {
            cardKipas.classList.add("opacity-60");
            cardSprayer.classList.add("opacity-60");
        } else {
            cardKipas.classList.remove("opacity-60");
            cardSprayer.classList.remove("opacity-60");
        }
      }

      if (data.kipas !== undefined) {
        currentKipasState = data.kipas;
        toggleKipas.checked = currentKipasState === 1;
        statusKipas.innerText = currentKipasState === 1 ? "Sedang Menyala" : "Mati";
      }

      if (data.sprayer !== undefined) {
        currentSprayerState = data.sprayer;
        toggleSprayer.checked = currentSprayerState === 1;
        statusSprayer.innerText = currentSprayerState === 1 ? "Sedang Menyala" : "Mati";
      }
    }
  });

  const historyRef = ref(database, "UsersData/" + uid + "/history");
  const recentHistoryQuery = query(historyRef, limitToLast(20));

  onValue(recentHistoryQuery, (snapshot) => {
    if (snapshot.exists() && myChart) {
      const timeLabels = [];
      const suhuData = [];
      const amoniaData = [];

      snapshot.forEach((childSnapshot) => {
        const log = childSnapshot.val();
        if (log.timestamp) {
          const date = new Date(log.timestamp * 1000);
          timeLabels.push(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
        } else {
          timeLabels.push("--:--");
        }
        suhuData.push(log.suhu || 0);
        amoniaData.push(log.amonia || 0);
      });

      myChart.data.labels = timeLabels;
      myChart.data.datasets[0].data = suhuData;
      myChart.data.datasets[1].data = amoniaData;
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
    modeText.innerText = "Mengubah...";
  }
});

toggleKipas.addEventListener("change", (e) => {
  if (userUid && currentModeState === 1) {
    const newState = e.target.checked ? 1 : 0;
    set(ref(database, "UsersData/" + userUid + "/kipas"), newState);
    statusKipas.innerText = "Mengirim perintah...";
  } else {
    e.target.checked = !e.target.checked; // Revert jika dilarang
  }
});

toggleSprayer.addEventListener("change", (e) => {
  if (userUid && currentModeState === 1) {
    const newState = e.target.checked ? 1 : 0;
    set(ref(database, "UsersData/" + userUid + "/sprayer"), newState);
    statusSprayer.innerText = "Mengirim perintah...";
  } else {
    e.target.checked = !e.target.checked;
  }
});

// =========================================================
// 7. LOGIKA MENU MOBILE
// =========================================================
if (btnMenu && sidebar && sidebarOverlay) {
  btnMenu.addEventListener("click", () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
  });

  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
  });
}

// =========================================================
// 8. LOGIKA EXPORT DATA (CSV, EXCEL, PDF)
// =========================================================
btnShowExport.addEventListener("click", () => exportModal.classList.remove("hidden"));
btnCloseModal.addEventListener("click", () => exportModal.classList.add("hidden"));

// Tutup modal jika klik di luar box modal
exportModal.addEventListener("click", (e) => {
    if(e.target === exportModal) exportModal.classList.add("hidden");
});

btnExportCSV.addEventListener("click", () => handleExport('csv'));
btnExportExcel.addEventListener("click", () => handleExport('excel'));
btnExportPDF.addEventListener("click", () => handleExport('pdf'));

async function handleExport(type) {
    const fromVal = document.getElementById("modal-export-from").value;
    const toVal = document.getElementById("modal-export-to").value;

    if (!fromVal || !toVal) {
        alert("Mohon pilih rentang tanggal dari dan sampai terlebih dahulu.");
        return;
    }

    const startTimestamp = Math.floor(new Date(fromVal).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(toVal).getTime() / 1000);

    const historyRef = ref(database, "UsersData/" + userUid + "/history");
    const exportQuery = query(historyRef, orderByChild('timestamp'), startAt(startTimestamp), endAt(endTimestamp));

    const originalBtnText = {
        'csv': btnExportCSV.innerHTML,
        'excel': btnExportExcel.innerHTML,
        'pdf': btnExportPDF.innerHTML
    };
    
    // Set Loading State
    if(type === 'csv') btnExportCSV.innerText = "Memproses...";
    if(type === 'excel') btnExportExcel.innerText = "Memproses...";
    if(type === 'pdf') btnExportPDF.innerText = "Memproses...";

    try {
        const snapshot = await get(exportQuery);
        if (!snapshot.exists()) {
            alert("Tidak ada data riwayat yang ditemukan pada rentang tanggal tersebut.");
            restoreBtnState(type, originalBtnText);
            return;
        }

        const dataArray = [];
        snapshot.forEach((childSnapshot) => {
            const log = childSnapshot.val();
            const dateStr = new Date(log.timestamp * 1000).toLocaleString('id-ID');
            dataArray.push({
                "Waktu": dateStr,
                "Suhu (°C)": log.suhu || 0,
                "Amonia (PPM)": log.amonia || 0
            });
        });

        if (type === 'csv') exportCSV(dataArray);
        else if (type === 'excel') exportExcel(dataArray);
        else if (type === 'pdf') exportPDF(dataArray);

        exportModal.classList.add("hidden");

    } catch (error) {
        console.error("Error fetching export data:", error);
        alert("Terjadi kesalahan saat mengambil data eksport dari Firebase.");
    } finally {
        restoreBtnState(type, originalBtnText);
    }
}

function restoreBtnState(type, originalTextObj) {
    if(type === 'csv') btnExportCSV.innerHTML = originalTextObj.csv;
    if(type === 'excel') btnExportExcel.innerHTML = originalTextObj.excel;
    if(type === 'pdf') btnExportPDF.innerHTML = originalTextObj.pdf;
}

function exportCSV(data) {
    const header = Object.keys(data[0]).join(",");
    const rows = data.map(obj => Object.values(obj).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + "\n" + rows);
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "Laporan_SATPAM_Q.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function exportExcel(data) {
    if (typeof XLSX === 'undefined') {
        alert("Library SheetJS gagal dimuat. Harap periksa koneksi internet."); 
        return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
    XLSX.writeFile(wb, "Laporan_SATPAM_Q.xlsx");
}

function exportPDF(data) {
    if (typeof window.jspdf === 'undefined') {
        alert("Library jsPDF gagal dimuat. Harap periksa koneksi internet."); 
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.text("Laporan Riwayat Sensor Kandang SATPAM-Q", 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Waktu Ekspor: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const tableColumn = Object.keys(data[0]);
    const tableRows = data.map(obj => Object.values(obj));

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [0, 76, 34] } // Sesuai warna Primary GreenLeaf
    });

    doc.save("Laporan_SATPAM_Q.pdf");
}

// =========================================================
// 9. LOGIKA NAVIGASI SPA (SINGLE PAGE APPLICATION)
// =========================================================
if (navOverview && navAnalytics && overviewSection && analyticsSection) {
  navOverview.addEventListener("click", (e) => {
    e.preventDefault();
    navOverview.classList.add("active");
    navOverview.classList.remove("inactive");
    navAnalytics.classList.add("inactive");
    navAnalytics.classList.remove("active");
    
    overviewSection.classList.remove("hidden");
    analyticsSection.classList.add("hidden");
  });

  navAnalytics.addEventListener("click", (e) => {
    e.preventDefault();
    navAnalytics.classList.add("active");
    navAnalytics.classList.remove("inactive");
    navOverview.classList.add("inactive");
    navOverview.classList.remove("active");
    
    overviewSection.classList.add("hidden");
    analyticsSection.classList.remove("hidden");

    if (userUid) {
      renderHeatmapGrid(currentHeatmapDate);
    }
  });
}

// =========================================================
// 10. LOGIKA HEATMAP BULANAN
// =========================================================
function renderHeatmapGrid(dateObj) {
  if (!userUid || !heatmapMonthLabel || !heatmapGrid) return;

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-11
  
  // Set Label Bulan
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  heatmapMonthLabel.innerText = `${monthNames[month]} ${year}`;

  // Tentukan Epoch Timestamp (detik) awal dan akhir bulan
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59);
  
  const startEpoch = Math.floor(firstDay.getTime() / 1000);
  const endEpoch = Math.floor(lastDay.getTime() / 1000);

  // Ambil Data Firebase
  const historyRef = ref(database, "UsersData/" + userUid + "/history");
  const q = query(historyRef, orderByChild("timestamp"), startAt(startEpoch), endAt(endEpoch));
  
  heatmapGrid.innerHTML = `<div class="p-xl text-on-surface-variant col-span-7 text-center">Memuat data kalender...</div>`;

  get(q).then((snapshot) => {
    const dailyData = {};
    const totalDays = lastDay.getDate();

    // Inisialisasi object untuk setiap hari
    for (let i = 1; i <= totalDays; i++) {
      dailyData[i] = { sumAmonia: 0, count: 0, criticalAlerts: 0 };
    }

    if (snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        const log = childSnap.val();
        if (log.timestamp && log.amonia !== undefined) {
          const logDate = new Date(log.timestamp * 1000);
          const day = logDate.getDate();
          
          if (dailyData[day]) {
            dailyData[day].sumAmonia += log.amonia;
            dailyData[day].count += 1;
            if (log.amonia > 25) {
              dailyData[day].criticalAlerts += 1;
            }
          }
        }
      });
    }

    drawCalendar(year, month, totalDays, dailyData, firstDay.getDay());
  }).catch((err) => {
    console.error("Gagal memuat data heatmap:", err);
    heatmapGrid.innerHTML = `<div class="p-md text-error col-span-7">Gagal memuat data dari database.</div>`;
  });
}

function drawCalendar(year, month, totalDays, dailyData, startDayOfWeek) {
  heatmapGrid.innerHTML = "";
  
  // startDayOfWeek: 0 = Minggu, 1 = Senin, dst. Di UI kita pakai Minggu(0) sebagai hari pertama
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "bg-surface-container-high border-r border-b border-subtle calendar-cell";
    heatmapGrid.appendChild(emptyCell);
  }

  // Render hari-hari di bulan tersebut
  for (let d = 1; d <= totalDays; d++) {
    const data = dailyData[d];
    let avgPpm = 0;
    let bgColorClass = "bg-surface-container-high"; // Empty/No data
    let tooltipStatus = "Tidak ada data";

    if (data.count > 0) {
      avgPpm = (data.sumAmonia / data.count).toFixed(1);
      
      // Logika warna berdasarkan rata-rata & critical alerts
      if (data.criticalAlerts > 0 || avgPpm > 25) {
        bgColorClass = "bg-error-container";
        tooltipStatus = "Kritis";
      } else if (avgPpm >= 20) {
        bgColorClass = "bg-warning-container";
        tooltipStatus = "Peringatan";
      } else {
        bgColorClass = "bg-success-container";
        tooltipStatus = "Sehat";
      }
    }

    const cell = document.createElement("div");
    cell.className = `${bgColorClass} calendar-cell relative tooltip-container border-r border-b border-subtle hover:opacity-90 transition-opacity cursor-pointer`;
    
    // Teks Tanggal & PPM
    let innerHtml = `
      <div class="absolute top-sm left-sm font-caption text-on-surface opacity-60">${d}</div>
    `;
    
    if (data.count > 0) {
      innerHtml += `
      <div class="w-full h-full flex-center font-subhead text-on-surface mt-sm">
          ${Math.round(avgPpm)}<span class="font-caption ml-xs opacity-70">ppm</span>
      </div>`;
    } else {
      innerHtml += `
      <div class="w-full h-full flex-center font-caption text-on-surface-variant opacity-50 mt-sm">-</div>
      `;
    }

    // Tooltip
    innerHtml += `
      <div class="tooltip-content text-left">
          <div class="font-body-sm font-bold border-b border-subtle pb-xs mb-sm">${d} ${heatmapMonthLabel.innerText.split(' ')[0]} ${year}</div>
          <div class="font-caption flex-between mb-xs"><span>Rata-rata:</span> <span>${data.count > 0 ? avgPpm + ' ppm' : '-'}</span></div>
          <div class="font-caption flex-between"><span>Status:</span> <span class="${tooltipStatus === 'Kritis' ? 'text-error font-bold' : tooltipStatus === 'Peringatan' ? 'text-warning font-bold' : ''}">${tooltipStatus}</span></div>
      </div>
    `;

    cell.innerHTML = innerHtml;
    heatmapGrid.appendChild(cell);
  }
}

if (btnPrevMonth && btnNextMonth) {
  btnPrevMonth.addEventListener("click", () => {
    currentHeatmapDate.setMonth(currentHeatmapDate.getMonth() - 1);
    renderHeatmapGrid(currentHeatmapDate);
  });
  btnNextMonth.addEventListener("click", () => {
    currentHeatmapDate.setMonth(currentHeatmapDate.getMonth() + 1);
    renderHeatmapGrid(currentHeatmapDate);
  });
}
