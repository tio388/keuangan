const API = '/api';

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  view: 'login'
};

function sanitize(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function notify(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `notification notification-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  return fetch(`${API}${path}`, { ...options, headers }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Terjadi kesalahan');
    return data;
  });
}

function renderLogin() {
  state.view = 'login';
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card fade-in">
        <h1>Keuangan</h1>
        <p class="subtitle">Sistem Slip Gaji Dokter</p>
        <div class="role-toggle">
          <div class="role-btn active" data-role="dokter">Dokter</div>
          <div class="role-btn" data-role="admin">Admin</div>
        </div>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Masukkan email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Masukkan password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary">Masuk</button>
        </form>
      </div>
    </div>
  `;

  let selectedRole = 'dokter';

  app.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      app.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = btn.dataset.role;
    });
  });

  app.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = app.querySelector('#email').value;
    const password = app.querySelector('#password').value;
    const btn = app.querySelector('#loginForm .btn');
    btn.disabled = true; btn.textContent = 'Memproses...';

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: selectedRole })
      });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      notify(`Selamat datang, ${data.user.nama || data.user.email}!`, 'success');
      renderDashboard();
    } catch (err) {
      notify(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Masuk';
    }
  });
}

function renderDashboard() {
  state.view = 'dashboard';
  const isAdmin = state.user.role === 'admin';
  const isDokter = state.user.role === 'dokter';
  const displayName = state.user.nama || state.user.email;

  const navItems = isAdmin
    ? [
        { id: 'dokter', icon: '👨‍⚕️', label: 'Kelola Dokter' },
        { id: 'upload', icon: '📤', label: 'Upload Gaji' },
        { id: 'slip-recap', icon: '📄', label: 'Slip Gaji' },
        { id: 'rekap-tindakan', icon: '📊', label: 'Rekap Data Tindakan' },
        { id: 'pendapatan', icon: '💰', label: 'Input Pendapatan & Potongan' },
        { id: 'slip', icon: '📋', label: 'Data Gaji Dokter' }
      ]
    : [
        { id: 'slip-recap', icon: '📄', label: 'Slip Gaji' }
      ];

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-brand">Keuan<span>gan</span></div>
        <div class="sidebar-user">
          <div class="name">${displayName}</div>
          <div class="role">${isAdmin ? 'Administrator' : 'Dokter'}</div>
        </div>
        <nav class="sidebar-nav">
          ${navItems.map(n => `
            <button class="nav-item" data-nav="${n.id}">
              <span class="icon">${n.icon}</span>
              <span>${n.label}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-logout">
          <button class="nav-item" id="btnLogout">
            <span class="icon">🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>
      <main class="main-content" id="mainContent"></main>
    </div>
  `;

  app.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      app.querySelectorAll('.nav-item[data-nav]').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      navigate(item.dataset.nav);
    });
  });

  app.querySelector('#btnLogout').addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    renderLogin();
  });

  app.querySelector('.nav-item[data-nav]').classList.add('active');
  navigate(navItems[0].id);
}

function navigate(view) {
  const main = document.getElementById('mainContent');
  switch (view) {
    case 'dokter': renderDokter(main); break;
    case 'upload': renderUpload(main); break;
    case 'slip-recap': renderSlipRecap(main); break;
    case 'rekap-tindakan': renderRekapTindakan(main); break;
    case 'pendapatan': renderPendapatan(main); break;
    case 'slip': renderSlip(main); break;
  }
}

/* ─── DOCTOR MANAGEMENT ─── */
function renderDokter(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Kelola Dokter</h2>
      <p>Daftar dokter yang terdaftar dalam sistem</p>
    </div>
    <div class="fade-in fade-in-delay-1" style="margin-bottom:20px">
      <button class="btn btn-primary" id="btnTambahDokter">+ Tambah Dokter</button>
    </div>
    <div class="card fade-in fade-in-delay-2">
      <div class="table-container">
        <table>
          <thead>
            <tr><th>NIP</th><th>Nama</th><th>Poliklinik</th><th>Email</th><th>Aksi</th></tr>
          </thead>
          <tbody id="dokterTableBody">
            <tr><td colspan="5" style="text-align:center;color:var(--slate-400);padding:32px">Memuat data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  main.querySelector('#btnTambahDokter').addEventListener('click', () => showDokterModal());

  loadDokterTable(main);
}

async function loadDokterTable(main) {
  try {
    const list = await api('/dokter');
    const tbody = main.querySelector('#dokterTableBody');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--slate-400);padding:32px">Belum ada dokter terdaftar</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(d => `
      <tr>
        <td><strong>${sanitize(d.nip)}</strong></td>
        <td>${sanitize(d.nama)}</td>
        <td>${sanitize(d.poliklinik)}</td>
        <td>${sanitize(d.email)}</td>
        <td class="table-actions">
          <button class="btn btn-danger btn-delete" data-id="${d.id}" style="padding:6px 12px;font-size:.8rem">Hapus</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus dokter ini?')) return;
        try {
          await api(`/dokter/${btn.dataset.id}`, { method: 'DELETE' });
          notify('Dokter berhasil dihapus', 'success');
          loadDokterTable(main);
        } catch (err) { notify(err.message, 'error'); }
      });
    });
  } catch (err) { notify(err.message, 'error'); }
}

function showDokterModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Tambah Dokter</h3>
      <form id="formDokter">
        <div class="form-group">
          <label for="fnip">NIP</label>
          <input type="text" id="fnip" required placeholder="Nomor Induk Pegawai">
        </div>
        <div class="form-group">
          <label for="fnama">Nama Lengkap</label>
          <input type="text" id="fnama" required placeholder="Nama dokter">
        </div>
        <div class="form-group">
          <label for="fpoli">Poliklinik</label>
          <input type="text" id="fpoli" required placeholder="Poliklinik">
        </div>
        <div class="form-group">
          <label for="femail">Email</label>
          <input type="email" id="femail" required placeholder="Email">
        </div>
        <div class="form-group">
          <label for="fpassword">Password</label>
          <input type="password" id="fpassword" required placeholder="Password">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btnCancel">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#btnCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#formDokter').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nip: overlay.querySelector('#fnip').value,
      nama: overlay.querySelector('#fnama').value,
      poliklinik: overlay.querySelector('#fpoli').value,
      email: overlay.querySelector('#femail').value,
      password: overlay.querySelector('#fpassword').value
    };
    const btn = overlay.querySelector('#formDokter .btn-primary');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/dokter', { method: 'POST', body: JSON.stringify(data) });
      notify('Dokter berhasil ditambahkan', 'success');
      overlay.remove();
      loadDokterTable(document.getElementById('mainContent'));
    } catch (err) { notify(err.message, 'error'); btn.disabled = false; btn.textContent = 'Simpan'; }
  });
}

/* ─── UPLOAD ─── */
function renderUpload(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Upload Data Gaji</h2>
      <p>Unggah file CSV atau Excel (.xls, .xlsx) berisi data gaji dokter</p>
    </div>
    <div class="card fade-in fade-in-delay-1">
      <form id="uploadForm">
        <div class="upload-zone" id="uploadZone">
          <div class="icon">📂</div>
          <p>Klik atau seret file ke sini</p>
          <p class="hint">Format: CSV, XLS, XLSX (maks 5MB)</p>
        </div>
        <input type="file" id="fileInput" accept=".csv,.xls,.xlsx" style="display:none">
        <div id="fileInfo" style="display:none;margin-top:16px;padding:12px;background:var(--emerald-50);border-radius:var(--radius-sm)">
          <p style="font-family:var(--font-heading);font-weight:600;color:var(--emerald-700)">📄 <span id="fileName"></span></p>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:20px;width:100%" id="btnUpload">Upload & Proses</button>
      </form>
    </div>
  `;

  const zone = main.querySelector('#uploadZone');
  const input = main.querySelector('#fileInput');
  const fileInfo = main.querySelector('#fileInfo');
  const fileName = main.querySelector('#fileName');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleFile(input.files[0], fileInfo, fileName);
    }
  });
  input.addEventListener('change', () => {
    if (input.files.length) handleFile(input.files[0], fileInfo, fileName);
  });

  main.querySelector('#uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.files.length) return notify('Pilih file terlebih dahulu', 'error');
    const btn = main.querySelector('#btnUpload');
    btn.disabled = true; btn.textContent = 'Memproses...';

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
      const res = await fetch(`${API}/gaji/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify(data.message, 'success');
      input.value = '';
      fileInfo.style.display = 'none';
      btn.disabled = false; btn.textContent = 'Upload & Proses';
    } catch (err) { notify(err.message, 'error'); btn.disabled = false; btn.textContent = 'Upload & Proses'; }
  });
}

function handleFile(file, infoEl, nameEl) {
  nameEl.textContent = file.name;
  infoEl.style.display = 'block';
}

/* ─── DATA GAJI DOKTER ─── */
function renderSlip(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Data Gaji Dokter</h2>
      <p>${state.user.role === 'admin' ? 'Seluruh data gaji dokter' : 'Data gaji Anda'}</p>
    </div>
    <div class="filter-bar fade-in fade-in-delay-1">
      <input type="text" id="filterNama" placeholder="Cari nama dokter..." style="max-width:220px">
      <select id="filterBulan" style="max-width:160px">
        <option value="">Semua Bulan</option>
      </select>
      <select id="filterTindakan" style="max-width:180px">
        <option value="">Semua Tindakan</option>
        <option value="ada">Ada Tindakan (&gt; 0)</option>
        <option value="tidak">Tidak Ada Tindakan (= 0)</option>
      </select>
    </div>
    <div class="slip-grid fade-in fade-in-delay-2" id="slipGrid">
      <div class="empty-state"><div class="icon">📋</div><h3>Memuat data...</h3></div>
    </div>
  `;

  const filterNama = main.querySelector('#filterNama');
  const filterBulan = main.querySelector('#filterBulan');
  const filterTindakan = main.querySelector('#filterTindakan');

  loadFilterBulan(main);

  const applyFilters = () => loadSlipData(main, filterNama.value, filterBulan.value, filterTindakan.value);
  filterNama.addEventListener('input', applyFilters);
  filterBulan.addEventListener('change', applyFilters);
  filterTindakan.addEventListener('change', applyFilters);

  loadSlipData(main, '', '', '');
}

async function loadFilterBulan(main) {
  try {
    const periodes = await api('/gaji/periode');
    const select = main.querySelector('#filterBulan');
    periodes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });
  } catch (err) { console.error(err); }
}

async function loadSlipData(main, namaFilter, bulanFilter, tindakanFilter) {
  const grid = main.querySelector('#slipGrid');
  try {
    let data = await api('/gaji/slip');

    if (namaFilter) data = data.filter(d => d.nm_dokter && d.nm_dokter.toLowerCase().includes(namaFilter.toLowerCase()));
    if (bulanFilter) data = data.filter(d => d.bulan === bulanFilter);
    if (tindakanFilter === 'ada') data = data.filter(d => d.nm_tindakan && d.nm_tindakan.trim() !== '');
    if (tindakanFilter === 'tidak') data = data.filter(d => !d.nm_tindakan || d.nm_tindakan.trim() === '');

    if (data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>Belum ada data gaji</h3><p>Silakan hubungi admin</p></div>';
      return;
    }

    grid.innerHTML = data.map((d, i) => `
      <div class="slip-card card" style="animation-delay:${Math.min(i * 0.05, 1)}s">
        <div class="slip-header">
          <div>
            <h4>${sanitize(d.nm_dokter)}</h4>
            <p style="font-size:.8rem;color:var(--slate-400)">NIP: ${sanitize(d.nip)}</p>
          </div>
          <div class="bulan">${sanitize(d.bulan)}</div>
        </div>
        <div class="slip-detail">
          <span class="label">Poliklinik</span><span class="value">${sanitize(d.poliklinik || '-')}</span>
          <span class="label">Tanggal</span><span class="value">${sanitize(d.tanggal || '-')}</span>
          <span class="label">Pasien</span><span class="value">${sanitize(d.pasien || '-')}</span>
          <span class="label">Ruangan</span><span class="value">${sanitize(d.Ruangan || '-')}</span>
          <span class="label">Pembayaran</span><span class="value">${sanitize(d.pembayaran || '-')}</span>
          <span class="label">Tindakan</span><span class="value">${sanitize(d.tindakan || '-')}</span>
          <span class="label">Tarif</span><span class="value">Rp ${Number(d.tarif).toLocaleString()}</span>
          <span class="label">OP/NON</span><span class="value">${sanitize(d.OP_NON || '-')}</span>
          <span class="label">BHP</span><span class="value">Rp ${Number(d.BHP).toLocaleString()}</span>
          <span class="label">JM Dokter</span><span class="value">Rp ${Number(d.JM_dokter).toLocaleString()}</span>
          <div class="total-row">
            <span>Total Jumlah</span>
            <span class="value">Rp ${Number(d.Jumlah).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Gagal memuat data</h3><p>${err.message}</p></div>`;
  }
}

/* ─── SLIP GAJI (REKAP) ─── */
function renderSlipRecap(main) {
  const isAdmin = state.user.role === 'admin';
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Slip Gaji</h2>
      <p>Rekap tindakan dokter berdasarkan tarif</p>
    </div>
    ${isAdmin ? `
    <div class="filter-bar fade-in fade-in-delay-1">
      <select id="recapDokter" style="max-width:300px">
        <option value="">-- Pilih Dokter --</option>
      </select>
    </div>
    ` : ''}
    <div class="fade-in fade-in-delay-1" id="recapContainer">
      <div class="empty-state"><div class="icon">📄</div><h3>${isAdmin ? 'Pilih dokter untuk melihat rekap' : 'Memuat data...'}</h3></div>
    </div>
  `;

  if (isAdmin) {
    loadDokterList(main);
  } else {
    loadSlipRecap(main, state.user.nip);
  }
}

async function loadDokterList(main) {
  try {
    const list = await api('/dokter');
    const select = main.querySelector('#recapDokter');
    list.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.nip;
      opt.textContent = `${d.nama} (${d.nip})`;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (select.value) loadSlipRecap(main, select.value);
      else main.querySelector('#recapContainer').innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Pilih dokter untuk melihat rekap</h3></div>';
    });
  } catch (err) { notify(err.message, 'error'); }
}

async function loadSlipRecap(main, nip) {
  const container = main.querySelector('#recapContainer');
  try {
    const data = await api('/gaji/slip');
    const filtered = data.filter(d => d.nip === nip && d.nm_tindakan && Number(d.tarif) > 0);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Belum ada data tindakan</h3></div>';
      return;
    }

    const groups = {};
    for (const d of filtered) {
      const tKey = d.nm_tindakan;
      if (!groups[tKey]) groups[tKey] = { polikliniks: new Set() };
      const payment = String(d.pembayaran || '').toLowerCase().includes('bpjs') ? 'BPJS KESEHATAN' : 'UMUM';
      if (!groups[tKey][payment]) groups[tKey][payment] = { tarif: Number(d.tarif), jumlah: 0 };
      groups[tKey][payment].jumlah++;
      if (d.poliklinik) groups[tKey].polikliniks.add(d.poliklinik);
    }

    let grandTotal = 0;
    let no = 0;
    let rows = '';

    for (const [tindakan, grp] of Object.entries(groups)) {
      no++;
      let tindakanTotal = 0;
      const perawatan = [...grp.polikliniks].filter(Boolean).join(', ') || '-';

      rows += `<tr class="tindakan-title">
        <td>${no}</td>
        <td><strong>${sanitize(tindakan)}</strong></td>
        <td>${sanitize(perawatan)}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`;

      for (const [payment, info] of Object.entries(grp)) {
        if (payment === 'polikliniks') continue;
        const subtotal = info.tarif * info.jumlah;
        tindakanTotal += subtotal;
        rows += `<tr class="tindakan-sub">
          <td></td>
          <td style="padding-left:32px">${sanitize(payment)}</td>
          <td></td>
          <td>Rp ${info.tarif.toLocaleString()}</td>
          <td>${info.jumlah}</td>
          <td class="value">Rp ${subtotal.toLocaleString()}</td>
        </tr>`;
      }

      grandTotal += tindakanTotal;
    }

    let pendapatanHtml = '';
    try {
      const pdData = await api(`/pendapatan/dokter/${nip}`);
      if (pdData && pdData.length > 0) {
        let sumTunjangan = 0, sumPotongan = 0;
        const pdRows = pdData.map(p => {
          const t = Number(p.tunjangan_jabatan) + Number(p.standby_kantor) + Number(p.remun_sesuai) + Number(p.fee_tim) + Number(p.tunjangan_kinerja);
          const pot = Number(p.absensi) + Number(p.bpjs_kesehatan) + Number(p.ketenagakerjaan) + Number(p.pph21) + Number(p.bumida) + Number(p.lain);
          sumTunjangan += t; sumPotongan += pot;
          return `<tr>
            <td><strong>${sanitize(p.bulan)}</strong></td>
            <td>Rp ${t.toLocaleString()}</td>
            <td>Rp ${pot.toLocaleString()}</td>
            <td class="value">Rp ${(t - pot).toLocaleString()}</td>
          </tr>`;
        }).join('');
        const totalPendapatan = grandTotal + sumTunjangan - sumPotongan;
        pendapatanHtml = `
      </div>
      <div class="card" style="margin-top:20px">
        <h4 style="margin-bottom:16px;color:var(--slate-700)">Pendapatan & Potongan</h4>
        <div class="table-container">
          <table class="recap-table">
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Total Tunjangan</th>
                <th>Total Potongan</th>
                <th>Bersih</th>
              </tr>
            </thead>
            <tbody>${pdRows}</tbody>
            <tfoot>
              <tr>
                <td><strong>Subtotal Tunjangan/Potongan</strong></td>
                <td><strong>Rp ${sumTunjangan.toLocaleString()}</strong></td>
                <td><strong>Rp ${sumPotongan.toLocaleString()}</strong></td>
                <td class="value"><strong>Rp ${(sumTunjangan - sumPotongan).toLocaleString()}</strong></td>
              </tr>
              <tr style="background:var(--emerald-50)">
                <td colspan="3"><strong>PENGHASILAN BERSIH (Total Tindakan + Tunjangan - Potongan)</strong></td>
                <td class="value" style="font-size:1.1rem"><strong>Rp ${totalPendapatan.toLocaleString()}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
      }
    } catch (e) { /* pendapatan data not available */ }

    container.innerHTML = `
      <div class="card">
        <div class="table-container">
          <table class="recap-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Tindakan</th>
                <th>Jenis Perawatan</th>
                <th>Fee Dokter</th>
                <th>Jumlah Tindakan</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"><strong>Total Keseluruhan</strong></td>
                <td class="value"><strong>Rp ${grandTotal.toLocaleString()}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      ${pendapatanHtml}
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Gagal memuat data</h3><p>${err.message}</p></div>`;
  }
}

/* ─── REKAP DATA TINDAKAN ─── */
function renderRekapTindakan(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Rekap Data Tindakan</h2>
      <p>Rekapitulasi tindakan per dokter berdasarkan jenis pembayaran</p>
    </div>
    <div class="filter-bar fade-in fade-in-delay-1">
      <select id="rekapTindakanDokter" style="max-width:300px">
        <option value="">-- Semua Dokter --</option>
      </select>
      <select id="rekapTindakanBulan" style="max-width:160px">
        <option value="">Semua Bulan</option>
      </select>
    </div>
    <div class="fade-in fade-in-delay-2" id="rekapTindakanContainer">
      <div class="empty-state"><div class="icon">📊</div><h3>Memuat data...</h3></div>
    </div>
  `;

  Promise.all([
    api('/gaji/dokter-names').then(names => {
      const select = main.querySelector('#rekapTindakanDokter');
      names.forEach(nama => {
        const opt = document.createElement('option');
        opt.value = nama;
        opt.textContent = nama;
        select.appendChild(opt);
      });
    }),
    api('/gaji/periode').then(periodes => {
      const select = main.querySelector('#rekapTindakanBulan');
      periodes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
      });
    })
  ]).then(() => {
    const fd = main.querySelector('#rekapTindakanDokter');
    const fb = main.querySelector('#rekapTindakanBulan');
    const load = () => loadRekapTindakan(main, fd.value, fb.value);
    fd.addEventListener('change', load);
    fb.addEventListener('change', load);
    load();
  });
}

async function loadRekapTindakan(main, nipFilter, bulanFilter) {
  const container = main.querySelector('#rekapTindakanContainer');
  try {
    let data = await api('/gaji/slip');

    if (nipFilter) data = data.filter(d => d.nm_dokter === nipFilter);
    if (bulanFilter) data = data.filter(d => d.bulan === bulanFilter);


    const filtered = data.filter(d => d.nm_tindakan);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📊</div><h3>Belum ada data tindakan</h3></div>';
      return;
    }

    const groups = {};
    for (const d of filtered) {
      const key = `${d.nm_dokter}|${d.nm_tindakan}`;
      if (!groups[key]) groups[key] = { dokter: d.nm_dokter, tindakan: d.nm_tindakan, bpjsTotal: 0, bpjsPending: 0, umumTotal: 0, umumPending: 0 };
      const isBpjs = String(d.pembayaran || '').toLowerCase().includes('bpjs');
      const isPending = Number(d.pending) > 0;
      if (isBpjs) {
        groups[key].bpjsTotal++;
        if (isPending) groups[key].bpjsPending++;
      } else {
        groups[key].umumTotal++;
        if (isPending) groups[key].umumPending++;
      }
    }

    const rows = Object.values(groups);
    let grandTotal = 0;
    let grandPending = 0;

    container.innerHTML = `
      <div class="card">
        <div class="table-container">
          <table class="recap-table rekap-tindakan-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Dokter</th>
                <th>Tindakan</th>
                <th>BPJS Total</th>
                <th>BPJS Pending</th>
                <th>UMUM Total</th>
                <th>UMUM Pending</th>
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => {
                const total = r.bpjsTotal + r.umumTotal;
                const pending = r.bpjsPending + r.umumPending;
                grandTotal += total;
                grandPending += pending;
                return `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${sanitize(r.dokter)}</strong></td>
                  <td>${sanitize(r.tindakan)}</td>
                  <td>${r.bpjsTotal}</td>
                  <td>${r.bpjsPending}</td>
                  <td>${r.umumTotal}</td>
                  <td>${r.umumPending}</td>
                  <td class="value">${total}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"><strong>Total Keseluruhan</strong></td>
                <td><strong>${rows.reduce((s, r) => s + r.bpjsTotal, 0)}</strong></td>
                <td><strong>${rows.reduce((s, r) => s + r.bpjsPending, 0)}</strong></td>
                <td><strong>${rows.reduce((s, r) => s + r.umumTotal, 0)}</strong></td>
                <td><strong>${rows.reduce((s, r) => s + r.umumPending, 0)}</strong></td>
                <td class="value"><strong>${grandTotal}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Gagal memuat data</h3><p>${err.message}</p></div>`;
  }
}

/* ─── PENDAPATAN & POTONGAN ─── */
function renderPendapatan(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Input Pendapatan & Potongan</h2>
      <p>Atur tunjangan dan potongan per dokter per bulan</p>
    </div>
    <div class="card fade-in fade-in-delay-1">
      <form id="formPendapatan">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
          <div style="flex:1;min-width:200px">
            <label for="fpDokter">Dokter</label>
            <select id="fpDokter" required></select>
          </div>
          <div style="flex:1;min-width:160px">
            <label for="fpBulan">Bulan</label>
            <select id="fpBulan" required></select>
          </div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--slate-700)">Tunjangan</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px">
          <div class="form-group"><label>Tunjangan Jabatan</label><input type="number" id="fpTunjab" step="1" value="0"></div>
          <div class="form-group"><label>Standby Kantor</label><input type="number" id="fpStandby" step="1" value="0"></div>
          <div class="form-group"><label>Remun Sesuai</label><input type="number" id="fpRemun" step="1" value="0"></div>
          <div class="form-group"><label>Fee TIM</label><input type="number" id="fpFeeTim" step="1" value="0"></div>
          <div class="form-group"><label>Tunjangan Kinerja</label><input type="number" id="fpTukin" step="1" value="0"></div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--slate-700)">Potongan</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px">
          <div class="form-group"><label>Potongan Absensi</label><input type="number" id="fpAbsensi" step="1" value="0"></div>
          <div class="form-group"><label>BPJS Kesehatan</label><input type="number" id="fpBpjs" step="1" value="0"></div>
          <div class="form-group"><label>Ketenagakerjaan</label><input type="number" id="fpNaker" step="1" value="0"></div>
          <div class="form-group"><label>PPH 21</label><input type="number" id="fpPph" step="1" value="0"></div>
          <div class="form-group"><label>Asuransi BUMIDA</label><input type="number" id="fpBumida" step="1" value="0"></div>
          <div class="form-group"><label>Potongan Lain</label><input type="number" id="fpLain" step="1" value="0"></div>
        </div>

        <button type="submit" class="btn btn-primary">Simpan</button>
        <span id="fpTotalInfo" style="margin-left:16px;font-family:var(--font-heading);font-weight:600;color:var(--emerald-700)"></span>
      </form>
    </div>
  `;

  const selDokter = main.querySelector('#fpDokter');
  const selBulan = main.querySelector('#fpBulan');

  Promise.all([
    api('/dokter').then(list => {
      list.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.nip;
        opt.textContent = `${d.nama} (${d.nip})`;
        selDokter.appendChild(opt);
      });
    }),
    api('/gaji/periode').then(periodes => {
      periodes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        selBulan.appendChild(opt);
      });
    })
  ]).then(() => {
    const loadData = () => {
      const nip = selDokter.value;
      const bulan = selBulan.value;
      if (nip && bulan) {
        api(`/pendapatan/${nip}/${encodeURIComponent(bulan)}`).then(data => {
          if (data) {
            main.querySelector('#fpTunjab').value = data.tunjangan_jabatan || 0;
            main.querySelector('#fpStandby').value = data.standby_kantor || 0;
            main.querySelector('#fpRemun').value = data.remun_sesuai || 0;
            main.querySelector('#fpFeeTim').value = data.fee_tim || 0;
            main.querySelector('#fpTukin').value = data.tunjangan_kinerja || 0;
            main.querySelector('#fpAbsensi').value = data.absensi || 0;
            main.querySelector('#fpBpjs').value = data.bpjs_kesehatan || 0;
            main.querySelector('#fpNaker').value = data.ketenagakerjaan || 0;
            main.querySelector('#fpPph').value = data.pph21 || 0;
            main.querySelector('#fpBumida').value = data.bumida || 0;
            main.querySelector('#fpLain').value = data.lain || 0;
          }
          updateTotal(main);
        }).catch(() => {});
      }
    };
    selDokter.addEventListener('change', loadData);
    selBulan.addEventListener('change', loadData);
    loadData();
  });

  function updateTotal(m) {
    const g = id => Number(m.querySelector(id).value) || 0;
    const tunjangan = g('#fpTunjab') + g('#fpStandby') + g('#fpRemun') + g('#fpFeeTim') + g('#fpTukin');
    const potongan = g('#fpAbsensi') + g('#fpBpjs') + g('#fpNaker') + g('#fpPph') + g('#fpBumida') + g('#fpLain');
    m.querySelector('#fpTotalInfo').textContent = `Tunjangan: Rp ${tunjangan.toLocaleString()} | Potongan: Rp ${potongan.toLocaleString()} | Bersih: Rp ${(tunjangan - potongan).toLocaleString()}`;
  }

  main.querySelectorAll('#formPendapatan input[type="number"]').forEach(inp => {
    inp.addEventListener('input', () => updateTotal(main));
  });

  main.querySelector('#formPendapatan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nipl = selDokter.value;
    const bulan = selBulan.value;
    if (!nipl || !bulan) return notify('Pilih dokter dan bulan', 'error');
    const dokter = selDokter.options[selDokter.selectedIndex].text;
    const payload = {
      nip: nipl,
      nm_dokter: dokter.split(' (')[0],
      bulan,
      tunjangan_jabatan: main.querySelector('#fpTunjab').value,
      standby_kantor: main.querySelector('#fpStandby').value,
      remun_sesuai: main.querySelector('#fpRemun').value,
      fee_tim: main.querySelector('#fpFeeTim').value,
      tunjangan_kinerja: main.querySelector('#fpTukin').value,
      absensi: main.querySelector('#fpAbsensi').value,
      bpjs_kesehatan: main.querySelector('#fpBpjs').value,
      ketenagakerjaan: main.querySelector('#fpNaker').value,
      pph21: main.querySelector('#fpPph').value,
      bumida: main.querySelector('#fpBumida').value,
      lain: main.querySelector('#fpLain').value,
    };
    const btn = e.target.querySelector('.btn');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/pendapatan', { method: 'POST', body: JSON.stringify(payload) });
      notify('Data pendapatan & potongan berhasil disimpan', 'success');
    } catch (err) { notify(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

/* ─── INIT ─── */
if (state.token && state.user) {
  renderDashboard();
} else {
  renderLogin();
}
