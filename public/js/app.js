// ================= MASTER DATA & STATE =================
let listSiswa = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
let listGuru = JSON.parse(localStorage.getItem("DATA_GURU")) || [];
let listAttendance = JSON.parse(localStorage.getItem("DATA_ATTENDANCE")) || [];
let currentUser = JSON.parse(localStorage.getItem("CURRENT_USER")) || null;
let fonnteToken = localStorage.getItem("FONNTE_TOKEN") || "";

let html5QrScannerGuru = null;
let html5QrScannerAdmin = null;
let isProcessingScan = false;

// ================= FITUR SUARA =================
function bicara(teks) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(teks);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// ================= FITUR WHATSAPP GATEWAY =================
function formatWA(nomor) {
  if (!nomor) return null;
  let formatted = nomor.toString().replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  return formatted;
}

function kirimWAOtomatis(siswa, timeStr) {
  const noWA = formatWA(siswa.noHp);
  const token = localStorage.getItem("FONNTE_TOKEN");

  if (!noWA || !token) return;

  const pesan = `[PRESENSI SEKOLAH]\n\nYth. Bapak/Ibu Orang Tua/Wali,\n\nAnak Anda ${siswa.nama} (${siswa.kelas}) telah dicatat HADIR DI SEKOLAH pada pukul ${timeStr} WIB.\n\nPesan ini dikirim otomatis oleh Sistem Absensi Sekolah.`;

  fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { "Authorization": token },
    body: new URLSearchParams({ "target": noWA, "message": pesan })
  }).catch(err => console.error("WA Error:", err));
}

function simpanFonnteToken() {
  const tokenInp = document.getElementById("fonnteTokenInput").value.trim();
  if (!tokenInp) return alert("⚠️ Masukkan API Token Fonnte terlebih dahulu!");
  localStorage.setItem("FONNTE_TOKEN", tokenInp);
  fonnteToken = tokenInp;
  alert("✅ API Token WhatsApp Gateway berhasil disimpan!");
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  if (currentUser) showAppView();
  else showLoginView();
});

// ================= LOGIN & LOGOUT =================
function switchLoginRole(role) {
  document.getElementById("loginRole").value = role;
  const guruBtn = document.getElementById("loginRoleGuruBtn");
  const adminBtn = document.getElementById("loginRoleAdminBtn");
  const passGroup = document.getElementById("passwordGroup");
  const userLabel = document.getElementById("usernameLabel");
  const userInp = document.getElementById("username");

  if (role === 'guru') {
    guruBtn.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600";
    adminBtn.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600";
    passGroup.classList.add("hidden");
    userLabel.innerText = "NIP / Nama Lengkap (Huruf Kecil Tanpa Spasi)";
    userInp.placeholder = "contoh: 19820101... atau budisantoso";
  } else {
    adminBtn.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600";
    guruBtn.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600";
    passGroup.classList.remove("hidden");
    userLabel.innerText = "Username Admin";
    userInp.placeholder = "admin";
  }
}

function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById("loginRole").value;
  const usernameVal = document.getElementById("username").value.trim().toLowerCase();
  const passwordVal = document.getElementById("password").value;

  if (role === 'admin') {
    if (usernameVal === 'admin' && passwordVal === 'admin') {
      currentUser = { role: 'admin', name: 'Administrator', identifier: 'admin' };
      localStorage.setItem("CURRENT_USER", JSON.stringify(currentUser));
      showAppView();
      bicara("Selamat datang Administrator");
    } else {
      alert("❌ Username atau Password Admin salah!");
    }
  } else {
    const foundGuru = listGuru.find(g => {
      const nipMatch = g.nip && g.nip.trim() === usernameVal;
      const nameClean = g.nama.toLowerCase().replace(/\s+/g, '');
      return nipMatch || nameClean === usernameVal;
    });

    if (foundGuru) {
      currentUser = { role: 'guru', name: foundGuru.nama, identifier: foundGuru.nip || usernameVal };
      localStorage.setItem("CURRENT_USER", JSON.stringify(currentUser));
      showAppView();
      bicara(`Selamat datang ${foundGuru.nama}`);
    } else {
      alert("❌ Data Guru tidak ditemukan!");
    }
  }
}

function handleLogout() {
  stopAllCameras();
  currentUser = null;
  localStorage.removeItem("CURRENT_USER");
  window.speechSynthesis.cancel();
  showLoginView();
}

function showLoginView() {
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("appSection").classList.add("hidden");
}

function showAppView() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("hidden");
  document.getElementById("userInfo").innerText = `Logged in as: ${currentUser.name} (${currentUser.role.toUpperCase()})`;

  if (currentUser.role === 'guru') {
    document.getElementById("guruView").classList.remove("hidden");
    document.getElementById("adminView").classList.add("hidden");
    document.getElementById("guruNameLabel").innerText = currentUser.name;
    loadGuruAttendanceHistory();
    initGuruCamera();
  } else {
    document.getElementById("adminView").classList.remove("hidden");
    document.getElementById("guruView").classList.add("hidden");
    
    const savedToken = localStorage.getItem("FONNTE_TOKEN");
    if (savedToken && document.getElementById("fonnteTokenInput")) {
      document.getElementById("fonnteTokenInput").value = savedToken;
    }
    renderAdminTables();
    initAdminCamera();
  }
}

function cleanNIS(nis) {
  if (nis === null || nis === undefined) return "";
  // Konversi ke string, buang semua spasi, newlines, tab, dan karakter tersembunyi
  return String(nis)
    .replace(/[\r\n\t]/g, '') // Hapus enter/tab
    .replace(/\s+/g, '')       // Hapus semua spasi
    .trim();
}

// ================= KAMERA SCANNER LIVE =================
function stopAllCameras() {
  if (html5QrScannerGuru) {
    html5QrScannerGuru.clear().catch(err => console.error(err));
    html5QrScannerGuru = null;
  }
  if (html5QrScannerAdmin) {
    html5QrScannerAdmin.clear().catch(err => console.error(err));
    html5QrScannerAdmin = null;
  }
}

function initGuruCamera() {
  stopAllCameras();
  if (!document.getElementById("reader-guru")) return;

  html5QrScannerGuru = new Html5QrcodeScanner("reader-guru", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
  html5QrScannerGuru.render((qrCodeMessage) => {
    processScannedQR(qrCodeMessage, 'guru');
  }, (errorMessage) => {});
}

function initAdminCamera() {
  stopAllCameras();
  if (!document.getElementById("reader-admin")) return;

  html5QrScannerAdmin = new Html5QrcodeScanner("reader-admin", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
  html5QrScannerAdmin.render((qrCodeMessage) => {
    processScannedQR(qrCodeMessage, 'admin');
  }, (errorMessage) => {});
}

function processScannedQR(decodedText, scannedByRole) {
  if (isProcessingScan) return;
  isProcessingScan = true;

  const qrClean = cleanNIS(decodedText);
  if (!qrClean) { isProcessingScan = false; return; }

  if (scannedByRole === 'guru') {
    const selectedKelas = document.getElementById("guruSelectKelas").value;
    if (!selectedKelas) {
      bicara("Pilih kelas terlebih dahulu");
      alert("⚠️ Pilih kelas mengajar dulu di menu atas!");
      setTimeout(() => { isProcessingScan = false; }, 2000);
      return;
    }
  }

// Bersihkan teks dari QR Code
const qrClean = cleanNIS(decodedText);

// Cari siswa dengan mencocokkan nis, NIS, atau ID secara fleksibel
const siswa = listSiswa.find(s => {
  const nisSiswa = cleanNIS(s.nis || s.NIS || s.id || "");
  return nisSiswa === qrClean;
});

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  const sudahAbsen = listAttendance.some(a => a.tanggal === dateStr && cleanNIS(a.nis) === qrClean);

  if (sudahAbsen) {
    bicara(`Siswa ${siswa.nama} sudah di scan`);
    alert(`⚠️ Siswa ${siswa.nama} SUDAH di-scan hari ini!`);
  } else {
    listAttendance.unshift({
      id: Date.now().toString(),
      nis: siswa.nis.toString(),
      nama: siswa.nama,
      kelas: siswa.kelas,
      scannedByRole: scannedByRole,
      scannedByName: currentUser.name,
      jam: timeStr,
      tanggal: dateStr
    });
    localStorage.setItem("DATA_ATTENDANCE", JSON.stringify(listAttendance));

    bicara(`Presensi berhasil, ${siswa.nama}`);
    alert(`✅ Presensi Berhasil: ${siswa.nama} (${siswa.kelas})`);

    kirimWAOtomatis(siswa, timeStr);
  }

  if (scannedByRole === 'guru') loadGuruAttendanceHistory();
  else renderAdminTables();

  setTimeout(() => { isProcessingScan = false; }, 2500);
}

function loadGuruAttendanceHistory() {
  const selectedKelas = document.getElementById("guruSelectKelas").value;
  const tbody = document.getElementById("guruAttendanceTable");
  const today = new Date().toISOString().split('T')[0];
  const filtered = listAttendance.filter(a => a.tanggal === today && (!selectedKelas || a.kelas === selectedKelas));
  document.getElementById("guruTotalScanned").innerText = `${filtered.length} Siswa`;

  tbody.innerHTML = filtered.length === 0 ? `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada siswa di-scan.</td></tr>` :
    filtered.map(a => `<tr class="hover:bg-slate-50"><td class="p-2.5 font-mono text-xs">${a.jam}</td><td class="p-2.5 font-mono text-xs">${a.nis}</td><td class="p-2.5 font-semibold">${a.nama}</td><td class="p-2.5">${a.kelas}</td><td class="p-2.5 text-center text-emerald-600 font-semibold">✅ Hadir</td></tr>`).join("");
}

function switchAdminTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition");

  if (tab === 'scan') {
    document.getElementById("adminTabScan").classList.remove("hidden");
    document.getElementById("tabScanBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
    initAdminCamera();
  } else if (tab === 'siswa') {
    stopAllCameras();
    document.getElementById("adminTabSiswa").classList.remove("hidden");
    document.getElementById("tabSiswaBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  } else if (tab === 'guru') {
    stopAllCameras();
    document.getElementById("adminTabGuru").classList.remove("hidden");
    document.getElementById("tabGuruBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  } else if (tab === 'wa') {
    stopAllCameras();
    document.getElementById("adminTabWa").classList.remove("hidden");
    document.getElementById("tabWaBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  }
}

function renderAdminTables() {
  const attTb = document.getElementById("adminAttendanceTable");
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = listAttendance.filter(a => a.tanggal === today);

  attTb.innerHTML = todayAtt.length === 0 ? `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada riwayat.</td></tr>` :
    todayAtt.map(a => `<tr class="hover:bg-slate-50"><td class="p-3 font-mono text-xs">${a.jam}</td><td class="p-3 font-mono text-xs">${a.nis}</td><td class="p-3 font-semibold">${a.nama}</td><td class="p-3">${a.kelas}</td><td class="p-3 text-xs text-indigo-600">${a.scannedByName}</td></tr>`).join("");

  const sisTb = document.getElementById("studentsTable");
  sisTb.innerHTML = listSiswa.length === 0 ? `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data siswa.</td></tr>` :
    listSiswa.map((s, idx) => `
      <tr class="hover:bg-slate-50">
        <td class="p-3 font-mono text-xs font-bold">${s.nis}</td>
        <td class="p-3 font-semibold">${s.nama}</td>
        <td class="p-3">${s.kelas}</td>
        <td class="p-3 text-xs text-slate-500">${s.noHp || '-'}</td>
        <td class="p-3 text-center space-x-1">
          <button onclick="downloadSingleQR('${s.nis}', '${s.nama}')" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-semibold">📇 QR</button>
          <button onclick="editSiswa(${idx})" class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold">✏️ Edit</button>
          <button onclick="deleteSiswa(${idx})" class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-semibold">🗑️ Hapus</button>
        </td>
      </tr>
    `).join("");

  const gurTb = document.getElementById("teachersTable");
  gurTb.innerHTML = listGuru.length === 0 ? `<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada data guru.</td></tr>` :
    listGuru.map((g, idx) => `
      <tr class="hover:bg-slate-50">
        <td class="p-3 font-mono text-xs">${g.nip || '-'}</td>
        <td class="p-3 font-semibold">${g.nama}</td>
        <td class="p-3 font-mono text-xs text-indigo-600">${g.nama.toLowerCase().replace(/\s+/g, '')}</td>
        <td class="p-3 text-center space-x-1">
          <button onclick="editGuru(${idx})" class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold">✏️ Edit</button>
          <button onclick="deleteGuru(${idx})" class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-semibold">🗑️ Hapus</button>
        </td>
      </tr>
    `).join("");
}

// EDIT & MODAL SISWA
function openModalSiswa() {
  document.getElementById("siswaIndex").value = "-1";
  document.getElementById("modalSiswaTitle").innerText = "Tambah Siswa Baru";
  document.getElementById("siswaNis").value = "";
  document.getElementById("siswaNama").value = "";
  document.getElementById("siswaKelas").value = "";
  document.getElementById("siswaNoHp").value = "";
  document.getElementById("modalSiswa").classList.remove("hidden");
}

function editSiswa(idx) {
  const s = listSiswa[idx];
  document.getElementById("siswaIndex").value = idx;
  document.getElementById("modalSiswaTitle").innerText = "Edit Data Siswa";
  document.getElementById("siswaNis").value = s.nis;
  document.getElementById("siswaNama").value = s.nama;
  document.getElementById("siswaKelas").value = s.kelas;
  document.getElementById("siswaNoHp").value = s.noHp || "";
  document.getElementById("modalSiswa").classList.remove("hidden");
}

function closeModalSiswa() { document.getElementById("modalSiswa").classList.add("hidden"); }

function saveSiswa(e) {
  e.preventDefault();
  const idx = parseInt(document.getElementById("siswaIndex").value);
  const nis = document.getElementById("siswaNis").value.trim();
  const nama = document.getElementById("siswaNama").value.trim();
  const kelas = document.getElementById("siswaKelas").value.trim();
  const noHp = document.getElementById("siswaNoHp").value.trim();

  if (idx === -1) {
    listSiswa.push({ nis, nama, kelas, noHp });
  } else {
    listSiswa[idx] = { nis, nama, kelas, noHp };
  }
  localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
  closeModalSiswa();
  renderAdminTables();
}

function deleteSiswa(idx) {
  if (confirm("Hapus siswa ini?")) {
    listSiswa.splice(idx, 1);
    localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
    renderAdminTables();
  }
}

// EDIT & MODAL GURU
function openModalGuru() {
  document.getElementById("guruIndex").value = "-1";
  document.getElementById("modalGuruTitle").innerText = "Tambah Guru Baru";
  document.getElementById("guruNip").value = "";
  document.getElementById("guruNama").value = "";
  document.getElementById("modalGuru").classList.remove("hidden");
}

function editGuru(idx) {
  const g = listGuru[idx];
  document.getElementById("guruIndex").value = idx;
  document.getElementById("modalGuruTitle").innerText = "Edit Data Guru";
  document.getElementById("guruNip").value = g.nip || "";
  document.getElementById("guruNama").value = g.nama;
  document.getElementById("modalGuru").classList.remove("hidden");
}

function closeModalGuru() { document.getElementById("modalGuru").classList.add("hidden"); }

function saveGuru(e) {
  e.preventDefault();
  const idx = parseInt(document.getElementById("guruIndex").value);
  const nip = document.getElementById("guruNip").value.trim();
  const nama = document.getElementById("guruNama").value.trim();

  if (idx === -1) {
    listGuru.push({ nip, nama });
  } else {
    listGuru[idx] = { nip, nama };
  }
  localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
  closeModalGuru();
  renderAdminTables();
}

function deleteGuru(idx) {
  if (confirm("Hapus guru ini?")) {
    listGuru.splice(idx, 1);
    localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
    renderAdminTables();
  }
}

// EXCEL IMPORT & QR CODE
function importExcel(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: 'binary' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (type === 'siswa') {
      const imported = data.map(i => ({ nis: (i.NIS||i.nis||"").toString().trim(), nama: (i.NAMA||i.Nama||i.nama||"").toString().trim(), kelas: (i.KELAS||i.Kelas||i.kelas||"").toString().trim(), noHp: (i.HP||i.hp||i.WA||"").toString().trim() })).filter(x => x.nis && x.nama);
      listSiswa = listSiswa.concat(imported);
      localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
    } else {
      const imported = data.map(i => ({ nip: (i.NIP||i.nip||"").toString().trim(), nama: (i.NAMA||i.Nama||i.nama||"").toString().trim() })).filter(x => x.nama);
      listGuru = listGuru.concat(imported);
      localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
    }
    renderAdminTables();
  };
  reader.readAsBinaryString(file);
}

function downloadTemplateExcel(type) {
  const data = type === 'siswa' ? [{ NIS: "1001", NAMA: "Ahmad Dahlan", KELAS: "7A", HP: "628123456789" }] : [{ NIP: "198201012010011001", NAMA: "Budi Santoso, S.Pd." }];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `Template_${type}.xlsx`);
}

function generateQRCanvas(text) {
  return new Promise((resolve) => {
    let container = document.getElementById("qrPrintContainer") || document.createElement("div");
    container.id = "qrPrintContainer"; container.style.display = "none"; document.body.appendChild(container);
    container.innerHTML = "";
    new QRCode(container, { text: text, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H });
    setTimeout(() => {
      const canvas = container.querySelector("canvas");
      const img = container.querySelector("img");
      resolve(canvas ? canvas.toDataURL("image/png") : (img ? img.src : null));
    }, 200);
  });
}

async function downloadSingleQR(nis, nama) {
  const qrDataUrl = await generateQRCanvas(nis);
  if (!qrDataUrl) return alert("Gagal!");
  const link = document.createElement("a");
  link.href = qrDataUrl;
  link.download = `QR_${nis}_${nama}.png`;
  link.click();
}

// CETAK KARTU PDF A3 MODE PORTRAIT
async function downloadQRAll() {
  if (listSiswa.length === 0) return alert("Tidak ada data siswa!");
  const { jsPDF } = window.jspdf;

  // Set Portrait pada Kertas A3 (297mm x 420mm)
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
  
  const cardW = 85.6, cardH = 53.9;
  const startX = 12, startY = 15;
  const gapX = 8, gapY = 8;
  const cols = 3, rows = 7; // Grid 3x7 per halaman A3 Portrait
  let col = 0, row = 0;

  for (let i = 0; i < listSiswa.length; i++) {
    if (i > 0 && i % (cols * rows) === 0) {
      doc.addPage("a3", "portrait");
      col = 0; row = 0;
    }

    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // Kartu Border
    doc.setDrawColor(200);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "S");

    // Header Kartu
    doc.setFillColor(67, 56, 202);
    doc.rect(x, y, cardW, 12, "F");
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PRESENSI SISWA", x + cardW / 2, y + 8, { align: "center" });

    // QR Code
    const qrUrl = await generateQRCanvas(listSiswa[i].nis);
    if (qrUrl) doc.addImage(qrUrl, "PNG", x + 5, y + 16, 32, 32);

    // Detail Informasi Siswa
    doc.setTextColor(30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(listSiswa[i].nama, x + 40, y + 23);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`NIS    : ${listSiswa[i].nis}`, x + 40, y + 30);
    doc.text(`Kelas  : ${listSiswa[i].kelas}`, x + 40, y + 36);

    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }

  doc.save("Kartu_Presensi_Siswa_A3_Portrait.pdf");
}