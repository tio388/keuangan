const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in environment');
const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses khusus admin' });
  }
  next();
}

module.exports = { signToken, authenticate, adminOnly };
