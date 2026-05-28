const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'keuangan.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    migrateSchema();
    seedAdmin();
  }
  return db;
}

function migrateSchema() {
  const existing = db.prepare("PRAGMA table_info(gaji)").all().map(c => c.name.toLowerCase());
  const addCol = (name, type) => {
    if (!existing.includes(name.toLowerCase())) {
      db.exec(`ALTER TABLE gaji ADD COLUMN ${name} ${type}`);
    }
  };
  addCol('tanggal', 'TEXT');
  addCol('nm_tindakan', 'TEXT');
  addCol('pending', 'INT DEFAULT 0');

}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS dokter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      poliklinik TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS gaji (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT NOT NULL,
      nm_dokter TEXT NOT NULL,
      bulan TEXT NOT NULL,
      tanggal TEXT,
      poliklinik TEXT DEFAULT '',
      pasien TEXT DEFAULT '',
      Ruangan TEXT DEFAULT '',
      pembayaran TEXT DEFAULT '',
      tindakan TEXT DEFAULT '',
      tarif INT DEFAULT 0,
      OP_NON INT DEFAULT 0,
      Jumlah INT DEFAULT 0,
      BHP INT DEFAULT 0,
      JM_dokter INT DEFAULT 0,
      uploaded_at TEXT DEFAULT (datetime('now','localtime')),
      periode TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_gaji_nip ON gaji(nip);
    CREATE INDEX IF NOT EXISTS idx_gaji_bulan ON gaji(bulan);

    CREATE TABLE IF NOT EXISTS slip_pendapatan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT NOT NULL,
      nm_dokter TEXT NOT NULL DEFAULT '',
      bulan TEXT NOT NULL,
      tunjangan_jabatan REAL DEFAULT 0,
      standby_kantor REAL DEFAULT 0,
      remun_sesuai REAL DEFAULT 0,
      fee_tim REAL DEFAULT 0,
      tunjangan_kinerja REAL DEFAULT 0,
      absensi REAL DEFAULT 0,
      bpjs_kesehatan REAL DEFAULT 0,
      ketenagakerjaan REAL DEFAULT 0,
      pph21 REAL DEFAULT 0,
      bumida REAL DEFAULT 0,
      lain REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(nip, bulan)
    );
  `);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin LIMIT 1').get();
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin (email, password) VALUES (?, ?)').run('admin@keuangan.com', hash);
    console.log('[seed] Default admin created: admin@keuangan.com / admin123');
  }
}

module.exports = { getDb };
