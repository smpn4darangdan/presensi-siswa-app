// Variable Global
let listSiswa = [];
let filteredSiswa = [];

// ==========================================
// 1. NAVIGASI TAB & INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadStudents();
});

function switchTab(tabName) {
  const tabScan = document.getElementById("tabScan");
  const tabSiswa = document.getElementById("tabSiswa");
  const btnScan = document.getElementById("tabScanBtn");
  const btnSiswa = document.getElementById("tabSiswaBtn");

  if (tabName === "scan") {
    tabScan.classList.remove("hidden");
    tabSiswa.classList.add("hidden");

    btnScan.className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
    btnSiswa.className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition";
  } else {
    tabScan.classList.add("hidden");
    tabSiswa.classList.remove("hidden");

    btnSiswa.className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white transition";
    btnScan.className = "tab-btn px-5 py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition";
  }
}

function checkAuth() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("hidden");
}

// ==========================================
// 2. MASTER DATA SISWA (CRUD & FILTER)
// ==========================================
async function loadStudents() {
  try {
    const res = await fetch("/api/siswa");
    if (res.ok) {
      listSiswa = await res.json();
    } else {
      listSiswa = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
    }
  } catch (e) {
    listSiswa = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
  }
  
  filteredSiswa = [...listSiswa];
  renderStudentsTable(filteredSiswa);
}

function renderStudentsTable(data) {
  const tbody = document.getElementById("studentsTable");
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data siswa. Silakan klik "Tambah Siswa" atau "Import Excel".</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((s) => `
    <tr class="hover:bg-slate-50 border-b border-slate-100">
      <td class="p-3 font-mono font-semibold text-indigo-600">${s.nis}</td>
      <td class="p-3 font-medium text-slate-800">${s.nama}</td>
      <td class="p-3"><span class="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-md font-semibold">${s.kelas}</span></td>
      <td class="p-3 font-mono text-xs text-slate-600">${s.no_hp_ortu || '-'}</td>
      <td class="p-3 text-center space-x-1">
        <button onclick='downloadQRSingle(${JSON.stringify(s.nis)})' title="Cetak QR A3 Tagname" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1 rounded-md transition">📇 QR</button>
        <button onclick='editSiswa(${JSON.stringify(s)})' title="Edit Siswa" class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md transition">✏️ Edit</button>
        <button onclick="deleteSiswa('${s.id || s.nis}')" title="Hapus Siswa" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-md transition">🗑️ Hapus</button>
      </td>
    </tr>
  `).join('');
}

function filterSiswaByKelas() {
  const kls = document.getElementById("filterKelas").value;
  if (!kls) {
    filteredSiswa = [...listSiswa];
  } else {
    filteredSiswa = listSiswa.filter(s => s.kelas === kls);
  }
  renderStudentsTable(filteredSiswa);
}

function openModalSiswa(data = null) {
  document.getElementById('modalSiswa').classList.remove('hidden');
  if (data) {
    document.getElementById('modalSiswaTitle').innerText = 'Edit Data Siswa';
    document.getElementById('siswaId').value = data.id || data.nis;
    document.getElementById('siswaNis').value = data.nis;
    document.getElementById('siswaNama').value = data.nama;
    document.getElementById('siswaKelas').value = data.kelas;
    document.getElementById('siswaNoHp').value = data.no_hp_ortu || '';
  } else {
    document.getElementById('modalSiswaTitle').innerText = 'Tambah Data Siswa';
    document.getElementById('siswaForm').reset();
    document.getElementById('siswaId').value = '';
  }
}

function editSiswa(s) {
  openModalSiswa(s);
}

function closeModalSiswa() {
  document.getElementById('modalSiswa').classList.add('hidden');
}

async function saveSiswa(e) {
  e.preventDefault();
  const id = document.getElementById('siswaId').value;
  const payload = {
    id: id || Date.now().toString(),
    nis: document.getElementById('siswaNis').value,
    nama: document.getElementById('siswaNama').value,
    kelas: document.getElementById('siswaKelas').value,
    no_hp_ortu: document.getElementById('siswaNoHp').value,
  };

  try {
    const url = id ? `/api/siswa/${id}` : '/api/siswa';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();
  } catch (err) {
    let localData = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
    if (id) {
      localData = localData.map(s => (s.id === id || s.nis === id) ? payload : s);
    } else {
      localData.push(payload);
    }
    localStorage.setItem("DATA_SISWA", JSON.stringify(localData));
  }

  alert('✅ Data Siswa berhasil disimpan!');
  closeModalSiswa();
  loadStudents();
}

async function deleteSiswa(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return;
  
  try {
    await fetch(`/api/siswa/${id}`, { method: 'DELETE' });
  } catch (err) {
    let localData = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
    localData = localData.filter(s => s.id !== id && s.nis !== id);
    localStorage.setItem("DATA_SISWA", JSON.stringify(localData));
  }

  alert('🗑️ Data siswa berhasil dihapus.');
  loadStudents();
}

// ==========================================
// 3. PENGATURAN WA PENGIRIM SEKOLAH
// ==========================================
function openModalWA() {
  document.getElementById('modalWA').classList.remove('hidden');
  document.getElementById('waSenderNumber').value = localStorage.getItem('WA_SENDER_NUMBER') || '628123456789';
}

function closeModalWA() {
  document.getElementById('modalWA').classList.add('hidden');
}

function saveWASender() {
  const num = document.getElementById('waSenderNumber').value;
  if (!num) return alert('Nomor pengirim wajib diisi!');
  localStorage.setItem('WA_SENDER_NUMBER', num);
  alert('✅ Nomor WA Utama Pengirim Sekolah Berhasil Disimpan!');
  closeModalWA();
}

// ==========================================
// 4. GENERATE PDF QR KARTU TAGNAME (A3 PORTRAIT)
// ==========================================
async function generateQRCardsPDF(siswaArray, filename = "Kartu_QR_Siswa.pdf") {
  if (!siswaArray || siswaArray.length === 0) {
    return alert('Tidak ada data siswa untuk dicetak!');
  }

  const { jsPDF } = window.jspdf;
  
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a3'
  });

  const cardWidth = 80;   
  const cardHeight = 115; 
  const marginX = 18;
  const marginY = 20;
  const gapX = 12;
  const gapY = 12;

  const cols = 3; 
  const rows = 3; 

  let xIndex = 0;
  let yIndex = 0;

  for (let i = 0; i < siswaArray.length; i++) {
    const s = siswaArray[i];

    const posX = marginX + xIndex * (cardWidth + gapX);
    const posY = marginY + yIndex * (cardHeight + gapY);

    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.roundedRect(posX, posY, cardWidth, cardHeight, 4, 4);

    doc.setFillColor(79, 70, 229);
    doc.rect(posX, posY, cardWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PRESENSI SISWA", posX + (cardWidth / 2), posY + 10, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("PRESENSI APP SEKOLAH", posX + (cardWidth / 2), posY + 16, { align: "center" });

    const qrContainer = document.createElement("div");
    new QRCode(qrContainer, {
      text: s.nis,
      width: 150,
      height: 150
    });
    
    await new Promise(r => setTimeout(r, 100));
    const qrCanvas = qrContainer.querySelector("canvas");
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL("image/png") : "";

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", posX + 15, posY + 28, 50, 50);
    }

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(s.nama.toUpperCase(), posX + (cardWidth / 2), posY + 85, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`NIS: ${s.nis}`, posX + (cardWidth / 2), posY + 92, { align: "center" });
    doc.text(`KELAS: ${s.kelas}`, posX + (cardWidth / 2), posY + 98, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Tunjukkan kartu ini pada kamera scanner", posX + (cardWidth / 2), posY + 108, { align: "center" });

    xIndex++;
    if (xIndex >= cols) {
      xIndex = 0;
      yIndex++;
      if (yIndex >= rows && i < siswaArray.length - 1) {
        yIndex = 0;
        doc.addPage('a3', 'p');
      }
    }
  }

  doc.save(filename);
}

function downloadQRSingle(nis) {
  const s = listSiswa.find(x => x.nis === nis);
  if (s) generateQRCardsPDF([s], `Kartu_QR_${s.nama.replace(/\s+/g, '_')}.pdf`);
}

function downloadQRPerKelas() {
  const kls = document.getElementById('filterKelas').value;
  if (!kls) return alert('Silakan pilih kelas terlebih dahulu pada dropdown filter kelas!');
  const filtered = listSiswa.filter(s => s.kelas === kls);
  if (filtered.length === 0) return alert(`Tidak ada data siswa di kelas ${kls}!`);
  generateQRCardsPDF(filtered, `Kartu_QR_Kelas_${kls}.pdf`);
}

function downloadQRAll() {
  if (listSiswa.length === 0) return alert('Belum ada data siswa untuk dicetak!');
  generateQRCardsPDF(listSiswa, "Kartu_QR_Semua_Siswa_A3.pdf");
}

// ==========================================
// 5. FITUR TEMPLATE & IMPORT EXCEL SISWA
// ==========================================
function downloadTemplateExcel() {
  const templateData = [
    { NIS: "1001", NAMA: "Ahmad Rizky", KELAS: "7A", NO_WA_ORTU: "628123456789" },
    { NIS: "1002", NAMA: "Siti Nurhaliza", KELAS: "7A", NO_WA_ORTU: "628987654321" },
    { NIS: "1003", NAMA: "Budi Santoso", KELAS: "7B", NO_WA_ORTU: "628556677889" }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Data Siswa");

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 10 },
    { wch: 18 }
  ];

  XLSX.writeFile(workbook, "Template_Import_Siswa_Presensi.xlsx");
}

function importSiswaExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const importedJson = XLSX.utils.sheet_to_json(worksheet);

      if (importedJson.length === 0) {
        alert("⚠️ File Excel kosong atau format tidak sesuai.");
        return;
      }

      const newStudents = importedJson.map((row, index) => ({
        id: (Date.now() + index).toString(),
        nis: row.NIS ? row.NIS.toString() : `NIS-${index + 1}`,
        nama: row.NAMA || "Tanpa Nama",
        kelas: row.KELAS ? row.KELAS.toString() : "Umum",
        no_hp_ortu: row.NO_WA_ORTU ? row.NO_WA_ORTU.toString() : ""
      }));

      let existingData = JSON.parse(localStorage.getItem("DATA_SISWA")) || [];
      
      newStudents.forEach(newS => {
        const existIdx = existingData.findIndex(item => item.nis === newS.nis);
        if (existIdx >= 0) {
          existingData[existIdx] = newS;
        } else {
          existingData.push(newS);
        }
      });

      localStorage.setItem("DATA_SISWA", JSON.stringify(existingData));
      alert(`✅ Berhasil mengimpor ${newStudents.length} data siswa!`);
      e.target.value = "";
      loadStudents();

    } catch (error) {
      console.error(error);
      alert("❌ Terjadi kesalahan saat membaca file. Pastikan file berupa .xlsx atau .csv dengan format yang benar.");
    }
  };

  reader.readAsArrayBuffer(file);
}