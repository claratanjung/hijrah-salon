// Rute PENGATURAN (identitas salon) - ubah hanya oleh pemilik
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const [[s]] = await pool.query('SELECT * FROM pengaturan LIMIT 1');
  if (!s) return res.json({});
  res.json({ ...s, logo: s.logo_url ?? null });
});

// PUT /api/settings  (khusus pemilik)
router.put('/', auth, requireRole('pemilik'), async (req, res) => {
  const { nama_salon, alamat, telepon } = req.body;
  const logoValue = Object.prototype.hasOwnProperty.call(req.body, 'logo')
    ? req.body.logo
    : req.body.logo_url;
  const [[s]] = await pool.query('SELECT id FROM pengaturan LIMIT 1');
  if (s) {
    await pool.query(
      'UPDATE pengaturan SET nama_salon=?, alamat=?, telepon=?, logo_url=? WHERE id=?',
      [nama_salon, alamat || '', telepon || '', logoValue ?? null, s.id]
    );
  } else {
    await pool.query(
      'INSERT INTO pengaturan (nama_salon, alamat, telepon, logo_url) VALUES (?,?,?,?)',
      [nama_salon, alamat || '', telepon || '', logoValue ?? null]
    );
  }
  res.json({ message: 'Pengaturan disimpan.' });
});

module.exports = router;
