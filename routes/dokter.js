const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, adminOnly);

router.get('/', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, nip, nama, poliklinik, created_at FROM dokter ORDER BY nama ASC').all();
  res.json(list);
});

router.post('/', (req, res) => {
  const { nip, nama, poliklinik, password } = req.body;
  if (!nip || !nama || !poliklinik || !password) {
    return res.status(400).json({ error: 'NIP, nama, poliklinik, dan password harus diisi' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM dokter WHERE nip = ?').get(nip);
  if (existing) {
    return res.status(409).json({ error: 'NIP sudah terdaftar' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO dokter (nip, nama, poliklinik, password) VALUES (?, ?, ?, ?)').run(nip, nama, poliklinik, hash);
  res.status(201).json({ message: 'Dokter berhasil ditambahkan' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM dokter WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dokter tidak ditemukan' });
  }
  res.json({ message: 'Dokter berhasil dihapus' });
});

router.put('/:id', (req, res) => {
  const { nip, nama, poliklinik, password } = req.body;
  if (!nip || !nama || !poliklinik) {
    return res.status(400).json({ error: 'NIP, nama, dan poliklinik harus diisi' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM dokter WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Dokter tidak ditemukan' });
  }

  const conflict = db.prepare('SELECT id FROM dokter WHERE nip = ? AND id != ?').get(nip, req.params.id);
  if (conflict) {
    return res.status(409).json({ error: 'NIP sudah digunakan dokter lain' });
  }

  if (password && password.trim() !== '') {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE dokter SET nip = ?, nama = ?, poliklinik = ?, password = ? WHERE id = ?')
      .run(nip, nama, poliklinik, hash, req.params.id);
  } else {
    db.prepare('UPDATE dokter SET nip = ?, nama = ?, poliklinik = ? WHERE id = ?')
      .run(nip, nama, poliklinik, req.params.id);
  }
  res.json({ message: 'Data dokter berhasil diperbarui' });
});

module.exports = router;
