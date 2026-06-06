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
            <label for="identifier" id="labelIdentifier">NIP</label>
            <input type="text" id="identifier" placeholder="Masukkan NIP" required autocomplete="username">
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

  const updateIdentifierField = () => {
    const label = app.querySelector('#labelIdentifier');
    const input = app.querySelector('#identifier');
    if (selectedRole === 'admin') {
      label.textContent = 'Email';
      input.placeholder = 'Masukkan email';
      input.type = 'email';
      input.autocomplete = 'email';
    } else {
      label.textContent = 'NIP';
      input.placeholder = 'Masukkan NIP';
      input.type = 'text';
      input.autocomplete = 'username';
    }
  };

  app.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      app.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = btn.dataset.role;
      updateIdentifierField();
    });
  });

  app.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = app.querySelector('#identifier').value;
    const password = app.querySelector('#password').value;
    const btn = app.querySelector('#loginForm .btn');
    btn.disabled = true; btn.textContent = 'Memproses...';

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, role: selectedRole })
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
        { id: 'master-pendapatan', icon: '⚙️', label: 'Master Item' },
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
    case 'master-pendapatan': renderMasterPendapatan(main); break;
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
          <button class="btn btn-outline btn-edit-dokter" data-id="${d.id}" style="padding:6px 12px;font-size:.8rem">Edit</button>
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

    tbody.querySelectorAll('.btn-edit-dokter').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const dokter = list.find(d => String(d.id) === id);
          showDokterModal(dokter);
        } catch (err) { notify(err.message, 'error'); }
      });
    });
  } catch (err) { notify(err.message, 'error'); }
}

function showDokterModal(dokter) {
  const isEdit = !!dokter;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Dokter' : 'Tambah Dokter'}</h3>
      <form id="formDokter">
        <div class="form-group">
          <label for="fnip">NIP</label>
          <input type="text" id="fnip" required placeholder="Nomor Induk Pegawai" value="${isEdit ? sanitize(dokter.nip) : ''}">
        </div>
        <div class="form-group">
          <label for="fnama">Nama Lengkap</label>
          <input type="text" id="fnama" required placeholder="Nama dokter" value="${isEdit ? sanitize(dokter.nama) : ''}">
        </div>
        <div class="form-group">
          <label for="fpoli">Poliklinik</label>
          <input type="text" id="fpoli" required placeholder="Poliklinik" value="${isEdit ? sanitize(dokter.poliklinik) : ''}">
        </div>
        <div class="form-group">
          <label for="fpassword">Password ${isEdit ? '<small style="color:var(--slate-400);font-weight:400">(kosongkan jika tidak diubah)</small>' : ''}</label>
          <input type="password" id="fpassword" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '••••••••' : 'Password'}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btnCancel">Batal</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan Perubahan' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#btnCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#formDokter').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nipEl = overlay.querySelector('#fnip');
    const namaEl = overlay.querySelector('#fnama');
    const poliEl = overlay.querySelector('#fpoli');
    const passEl = overlay.querySelector('#fpassword');
    if (!nipEl || !namaEl || !poliEl || !passEl) {
      return notify('Form tidak lengkap, silakan refresh halaman', 'error');
    }
    const passwordVal = passEl.value;
    if (!isEdit && !passwordVal.trim()) {
      return notify('Password wajib diisi untuk dokter baru', 'error');
    }
    const data = {
      nip: nipEl.value.trim(),
      nama: namaEl.value.trim(),
      poliklinik: poliEl.value.trim(),
    };
    if (passwordVal.trim() !== '') data.password = passwordVal;
    const btn = overlay.querySelector('#formDokter .btn-primary');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      if (isEdit) {
        await api(`/dokter/${dokter.id}`, { method: 'PUT', body: JSON.stringify(data) });
        notify('Data dokter berhasil diperbarui', 'success');
      } else {
        data.password = passwordVal;
        await api('/dokter', { method: 'POST', body: JSON.stringify(data) });
        notify('Dokter berhasil ditambahkan', 'success');
      }
      overlay.remove();
      loadDokterTable(document.getElementById('mainContent'));
    } catch (err) { notify(err.message, 'error'); btn.disabled = false; btn.textContent = isEdit ? 'Simpan Perubahan' : 'Simpan'; }
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
        <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
          <input type="checkbox" id="chkOverride" style="width:18px;height:18px;cursor:pointer">
          <label for="chkOverride" style="margin:0;cursor:pointer;font-weight:500;color:var(--slate-700)">
            Replace data yang sudah ada jika NIP dan Periode sama (Override)
          </label>
        </div>
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

    const isOverride = main.querySelector('#chkOverride').checked;
    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
      const res = await fetch(`${API}/gaji/upload${isOverride ? '?override=true' : ''}`, {
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
      <select id="filterTahun" style="max-width:120px">
        <option value="">Semua Tahun</option>
      </select>
      <select id="filterBulan" style="max-width:160px">
        <option value="">Semua Bulan</option>
      </select>
      <div class="searchable-select" style="max-width:300px;flex:1">
        <input type="text" id="filterTindakan" placeholder="Ketik tindakan..." autocomplete="off">
        <div class="searchable-dropdown" id="filterTindakanDropdown"></div>
      </div>
    </div>
    <div class="table-responsive fade-in fade-in-delay-2" id="slipGrid">
      <div class="empty-state"><div class="icon">📋</div><h3>Memuat data...</h3></div>
    </div>
  `;

  const filterBulan = main.querySelector('#filterBulan');
  const filterTahun = main.querySelector('#filterTahun');
  window._tindakanFilter = '';

  Promise.all([
    loadFilterBulan(main),
    loadFilterTindakan(main),
    loadFilterTahun(main),
    state.user.role === 'admin' ? loadFilterDokter(main) : Promise.resolve()
  ]).then(() => {
    const applyFilters = () => {
      loadSlipData(main, window._namaFilter || '', filterBulan.value, window._tindakanFilter || '', filterTahun.value);
    };
    filterBulan.addEventListener('change', applyFilters);
    filterTahun.addEventListener('change', applyFilters);
    loadSlipData(main, '', '', '', '');
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

async function loadFilterTahun(main) {
  try {
    const tahunList = await api('/gaji/tahun');
    const select = main.querySelector('#filterTahun');
    tahunList.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    });
  } catch (err) { console.error(err); }
}

let _slipPage = 1;
const _slipPerPage = 50;
let _slipData = [];

let _pendapatanDeleter = null;
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.fp-delete');
  if (btn && _pendapatanDeleter) {
    e.preventDefault();
    e.stopPropagation();
    const tr = btn.closest('tr');
    const id = tr?.dataset?.id;
    if (id) _pendapatanDeleter(id);
  }
});

async function loadSlipData(main, namaFilter, bulanFilter, tindakanFilter, tahunFilter) {
  const grid = main.querySelector('#slipGrid');
  try {
    _slipData = await api('/gaji/slip');

    if (namaFilter) _slipData = _slipData.filter(d => d.nm_dokter === namaFilter);
    if (tahunFilter) _slipData = _slipData.filter(d => d.tahun === tahunFilter);
    if (bulanFilter) _slipData = _slipData.filter(d => d.bulan === bulanFilter);
    if (tindakanFilter) _slipData = _slipData.filter(d => d.tindakan === tindakanFilter);

    if (_slipData.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>Belum ada data gaji</h3><p>Silakan hubungi admin</p></div>';
      return;
    }

    _slipPage = 1;
    renderSlipPage(grid);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Gagal memuat data</h3><p>${err.message}</p></div>`;
  }
}

function renderSlipPage(grid) {
  const total = _slipData.length;
  const totalPages = Math.ceil(total / _slipPerPage);
  if (_slipPage > totalPages) _slipPage = totalPages;

  const start = (_slipPage - 1) * _slipPerPage;
  const page = _slipData.slice(start, start + _slipPerPage);

  let pagesHtml = '';
  if (totalPages > 1) {
    const range = 3;
    const from = Math.max(1, _slipPage - range);
    const to = Math.min(totalPages, _slipPage + range);
    pagesHtml = `<div class="pagination">
      <button class="btn-page" data-page="${_slipPage - 1}"${_slipPage <= 1 ? ' disabled' : ''}>&laquo;</button>
      ${from > 1 ? '<span class="page-dots">...</span>' : ''}
      ${Array.from({length: to - from + 1}, (_, i) => from + i).map(p =>
        `<button class="btn-page${p === _slipPage ? ' active' : ''}" data-page="${p}">${p}</button>`
      ).join('')}
      ${to < totalPages ? '<span class="page-dots">...</span>' : ''}
      <button class="btn-page" data-page="${_slipPage + 1}"${_slipPage >= totalPages ? ' disabled' : ''}>&raquo;</button>
      <span class="page-info">${total} data</span>
    </div>`;
  }

  grid.innerHTML = `
    <table class="slip-table">
      <thead>
        <tr>
          <th>Nama Dokter</th>
          <th>Tanggal</th>
          <th>Pasien</th>
          <th>Ruangan</th>
          <th>Pembayaran</th>
          <th>Tindakan</th>
          <th class="text-right">JM Dokter</th>
          ${state.user.role === 'admin' ? '<th style="width:80px;text-align:center">Aksi</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${page.map(d => `
          <tr>
            <td>
              <div class="td-name">${sanitize(d.nm_dokter)}</div>
              <div class="td-nip">${sanitize(d.nip)}</div>
            </td>
            <td>${sanitize(d.tanggal || '-')}</td>
            <td>${sanitize(d.pasien || '-')}</td>
            <td>${sanitize(d.Ruangan || '-')}</td>
            <td>${sanitize(d.pembayaran || '-')}</td>
            <td>${sanitize(d.tindakan || '-')}</td>
            <td class="text-right">Rp ${Number(d.JM_dokter).toLocaleString()}</td>
            ${state.user.role === 'admin' ? `<td style="text-align:center;white-space:nowrap">
              <button class="btn btn-sm btn-edit" data-id="${d.id}" style="padding:4px 8px;font-size:.75rem">✏️</button>
              <button class="btn btn-sm btn-delete-gaji" data-id="${d.id}" style="padding:4px 8px;font-size:.75rem;background:var(--red-500);color:#fff;border:none;border-radius:var(--radius-sm);cursor:pointer">🗑️</button>
            </td>` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${pagesHtml}`;

  grid.querySelectorAll('.btn-page:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      _slipPage = Number(btn.dataset.page);
      renderSlipPage(grid);
    });
  });

  // Event listener untuk tombol edit
  if (state.user.role === 'admin') {
    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const data = await api(`/gaji/slip/${id}`);
          showEditGajiModal(data, () => {
            loadSlipData(document.getElementById('mainContent'), window._namaFilter || '', document.getElementById('filterBulan')?.value || '', window._tindakanFilter || '');
          });
        } catch (err) { notify(err.message, 'error'); }
      });
    });

    grid.querySelectorAll('.btn-delete-gaji').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus data gaji ini?')) return;
        try {
          await api(`/gaji/${btn.dataset.id}`, { method: 'DELETE' });
          notify('Data gaji berhasil dihapus', 'success');
          loadSlipData(document.getElementById('mainContent'), window._namaFilter || '', document.getElementById('filterBulan')?.value || '', window._tindakanFilter || '');
        } catch (err) { notify(err.message, 'error'); }
      });
    });
  }
}

function showEditGajiModal(data, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:700px">
      <h3>Edit Data Gaji Dokter</h3>
      <form id="formEditGaji">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label for="egNama">Nama Dokter</label>
            <input type="text" id="egNama" value="${sanitize(data.nm_dokter || '')}" disabled>
          </div>
          <div class="form-group">
            <label for="egNip">NIP</label>
            <input type="text" id="egNip" value="${sanitize(data.nip || '')}" disabled>
          </div>
          <div class="form-group">
            <label for="egBulan">Bulan</label>
            <input type="text" id="egBulan" value="${sanitize(data.bulan || '')}">
          </div>
          <div class="form-group">
            <label for="egTahun">Tahun</label>
            <input type="text" id="egTahun" value="${sanitize(data.tahun || '')}">
          </div>
          <div class="form-group">
            <label for="egTanggal">Tanggal</label>
            <input type="text" id="egTanggal" value="${sanitize(data.tanggal || '')}">
          </div>
          <div class="form-group">
            <label for="egPoliklinik">Poliklinik</label>
            <input type="text" id="egPoliklinik" value="${sanitize(data.poliklinik || '')}">
          </div>
          <div class="form-group">
            <label for="egPasien">Pasien</label>
            <input type="text" id="egPasien" value="${sanitize(data.pasien || '')}">
          </div>
          <div class="form-group">
            <label for="egRuangan">Ruangan</label>
            <input type="text" id="egRuangan" value="${sanitize(data.Ruangan || '')}">
          </div>
          <div class="form-group">
            <label for="egPembayaran">Pembayaran</label>
            <input type="text" id="egPembayaran" value="${sanitize(data.pembayaran || '')}">
          </div>
          <div class="form-group">
            <label for="egTindakan">Tindakan</label>
            <input type="text" id="egTindakan" value="${sanitize(data.tindakan || '')}">
          </div>
          <div class="form-group">
            <label for="egTarif">Tarif</label>
            <input type="number" id="egTarif" value="${data.tarif || 0}">
          </div>
          <div class="form-group">
            <label for="egJumlah">Jumlah</label>
            <input type="number" id="egJumlah" value="${data.Jumlah || 0}">
          </div>
          <div class="form-group">
            <label for="egBHP">BHP</label>
            <input type="number" id="egBHP" value="${data.BHP || 0}">
          </div>
          <div class="form-group">
            <label for="egJM">JM Dokter</label>
            <input type="number" id="egJM" value="${data.JM_dokter || 0}">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="egTindakanNama">Nama Tindakan</label>
            <input type="text" id="egTindakanNama" value="${sanitize(data.nm_tindakan || '')}">
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btnCancelEdit">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#btnCancelEdit').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#formEditGaji').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nip: overlay.querySelector('#egNip').value,
      nm_dokter: overlay.querySelector('#egNama').value,
      bulan: overlay.querySelector('#egBulan').value,
      tahun: overlay.querySelector('#egTahun').value,
      tanggal: overlay.querySelector('#egTanggal').value,
      poliklinik: overlay.querySelector('#egPoliklinik').value,
      pasien: overlay.querySelector('#egPasien').value,
      Ruangan: overlay.querySelector('#egRuangan').value,
      pembayaran: overlay.querySelector('#egPembayaran').value,
      tindakan: overlay.querySelector('#egTindakan').value,
      tarif: overlay.querySelector('#egTarif').value,
      Jumlah: overlay.querySelector('#egJumlah').value,
      BHP: overlay.querySelector('#egBHP').value,
      JM_dokter: overlay.querySelector('#egJM').value,
      nm_tindakan: overlay.querySelector('#egTindakanNama').value,
      periode: overlay.querySelector('#egBulan').value,
      pending: 0
    };
    const btn = overlay.querySelector('#formEditGaji .btn-primary');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api(`/gaji/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      notify('Data gaji berhasil diperbarui', 'success');
      overlay.remove();
      if (onSave) onSave();
    } catch (err) { notify(err.message, 'error'); btn.disabled = false; btn.textContent = 'Simpan Perubahan'; }
  });
}
function renderSlipRecap(main) {
  const isAdmin = state.user.role === 'admin';
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Slip Gaji</h2>
      <p>Rekap tindakan dokter berdasarkan tarif</p>
    </div>
    <div class="filter-bar fade-in fade-in-delay-1">
      ${isAdmin ? '<select id="recapDokter" style="max-width:300px"><option value="">-- Pilih Dokter --</option></select>' : ''}
      <select id="recapTahun" style="max-width:120px"><option value="">-- Semua Tahun --</option></select>
      <select id="recapBulan" style="max-width:160px">
        <option value="">-- Semua Bulan --</option>
      </select>
    </div>
    <div class="fade-in fade-in-delay-1" id="recapContainer">
      <div class="empty-state"><div class="icon">📄</div><h3>${isAdmin ? 'Pilih dokter untuk melihat rekap' : 'Memuat data...'}</h3></div>
    </div>
  `;

  let allPeriodes = [];

  const loadPeriodes = () => Promise.all([
    api('/gaji/periode'),
    api('/gaji/tahun')
  ]).then(([periodes, tahunList]) => {
    allPeriodes = periodes;
    const tahunSel = main.querySelector('#recapTahun');
    tahunList.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      tahunSel.appendChild(opt);
    });
    populateBulan('');
  });

  const populateBulan = () => {
    const sel = main.querySelector('#recapBulan');
    const val = sel.value;
    sel.innerHTML = '<option value="">-- Semua Bulan --</option>';
    allPeriodes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });
    if ([...sel.options].some(o => o.value === val)) sel.value = val;
    else sel.value = '';
  };

  const getFilters = () => ({
    nip: main.querySelector('#recapDokter')?.value || state.user.nip,
    tahun: main.querySelector('#recapTahun').value,
    bulan: main.querySelector('#recapBulan').value,
  });

  const onFilter = () => {
    const f = getFilters();
    if (isAdmin && !f.nip) {
      main.querySelector('#recapContainer').innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Pilih dokter untuk melihat rekap</h3></div>';
      return;
    }
    loadSlipRecap(main, f.nip, f.bulan, f.tahun);
  };

  if (isAdmin) {
    loadPeriodes().then(() => {
      api('/dokter').then(list => {
        const sel = main.querySelector('#recapDokter');
        list.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.nip;
          opt.textContent = `${d.nama} (${d.nip})`;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', onFilter);
        main.querySelector('#recapTahun').addEventListener('change', () => {
          populateBulan(main.querySelector('#recapTahun').value);
          onFilter();
        });
        main.querySelector('#recapBulan').addEventListener('change', onFilter);
      });
    });
  } else {
    loadPeriodes().then(() => {
      main.querySelector('#recapTahun').addEventListener('change', () => {
        populateBulan(main.querySelector('#recapTahun').value);
        onFilter();
      });
      main.querySelector('#recapBulan').addEventListener('change', onFilter);
      loadSlipRecap(main, state.user.nip, '', '');
    });
  }
}

async function loadSlipRecap(main, nip, bulan, tahun) {
  const container = main.querySelector('#recapContainer');
  try {
    let data = await api('/gaji/slip');
    data = data.filter(d => d.nip === nip);
    if (tahun) data = data.filter(d => d.tahun === tahun);
    if (bulan) data = data.filter(d => d.bulan === bulan);
    data = data.filter(d => d.nm_tindakan && Number(d.tarif) > 0 && Number(d.pending) !== 1);

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
          const detail = pd.detail || [];
          const tunjItems = detail.filter(d => d.jenis === 'tunjangan');
          const potItems = detail.filter(d => d.jenis === 'potongan');
          const t = tunjItems.reduce((s, d) => s + Number(d.nilai), 0);
          const pot = potItems.reduce((s, d) => s + Number(d.nilai), 0);
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
          const tunjRows = tunjItems.map((d, i) => `
            ${i === 0 ? `<tr><td rowspan="${tunjItems.length}" style="font-weight:600;vertical-align:middle">Tunjangan</td>` : '<tr>'}
              <td>${sanitize(d.nama)}</td>
              <td style="text-align:right">Rp ${Number(d.nilai).toLocaleString()}</td>
            </tr>`).join('');
          const potRows = potItems.map((d, i) => `
            ${i === 0 ? `<tr><td rowspan="${potItems.length}" style="font-weight:600;vertical-align:middle">Potongan</td>` : '<tr>'}
              <td>${sanitize(d.nama)}</td>
              <td style="text-align:right">Rp ${Number(d.nilai).toLocaleString()}</td>
            </tr>`).join('');
          pendapatanHtml = `
        <div class="card" style="margin-top:20px">
          <div class="table-container">
            <table class="recap-table">
              <thead>
                <tr><th>Jenis</th><th>Item</th><th style="text-align:right">Nominal</th></tr>
              </thead>
              <tbody>
                ${tunjRows}
                <tr style="background:var(--slate-50)"><td></td><td style="font-weight:600">Subtotal Tunjangan</td><td style="text-align:right;font-weight:600">Rp ${t.toLocaleString()}</td></tr>
                ${potRows}
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
      <select id="rekapTindakanTahun" style="max-width:120px">
        <option value="">Semua Tahun</option>
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
    }),
    api('/gaji/tahun').then(tahunList => {
      const select = main.querySelector('#rekapTindakanTahun');
      tahunList.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        select.appendChild(opt);
      });
    })
  ]).then(() => {
    const fd = main.querySelector('#rekapTindakanDokter');
    const ft = main.querySelector('#rekapTindakanTahun');
    const fb = main.querySelector('#rekapTindakanBulan');
    const load = () => loadRekapTindakan(main, fd.value, fb.value, ft.value);
    fd.addEventListener('change', load);
    ft.addEventListener('change', load);
    fb.addEventListener('change', load);
    load();
  });
}

async function loadRekapTindakan(main, nipFilter, bulanFilter, tahunFilter) {
  const container = main.querySelector('#rekapTindakanContainer');
  try {
    let data = await api('/gaji/slip');

    if (nipFilter) data = data.filter(d => d.nm_dokter === nipFilter);
    if (tahunFilter) data = data.filter(d => d.tahun === tahunFilter);
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

/* ─── MASTER PENDAPATAN & POTONGAN ─── */
function renderMasterPendapatan(main) {
  main.innerHTML = `
    <div class="page-header fade-in">
      <h2>Master Item Pendapatan & Potongan</h2>
      <p>Atur daftar item tunjangan dan potongan yang tersedia di sistem</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="fade-in fade-in-delay-1" id="masterGrid">
      <div class="card">
        <h3 style="font-family:var(--font-heading);color:var(--emerald-700);margin-bottom:12px">💚 Tunjangan</h3>
        <form id="formAddTunjangan" style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" id="addNamaTunjangan" required placeholder="Nama item tunjangan"
            style="flex:1;padding:8px 12px;border:2px solid var(--slate-200);border-radius:var(--radius-sm);font-size:.85rem;outline:none;font-family:var(--font-body)">
          <button type="submit" class="btn btn-primary" style="padding:8px 16px;font-size:.85rem;white-space:nowrap">+ Tambah</button>
        </form>
        <div class="table-container">
          <table>
            <thead><tr><th style="width:50px">#</th><th>Nama Item</th><th style="width:80px;text-align:center">Aksi</th></tr></thead>
            <tbody id="tbodyTunjangan"><tr><td colspan="3" style="text-align:center;color:var(--slate-400);padding:24px">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <h3 style="font-family:var(--font-heading);color:var(--rose-700);margin-bottom:12px">🔴 Potongan</h3>
        <form id="formAddPotongan" style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" id="addNamaPotongan" required placeholder="Nama item potongan"
            style="flex:1;padding:8px 12px;border:2px solid var(--slate-200);border-radius:var(--radius-sm);font-size:.85rem;outline:none;font-family:var(--font-body)">
          <button type="submit" class="btn btn-primary" style="padding:8px 16px;font-size:.85rem;white-space:nowrap">+ Tambah</button>
        </form>
        <div class="table-container">
          <table>
            <thead><tr><th style="width:50px">#</th><th>Nama Item</th><th style="width:80px;text-align:center">Aksi</th></tr></thead>
            <tbody id="tbodyPotongan"><tr><td colspan="3" style="text-align:center;color:var(--slate-400);padding:24px">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  loadMasterItems(main);

  main.querySelector('#formAddTunjangan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = main.querySelector('#addNamaTunjangan').value.trim();
    if (!nama) return;
    try {
      await api('/pendapatan/master-items', { method: 'POST', body: JSON.stringify({ nama, jenis: 'tunjangan' }) });
      main.querySelector('#addNamaTunjangan').value = '';
      notify('Item tunjangan berhasil ditambahkan', 'success');
      loadMasterItems(main);
    } catch (err) { notify(err.message, 'error'); }
  });

  main.querySelector('#formAddPotongan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = main.querySelector('#addNamaPotongan').value.trim();
    if (!nama) return;
    try {
      await api('/pendapatan/master-items', { method: 'POST', body: JSON.stringify({ nama, jenis: 'potongan' }) });
      main.querySelector('#addNamaPotongan').value = '';
      notify('Item potongan berhasil ditambahkan', 'success');
      loadMasterItems(main);
    } catch (err) { notify(err.message, 'error'); }
  });
}

async function loadMasterItems(main) {
  try {
    const items = await api('/pendapatan/master-items');
    const tun = items.filter(i => i.jenis === 'tunjangan');
    const pot = items.filter(i => i.jenis === 'potongan');

    const renderRows = (list) => list.length === 0
      ? '<tr><td colspan="3" style="text-align:center;color:var(--slate-400);padding:24px">Belum ada item</td></tr>'
      : list.map((it, idx) => `
        <tr>
          <td style="color:var(--slate-400)">${idx + 1}</td>
          <td><strong>${sanitize(it.nama)}</strong></td>
          <td style="text-align:center">
            <button class="btn btn-danger btn-delete-master" data-id="${it.id}" data-nama="${sanitize(it.nama)}" style="padding:4px 10px;font-size:.75rem">Hapus</button>
          </td>
        </tr>
      `).join('');

    main.querySelector('#tbodyTunjangan').innerHTML = renderRows(tun);
    main.querySelector('#tbodyPotongan').innerHTML = renderRows(pot);

    main.querySelectorAll('.btn-delete-master').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nama = btn.dataset.nama;
        if (!confirm(`Hapus item "${nama}"? Item yang sudah tersimpan di slip dokter tidak akan terhapus, hanya master item ini saja.`)) return;
        try {
          await api(`/pendapatan/master-items/${id}`, { method: 'DELETE' });
          notify('Item berhasil dihapus', 'success');
          loadMasterItems(main);
        } catch (err) { notify(err.message, 'error'); }
      });
    });
  } catch (err) { notify(err.message, 'error'); }
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

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  async function renderManualForm() {
    const [defaultItems, dokterList, periodes, tahunList] = await Promise.all([
      api('/pendapatan/master-items'),
      api('/dokter'),
      api('/gaji/periode'),
      api('/gaji/tahun')
    ]);

    let rows = defaultItems.map(i => ({ jenis: i.jenis, nama: i.nama, nilai: 0 }));

    function rowHtml(r) {
      const id = r._id || Math.random().toString(36).slice(2);
      return `<tr data-id="${id}">
        <td>
          <select id="fp-jenis-${id}" name="fp-jenis-${id}" class="fp-jenis" style="width:120px;padding:8px 10px;border:2px solid var(--slate-200);border-radius:var(--radius-sm);font-size:.85rem;outline:none;font-family:var(--font-body);background:#fff">
            <option value="tunjangan"${r.jenis === 'tunjangan' ? ' selected' : ''}>Tunjangan</option>
            <option value="potongan"${r.jenis === 'potongan' ? ' selected' : ''}>Potongan</option>
          </select>
        </td>
        <td><input type="text" id="fp-item-${id}" name="fp-item-${id}" class="fp-item" value="${sanitize(r.nama)}" style="width:100%;min-width:160px;padding:8px 12px;border:2px solid var(--slate-200);border-radius:var(--radius-sm);font-size:.85rem;outline:none;font-family:var(--font-body)"></td>
        <td style="text-align:right"><input type="number" id="fp-nilai-${id}" name="fp-nilai-${id}" class="fp-nilai" step="1" value="${r.nilai}" style="width:160px;padding:8px 12px;border:2px solid var(--slate-200);border-radius:var(--radius-sm);font-size:.85rem;text-align:right;font-family:var(--font-heading);outline:none"></td>
        <td style="text-align:center"><button type="button" id="fp-del-${id}" class="fp-delete" style="background:none;border:none;color:var(--slate-400);cursor:pointer;font-size:1.2rem;line-height:1;padding:4px 6px">&times;</button></td>
      </tr>`;
    }

    function renderTable() {
      let tunjangan = 0, potongan = 0;
      for (const r of rows) {
        if (r.jenis === 'tunjangan') tunjangan += r.nilai;
        else potongan += r.nilai;
      }
      const tbody = content.querySelector('#fpTableBody');
      if (tbody) tbody.innerHTML = rows.map(rowHtml).join('');
      const st = content.querySelector('#subtotalTunjangan');
      const sp = content.querySelector('#subtotalPotongan');
      const tt = content.querySelector('#totalBersih');
      if (st) st.textContent = `Rp ${tunjangan.toLocaleString()}`;
      if (sp) sp.textContent = `Rp ${potongan.toLocaleString()}`;
      if (tt) tt.textContent = `Rp ${(tunjangan - potongan).toLocaleString()}`;
      attachRowEvents();
    }

    _pendapatanDeleter = (id) => {
      rows = rows.filter(r => r._id !== id);
      renderTable();
    };

    function attachRowEvents() {
      content.querySelectorAll('.fp-nilai, .fp-jenis').forEach(el => {
        el.addEventListener('change', () => {
          const tr = el.closest('tr');
          const id = tr.dataset.id;
          const row = rows.find(r => r._id === id);
          if (row) {
            row.jenis = tr.querySelector('.fp-jenis').value;
            row.nilai = Number(tr.querySelector('.fp-nilai').value) || 0;
            renderTable();
          }
        });
        el.addEventListener('input', () => {
          if (el.classList.contains('fp-nilai')) {
            const tr = el.closest('tr');
            const id = tr.dataset.id;
            const row = rows.find(r => r._id === id);
            if (row) {
              row.nilai = Number(el.value) || 0;
              renderTable();
            }
          }
        });
      });
      content.querySelectorAll('.fp-item').forEach(el => {
        el.addEventListener('change', () => {
          const tr = el.closest('tr');
          const id = tr.dataset.id;
          const row = rows.find(r => r._id === id);
          if (row) row.nama = el.value;
        });
      });
    }

    function syncRowsFromDOM() {
      rows = [];
      content.querySelectorAll('#fpTableBody tr').forEach(tr => {
        const jenis = tr.querySelector('.fp-jenis').value;
        const nama = tr.querySelector('.fp-item').value.trim();
        const nilai = Number(tr.querySelector('.fp-nilai').value) || 0;
        if (nama) rows.push({ _id: tr.dataset.id, jenis, nama, nilai });
      });
    }

    content.innerHTML = `
      <div class="card">
        <style>.fp-jenis:focus,.fp-item:focus,.fp-nilai:focus { border-color:var(--emerald-500) !important; box-shadow:0 0 0 3px rgba(16,185,129,.15) !important; }</style>
        <form id="formPendapatan">
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
            <div style="flex:1;min-width:200px">
              <label for="fpDokter">Dokter</label>
              <select id="fpDokter" required></select>
            </div>
            <div style="flex:1;min-width:120px">
              <label for="fpTahun">Tahun</label>
              <select id="fpTahun"><option value="">-- Semua --</option></select>
            </div>
            <div style="flex:1;min-width:160px">
              <label for="fpBulan">Bulan</label>
              <select id="fpBulan" required></select>
            </div>
          </div>

          <div class="table-container" style="margin-bottom:16px">
            <table class="recap-table" style="text-align:left">
              <thead>
                <tr><th style="text-align:left;width:130px">Jenis</th><th style="text-align:left">Item</th><th style="text-align:right;width:220px">Nominal</th><th style="width:40px"></th></tr>
              </thead>
              <tbody id="fpTableBody">
                ${rows.map(r => { r._id = Math.random().toString(36).slice(2); return rowHtml(r); }).join('')}
              </tbody>
              <tfoot>
                <tr class="subtotal-row"><td></td><td style="font-weight:600">Subtotal Tunjangan</td><td id="subtotalTunjangan" style="text-align:right;font-weight:600;font-family:var(--font-heading);color:var(--emerald-700)">Rp 0</td><td></td></tr>
                <tr class="subtotal-row"><td></td><td style="font-weight:600">Subtotal Potongan</td><td id="subtotalPotongan" style="text-align:right;font-weight:600;font-family:var(--font-heading);color:#dc2626">Rp 0</td><td></td></tr>
                <tr style="background:var(--emerald-600);color:#fff">
                  <td colspan="2" style="font-weight:800;font-family:var(--font-heading);font-size:1rem">TOTAL BERSIH</td>
                  <td id="totalBersih" style="text-align:right;font-weight:800;font-family:var(--font-heading);font-size:1rem">Rp 0</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-outline" id="addRowBtn">+ Tambah Baris</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    `;

    const selDokter = content.querySelector('#fpDokter');
    const selBulan = content.querySelector('#fpBulan');
    const selTahun = content.querySelector('#fpTahun');

    dokterList.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.nip;
      opt.textContent = `${d.nama} (${d.nip})`;
      selDokter.appendChild(opt);
    });
    tahunList.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      selTahun.appendChild(opt);
    });
    periodes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      selBulan.appendChild(opt);
    });

    attachRowEvents();
    renderTable();

    content.querySelector('#addRowBtn').addEventListener('click', () => {
      rows.push({ _id: Math.random().toString(36).slice(2), jenis: 'tunjangan', nama: '', nilai: 0 });
      renderTable();
    });

    const loadData = () => {
      const nip = selDokter.value;
      const bulan = selBulan.value;
      if (nip && bulan) {
        api(`/pendapatan/${nip}/${encodeURIComponent(bulan)}`).then(data => {
          if (data && data.detail && data.detail.length) {
            rows = data.detail.map(d => ({ _id: Math.random().toString(36).slice(2), jenis: d.jenis, nama: d.nama, nilai: Number(d.nilai) || 0 }));
          } else {
            rows = defaultItems.map(i => ({ _id: Math.random().toString(36).slice(2), jenis: i.jenis, nama: i.nama, nilai: 0 }));
          }
          renderTable();
        }).catch(() => {});
      }
    };

    selDokter.addEventListener('change', loadData);
    selBulan.addEventListener('change', loadData);
    loadData();

    content.querySelector('#formPendapatan').addEventListener('submit', async (e) => {
      e.preventDefault();
      syncRowsFromDOM();
      const nip = selDokter.value;
      const bulan = selBulan.value;
      if (!nip || !bulan) return notify('Pilih dokter dan bulan', 'error');
      const dokter = selDokter.options[selDokter.selectedIndex].text;
      const detail = rows.filter(r => r.nama.trim()).map(r => ({ nama: r.nama.trim(), jenis: r.jenis, nilai: r.nilai }));
      const payload = { nip, nm_dokter: dokter.split(' (')[0], bulan, detail };
      const btn = e.target.querySelector('.btn-primary');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        await api('/pendapatan', { method: 'POST', body: JSON.stringify(payload) });
        notify('Data pendapatan & potongan berhasil disimpan', 'success');
      } catch (err) { notify(err.message, 'error'); }
      btn.disabled = false; btn.textContent = 'Simpan';
    });
  }

  async function renderUploadForm() {
    let items = await api('/pendapatan/master-items');
    let cols = ['nip', 'nm_dokter', 'bulan', ...items.map(i => i.nama)];
    let sample = ['123456', 'Dr. Contoh', 'Januari 2026', ...items.map(() => '0')];

    function renderTemplateInfo() {
      const code = content.querySelector('#colsList');
      if (code) code.textContent = cols.join(', ');
    }

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
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="color:var(--slate-800)">Format kolom yang didukung:</strong>
            <button type="button" class="btn btn-outline" id="btnRefreshTemplate" style="padding:4px 12px;font-size:.75rem" title="Muat ulang daftar master item">↻ Segarkan</button>
          </div>
          <code id="colsList">${cols.join(', ')}</code>
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

    content.querySelector('#btnRefreshTemplate').addEventListener('click', async () => {
      const btn = content.querySelector('#btnRefreshTemplate');
      btn.disabled = true; btn.textContent = 'Memuat...';
      try {
        items = await api('/pendapatan/master-items');
        cols = ['nip', 'nm_dokter', 'bulan', ...items.map(i => i.nama)];
        sample = ['123456', 'Dr. Contoh', 'Januari 2026', ...items.map(() => '0')];
        renderTemplateInfo();
        notify('Template diperbarui', 'success');
      } catch (err) { notify(err.message, 'error'); }
      btn.disabled = false; btn.textContent = '↻ Segarkan';
    });

    content.querySelector('#btnDownloadTemplate').addEventListener('click', () => {
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

  function renderMode() {
    if (currentMode === 'manual') {
      renderManualForm();
    } else {
      renderUploadForm();
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
