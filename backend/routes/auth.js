// Rute autentikasi: login dan kelola pengguna
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { auth, requireAdmin, normalizeRole, SECRET } = require('../middleware/auth');

const router = express.Router();

const cleanRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' ? 'admin' : normalized === 'kasir' ? 'kasir' : 'kasir';
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email & password wajib diisi.' });

    const [rows] = await pool.query(
      'SELECT id, nama, email, kata_sandi AS password, peran AS role FROM pengguna WHERE email = ?',
      [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: 'Email atau password salah.' });

    const user = rows[0];
    if (password !== user.password)
      return res.status(401).json({ message: 'Email atau password salah.' });

    const payload = { id: user.id, nama: user.nama, email: user.email, role: user.role };
    const token = jwt.sign(payload, SECRET, { expiresIn: '12h' });
    res.json({ token, user: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/users  (buat akun baru - khusus admin)
router.post('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!nama || !email || !password)
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });

    const peran = cleanRole(role);
    const [ada] = await pool.query('SELECT id FROM pengguna WHERE email = ?', [email]);
    if (ada.length > 0)
      return res.status(409).json({ message: 'Email sudah terdaftar.' });

    const [r] = await pool.query(
      'INSERT INTO pengguna (nama, email, kata_sandi, peran) VALUES (?,?,?,?)',
      [nama, email, password, peran]
    );
    res.status(201).json({ id: r.insertId, nama, email, password, role: peran });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

// GET /api/auth/users  (kelola pengguna - khusus admin)
router.get('/users', auth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nama, email, kata_sandi AS password, peran AS role,
            dibuat_pada AS created_at
     FROM pengguna ORDER BY id`
  );
  res.json(rows);
});

// PUT /api/auth/users/:id  (ubah peran / password - khusus admin)
router.put('/users/:id', auth, requireAdmin, async (req, res) => {
  const { nama, role, password } = req.body;
  const fields = [];
  const vals = [];
  if (nama) { fields.push('nama = ?'); vals.push(nama); }
  if (role) { fields.push('peran = ?'); vals.push(cleanRole(role)); }
  if (password) {
    fields.push('kata_sandi = ?'); vals.push(password);
  }
  if (fields.length === 0)
    return res.status(400).json({ message: 'Tidak ada perubahan.' });
  vals.push(req.params.id);
  await pool.query(`UPDATE pengguna SET ${fields.join(', ')} WHERE id = ?`, vals);
  res.json({ message: 'Pengguna diperbarui.' });
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri.' });
  await pool.query('DELETE FROM pengguna WHERE id = ?', [req.params.id]);
  res.json({ message: 'Pengguna dihapus.' });
});

module.exports = router;
