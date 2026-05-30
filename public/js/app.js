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
      <div style="margin-top:20px;padding:16px;background:var(--slate-50);border-radius:var(--radius-sm);font-size:.85rem;color:var(--slate-600)">
        <strong style="color:var(--slate-800)">Format kolom yang didukung:</strong><br>
        <code>nip, nm_dokter, bulan, tanggal, poliklinik, pasien, Ruangan, pembayaran, tindakan, tarif, OP_NON, Jumlah, BHP, JM_dokter</code>
        <button type="button" class="btn btn-outline" style="margin-top:12px" id="btnDownloadTemplateGaji">Download Contoh CSV</button>
      </div>
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

  main.querySelector('#btnDownloadTemplateGaji').addEventListener('click', () => {
    const cols = ['nip','nm_dokter','bulan','tanggal','poliklinik','pasien','Ruangan','pembayaran','tindakan','tarif','OP_NON','Jumlah','BHP','JM_dokter'];
    const sample = ['123456','Dr. Contoh','Januari 2026','01/01/2026','Poli Umum','10','Ruang 1','BPJS','Tindakan A','150000','OP','500000','50000','250000'];
    const csv = cols.join(',') + '\n' + sample.join(',') + '\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template_gaji.csv';
    a.click();
    URL.revokeObjectURL(a.href);
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
      ${state.user.role === 'admin' ? `
      <div class="searchable-select" style="max-width:300px;flex:1">
        <input type="text" id="filterNama" placeholder="Ketik nama dokter..." autocomplete="off">
        <div class="searchable-dropdown" id="filterNamaDropdown"></div>
      </div>` : ''}
      <select id="filterBulan" style="max-width:160px">
        <option value="">Semua Bulan</option>
      </select>
      <div class="searchable-select" style="max-width:300px;flex:1">
        <input type="text" id="filterTindakan" placeholder="Ketik tindakan..." autocomplete="off">
        <div class="searchable-dropdown" id="filterTindakanDropdown"></div>
      </div>
    </div>
    <div class="slip-grid fade-in fade-in-delay-2" id="slipGrid">
      <div class="empty-state"><div class="icon">📋</div><h3>Memuat data...</h3></div>
    </div>
  `;

  const filterBulan = main.querySelector('#filterBulan');
  window._tindakanFilter = '';

  Promise.all([
    loadFilterBulan(main),
    loadFilterTindakan(main),
    state.user.role === 'admin' ? loadFilterDokter(main) : Promise.resolve()
  ]).then(() => {
    filterBulan.addEventListener('change', () => {
      loadSlipData(main, window._namaFilter || '', filterBulan.value, window._tindakanFilter || '');
    });
    loadSlipData(main, '', '', '');
  });
}

function initSearchableSelect(inputId, dropdownId, items, onSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;
  let selectedValue = '';

  const render = (filter) => {
    const filtered = items.filter(item => !filter || item.label.toLowerCase().includes(filter.toLowerCase()));
    dropdown.innerHTML = filtered.map((item, i) =>
      `<div class="s-item${item.value === selectedValue ? ' active' : ''}" data-value="${item.value}">${item.label}</div>`
    ).join('');
    dropdown.classList.toggle('open', filtered.length > 0);

    dropdown.querySelectorAll('.s-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedValue = el.dataset.value;
        input.value = items.find(i => i.value === selectedValue)?.label || '';
        dropdown.classList.remove('open');
        onSelect(selectedValue);
      });
    });
  };

  input.addEventListener('focus', () => render(input.value));
  input.addEventListener('input', () => {
    selectedValue = '';
    render(input.value);
  });
  input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 200));

  document.addEventListener('click', (e) => {
    if (!input.closest('.searchable-select')?.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  return { setValue: (v) => { selectedValue = v; input.value = items.find(i => i.value === v)?.label || ''; } };
}

async function loadFilterDokter(main) {
  try {
    const list = await api('/dokter');
    const input = main.querySelector('#filterNama');
    if (!input) return;
    const items = list.map(d => ({ value: d.nama, label: `${d.nama} (${d.nip})` }));
    items.unshift({ value: '', label: '-- Semua Dokter --' });
    initSearchableSelect('filterNama', 'filterNamaDropdown', items, (val) => {
      window._namaFilter = val;
      loadSlipData(main, val, main.querySelector('#filterBulan')?.value || '', window._tindakanFilter || '');
    });
  } catch (err) { console.error(err); }
}

async function loadFilterTindakan(main) {
  try {
    const list = await api('/gaji/tindakan-list');
    const items = list.map(t => ({ value: t, label: t }));
    items.unshift({ value: '', label: '-- Semua Tindakan --' });
    initSearchableSelect('filterTindakan', 'filterTindakanDropdown', items, (val) => {
      window._tindakanFilter = val;
      loadSlipData(main, main.querySelector('#filterNama')?.value || '', main.querySelector('#filterBulan')?.value || '', val);
    });
  } catch (err) { console.error(err); }
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

    if (namaFilter) data = data.filter(d => d.nm_dokter === namaFilter);
    if (bulanFilter) data = data.filter(d => d.bulan === bulanFilter);
    if (tindakanFilter) data = data.filter(d => d.tindakan === tindakanFilter);

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
    <div class="filter-bar fade-in fade-in-delay-1">
      ${isAdmin ? '<select id="recapDokter" style="max-width:300px"><option value="">-- Pilih Dokter --</option></select>' : ''}
      <select id="recapBulan" style="max-width:160px">
        <option value="">-- Semua Bulan --</option>
      </select>
    </div>
    <div class="fade-in fade-in-delay-1" id="recapContainer">
      <div class="empty-state"><div class="icon">📄</div><h3>${isAdmin ? 'Pilih dokter untuk melihat rekap' : 'Memuat data...'}</h3></div>
    </div>
  `;

  const loadBulan = () => api('/gaji/periode').then(periodes => {
    const sel = main.querySelector('#recapBulan');
    periodes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });
  });

  const getFilters = () => ({
    nip: main.querySelector('#recapDokter')?.value || state.user.nip,
    bulan: main.querySelector('#recapBulan').value,
  });

  const onFilter = () => {
    const f = getFilters();
    if (isAdmin && !f.nip) {
      main.querySelector('#recapContainer').innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Pilih dokter untuk melihat rekap</h3></div>';
      return;
    }
    loadSlipRecap(main, f.nip, f.bulan);
  };

  if (isAdmin) {
    loadBulan().then(() => {
      api('/dokter').then(list => {
        const sel = main.querySelector('#recapDokter');
        list.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.nip;
          opt.textContent = `${d.nama} (${d.nip})`;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', onFilter);
        main.querySelector('#recapBulan').addEventListener('change', onFilter);
      });
    });
  } else {
    loadBulan().then(() => {
      main.querySelector('#recapBulan').addEventListener('change', onFilter);
      loadSlipRecap(main, state.user.nip, '');
    });
  }
}

async function loadSlipRecap(main, nip, bulan) {
  const container = main.querySelector('#recapContainer');
  try {
    let data = await api('/gaji/slip');
    data = data.filter(d => d.nip === nip);
    if (bulan) data = data.filter(d => d.bulan === bulan);
    data = data.filter(d => d.nm_tindakan && Number(d.tarif) > 0);

    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Belum ada data tindakan</h3></div>';
      return;
    }

    const groups = {};
    for (const d of data) {
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

    let summaryCards = '';
    let pendapatanHtml = '';
    if (bulan) {
      try {
        const pd = await api(`/pendapatan/${nip}/${encodeURIComponent(bulan)}`);
        if (pd) {
          const t = Number(pd.tunjangan_jabatan) + Number(pd.standby_kantor) + Number(pd.remun_sesuai) + Number(pd.fee_tim) + Number(pd.tunjangan_kinerja);
          const pot = Number(pd.absensi) + Number(pd.bpjs_kesehatan) + Number(pd.ketenagakerjaan) + Number(pd.pph21) + Number(pd.bumida) + Number(pd.lain);
          const totalPendapatan = grandTotal + t - pot;
          summaryCards = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
          <div style="background:var(--emerald-50);padding:16px;border-radius:var(--radius-sm)">
            <div style="font-size:.8rem;color:var(--slate-500)">Total Tindakan</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:1.2rem;color:var(--emerald-700)">Rp ${grandTotal.toLocaleString()}</div>
          </div>
          <div style="background:var(--gold-100);padding:16px;border-radius:var(--radius-sm)">
            <div style="font-size:.8rem;color:var(--slate-500)">Total Tunjangan</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:1.2rem;color:var(--gold-600)">Rp ${t.toLocaleString()}</div>
          </div>
          <div style="background:#fef2f2;padding:16px;border-radius:var(--radius-sm)">
            <div style="font-size:.8rem;color:var(--slate-500)">Total Potongan</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:1.2rem;color:#dc2626">Rp ${pot.toLocaleString()}</div>
          </div>
          <div style="background:var(--emerald-600);padding:16px;border-radius:var(--radius-sm);color:#fff">
            <div style="font-size:.8rem;opacity:.8">Penghasilan Bersih</div>
            <div style="font-family:var(--font-heading);font-weight:800;font-size:1.2rem">Rp ${totalPendapatan.toLocaleString()}</div>
          </div>
        </div>`;
          pendapatanHtml = `
        <div class="card" style="margin-top:20px">
          <div class="table-container">
            <table class="recap-table">
              <thead>
                <tr><th>Jenis</th><th>Item</th><th style="text-align:right">Nominal</th></tr>
              </thead>
              <tbody>
                <tr><td rowspan="5" style="font-weight:600;vertical-align:middle">Tunjangan</td><td>Tunjangan Jabatan</td><td style="text-align:right">Rp ${Number(pd.tunjangan_jabatan).toLocaleString()}</td></tr>
                <tr><td>Standby Kantor</td><td style="text-align:right">Rp ${Number(pd.standby_kantor).toLocaleString()}</td></tr>
                <tr><td>Remun Sesuai</td><td style="text-align:right">Rp ${Number(pd.remun_sesuai).toLocaleString()}</td></tr>
                <tr><td>Fee TIM</td><td style="text-align:right">Rp ${Number(pd.fee_tim).toLocaleString()}</td></tr>
                <tr><td>Tunjangan Kinerja</td><td style="text-align:right">Rp ${Number(pd.tunjangan_kinerja).toLocaleString()}</td></tr>
                <tr style="background:var(--slate-50)"><td></td><td style="font-weight:600">Subtotal Tunjangan</td><td style="text-align:right;font-weight:600">Rp ${t.toLocaleString()}</td></tr>
                <tr><td rowspan="6" style="font-weight:600;vertical-align:middle">Potongan</td><td>Potongan Absensi</td><td style="text-align:right">Rp ${Number(pd.absensi).toLocaleString()}</td></tr>
                <tr><td>BPJS Kesehatan</td><td style="text-align:right">Rp ${Number(pd.bpjs_kesehatan).toLocaleString()}</td></tr>
                <tr><td>Ketenagakerjaan</td><td style="text-align:right">Rp ${Number(pd.ketenagakerjaan).toLocaleString()}</td></tr>
                <tr><td>PPH 21</td><td style="text-align:right">Rp ${Number(pd.pph21).toLocaleString()}</td></tr>
                <tr><td>Asuransi BUMIDA</td><td style="text-align:right">Rp ${Number(pd.bumida).toLocaleString()}</td></tr>
                <tr><td>Potongan Lain</td><td style="text-align:right">Rp ${Number(pd.lain).toLocaleString()}</td></tr>
                <tr style="background:var(--slate-50)"><td></td><td style="font-weight:600">Subtotal Potongan</td><td style="text-align:right;font-weight:600">Rp ${pot.toLocaleString()}</td></tr>
                <tr style="background:var(--emerald-600);color:#fff">
                  <td colspan="2" style="font-weight:800;font-family:var(--font-heading)">PENGHASILAN BERSIH</td>
                  <td style="text-align:right;font-weight:800;font-family:var(--font-heading);font-size:1.1rem">Rp ${totalPendapatan.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>`;
        }
      } catch (e) { /* no pendapatan data for this month */ }
    }

    container.innerHTML = `
      ${summaryCards}
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
                <td colspan="5"><strong>${bulan ? sanitize(bulan) : 'Total Keseluruhan'}</strong></td>
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
    <div class="fade-in fade-in-delay-1" style="margin-bottom:20px">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary mode-btn active" data-mode="manual">Input Manual</button>
        <button class="btn btn-outline mode-btn" data-mode="upload">Upload File</button>
      </div>
    </div>
    <div id="pendapatanContent"></div>
  `;

  const content = main.querySelector('#pendapatanContent');
  let currentMode = 'manual';

  main.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('.mode-btn').forEach(b => {
        b.className = 'btn btn-outline mode-btn';
      });
      btn.className = 'btn btn-primary mode-btn active';
      currentMode = btn.dataset.mode;
      renderMode();
    });
  });

  function renderMode() {
    if (currentMode === 'manual') {
      content.innerHTML = `
        <div class="card">
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

      const selDokter = content.querySelector('#fpDokter');
      const selBulan = content.querySelector('#fpBulan');

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
                content.querySelector('#fpTunjab').value = data.tunjangan_jabatan || 0;
                content.querySelector('#fpStandby').value = data.standby_kantor || 0;
                content.querySelector('#fpRemun').value = data.remun_sesuai || 0;
                content.querySelector('#fpFeeTim').value = data.fee_tim || 0;
                content.querySelector('#fpTukin').value = data.tunjangan_kinerja || 0;
                content.querySelector('#fpAbsensi').value = data.absensi || 0;
                content.querySelector('#fpBpjs').value = data.bpjs_kesehatan || 0;
                content.querySelector('#fpNaker').value = data.ketenagakerjaan || 0;
                content.querySelector('#fpPph').value = data.pph21 || 0;
                content.querySelector('#fpBumida').value = data.bumida || 0;
                content.querySelector('#fpLain').value = data.lain || 0;
              }
              updateTotal(content);
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

      content.querySelectorAll('#formPendapatan input[type="number"]').forEach(inp => {
        inp.addEventListener('input', () => updateTotal(content));
      });

      content.querySelector('#formPendapatan').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nipl = selDokter.value;
        const bulan = selBulan.value;
        if (!nipl || !bulan) return notify('Pilih dokter dan bulan', 'error');
        const dokter = selDokter.options[selDokter.selectedIndex].text;
        const payload = {
          nip: nipl,
          nm_dokter: dokter.split(' (')[0],
          bulan,
          tunjangan_jabatan: content.querySelector('#fpTunjab').value,
          standby_kantor: content.querySelector('#fpStandby').value,
          remun_sesuai: content.querySelector('#fpRemun').value,
          fee_tim: content.querySelector('#fpFeeTim').value,
          tunjangan_kinerja: content.querySelector('#fpTukin').value,
          absensi: content.querySelector('#fpAbsensi').value,
          bpjs_kesehatan: content.querySelector('#fpBpjs').value,
          ketenagakerjaan: content.querySelector('#fpNaker').value,
          pph21: content.querySelector('#fpPph').value,
          bumida: content.querySelector('#fpBumida').value,
          lain: content.querySelector('#fpLain').value,
        };
        const btn = e.target.querySelector('.btn');
        btn.disabled = true; btn.textContent = 'Menyimpan...';
        try {
          await api('/pendapatan', { method: 'POST', body: JSON.stringify(payload) });
          notify('Data pendapatan & potongan berhasil disimpan', 'success');
        } catch (err) { notify(err.message, 'error'); }
        btn.disabled = false; btn.textContent = 'Simpan';
      });
    } else {
      content.innerHTML = `
        <div class="card">
          <form id="uploadFormPendapatan">
            <div class="upload-zone" id="uploadZonePendapatan">
              <div class="icon">📂</div>
              <p>Klik atau seret file ke sini</p>
              <p class="hint">Format: CSV, XLS, XLSX (maks 5MB)</p>
            </div>
            <input type="file" id="fileInputPendapatan" accept=".csv,.xls,.xlsx" style="display:none">
            <div id="fileInfoPendapatan" style="display:none;margin-top:16px;padding:12px;background:var(--emerald-50);border-radius:var(--radius-sm)">
              <p style="font-family:var(--font-heading);font-weight:600;color:var(--emerald-700)">📄 <span id="fileNamePendapatan"></span></p>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:20px;width:100%" id="btnUploadPendapatan">Upload & Proses</button>
          </form>
          <div style="margin-top:20px;padding:16px;background:var(--slate-50);border-radius:var(--radius-sm);font-size:.85rem;color:var(--slate-600)">
            <strong style="color:var(--slate-800)">Format kolom yang didukung:</strong><br>
            <code>nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain</code>
            <button type="button" class="btn btn-outline" style="margin-top:12px" id="btnDownloadTemplate">Download Contoh CSV</button>
          </div>
        </div>
      `;

      const zone = content.querySelector('#uploadZonePendapatan');
      const input = content.querySelector('#fileInputPendapatan');
      const fileInfo = content.querySelector('#fileInfoPendapatan');
      const fileName = content.querySelector('#fileNamePendapatan');

      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          input.files = e.dataTransfer.files;
          fileName.textContent = input.files[0].name;
          fileInfo.style.display = 'block';
        }
      });
      input.addEventListener('change', () => {
        if (input.files.length) {
          fileName.textContent = input.files[0].name;
          fileInfo.style.display = 'block';
        }
      });

      content.querySelector('#btnDownloadTemplate').addEventListener('click', () => {
        const cols = ['nip','nm_dokter','bulan','tunjangan_jabatan','standby_kantor','remun_sesuai','fee_tim','tunjangan_kinerja','absensi','bpjs_kesehatan','ketenagakerjaan','pph21','bumida','lain'];
        const sample = ['123456','Dr. Contoh','Januari 2026','500000','300000','1000000','200000','750000','0','150000','200000','250000','100000','0'];
        const csv = cols.join(',') + '\n' + sample.join(',') + '\n';
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'template_pendapatan.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      content.querySelector('#uploadFormPendapatan').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!input.files.length) return notify('Pilih file terlebih dahulu', 'error');
        const btn = content.querySelector('#btnUploadPendapatan');
        btn.disabled = true; btn.textContent = 'Memproses...';

        const formData = new FormData();
        formData.append('file', input.files[0]);

        try {
          const res = await fetch(`${API}/pendapatan/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          notify(data.message, 'success');
          input.value = '';
          fileInfo.style.display = 'none';
        } catch (err) { notify(err.message, 'error'); }
        btn.disabled = false; btn.textContent = 'Upload & Proses';
      });
    }
  }

  renderMode();
}

/* ─── INIT ─── */
if (state.token && state.user) {
  renderDashboard();
} else {
  renderLogin();
}
