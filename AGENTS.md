# AGENTS.md — Keuangan

## Stack
- **Runtime:** Node.js (Express 5)
- **Database:** SQLite (via `better-sqlite3`), auto-created at `keuangan.db`
- **Auth:** JWT (`jsonwebtoken`), bcrypt for password hashing
- **File upload:** `multer` + `xlsx` (SheetJS) for CSV/Excel parsing
- **Frontend:** Vanilla JS SPA (no framework), served as static from `public/`

## Commands
- `npm start` / `npm run dev` — start server on `http://localhost:3000`

## Architecture
- `server.js` — Express entrypoint, mounts routes, serves `public/`
- `db.js` — SQLite schema init + default admin seed on first run
- `middleware/auth.js` — JWT middleware: `authenticate`, `adminOnly`
- `routes/auth.js` — `POST /api/auth/login` (role: `admin` or `dokter`)
- `routes/dokter.js` — CRUD for doctors (`authenticate` + `adminOnly`)
- `routes/gaji.js` — salary upload (`POST /api/gaji/upload`, admin only), slip retrieval (`GET /api/gaji/slip`)
- `public/index.html` — single-page app entrypoint
- `public/js/app.js` — all client-side logic (routing, auth, views)
- `public/css/style.css` — all styling

## Auth rules
- Default admin: `admin@keuangan.com` / `admin123` (auto-seeded on first run)
- Admin can: manage doctors, upload salary files, view all slips
- Doctor can: view own slips only (filtered by NIP from JWT payload)
- Token in `Authorization: Bearer <token>` header, expires 8h

## Salary upload
- Accepts CSV, XLS, XLSX (max 5MB) via `POST /api/gaji/upload`
- Expected column names (case-insensitive): `nip`, `nm_dokter`, `bulan`, `keluar`, `poliklinik`, `pasien`, `Ruangan`, `pembayaran`, `tindakan`, `tarif`, `OP_NON`, `Jumlah`, `BHP`, `JM_dokter`
- File is parsed with SheetJS (`xlsx`); deleted after processing

## Gotchas
- Express 5 — catch-all route uses `app.use((req,res) => ...)` not `app.get('*', ...)`
- SQLite DB and `uploads/` directory are git-ignored; created at runtime
- SheetJS may auto-parse date columns; NIP may need string coercion in CSV files
