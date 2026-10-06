// Rute PEMBELIAN PRODUK KE SUPPLIER - KHUSUS PEMILIK
// Stok produk BERTAMBAH -> otomatis tercatat sebagai PENGELUARAN
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(auth, requireRole('pemilik'));

// GET /api/purchases?q=&dari=&sampai=
router.get('/', async (req, res) => {
  const { q = '', dari, sampai } = req.query;
  let sql = `SELECT pu.*, pu.produk_id AS product_id, pu.pengguna_id AS user_id,
                    p.nama AS nama_produk
             FROM pembelian pu JOIN produk p ON p.id = pu.produk_id
             WHERE 1=1`;
  const params = [];
  if (dari && sampai) { sql += ' AND pu.tanggal BETWEEN ? AND ?'; params.push(dari, sampai); }
  if (q) { sql += ' AND (p.nama LIKE ? OR pu.supplier LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY pu.tanggal DESC, pu.id DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// POST /api/purchases  body:{ tanggal, product_id, supplier, jumlah, harga_satuan, keterangan }
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { tanggal, product_id, supplier, jumlah, harga_satuan, keterangan } = req.body;
    if (!product_id || !jumlah)
      return res.status(400).json({ message: 'Produk & jumlah wajib diisi.' });

    await conn.beginTransaction();
    const tgl = tanggal || new Date().toISOString().slice(0, 10);
    const total = Number(jumlah) * Number(harga_satuan || 0);

    const [[prod]] = await conn.query('SELECT * FROM produk WHERE id=?', [product_id]);
    if (!prod) { await conn.rollback(); return res.status(404).json({ message: 'Produk tidak ada.' }); }

    const [pr] = await conn.query(
      `INSERT INTO pembelian
       (tanggal, produk_id, supplier, jumlah, harga_satuan, total, keterangan, pengguna_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [tgl, product_id, supplier || prod.supplier, jumlah,
       harga_satuan || 0, total, keterangan || null, req.user.id]
    );
    const stokBaru = prod.stok + Number(jumlah);
    await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, product_id]);

    await conn.query(
      `INSERT INTO mutasi_stok
       (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan)
       VALUES (?,?,'masuk',?,?,'pembelian',?,?)`,
      [tgl, product_id, jumlah, stokBaru, pr.insertId,
       `Pembelian dari ${supplier || prod.supplier}`]
    );
    // pembelian = pengeluaran otomatis
    await conn.query(
      `INSERT INTO pengeluaran
       (tanggal, kategori, jumlah, keterangan, sumber, referensi_id, pengguna_id)
       VALUES (?,?,?,?,?,?,?)`,
      [tgl, 'beli_produk', total,
       `Pembelian: ${prod.nama} x${jumlah}`, 'pembelian', pr.insertId, req.user.id]
    );
    await conn.commit();
    res.status(201).json({ id: pr.insertId, total });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: 'Gagal menyimpan pembelian.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/purchases/:id  (batalkan stok + pengeluaran terkait)
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[pu]] = await conn.query('SELECT * FROM pembelian WHERE id=?', [req.params.id]);
    if (pu) {
      await conn.query('UPDATE produk SET stok = stok - ? WHERE id=?',
        [pu.jumlah, pu.produk_id]);
      await conn.query("DELETE FROM pengeluaran WHERE sumber='pembelian' AND referensi_id=?",
        [pu.id]);
      await conn.query("DELETE FROM mutasi_stok WHERE sumber='pembelian' AND referensi_id=?",
        [pu.id]);
      await conn.query('DELETE FROM pembelian WHERE id=?', [pu.id]);
    }
    await conn.commit();
    res.json({ message: 'Pembelian dibatalkan.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal membatalkan pembelian.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
