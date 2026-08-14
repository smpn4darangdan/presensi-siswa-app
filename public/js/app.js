/* =========================================================
   APP.JS - PRESENSI SISWA & GURU (FULL REVISED & FIXED)
   ========================================================= */

// State Global
let currentGuru = null;
let currentAdmin = null;
let html5QrcodeScannerGuru = null;
let html5QrcodeScannerAdmin = null;

// ==================== UTILS & CLEANER ====================
// Mengabaikan spasi dan angka 0 di depan NIS agar 03121131160 == 3121131160
function cleanNIS(nis) {
  if (nis === null || nis === undefined) return "";
  return String(nis).replace(/\D/g, '').replace(/^0+/, '');
}

// Mengabaikan spasi dan kata "Kelas" agar "7 A" == "7A" == "Kelas 7A"
function cleanKelas(kelas) {
  if (!kelas) return "";
  return String(kelas).toUpperCase().replace(/KELAS/g, '').replace(/\s+/g, '');
}

// Format Tanggal Indonesia
function getFormattedDate() {
  const d = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
}

// Format Jam
function getFormattedTime() {
  const d = new Date();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// LocalStorage Helpers
function getDataSiswa() {
  return JSON.parse(localStorage.getItem('dataSiswa')) || [];
}
function setDataSiswa(data) {
  localStorage.setItem('dataSiswa', JSON.stringify(data));
}
function getDataGuru() {
  return JSON.parse(localStorage.getItem('dataGuru')) || [];
}
function setDataGuru(data) {
  localStorage.setItem('dataGuru', JSON.stringify(data));
}
function getDataPresensi() {
  return JSON.parse(localStorage.getItem('dataPresensi')) || [];
}
function setDataPresensi(data) {
  localStorage.setItem('dataPresensi', JSON.stringify(data));
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  initDefaultData();
  checkAuth();
  
  // Interval Jam Live
  setInterval(() => {
    const clockEl = document.getElementById("liveClock");
    if (clockEl) clockEl.innerText = `${getFormattedDate()} | ${getFormattedTime()}`;
  }, 1000);
});

function initDefaultData() {
  if (!localStorage.getItem('dataGuru')) {
    const defaultGuru = [
      { id: '1', nip: '198501012010011001', nama: 'Budi Santoso, S.Pd.', mapel: 'Matematika', password: '123' }
    ];
    setDataGuru(defaultGuru);
  }
  if (!localStorage.getItem('dataSiswa')) {
    const defaultSiswa = [
      { nis: '3121131160', nama: 'Agis Kurniawan', kelas: '7 A', hp: '6283194600265' },
      { nis: '3140035850', nama: 'Akmal Maulana Yusup', kelas: '7 A', hp: '' },
      { nis: '131796257', nama: 'Algika Wiguna Irawan', kelas: '7 A', hp: '' }
    ];
    setDataSiswa(defaultSiswa);
  }
}

// ==================== AUTHENTICATION ====================
function checkAuth() {
  const loggedUser = JSON.parse(sessionStorage.getItem('loggedUser'));
  if (loggedUser) {
    if (loggedUser.role === 'GURU') {
      currentGuru = loggedUser;
      showGuruDashboard();
    } else if (loggedUser.role === 'ADMIN') {
      currentAdmin = loggedUser;
      showAdminDashboard();
    }
  } else {
    showLoginForm();
  }
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();

  // Admin Check
  if (username.toLowerCase() === 'admin' && password === 'admin') {
    const adminObj = { nama: 'Administrator', role: 'ADMIN' };
    sessionStorage.setItem('loggedUser', JSON.stringify(adminObj));
    currentAdmin = adminObj;
    showAdminDashboard();
    return;
  }

  // Guru Check
  const listGuru = getDataGuru();
  const guruFound = listGuru.find(g => (g.nip === username || g.nama === username) && g.password === password);

  if (guruFound) {
    const guruObj = { ...guruFound, role: 'GURU' };
    sessionStorage.setItem('loggedUser', JSON.stringify(guruObj));
    currentGuru = guruObj;
    showGuruDashboard();
  } else {
    alert("❌ Username/NIP atau Password salah!");
  }
}

function handleLogout() {
  stopAllCameras();
  sessionStorage.removeItem('loggedUser');
  currentGuru = null;
  currentAdmin = null;
  showLoginForm();
}

// ==================== NAVIGATION VIEWS ====================
function hideAllViews() {
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("guruView")?.classList.add("hidden");
  document.getElementById("adminView")?.classList.add("hidden");
}

function showLoginForm() {
  hideAllViews();
  document.getElementById("loginView")?.classList.remove("hidden");
}

function showGuruDashboard() {
  hideAllViews();
  document.getElementById("guruView")?.classList.remove("hidden");
  document.getElementById("guruNameDisplay").innerText = currentGuru.nama;
  initGuruCamera();
}

function showAdminDashboard() {
  hideAllViews();
  document.getElementById("adminView")?.classList.remove("hidden");
  renderAdminTables();
  const savedToken = localStorage.getItem("fonnte_token");
  if (savedToken && document.getElementById("fonnteTokenInput")) {
    document.getElementById("fonnteTokenInput").value = savedToken;
  }
  initAdminCamera();
}

// ==================== LIVE CAMERA SCANNER ====================
function stopAllCameras() {
  if (html5QrcodeScannerGuru) {
    html5QrcodeScannerGuru.clear().catch(err => console.error(err));
    html5QrcodeScannerGuru = null;
  }
  if (html5QrcodeScannerAdmin) {
    html5QrcodeScannerAdmin.clear().catch(err => console.error(err));
    html5QrcodeScannerAdmin = null;
  }
}

function initGuruCamera() {
  stopAllCameras();
  if (!document.getElementById("readerGuru")) return;

  html5QrcodeScannerGuru = new Html5QrcodeScanner("readerGuru", {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  });

  html5QrcodeScannerGuru.render((decodedText) => {
    processScannedQR(decodedText, 'GURU');
  }, (errorMessage) => {
    // Handling error scan secara diam-diam
  });
}

function initAdminCamera() {
  stopAllCameras();
  if (!document.getElementById("readerAdmin")) return;

  html5QrcodeScannerAdmin = new Html5QrcodeScanner("readerAdmin", {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0
  });

  html5QrcodeScannerAdmin.render((decodedText) => {
    processScannedQR(decodedText, 'ADMIN');
  }, (errorMessage) => {
    // Handling error scan secara diam-diam
  });
}

// ==================== PROCESS SCAN MATCHING ====================
function processScannedQR(decodedText, sourceRole) {
  const listSiswa = getDataSiswa();
  const qrClean = cleanNIS(decodedText);

  // Ambil kelas yang terpilih jika guru memfilter kelas
  const selectKelasEl = document.getElementById("selectKelasGuru");
  const selectedKelasClean = selectKelasEl ? cleanKelas(selectKelasEl.value) : "";

  // Cari siswa secara cerdas (Abaikan angka 0 di depan NIS dan spasi kelas)
  const siswa = listSiswa.find(s => {
    const nisSiswa = cleanNIS(s.nis || s.NIS);
    const kelasSiswa = cleanKelas(s.kelas || s.KELAS);

    const isNisMatch = (nisSiswa === qrClean);
    const isKelasMatch = !selectedKelasClean || (kelasSiswa === selectedKelasClean);

    return isNisMatch && isKelasMatch;
  });

  if (!siswa) {
    alert(`❌ Siswa dengan ID/NIS '${decodedText}' tidak ditemukan!`);
    return;
  }

  // Record Presensi
  const presensiList = getDataPresensi();
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = getFormattedTime();

  // Cek apakah sudah presensi hari ini
  const alreadyScan = presensiList.find(p => cleanNIS(p.nis) === cleanNIS(siswa.nis) && p.tanggal === todayStr);

  if (alreadyScan) {
    alert(`⚠️ Siswa: ${siswa.nama} (${siswa.kelas}) SUDAH melakukan presensi hari ini pada jam ${alreadyScan.jam}`);
    return;
  }

  const recordBaru = {
    id: Date.now(),
    nis: siswa.nis,
    nama: siswa.nama,
    kelas: siswa.kelas,
    tanggal: todayStr,
    jam: timeStr,
    status: 'Hadir',
    pencatat: sourceRole === 'GURU' ? currentGuru.nama : 'Admin'
  };

  presensiList.push(recordBaru);
  setDataPresensi(presensiList);

  alert(`✅ BERHASIL PRESENSI!\n\nNama: ${siswa.nama}\nKelas: ${siswa.kelas}\nWaktu: ${timeStr}`);

  // Auto Kirim WhatsApp jika terhubung Fonnte
  sendWhatsAppNotification(siswa, timeStr);

  // Render Ulang Tabel Presensi jika di Admin View
  if (sourceRole === 'ADMIN') {
    renderAdminTables();
  }
}

// ==================== FONNTE WA GATEWAY ====================
function saveFonnteToken() {
  const token = document.getElementById("fonnteTokenInput").value.trim();
  localStorage.setItem("fonnte_token", token);
  alert("✅ Token Fonnte WhatsApp berhasil disimpan!");
}

function sendWhatsAppNotification(siswa, jam) {
  const token = localStorage.getItem("fonnte_token");
  if (!token || !siswa.hp) return;

  const pesan = `Assalamu'alaikum Wr. Wb.\n\nInformasi Presensi Siswa:\nNama: *${siswa.nama}*\nKelas: *${siswa.kelas}*\nStatus: *HADIR*\nTanggal: *${getFormattedDate()}*\nJam: *${jam}*\n\nTerima kasih.`;

  fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token
    },
    body: new URLSearchParams({
      'target': siswa.hp,
      'message': pesan
    })
  }).then(res => res.json())
    .then(data => console.log('Fonnte Response:', data))
    .catch(err => console.error('Fonnte Error:', err));
}

// ==================== ADMIN DATA MANAGEMENT ====================
function renderAdminTables() {
  // Render Tabel Siswa
  const listSiswa = getDataSiswa();
  const tbodySiswa = document.getElementById("tbodySiswa");
  if (tbodySiswa) {
    tbodySiswa.innerHTML = listSiswa.map((s, idx) => `
      <tr class="border-b">
        <td class="p-2">${s.nis}</td>
        <td class="p-2 font-semibold">${s.nama}</td>
        <td class="p-2">${s.kelas}</td>
        <td class="p-2">${s.hp || '-'}</td>
        <td class="p-2 space-x-1">
          <button onclick="editSiswa(${idx})" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Edit</button>
          <button onclick="deleteSiswa(${idx})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
        </td>
      </tr>
    `).join('');
  }

  // Render Tabel Guru
  const listGuru = getDataGuru();
  const tbodyGuru = document.getElementById("tbodyGuru");
  if (tbodyGuru) {
    tbodyGuru.innerHTML = listGuru.map((g, idx) => `
      <tr class="border-b">
        <td class="p-2">${g.nip}</td>
        <td class="p-2 font-semibold">${g.nama}</td>
        <td class="p-2">${g.mapel}</td>
        <td class="p-2 space-x-1">
          <button onclick="editGuru(${idx})" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Edit</button>
          <button onclick="deleteGuru(${idx})" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Hapus</button>
        </td>
      </tr>
    `).join('');
  }

  // Render Tabel Rekap Presensi
  const listPresensi = getDataPresensi();
  const tbodyPresensi = document.getElementById("tbodyPresensi");
  if (tbodyPresensi) {
    tbodyPresensi.innerHTML = listPresensi.map((p) => `
      <tr class="border-b">
        <td class="p-2">${p.tanggal}</td>
        <td class="p-2">${p.jam}</td>
        <td class="p-2 font-semibold">${p.nama}</td>
        <td class="p-2">${p.kelas}</td>
        <td class="p-2"><span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${p.status}</span></td>
      </tr>
    `).join('');
  }
}

// CRUD SISWA
function addSiswaManual() {
  const nis = prompt("Masukkan NIS Siswa:");
  if (!nis) return;
  const nama = prompt("Masukkan Nama Siswa:");
  if (!nama) return;
  const kelas = prompt("Masukkan Kelas (Contoh: 7A):");
  if (!kelas) return;
  const hp = prompt("Masukkan No HP Orang Tua (Opsional, ex: 628123456789):") || "";

  const listSiswa = getDataSiswa();
  listSiswa.push({ nis, nama, kelas, hp });
  setDataSiswa(listSiswa);
  renderAdminTables();
  alert("✅ Data siswa berhasil ditambahkan!");
}

function editSiswa(idx) {
  const listSiswa = getDataSiswa();
  const s = listSiswa[idx];
  const nis = prompt("Edit NIS Siswa:", s.nis);
  if (!nis) return;
  const nama = prompt("Edit Nama Siswa:", s.nama);
  if (!nama) return;
  const kelas = prompt("Edit Kelas Siswa:", s.kelas);
  if (!kelas) return;
  const hp = prompt("Edit No HP Orang Tua:", s.hp);

  listSiswa[idx] = { nis, nama, kelas, hp };
  setDataSiswa(listSiswa);
  renderAdminTables();
}

function deleteSiswa(idx) {
  if (confirm("Apakah Anda yakin ingin menghapus siswa ini?")) {
    const listSiswa = getDataSiswa();
    listSiswa.splice(idx, 1);
    setDataSiswa(listSiswa);
    renderAdminTables();
  }
}

// IMPORT EXCEL SISWA
function handleImportExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    const formattedData = json.map(row => ({
      nis: String(row.NIS || row.nis || '').trim(),
      nama: String(row.NAMA || row.Nama || row.nama || '').trim(),
      kelas: String(row.KELAS || row.Kelas || row.kelas || '').trim(),
      hp: String(row.HP || row.Hp || row.hp || row.NO_HP || '').trim()
    })).filter(item => item.nis && item.nama);

    if (formattedData.length === 0) {
      alert("⚠️ Format file Excel tidak sesuai atau data kosong. Pastikan kolom berjudul NIS, NAMA, KELAS.");
      return;
    }

    setDataSiswa(formattedData);
    renderAdminTables();
    alert(`✅ Berhasil mengimpor ${formattedData.length} data siswa!`);
  };
  reader.readAsArrayBuffer(file);
}

// ==================== PRINT KARTU A3 PORTRAIT ====================
async function downloadQRAll() {
  const listSiswa = getDataSiswa();
  if (listSiswa.length === 0) {
    alert("⚠️ Data siswa kosong! Silakan isi/import data siswa terlebih dahulu.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a3'
  });

  // Layout A3 Portrait: 297mm x 420mm
  const cardWidth = 85;
  const cardHeight = 54;
  const marginX = 15;
  const marginY = 15;
  const gapX = 8;
  const gapY = 8;
  const cols = 3;
  const rows = 6;
  const cardsPerPage = cols * rows;

  for (let i = 0; i < listSiswa.length; i++) {
    if (i > 0 && i % cardsPerPage === 0) {
      doc.addPage('a3', 'p');
    }

    const pageIndex = i % cardsPerPage;
    const col = pageIndex % cols;
    const row = Math.floor(pageIndex / cols);

    const x = marginX + col * (cardWidth + gapX);
    const y = marginY + row * (cardHeight + gapY);

    const s = listSiswa[i];

    // Card Border
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);

    // Card Header
    doc.setFillColor(37, 99, 235);
    doc.rect(x, y, cardWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PRESENSI SISWA", x + cardWidth / 2, y + 7, { align: "center" });

    // Generate QR Code Data URL
    const qrContainer = document.createElement("div");
    new QRCode(qrContainer, {
      text: String(s.nis),
      width: 100,
      height: 100
    });

    // Wait short time for QR Canvas
    await new Promise(res => setTimeout(res, 50));
    const qrCanvas = qrContainer.querySelector("canvas");
    if (qrCanvas) {
      const qrDataUrl = qrCanvas.toDataURL("image/png");
      doc.addImage(qrDataUrl, "PNG", x + 5, y + 16, 32, 32);
    }

    // Student Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(s.nama, x + 40, y + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`NIS     : ${s.nis}`, x + 40, y + 29);
    doc.text(`Kelas  : ${s.kelas}`, x + 40, y + 35);
  }

  doc.save("Kartu_Presensi_Siswa_A3_Portrait.pdf");
}