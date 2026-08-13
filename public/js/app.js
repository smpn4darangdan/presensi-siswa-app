// Variable Global
let listSiswa = [];
let listGuru = [];
let listAttendance = [];
let currentUser = null;

// ==========================================
// 1. INITIALIZATION & LOGIN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadMasterData();
  checkSession();
});

function loadMasterData() {
  listSiswa = JSON.parse(localStorage.getItem("DATA_SISWA")) || [
    { id: "1", nis: "3121131160", nama: "Agis Kurniawan", kelas: "7 A", no_hp_ortu: "6283194600265" },
    { id: "2", nis: "3140035850", nama: "Akmal Maulana Yusup", kelas: "7 A", no_hp_ortu: "6283194600265" },
    { id: "3", nis: "131796257", nama: "Algika Wiguna Irawan", kelas: "7 A", no_hp_ortu: "6283194600265" }
  ];
  listGuru = JSON.parse(localStorage.getItem("DATA_GURU")) || [
    { id: "1", nip: "19850101201001", nama: "Budi Santoso, S.Pd.", username: "budisantoso" },
    { id: "2", nip: "", nama: "Dewi Lestari, S.Si.", username: "dewilestari" }
  ];
  listAttendance = JSON.parse(localStorage.getItem("DATA_ATTENDANCE")) || [];

  localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
  localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
}

function switchLoginRole(role) {
  document.getElementById("loginRole").value = role;
  const btnGuru = document.getElementById("loginRoleGuruBtn");
  const btnAdmin = document.getElementById("loginRoleAdminBtn");
  const passGroup = document.getElementById("passwordGroup");
  const userLabel = document.getElementById("usernameLabel");

  if (role === "guru") {
    btnGuru.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600";
    btnAdmin.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600";
    passGroup.classList.add("hidden");
    userLabel.innerText = "NIP / Nama Lengkap (Huruf Kecil Tanpa Spasi)";
  } else {
    btnAdmin.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600";
    btnGuru.className = "w-1/2 py-2 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600";
    passGroup.classList.remove("hidden");
    userLabel.innerText = "Username Admin";
  }
}

function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById("loginRole").value;
  const inputUser = document.getElementById("username").value.trim().toLowerCase();
  const inputPass = document.getElementById("password").value;

  if (role === "admin") {
    if (inputUser === "admin" && inputPass === "admin123") {
      currentUser = { role: "admin", name: "Administrator", identifier: "admin" };
    } else {
      return alert("❌ Username atau password Admin salah!");
    }
  } else {
    const foundGuru = listGuru.find(g => 
      (g.nip && g.nip.toLowerCase() === inputUser) || 
      (g.username && g.username.toLowerCase() === inputUser) ||
      (g.nama.toLowerCase().replace(/\s+/g, '') === inputUser)
    );

    if (foundGuru) {
      currentUser = { role: "guru", name: foundGuru.nama, identifier: foundGuru.nip || foundGuru.username };
    } else {
      return alert("❌ Data NIP / Nama Guru tidak ditemukan!");
    }
  }

  localStorage.setItem("CURRENT_USER", JSON.stringify(currentUser));
  checkSession();
}

function checkSession() {
  const session = localStorage.getItem("CURRENT_USER");
  if (session) {
    currentUser = JSON.parse(session);
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    document.getElementById("userInfo").innerText = `Logged in as: ${currentUser.name} (${currentUser.role.toUpperCase()})`;

    if (currentUser.role === "guru") {
      document.getElementById("guruView").classList.remove("hidden");
      document.getElementById("adminView").classList.add("hidden");
      document.getElementById("guruNameLabel").innerText = currentUser.name;
    } else {
      document.getElementById("adminView").classList.remove("hidden");
      document.getElementById("guruView").classList.add("hidden");
      renderAdminTables();
    }
  } else {
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
  }
}

function handleLogout() {
  localStorage.removeItem("CURRENT_USER");
  location.reload();
}

// ==========================================
// 2. DASHBOARD GURU
// ==========================================
function handleGuruScan(e) {
  e.preventDefault();
  const selectedKelas = document.getElementById("guruSelectKelas").value;
  if (!selectedKelas) return alert("⚠️ Pilih kelas dulu!");

  const qrInput = document.getElementById("guruQrInput").value.trim();
  if (!qrInput) return;

  const siswa = listSiswa.find(s => s.nis === qrInput || s.id === qrInput);
  if (!siswa) {
    alert(`❌ Siswa dengan NIS '${qrInput}' tidak ditemukan!`);
    document.getElementById("guruQrInput").value = "";
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const attendanceRecord = {
    id: Date.now().toString(),
    nis: siswa.nis,
    nama: siswa.nama,
    kelas: siswa.kelas,
    scannedByRole: 'guru',
    scannedByName: currentUser.name,
    scannedByIdentifier: currentUser.identifier,
    jam: timeStr,
    tanggal: now.toISOString().split('T')[0]
  };

  listAttendance.unshift(attendanceRecord);
  localStorage.setItem("DATA_ATTENDANCE", JSON.stringify(listAttendance));

  alert(`✅ Presensi Berhasil: ${siswa.nama}`);
  document.getElementById("guruQrInput").value = "";
  loadGuruAttendanceHistory();
}

function loadGuruAttendanceHistory() {
  const selectedKelas = document.getElementById("guruSelectKelas").value;
  const tbody = document.getElementById("guruAttendanceTable");
  const totalScanned = document.getElementById("guruTotalScanned");

  if (!selectedKelas) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Pilih kelas di atas terlebih dahulu.</td></tr>`;
    totalScanned.innerText = `0 Siswa`;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const filtered = listAttendance.filter(a => 
    a.tanggal === today && 
    a.kelas.replace(/\s+/g, '') === selectedKelas.replace(/\s+/g, '') && 
    a.scannedByName === currentUser.name
  );

  totalScanned.innerText = `${filtered.length} Siswa`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada siswa di kelas ${selectedKelas} yang diabsen oleh Anda hari ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => `
    <tr class="hover:bg-slate-50 border-b border-slate-100">
      <td class="p-2.5 font-mono text-xs text-slate-500">${a.jam}</td>
      <td class="p-2.5 font-mono font-bold text-indigo-600">${a.nis}</td>
      <td class="p-2.5 font-semibold text-slate-800">${a.nama}</td>
      <td class="p-2.5"><span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">${a.kelas}</span></td>
      <td class="p-2.5 text-center"><span class="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-md">✅ Verified</span></td>
    </tr>
  `).join('');
}

// ==========================================
// 3. DASHBOARD ADMIN & TABEL MASTER
// ==========================================
function switchAdminTab(tab) {
  document.getElementById("adminTabScan").classList.add("hidden");
  document.getElementById("adminTabSiswa").classList.add("hidden");
  document.getElementById("adminTabGuru").classList.add("hidden");

  document.getElementById("tabScanBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition";
  document.getElementById("tabSiswaBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition";
  document.getElementById("tabGuruBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition";

  if (tab === 'scan') {
    document.getElementById("adminTabScan").classList.remove("hidden");
    document.getElementById("tabScanBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  } else if (tab === 'siswa') {
    document.getElementById("adminTabSiswa").classList.remove("hidden");
    document.getElementById("tabSiswaBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  } else if (tab === 'guru') {
    document.getElementById("adminTabGuru").classList.remove("hidden");
    document.getElementById("tabGuruBtn").className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
  }
}

function renderAdminTables() {
  const today = new Date().toISOString().split('T')[0];
  const tbodyAtt = document.getElementById("adminAttendanceTable");
  const todayAtt = listAttendance.filter(a => a.tanggal === today);

  if (todayAtt.length === 0) {
    tbodyAtt.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data presensi masuk hari ini.</td></tr>`;
  } else {
    tbodyAtt.innerHTML = todayAtt.map(a => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="p-3 font-mono text-xs">${a.jam}</td>
        <td class="p-3 font-mono font-bold text-indigo-600">${a.nis}</td>
        <td class="p-3 font-medium text-slate-800">${a.nama}</td>
        <td class="p-3"><span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold">${a.kelas}</span></td>
        <td class="p-3 text-xs font-semibold text-slate-600">${a.scannedByName} (${a.scannedByRole})</td>
      </tr>
    `).join('');
  }

  // Render Tabel Master Siswa (DENGAN TOMBOL QR PER SISWA, EDIT & HAPUS)
  const tbodySiswa = document.getElementById("studentsTable");
  tbodySiswa.innerHTML = listSiswa.map(s => `
    <tr class="hover:bg-slate-50 border-b border-slate-100">
      <td class="p-3 font-mono font-bold text-indigo-600">${s.nis}</td>
      <td class="p-3 font-medium text-slate-800">${s.nama}</td>
      <td class="p-3"><span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold">${s.kelas}</span></td>
      <td class="p-3 text-xs font-mono">${s.no_hp_ortu || '-'}</td>
      <td class="p-3 text-center space-x-1">
        <button onclick="downloadQRSiswaSingle('${s.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-1 rounded shadow-sm transition" title="Download QR Siswa ini">📇 QR</button>
        <button onclick="editSiswa('${s.id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1 rounded shadow-sm transition">✏️ Edit</button>
        <button onclick="deleteSiswa('${s.id}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded shadow-sm transition">🗑️ Hapus</button>
      </td>
    </tr>
  `).join('');

  // Render Tabel Master Guru
  const tbodyGuru = document.getElementById("teachersTable");
  tbodyGuru.innerHTML = listGuru.map(g => `
    <tr class="hover:bg-slate-50 border-b border-slate-100">
      <td class="p-3 font-mono font-bold text-slate-700">${g.nip || '- Non ASN -'}</td>
      <td class="p-3 font-medium text-slate-800">${g.nama}</td>
      <td class="p-3 font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">${g.username}</td>
      <td class="p-3 text-center space-x-1">
        <button onclick="editGuru('${g.id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1 rounded shadow-sm transition">✏️ Edit</button>
        <button onclick="deleteGuru('${g.id}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded shadow-sm transition">🗑️ Hapus</button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// 4. DOWNLOAD QR CODE PER SISWA (SINGLE)
// ==========================================
async function downloadQRSiswaSingle(id) {
  const siswa = listSiswa.find(s => s.id === id);
  if (!siswa) return alert("Data siswa tidak ditemukan");

  const container = document.getElementById("qrPrintContainer");
  container.innerHTML = "";

  // Render QR Code ke hidden div
  const tempDiv = document.createElement("div");
  container.appendChild(tempDiv);
  new QRCode(tempDiv, { text: siswa.nis, width: 300, height: 300 });

  await new Promise(r => setTimeout(r, 100));

  const canvasQr = tempDiv.querySelector("canvas");
  if (!canvasQr) return alert("Gagal memproses QR Code");

  // Buat Canvas Gambar ID Card
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  // Background Card
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border & Header
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#4f46e5";
  ctx.fillRect(0, 0, canvas.width, 60);

  // Header Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("KARTU PRESENSI SISWA", 20, 38);

  // Detail Siswa (Teks Left)
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(siswa.nama.substring(0, 22), 25, 120);

  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText(`NIS    : ${siswa.nis}`, 25, 160);
  ctx.fillText(`Kelas  : ${siswa.kelas}`, 25, 190);

  // Tempel Gambar QR
  ctx.drawImage(canvasQr, 310, 80, 160, 160);

  // Footer Tagline
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";
  ctx.fillText("PresensiSiswa App • Scan QR untuk Absensi", 25, 290);

  // Download sebagai Gambar PNG
  const link = document.createElement("a");
  link.download = `QR_${siswa.nis}_${siswa.nama.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// --- CRUD SISWA ---
function openModalSiswa() { 
  document.getElementById('siswaId').value = "";
  document.getElementById('siswaForm').reset();
  document.getElementById('modalSiswaTitle').innerText = "Tambah Data Siswa";
  document.getElementById('modalSiswa').classList.remove('hidden'); 
}

function closeModalSiswa() { document.getElementById('modalSiswa').classList.add('hidden'); }

function editSiswa(id) {
  const siswa = listSiswa.find(s => s.id === id);
  if (!siswa) return;
  document.getElementById('siswaId').value = siswa.id;
  document.getElementById('siswaNis').value = siswa.nis;
  document.getElementById('siswaNama').value = siswa.nama;
  document.getElementById('siswaKelas').value = siswa.kelas;
  document.getElementById('siswaNoHp').value = siswa.no_hp_ortu || "";
  document.getElementById('modalSiswaTitle').innerText = "Edit Data Siswa";
  document.getElementById('modalSiswa').classList.remove('hidden');
}

function saveSiswa(e) {
  e.preventDefault();
  const id = document.getElementById('siswaId').value;
  const nis = document.getElementById('siswaNis').value;
  const nama = document.getElementById('siswaNama').value;
  const kelas = document.getElementById('siswaKelas').value;
  const no_hp_ortu = document.getElementById('siswaNoHp').value;

  if (id) {
    const idx = listSiswa.findIndex(s => s.id === id);
    if (idx !== -1) listSiswa[idx] = { id, nis, nama, kelas, no_hp_ortu };
  } else {
    listSiswa.push({ id: Date.now().toString(), nis, nama, kelas, no_hp_ortu });
  }

  localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
  closeModalSiswa();
  renderAdminTables();
}

function deleteSiswa(id) {
  if (confirm("Hapus data siswa ini?")) {
    listSiswa = listSiswa.filter(s => s.id !== id);
    localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
    renderAdminTables();
  }
}

// --- CRUD GURU ---
function openModalGuru() { 
  document.getElementById('guruId').value = "";
  document.getElementById('guruForm').reset();
  document.getElementById('modalGuruTitle').innerText = "Tambah Data Guru";
  document.getElementById('modalGuru').classList.remove('hidden'); 
}

function closeModalGuru() { document.getElementById('modalGuru').classList.add('hidden'); }

function editGuru(id) {
  const guru = listGuru.find(g => g.id === id);
  if (!guru) return;
  document.getElementById('guruId').value = guru.id;
  document.getElementById('guruNip').value = guru.nip || "";
  document.getElementById('guruNama').value = guru.nama;
  document.getElementById('modalGuruTitle').innerText = "Edit Data Guru";
  document.getElementById('modalGuru').classList.remove('hidden');
}

function saveGuru(e) {
  e.preventDefault();
  const id = document.getElementById('guruId').value;
  const nip = document.getElementById('guruNip').value;
  const nama = document.getElementById('guruNama').value;
  const usernameClean = nama.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (id) {
    const idx = listGuru.findIndex(g => g.id === id);
    if (idx !== -1) listGuru[idx] = { id, nip, nama, username: usernameClean };
  } else {
    listGuru.push({ id: Date.now().toString(), nip, nama, username: usernameClean });
  }

  localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
  closeModalGuru();
  renderAdminTables();
}

function deleteGuru(id) {
  if (confirm("Hapus data guru ini?")) {
    listGuru = listGuru.filter(g => g.id !== id);
    localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
    renderAdminTables();
  }
}

// ==========================================
// 5. EXCEL IMPORT & CETAK QR MASSAL (PDF A3)
// ==========================================
function downloadTemplateExcel(type) {
  const data = type === 'siswa' 
    ? [{ NIS: "1001", NAMA: "Ahmad Rizky", KELAS: "7A", NO_WA_ORTU: "628123456789" }]
    : [{ NIP: "19850101201001", NAMA: "Budi Santoso, S.Pd." }, { NIP: "", NAMA: "Dewi Lestari, S.Si." }];
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `Template_${type}.xlsx`);
}

function importExcel(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    if (type === 'siswa') {
      json.forEach((r, idx) => {
        listSiswa.push({
          id: (Date.now() + idx).toString(),
          nis: r.NIS ? r.NIS.toString() : `100${idx}`,
          nama: r.NAMA || "Tanpa Nama",
          kelas: r.KELAS || "7A",
          no_hp_ortu: r.NO_WA_ORTU ? r.NO_WA_ORTU.toString() : ""
        });
      });
      localStorage.setItem("DATA_SISWA", JSON.stringify(listSiswa));
    } else {
      json.forEach((r, idx) => {
        const nama = r.NAMA || "Guru";
        listGuru.push({
          id: (Date.now() + idx).toString(),
          nip: r.NIP ? r.NIP.toString() : "",
          nama: nama,
          username: nama.toLowerCase().replace(/[^a-z0-9]/g, '')
        });
      });
      localStorage.setItem("DATA_GURU", JSON.stringify(listGuru));
    }
    alert(`✅ Berhasil import data ${type}!`);
    renderAdminTables();
  };
  reader.readAsArrayBuffer(file);
}

// CETAK QR CODE MASSAL PDF A3
async function downloadQRAll() {
  if (listSiswa.length === 0) return alert("❌ Belum ada data siswa untuk dicetak!");

  alert("⏳ Sedang memproses PDF Kartu QR Siswa (Format A3)... Mohon tunggu beberapa detik.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3' });

  const container = document.getElementById("qrPrintContainer");
  container.innerHTML = "";

  let x = 15;
  let y = 15;
  const cardWidth = 65;
  const cardHeight = 45;
  const gap = 10;
  const maxCols = 4;

  let colCount = 0;

  for (let i = 0; i < listSiswa.length; i++) {
    const siswa = listSiswa[i];
    
    const qrDiv = document.createElement("div");
    container.appendChild(qrDiv);
    new QRCode(qrDiv, { text: siswa.nis, width: 120, height: 120 });

    await new Promise(r => setTimeout(r, 50));
    const qrCanvas = qrDiv.querySelector("canvas");
    const qrImgData = qrCanvas ? qrCanvas.toDataURL("image/png") : "";

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("KARTU PRESENSI SISWA", x + 5, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(siswa.nama.substring(0, 20), x + 5, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`NIS: ${siswa.nis}`, x + 5, y + 22);
    doc.text(`Kelas: ${siswa.kelas}`, x + 5, y + 27);

    if (qrImgData) {
      doc.addImage(qrImgData, 'PNG', x + cardWidth - 28, y + 10, 23, 23);
    }

    colCount++;
    if (colCount >= maxCols) {
      colCount = 0;
      x = 15;
      y += cardHeight + gap;
      if (y + cardHeight > 400) {
        doc.addPage();
        y = 15;
      }
    } else {
      x += cardWidth + gap;
    }
  }

  doc.save(`Kartu_QR_Siswa_A3_${Date.now()}.pdf`);
}