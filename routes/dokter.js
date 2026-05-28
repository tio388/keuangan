const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, adminOnly);

router.get('/', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT id, nip, nama, poliklinik, email, created_at FROM dokter ORDER BY nama ASC').all();
  res.json(list);
});

router.post('/', (req, res) => {
  const { nip, nama, poliklinik, email, password } = req.body;
  if (!nip || !nama || !poliklinik || !email || !password) {
    return res.status(400).json({ error: 'Semua field harus diisi' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM dokter WHERE nip = ? OR email = ?').get(nip, email);
  if (existing) {
    return res.status(409).json({ error: 'NIP atau email sudah terdaftar' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO dokter (nip, nama, poliklinik, email, password) VALUES (?, ?, ?, ?, ?)').run(nip, nama, poliklinik, email, hash);
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

module.exports = router;
