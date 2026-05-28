require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dokter', require('./routes/dokter'));
app.use('/api/gaji', require('./routes/gaji'));

app.use((req, res) => {
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.status(404).json({ error: 'Not found' });
});

getDb();

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
