// Rute STOK & INVENTORI (riwayat pergerakan + penyesuaian manual)
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/stock/movements?product_id=&q=&dari=&sampai=
router.get('/movements', auth, requireRole('pemilik'), async (req, res) => {
  const { product_id, q = '', dari, sampai } = req.query;
  let sql = `SELECT sm.*, sm.produk_id AS product_id, sm.referensi_id AS ref_id,
                    p.nama AS nama_produk, p.kode
             FROM mutasi_stok sm JOIN produk p ON p.id = sm.produk_id
             WHERE 1=1`;
  const params = [];
  if (product_id) { sql += ' AND sm.produk_id=?'; params.push(product_id); }
  if (q) { sql += ' AND (p.nama LIKE ? OR p.kode LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (dari && sampai) { sql += ' AND sm.tanggal BETWEEN ? AND ?'; params.push(dari, sampai); }
  sql += ' ORDER BY sm.tanggal DESC, sm.id DESC LIMIT 300';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// POST /api/stock/adjust  body:{ product_id, tipe:'masuk'|'keluar', jumlah, keterangan }
// Penyesuaian manual (koreksi stok) — tidak membuat pemasukan/pengeluaran
router.post('/adjust', auth, requireRole('pemilik'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { product_id, tipe, jumlah, keterangan } = req.body;
    if (!product_id || !tipe || !jumlah)
      return res.status(400).json({ message: 'Data tidak lengkap.' });

    await conn.beginTransaction();
    const [[p]] = await conn.query('SELECT stok FROM produk WHERE id=?', [product_id]);
    const stokBaru =
      tipe === 'masuk' ? p.stok + Number(jumlah) : p.stok - Number(jumlah);
    await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, product_id]);
    await conn.query(
      `INSERT INTO mutasi_stok
       (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, keterangan)
       VALUES (CURDATE(),?,?,?,?,'koreksi',?)`,
      [product_id, tipe, jumlah, stokBaru, keterangan || 'Penyesuaian manual']
    );
    await conn.commit();
    res.json({ message: 'Stok disesuaikan.', stok_akhir: stokBaru });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal menyesuaikan stok.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
