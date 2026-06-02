const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const { getDb } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xls', '.xlsx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus CSV, XLS, atau XLSX'));
    }
  }
});

router.use(authenticate);

function parseIdr(v) {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(String(v).replace(/\./g, ''));
  return isNaN(n) ? 0 : n;
}

function normalizeName(name) {
  return String(name).toLowerCase().replace(/[\s_]+/g, '');
}

const FIXED_COLUMN_MAP = {
  tunjangan_jabatan: { nama: 'Tunjangan Jabatan', jenis: 'tunjangan' },
  standby_kantor: { nama: 'Standby Kantor', jenis: 'tunjangan' },
  remun_sesuai: { nama: 'Remun Sesuai', jenis: 'tunjangan' },
  fee_tim: { nama: 'Fee TIM', jenis: 'tunjangan' },
  tunjangan_kinerja: { nama: 'Tunjangan Kinerja', jenis: 'tunjangan' },
  absensi: { nama: 'Potongan Absensi', jenis: 'potongan' },
  bpjs_kesehatan: { nama: 'BPJS Kesehatan', jenis: 'potongan' },
  ketenagakerjaan: { nama: 'Ketenagakerjaan', jenis: 'potongan' },
  pph21: { nama: 'PPH 21', jenis: 'potongan' },
  bumida: { nama: 'Asuransi BUMIDA', jenis: 'potongan' },
  lain: { nama: 'Potongan Lain', jenis: 'potongan' },
};

function getMasterItems() {
  return getDb().prepare('SELECT * FROM master_pendapatan_item ORDER BY jenis, urutan').all();
}

function buildDetailArray(knownFields, additionalItems) {
  const detail = [];
  const seen = new Set();
  const additional = Array.isArray(additionalItems) ? additionalItems : [];
  const additionalMap = new Map(additional.map(i => [normalizeName(i.nama), i]));

  for (const [col, meta] of Object.entries(FIXED_COLUMN_MAP)) {
    const key = normalizeName(meta.nama);
    const fromDetail = additionalMap.get(key);
    const val = fromDetail ? Number(fromDetail.nilai) : (Number(knownFields[col]) || 0);
    detail.push({ nama: meta.nama, jenis: meta.jenis, nilai: val });
    seen.add(key);
  }

  for (const item of additional) {
    const key = normalizeName(item.nama);
    if (!seen.has(key)) {
      detail.push({ nama: item.nama, jenis: item.jenis || 'tunjangan', nilai: Number(item.nilai) || 0 });
      seen.add(key);
    }
  }

  return detail;
}

function parseDetail(data) {
  let detail = [];
  try { detail = JSON.parse(data.detail || '[]'); } catch (e) {}
  if (!detail.length) {
    detail = buildDetailArray(data, []);
  } else {
    const existingNames = detail.map(d => normalizeName(d.nama));
    for (const [col, meta] of Object.entries(FIXED_COLUMN_MAP)) {
      if (!existingNames.includes(normalizeName(meta.nama))) {
        const val = Number(data[col]) || 0;
        if (val) detail.push({ nama: meta.nama, jenis: meta.jenis, nilai: val });
      }
    }
  }
  return detail;
}

/* ─── MASTER ITEM CRUD ─── */

router.get('/master-items', (req, res) => {
  res.json(getMasterItems());
});

router.post('/master-items', adminOnly, (req, res) => {
  try {
    const { nama, jenis } = req.body;
    if (!nama || !jenis) return res.status(400).json({ error: 'Nama dan jenis harus diisi' });
    if (!['tunjangan', 'potongan'].includes(jenis)) return res.status(400).json({ error: 'Jenis harus tunjangan atau potongan' });
    const db = getDb();
    const max = db.prepare('SELECT MAX(urutan) as m FROM master_pendapatan_item WHERE jenis = ?').get(jenis);
    db.prepare('INSERT INTO master_pendapatan_item (nama, jenis, urutan) VALUES (?, ?, ?)').run(nama, jenis, (max?.m || 0) + 1);
    res.json({ message: 'Item berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/master-items/:id', adminOnly, (req, res) => {
  try {
    getDb().prepare('DELETE FROM master_pendapatan_item WHERE id = ?').run(req.params.id);
    res.json({ message: 'Item berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── UPLOAD ─── */

router.post('/upload', adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File tidak ditemukan' });
  }

  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

    if (rows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'File kosong' });
    }

    const db = getDb();
    const masterItems = getMasterItems();
    const normMaster = masterItems.map(m => ({ key: normalizeName(m.nama), nama: m.nama, jenis: m.jenis }));

    function matchColumn(col) {
      const n = normalizeName(col);
      const match = normMaster.find(m => m.key === n);
      if (match) return match;
      const fixed = FIXED_COLUMN_MAP[col] || FIXED_COLUMN_MAP[Object.keys(FIXED_COLUMN_MAP).find(k => normalizeName(k) === n)];
      if (fixed) return { nama: fixed.nama, jenis: fixed.jenis };
      return null;
    }

    const insertMany = db.transaction((data) => {
      let count = 0;
      let skipped = 0;
      for (const row of data) {
        const nip = row.nip || '';
        const nm_dokter = row.nm_dokter || row.nama_dokter || '';
        const bulan = row.bulan || '';
        if (!nip || !bulan) { skipped++; continue; }

        const detail = [];
        const fixed = {};

        for (const col of Object.keys(row)) {
          if (['nip', 'nm_dokter', 'nama_dokter', 'bulan'].includes(col)) continue;
          const matched = matchColumn(col);
          if (matched) {
            const val = parseIdr(row[col]);
            detail.push({ nama: matched.nama, jenis: matched.jenis, nilai: val });
          }
        }

        for (const [col, meta] of Object.entries(FIXED_COLUMN_MAP)) {
          const item = detail.find(d => normalizeName(d.nama) === normalizeName(meta.nama));
          fixed[col] = item ? item.nilai : 0;
        }

        db.prepare(`
          INSERT INTO slip_pendapatan (nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain, detail)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(nip, bulan) DO UPDATE SET
            nm_dokter = excluded.nm_dokter,
            tunjangan_jabatan = excluded.tunjangan_jabatan,
            standby_kantor = excluded.standby_kantor,
            remun_sesuai = excluded.remun_sesuai,
            fee_tim = excluded.fee_tim,
            tunjangan_kinerja = excluded.tunjangan_kinerja,
            absensi = excluded.absensi,
            bpjs_kesehatan = excluded.bpjs_kesehatan,
            ketenagakerjaan = excluded.ketenagakerjaan,
            pph21 = excluded.pph21,
            bumida = excluded.bumida,
            lain = excluded.lain,
            detail = excluded.detail,
            updated_at = datetime('now','localtime')
        `).run(nip, nm_dokter, bulan, fixed.tunjangan_jabatan, fixed.standby_kantor, fixed.remun_sesuai, fixed.fee_tim, fixed.tunjangan_kinerja, fixed.absensi, fixed.bpjs_kesehatan, fixed.ketenagakerjaan, fixed.pph21, fixed.bumida, fixed.lain, JSON.stringify(detail));
        count++;
      }
      return { count, skipped };
    });

    const { count: imported, skipped } = insertMany(rows);
    fs.unlinkSync(filePath);

    let msg = `Berhasil mengimpor ${imported} data pendapatan & potongan`;
    if (skipped > 0) msg += `, ${skipped} baris dilewati (NIP/Bulan kosong)`;
    res.json({ message: msg });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: 'Gagal memproses file. Pastikan format file benar.' });
  }
});

/* ─── GET ─── */

router.get('/dokter/:nip', (req, res) => {
  const db = getDb();
  const nip = req.user.role === 'admin' ? req.params.nip : req.user.nip;
  const data = db.prepare('SELECT * FROM slip_pendapatan WHERE nip = ? ORDER BY bulan DESC').all(nip);
  res.json(data.map(d => ({ ...d, detail: parseDetail(d) })));
});

router.get('/:nip/:bulan', (req, res) => {
  const db = getDb();
  const nip = req.user.role === 'admin' ? req.params.nip : req.user.nip;
  const data = db.prepare('SELECT * FROM slip_pendapatan WHERE nip = ? AND bulan = ?').get(nip, req.params.bulan);
  if (!data) return res.json(null);
  res.json({ ...data, detail: parseDetail(data) });
});

/* ─── MANUAL INPUT ─── */

router.post('/', adminOnly, (req, res) => {
  try {
    const { nip, nm_dokter, bulan, detail } = req.body;
    if (!nip || !bulan) {
      return res.status(400).json({ error: 'NIP dan bulan harus diisi' });
    }
    const db = getDb();

    const merged = buildDetailArray(req.body, detail || []);

    const fixed = {};
    for (const [col, meta] of Object.entries(FIXED_COLUMN_MAP)) {
      const item = merged.find(d => normalizeName(d.nama) === normalizeName(meta.nama));
      fixed[col] = item ? item.nilai : 0;
    }

    db.prepare(`
      INSERT INTO slip_pendapatan (nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(nip, bulan) DO UPDATE SET
        nm_dokter = excluded.nm_dokter,
        tunjangan_jabatan = excluded.tunjangan_jabatan,
        standby_kantor = excluded.standby_kantor,
        remun_sesuai = excluded.remun_sesuai,
        fee_tim = excluded.fee_tim,
        tunjangan_kinerja = excluded.tunjangan_kinerja,
        absensi = excluded.absensi,
        bpjs_kesehatan = excluded.bpjs_kesehatan,
        ketenagakerjaan = excluded.ketenagakerjaan,
        pph21 = excluded.pph21,
        bumida = excluded.bumida,
        lain = excluded.lain,
        detail = excluded.detail,
        updated_at = datetime('now','localtime')
    `).run(nip, nm_dokter || '', bulan, fixed.tunjangan_jabatan, fixed.standby_kantor, fixed.remun_sesuai, fixed.fee_tim, fixed.tunjangan_kinerja, fixed.absensi, fixed.bpjs_kesehatan, fixed.ketenagakerjaan, fixed.pph21, fixed.bumida, fixed.lain, JSON.stringify(merged));
    res.json({ message: 'Data pendapatan & potongan berhasil disimpan' });
  } catch (err) {
    console.error('[pendapatan]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
