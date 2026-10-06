// Rute Manajemen Produk (CRUD + pencarian + cek stok menipis)
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/products?q=
router.get('/', auth, async (req, res) => {
  const { q = '' } = req.query;
  let sql = 'SELECT * FROM produk WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (nama LIKE ? OR kode LIKE ? OR supplier LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY nama';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/products/low-stock  (notifikasi stok menipis)
router.get('/low-stock', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM produk WHERE stok <= stok_minimum ORDER BY stok ASC'
  );
  res.json(rows);
});

// POST /api/products
router.post('/', auth, requireRole('pemilik'), async (req, res) => {
  const { kode, nama, harga_modal, harga_jual, stok, stok_minimum, supplier, keterangan, expired } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama produk wajib diisi.' });
  const kodeFinal = kode || 'PRD-' + Date.now();
  try {
    const [r] = await pool.query(
      `INSERT INTO produk (kode, nama, harga_modal, harga_jual, stok, stok_minimum, supplier, keterangan, expired)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [kodeFinal, nama, harga_modal || 0, harga_jual || 0, stok || 0,
       stok_minimum || 5, supplier || '', keterangan || null, expired || null]
    );
    if (Number(stok) > 0) {
      await pool.query(
        `INSERT INTO mutasi_stok (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, keterangan)
         VALUES (CURDATE(), ?, 'masuk', ?, ?, 'manual', 'Stok awal produk')`,
        [r.insertId, stok, stok]
      );
    }
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Kode produk sudah dipakai.' });
    throw e;
  }
});

// PUT /api/products/:id
router.put('/:id', auth, requireRole('pemilik'), async (req, res) => {
  const { kode, nama, harga_modal, harga_jual, stok_minimum, supplier, keterangan, expired } = req.body;
  await pool.query(
    `UPDATE produk SET kode=?, nama=?, harga_modal=?, harga_jual=?, stok_minimum=?,
     supplier=?, keterangan=?, expired=? WHERE id=?`,
    [kode, nama, harga_modal || 0, harga_jual || 0, stok_minimum || 5,
     supplier || '', keterangan || null, expired || null, req.params.id]
  );
  res.json({ message: 'Produk diperbarui.' });
});

// DELETE /api/products/:id
router.delete('/:id', auth, requireRole('pemilik'), async (req, res) => {
  await pool.query('DELETE FROM produk WHERE id=?', [req.params.id]);
  res.json({ message: 'Produk dihapus.' });
});

module.exports = router;
