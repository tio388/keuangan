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

    // Cek mode override
    const overrideExisting = req.query.override === 'true';

    const db = getDb();
    
    // Kumpulkan periode unik dari file untuk override
    const filePeriodes = new Set();
    const mappedRows = rows.map(row => {
      const mapped = {
        nip: row.nip || '',
        nm_dokter: row.nm_dokter || row.nama_dokter || '',
        bulan: row.bulan || '',
        tahun: row.tahun || (row.bulan || '').split(' ').pop() || '',
        tanggal: row.tanggal || row.tgl || row.keluar || '',
        poliklinik: row.poliklinik || '',
        pasien: row.pasien || row.jumlah_pasien || row.total_pasien || '',
        Ruangan: row.ruangan || row.ruang || row.Ruangan || row.Ruang || '',
        pembayaran: row.pembayaran || row.total_pembayaran || row.Pembayaran || '',
        tindakan: row.tindakan || row.total_tindakan || row.Tindakan || '',
        tarif: parseIdr(row.tarif || row.harga || 0),
        OP_NON: row.op_non || row.OP_NON || '',
        Jumlah: parseIdr(row.jumlah || row.total || row.Jumlah || 0),
        BHP: parseIdr(row.bhp || row.BHP || 0),
        JM_dokter: parseIdr(row.jm_dokter || row.jasa_dokter || row.JM_dokter || 0),
        nm_tindakan: row.nm_tindakan || row.nama_tindakan || row.tindakan || '',
        periode: row.periode || row.bulan || '',
        pending: String(row.op_non || row.OP_NON || '').toLowerCase().includes('pending') ? 1 : 0,
      };
      return mapped;
    }).filter(m => {
      if(m.nip) {
        filePeriodes.add(`${m.nip}|${m.periode}`);
        return true;
      }
      return false;
    });

    if (mappedRows.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'File kosong setelah filter (NIP kosong)' });
    }

    const insert = db.prepare(`
      INSERT INTO gaji (nip, nm_dokter, bulan, tahun, tanggal, poliklinik, pasien, Ruangan, pembayaran, tindakan, tarif, OP_NON, Jumlah, BHP, JM_dokter, nm_tindakan, periode, pending)
      VALUES (@nip, @nm_dokter, @bulan, @tahun, @tanggal, @poliklinik, @pasien, @Ruangan, @pembayaran, @tindakan, @tarif, @OP_NON, @Jumlah, @BHP, @JM_dokter, @nm_tindakan, @periode, @pending)
    `);

    const insertMany = db.transaction((data) => {
      let count = 0;
      let skipped = 0;
      let overridden = 0;

      // Jika override aktif, hapus data lama untuk NIP dan periode yang ada di file
      if (overrideExisting && filePeriodes.size > 0) {
        const deleteStmt = db.prepare('DELETE FROM gaji WHERE nip = ? AND periode = ?');
        for (const key of filePeriodes) {
          const [nip, periode] = key.split('|');
          if(nip && periode) {
            const info = deleteStmt.run(nip, periode);
            overridden += info.changes;
          }
        }
      }
      
      for (const mapped of data) {
        if (!mapped.nip) { skipped++; continue; }
        insert.run(mapped);
        count++;
      }
      return { count, skipped, overridden };
    });

    const { count: imported, skipped, overridden } = insertMany(mappedRows);
    fs.unlinkSync(filePath);

    let msg = `Berhasil mengimpor ${imported} data gaji`;
    if (skipped > 0) msg += `, ${skipped} baris dilewati (NIP kosong)`;
    if (overrideExisting) msg += `. ${overridden} data lama dihapus/di-overwrite`;
    res.json({ message: msg, overridden: overrideExisting ? overridden : undefined });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('[upload error]', err);
    res.status(400).json({ error: 'Gagal memproses file. Pastikan format file benar.' });
  }
});

router.get('/slip', (req, res) => {
  const db = getDb();

  if (req.user.role === 'admin') {
    const data = db.prepare('SELECT * FROM gaji ORDER BY uploaded_at DESC').all();
    return res.json(data);
  }

  const data = db.prepare('SELECT * FROM gaji WHERE nip = ? ORDER BY uploaded_at DESC').all(req.user.nip);
  res.json(data);
});

router.get('/slip/:id', (req, res) => {
  const db = getDb();
  const slip = db.prepare('SELECT * FROM gaji WHERE id = ?').get(req.params.id);

  if (!slip) {
    return res.status(404).json({ error: 'Data gaji tidak ditemukan' });
  }

  if (req.user.role !== 'admin' && slip.nip !== req.user.nip) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  res.json(slip);
});

// PUT /api/gaji/:id — Edit manual data gaji
router.put('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const id = req.params.id;
  const existing = db.prepare('SELECT id FROM gaji WHERE id = ?').get(id);
  
  if (!existing) {
    return res.status(404).json({ error: 'Data gaji tidak ditemukan' });
  }

  const {
    nip, nm_dokter, bulan, tahun, tanggal, poliklinik, pasien,
    Ruangan, pembayaran, tindakan, tarif, OP_NON, Jumlah, BHP,
    JM_dokter, nm_tindakan, periode, pending
  } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE gaji SET
        nip = @nip, nm_dokter = @nm_dokter, bulan = @bulan, tahun = @tahun,
        tanggal = @tanggal, poliklinik = @poliklinik, pasien = @pasien,
        Ruangan = @Ruangan, pembayaran = @pembayaran, tindakan = @tindakan,
        tarif = @tarif, OP_NON = @OP_NON, Jumlah = @Jumlah, BHP = @BHP,
        JM_dokter = @JM_dokter, nm_tindakan = @nm_tindakan, periode = @periode,
        pending = @pending
      WHERE id = @id
    `);
    
    stmt.run({
      id,
      nip: nip || '',
      nm_dokter: nm_dokter || '',
      bulan: bulan || '',
      tahun: tahun || '',
      tanggal: tanggal || '',
      poliklinik: poliklinik || '',
      pasien: pasien || '',
      Ruangan: Ruangan || '',
      pembayaran: pembayaran || '',
      tindakan: tindakan || '',
      tarif: parseIdr(tarif || 0),
      OP_NON: OP_NON || '',
      Jumlah: parseIdr(Jumlah || 0),
      BHP: parseIdr(BHP || 0),
      JM_dokter: parseIdr(JM_dokter || 0),
      nm_tindakan: nm_tindakan || '',
      periode: periode || '',
      pending: String(pending || '').toLowerCase() === 'true' || pending === 1 ? 1 : 0,
    });

    res.json({ message: 'Data gaji berhasil diperbarui' });
  } catch (err) {
    console.error('[update gaji error]', err);
    res.status(400).json({ error: 'Gagal memperbarui data gaji' });
  }
});

router.get('/dokter-names', (req, res) => {
  const db = getDb();
  const names = db.prepare("SELECT DISTINCT nm_dokter FROM gaji WHERE nm_dokter != '' ORDER BY nm_dokter ASC").all();
  res.json(names.map(n => n.nm_dokter));
});

const bulanOrder = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const bulanMap = {
  'january':'Januari','february':'Februari','march':'Maret','april':'April','may':'Mei','june':'Juni',
  'july':'Juli','august':'Agustus','september':'September','october':'Oktober','november':'November','december':'Desember'
};

router.get('/periode', (req, res) => {
  const db = getDb();
  const periodes = db.prepare("SELECT DISTINCT TRIM(bulan) as bulan FROM gaji WHERE bulan != ''").all();
  const unique = new Set();
  periodes.forEach(p => {
    const key = p.bulan.toLowerCase();
    unique.add(bulanMap[key] || p.bulan);
  });
  const sorted = [...unique].sort((a, b) => {
    const ai = bulanOrder.indexOf(a);
    const bi = bulanOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  }).reverse();
  res.json(sorted);
});

router.get('/tahun', (req, res) => {
  const db = getDb();
  const tahun = db.prepare("SELECT DISTINCT tahun FROM gaji WHERE tahun IS NOT NULL AND tahun != '' ORDER BY tahun DESC").all();
  res.json(tahun.map(r => r.tahun));
});

router.get('/tindakan-list', (req, res) => {
  const db = getDb();
  const list = db.prepare("SELECT DISTINCT tindakan FROM gaji WHERE tindakan IS NOT NULL AND tindakan != '' ORDER BY tindakan ASC").all();
  res.json(list.map(r => r.tindakan));
});

module.exports = router;
