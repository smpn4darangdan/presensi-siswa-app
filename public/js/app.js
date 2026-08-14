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

// Normalisasi Nama (Menyamakan Spasi & Huruf Besar/Kecil)
function cleanNama(nama) {
  if (!nama) return "";
  return String(nama).trim().toLowerCase().replace(/\s+/g, ' ');
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

  const rawDecoded = String(decodedText || "").trim();
  const cleanScannedNama = cleanNama(rawDecoded);
  
  if (!rawDecoded) { 
    isProcessingScan = false; 
    return; 
  }

  if (scannedByRole === 'guru') {
    const selectedKelas = document.getElementById("guruSelectKelas").value;
    if (!selectedKelas) {
      bicara("Pilih kelas terlebih dahulu");
      alert("⚠️ Pilih kelas mengajar dulu di menu atas!");
      setTimeout(() => { isProcessingScan = false; }, 2000);
      return;
    }
  }

  // Cari siswa MURNI hanya berdasarkan NAMA LENGKAP (NISN diabaikan)
  const siswa = listSiswa.find(s => cleanNama(s.nama) === cleanScannedNama);

  if (!siswa) {
    bicara("Siswa tidak ditemukan");
    alert(`❌ Siswa dengan Nama "${decodedText}" tidak terdaftar!`);
    setTimeout(() => { isProcessingScan = false; }, 2500);
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  const sudahAbsen = listAttendance.some(a => {
    return a.tanggal === dateStr && cleanNama(a.nama) === cleanScannedNama;
  });

  if (sudahAbsen) {
    bicara(`Siswa ${siswa.nama} sudah di scan`);
    alert(`⚠️ Siswa ${siswa.nama} SUDAH di-scan hari ini!`);
  } else {
    listAttendance.unshift({
      id: Date.now().toString(),
      nis: siswa.nis || "-",
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

  tbody.innerHTML = filtered.length === 0 ? `<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada siswa di-scan.</td></tr>` :
    filtered.map(a => `<tr class="hover:bg-slate-50"><td class="p-2.5 font-mono text-xs">${a.jam}</td><td class="p-2.5 font-semibold text-slate-800">${a.nama}</td><td class="p-2.5">${a.kelas}</td><td class="p-2.5 text-center text-emerald-600 font-semibold">✅ Hadir</td></tr>`).join("");
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

  attTb.innerHTML = todayAtt.length === 0 ? `<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada riwayat.</td></tr>` :
    todayAtt.map(a => `<tr class="hover:bg-slate-50"><td class="p-3 font-mono text-xs">${a.jam}</td><td class="p-3 font-semibold">${a.nama}</td><td class="p-3">${a.kelas}</td><td class="p-3 text-xs text-indigo-600">${a.scannedByName}</td></tr>`).join("");

  const sisTb = document.getElementById("studentsTable");
  sisTb.innerHTML = listSiswa.length === 0 ? `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data siswa.</td></tr>` :
    listSiswa.map((s, idx) => `
      <tr class="hover:bg-slate-50">
        <td class="p-3 font-semibold text-slate-800">${s.nama}</td>
        <td class="p-3">${s.kelas}</td>
        <td class="p-3 font-mono text-xs text-slate-500">${s.nis || '-'}</td>
        <td class="p-3 text-xs text-slate-500">${s.noHp || '-'}</td>
        <td class="p-3 text-center space-x-1">
          <button onclick="downloadSingleQR('${s.nama}')" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-semibold">📇 QR Nama</button>
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

// EDIT & MODAL SISWA (OTOMATIS UPDATE QR KETIKA SISWA DIEDIT)
function openModalSiswa() {
  document.getElementById("siswaIndex").value = "-1";
  document.getElementById("modalSiswaTitle").innerText = "Tambah Siswa Baru";
  document.getElementById("siswaNama").value = "";
  document.getElementById("siswaKelas").value = "";
  document.getElementById("siswaNis").value = "";
  document.getElementById("siswaNoHp").value = "";
  document.getElementById("modalSiswa").classList.remove("hidden");
}

function editSiswa(idx) {
  const s = listSiswa[idx];
  document.getElementById("siswaIndex").value = idx;
  document.getElementById("modalSiswaTitle").innerText = "Edit Data Siswa";
  document.getElementById("siswaNama").value = s.nama;
  document.getElementById("siswaKelas").value = s.kelas;
  document.getElementById("siswaNis").value = s.nis || "";
  document.getElementById("siswaNoHp").value = s.noHp || "";
  document.getElementById("modalSiswa").classList.remove("hidden");
}

function closeModalSiswa() { document.getElementById("modalSiswa").classList.add("hidden"); }

function saveSiswa(e) {
  e.preventDefault();
  const idx = parseInt(document.getElementById("siswaIndex").value);
  const nama = document.getElementById("siswaNama").value.trim();
  const kelas = document.getElementById("siswaKelas").value.trim();
  const nis = document.getElementById("siswaNis").value.trim();
  const noHp = document.getElementById("siswaNoHp").value.trim();

  if (!nama) return alert("⚠️ Nama siswa tidak boleh kosong!");

  if (idx === -1) {
    listSiswa.push({ nama, kelas, nis, noHp });
  } else {
    const oldNama = listSiswa[idx].nama;
    if (oldNama !== nama) {
      listAttendance.forEach(a => {
        if (cleanNama(a.nama) === cleanNama(oldNama)) {
          a.nama = nama;
        }
      });
      localStorage.setItem("DATA_ATTENDANCE", JSON.stringify(listAttendance));
    }
    listSiswa[idx] = { nama, kelas, nis, noHp };
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

// EXCEL IMPORT & GENERATE QR CODE
function importExcel(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: 'binary' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (type === 'siswa') {
      const imported = data.map(i => {
        const namaVal = (i.NAMA || i.Nama || i.nama || "").toString().trim();
        const kelasVal = (i.KELAS || i.Kelas || i.kelas || "").toString().trim();
        const nisVal = (i.NISN || i.nisn || i.NIS || i.nis || "").toString().trim();
        const hpVal = (i.HP || i.hp || i.WA || i.wa || i.NO_HP || "").toString().trim();
        return { nama: namaVal, kelas: kelasVal, nis: nisVal, noHp: hpVal };
      }).filter(x => x.nama);
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
  const data = type === 'siswa' ? [{ NAMA: "Ahmad Dahlan", KELAS: "7A", HP: "628123456789" }] : [{ NIP: "198201012010011001", NAMA: "Budi Santoso, S.Pd." }];
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

async function downloadSingleQR(nama) {
  const qrDataUrl = await generateQRCanvas(nama);
  if (!qrDataUrl) return alert("Gagal membuat QR Code!");
  const link = document.createElement("a");
  link.href = qrDataUrl;
  link.download = `QR_SISWA_${nama.replace(/\s+/g, '_')}.png`;
  link.click();
}

// CETAK KARTU PDF A3 MODE PORTRAIT (BENTUK KARTU TEGAK & ISI QR NAMA)
async function downloadQRAll() {
  if (listSiswa.length === 0) return alert("Tidak ada data siswa!");
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
  
  const cardW = 54, cardH = 86; // Dimensi Kartu Tegak/Portrait
  const startX = 15, startY = 15;
  const gapX = 10, gapY = 10;
  const cols = 4, rows = 4;
  let col = 0, row = 0;

  for (let i = 0; i < listSiswa.length; i++) {
    if (i > 0 && i % (cols * rows) === 0) {
      doc.addPage("a3", "portrait");
      col = 0; row = 0;
    }

    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // Frame Kartu
    doc.setDrawColor(200);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "S");

    // Header Kartu
    doc.setFillColor(67, 56, 202);
    doc.rect(x, y, cardW, 14, "F");
    doc.setTextColor(255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PRESENSI", x + cardW / 2, y + 6, { align: "center" });
    doc.text("SISWA", x + cardW / 2, y + 11, { align: "center" });

    // QR Code Murni Nama Lengkap
    const qrUrl = await generateQRCanvas(listSiswa[i].nama);
    if (qrUrl) {
      const qrSize = 36;
      const qrX = x + (cardW - qrSize) / 2;
      doc.addImage(qrUrl, "PNG", qrX, y + 18, qrSize, qrSize);
    }

    // Detail Siswa
    doc.setTextColor(30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(listSiswa[i].nama, x + cardW / 2, y + 60, { align: "center", maxWidth: 48 });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Kelas : ${listSiswa[i].kelas}`, x + cardW / 2, y + 70, { align: "center" });

    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }

  doc.save("Kartu_Presensi_Siswa_Portrait.pdf");
}