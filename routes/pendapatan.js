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

    const insertMany = db.transaction((data) => {
      let count = 0;
      let skipped = 0;
      for (const row of data) {
        const nip = row.nip || '';
        const nm_dokter = row.nm_dokter || row.nama_dokter || '';
        const bulan = row.bulan || '';
        if (!nip || !bulan) { skipped++; continue; }

        db.prepare(`
          INSERT INTO slip_pendapatan (nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            updated_at = datetime('now','localtime')
        `).run(
          nip,
          nm_dokter,
          bulan,
          parseIdr(row.tunjangan_jabatan || row.tunjab || 0),
          parseIdr(row.standby_kantor || row.standby || 0),
          parseIdr(row.remun_sesuai || row.remun || 0),
          parseIdr(row.fee_tim || row.fee || 0),
          parseIdr(row.tunjangan_kinerja || row.tukin || row.tunjangan_kinerja || 0),
          parseIdr(row.absensi || 0),
          parseIdr(row.bpjs_kesehatan || row.bpjs || 0),
          parseIdr(row.ketenagakerjaan || row.naker || 0),
          parseIdr(row.pph21 || 0),
          parseIdr(row.bumida || 0),
          parseIdr(row.lain || 0)
        );
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

router.get('/dokter/:nip', (req, res) => {
  const db = getDb();
  let data;
  if (req.user.role === 'admin') {
    data = db.prepare('SELECT * FROM slip_pendapatan WHERE nip = ? ORDER BY bulan DESC').all(req.params.nip);
  } else {
    data = db.prepare('SELECT * FROM slip_pendapatan WHERE nip = ? ORDER BY bulan DESC').all(req.user.nip);
  }
  res.json(data);
});

router.get('/:nip/:bulan', adminOnly, (req, res) => {
  const db = getDb();
  const data = db.prepare('SELECT * FROM slip_pendapatan WHERE nip = ? AND bulan = ?').get(req.params.nip, req.params.bulan);
  res.json(data || null);
});

router.post('/', adminOnly, (req, res) => {
  try {
    const { nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain } = req.body;
    if (!nip || !bulan) {
      return res.status(400).json({ error: 'NIP dan bulan harus diisi' });
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO slip_pendapatan (nip, nm_dokter, bulan, tunjangan_jabatan, standby_kantor, remun_sesuai, fee_tim, tunjangan_kinerja, absensi, bpjs_kesehatan, ketenagakerjaan, pph21, bumida, lain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        updated_at = datetime('now','localtime')
    `).run(nip, nm_dokter || '', bulan, Number(tunjangan_jabatan) || 0, Number(standby_kantor) || 0, Number(remun_sesuai) || 0, Number(fee_tim) || 0, Number(tunjangan_kinerja) || 0, Number(absensi) || 0, Number(bpjs_kesehatan) || 0, Number(ketenagakerjaan) || 0, Number(pph21) || 0, Number(bumida) || 0, Number(lain) || 0);
    res.json({ message: 'Data pendapatan & potongan berhasil disimpan' });
  } catch (err) {
    console.error('[pendapatan]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
