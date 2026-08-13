const API_BASE = '/api';
let token = localStorage.getItem('token');

// Elements
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const scanForm = document.getElementById('scanForm');
const scanAlert = document.getElementById('scanAlert');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const attendanceTable = document.getElementById('attendanceTable');
const studentsTable = document.getElementById('studentsTable');

// Stats Elements
const statHadir = document.getElementById('statHadir');
const statTerlambat = document.getElementById('statTerlambat');
const statIzin = document.getElementById('statIzin');
const statTotal = document.getElementById('statTotal');

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    checkAuth();
  } else {
    showLogin();
  }
});

function showLogin() {
  loginSection.classList.remove('hidden');
  appSection.classList.add('hidden');
}

function showApp(user) {
  loginSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  userInfo.textContent = `Logged in as: ${user.nama} (${user.role.toUpperCase()})`;
  loadTodayAttendance();
}

// Switch Tab Navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.classList.add('text-slate-600', 'hover:bg-slate-100');
  });

  if (tabName === 'scan') {
    document.getElementById('tabScan').classList.remove('hidden');
    document.getElementById('tabScanBtn').classList.add('bg-indigo-600', 'text-white');
    document.getElementById('tabScanBtn').classList.remove('text-slate-600', 'hover:bg-slate-100');
    loadTodayAttendance();
  } else if (tabName === 'siswa') {
    document.getElementById('tabSiswa').classList.remove('hidden');
    document.getElementById('tabSiswaBtn').classList.add('bg-indigo-600', 'text-white');
    document.getElementById('tabSiswaBtn').classList.remove('text-slate-600', 'hover:bg-slate-100');
    loadStudents();
  }
}

// Check Auth Profile
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showApp(data.data);
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      token = data.data.token;
      localStorage.setItem('token', token);
      showApp(data.data.user);
    } else {
      showAlert(loginAlert, data.message, 'error');
    }
  } catch (err) {
    showAlert(loginAlert, 'Gagal terhubung ke server', 'error');
  }
});

// Handle Scan QR + Suara
scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const qrInput = document.getElementById('qrInput');
  const qr_code = qrInput.value.trim();

  try {
    const res = await fetch(`${API_BASE}/attendance/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ qr_code })
    });
    const data = await res.json();

    if (data.success) {
      const msg = `Presensi berhasil. Selamat datang, ${data.data.siswa.nama}!`;
      showAlert(scanAlert, `${data.message} (${data.data.siswa.nama})`, 'success');
      speakText(msg);

      qrInput.value = '';
      loadTodayAttendance();
    } else {
      showAlert(scanAlert, data.message, 'error');
      speakText(`Maaf, ${data.message}`);
    }
  } catch (err) {
    showAlert(scanAlert, 'Gagal memproses scan', 'error');
    speakText('Maaf, terjadi kesalahan pada sistem.');
  }
});

// Load Attendance Table & Calculate Stats
async function loadTodayAttendance() {
  try {
    const res = await fetch(`${API_BASE}/attendance/today`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      renderTable(data.data);
      updateStats(data.data);
    }
  } catch (err) {
    console.error(err);
  }
}

function updateStats(list) {
  let hadir = 0;
  let terlambat = 0;
  let izin = 0;

  list.forEach(item => {
    if (item.status === 'HADIR') hadir++;
    else if (item.status === 'TERLAMBAT') terlambat++;
    else if (item.status === 'IZIN' || item.status === 'SAKIT') izin++;
  });

  statHadir.textContent = hadir;
  statTerlambat.textContent = terlambat;
  statIzin.textContent = izin;
  statTotal.textContent = list.length;
}

function renderTable(list) {
  if (list.length === 0) {
    attendanceTable.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada data presensi hari ini.</td></tr>`;
    return;
  }

  attendanceTable.innerHTML = list.map(item => `
    <tr class="hover:bg-slate-50">
      <td class="p-3 font-mono text-slate-600">${item.jam}</td>
      <td class="p-3 font-semibold">${item.nis}</td>
      <td class="p-3 text-slate-800">${item.nama_siswa}</td>
      <td class="p-3 text-slate-600">${item.nama_rombel || '-'}</td>
      <td class="p-3"><span class="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700">${item.tipe}</span></td>
      <td class="p-3"><span class="px-2 py-0.5 text-xs font-semibold rounded ${
        item.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' :
        item.status === 'TERLAMBAT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
      }">${item.status}</span></td>
    </tr>
  `).join('');
}

// Load Students Data
async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      renderStudentsTable(data.data);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderStudentsTable(list) {
  if (!list || list.length === 0) {
    studentsTable.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada data siswa.</td></tr>`;
    return;
  }

  studentsTable.innerHTML = list.map(siswa => `
    <tr class="hover:bg-slate-50">
      <td class="p-3 font-semibold">${siswa.nis}</td>
      <td class="p-3 text-slate-600 font-mono">${siswa.nisn || '-'}</td>
      <td class="p-3 text-slate-800 font-medium">${siswa.nama}</td>
      <td class="p-3 text-slate-600">${siswa.jenis_kelamin}</td>
      <td class="p-3 font-mono text-xs text-indigo-600">${siswa.qr_code || '-'}</td>
      <td class="p-3"><span class="px-2 py-0.5 text-xs font-semibold rounded ${siswa.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${siswa.status_aktif ? 'AKTIF' : 'NON-AKTIF'}</span></td>
    </tr>
  `).join('');
}

// Helpers
function showAlert(element, message, type) {
  element.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-emerald-100', 'text-emerald-700');
  if (type === 'error') {
    element.classList.add('bg-red-100', 'text-red-700');
  } else {
    element.classList.add('bg-emerald-100', 'text-emerald-700');
  }
  element.textContent = message;
}

logoutBtn.addEventListener('click', logout);
refreshBtn.addEventListener('click', loadTodayAttendance);

function logout() {
  localStorage.removeItem('token');
  token = null;
  showLogin();
}

// Text-to-Speech
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}