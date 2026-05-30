const express = require('express');
const { getDb } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

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
    `).run(nip, nm_dokter || '', Number(tunjangan_jabatan) || 0, Number(standby_kantor) || 0, Number(remun_sesuai) || 0, Number(fee_tim) || 0, Number(tunjangan_kinerja) || 0, Number(absensi) || 0, Number(bpjs_kesehatan) || 0, Number(ketenagakerjaan) || 0, Number(pph21) || 0, Number(bumida) || 0, Number(lain) || 0);
    res.json({ message: 'Data pendapatan & potongan berhasil disimpan' });
  } catch (err) {
    console.error('[pendapatan]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
