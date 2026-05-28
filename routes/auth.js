const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, dan role harus diisi' });
  }

  const db = getDb();

  if (role === 'admin') {
    const admin = db.prepare('SELECT * FROM admin WHERE email = ?').get(email);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Email atau password admin salah' });
    }
    const token = signToken({ id: admin.id, email: admin.email, role: 'admin' });
    return res.json({ token, user: { email: admin.email, role: 'admin' } });
  }

  if (role === 'dokter') {
    const dokter = db.prepare('SELECT * FROM dokter WHERE email = ?').get(email);
    if (!dokter || !bcrypt.compareSync(password, dokter.password)) {
      return res.status(401).json({ error: 'Email atau password dokter salah' });
    }
    const token = signToken({ id: dokter.id, nip: dokter.nip, nama: dokter.nama, email: dokter.email, poliklinik: dokter.poliklinik, role: 'dokter' });
    return res.json({ token, user: { nip: dokter.nip, nama: dokter.nama, email: dokter.email, poliklinik: dokter.poliklinik, role: 'dokter' } });
  }

  return res.status(400).json({ error: 'Role harus admin atau dokter' });
});

module.exports = router;
