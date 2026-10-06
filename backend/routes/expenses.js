// Rute PENGELUARAN (biaya operasional) - KHUSUS PEMILIK
// Kasir tidak boleh mengakses (sesuai aturan: urusan uang keluar = pemilik)
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Semua endpoint di sini wajib role 'pemilik'
router.use(auth, requireRole('pemilik'));

function buildDateFilter(query) {
  const { periode, dari, sampai } = query;
  if (periode === 'hari') return { clause: ' AND tanggal = CURDATE()', params: [] };
  if (periode === 'minggu')
    return { clause: ' AND YEARWEEK(tanggal,1) = YEARWEEK(CURDATE(),1)', params: [] };
  if (dari && sampai)
    return { clause: ' AND tanggal BETWEEN ? AND ?', params: [dari, sampai] };
  return { clause: '', params: [] };
}

// GET /api/expenses?periode=&dari=&sampai=&q=&kategori=
router.get('/', async (req, res) => {
  const { q = '', kategori = '' } = req.query;
  const f = buildDateFilter(req.query);
  let sql = `SELECT e.*, u.nama AS pencatat
             FROM pengeluaran e LEFT JOIN pengguna u ON u.id = e.pengguna_id
             WHERE 1=1${f.clause}`;
  const params = [...f.params];
  if (q) { sql += ' AND e.keterangan LIKE ?'; params.push(`%${q}%`); }
  if (kategori) { sql += ' AND e.kategori = ?'; params.push(kategori); }
  sql += ' ORDER BY e.tanggal DESC, e.id DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// POST /api/expenses
router.post('/', async (req, res) => {
  const { tanggal, kategori, jumlah, keterangan } = req.body;
  if (!kategori || !jumlah)
    return res.status(400).json({ message: 'Kategori & jumlah wajib diisi.' });
  const tgl = tanggal || new Date().toISOString().slice(0, 10);
  const [r] = await pool.query(
    `INSERT INTO pengeluaran (tanggal, kategori, jumlah, keterangan, sumber, pengguna_id)
     VALUES (?,?,?,?,'manual',?)`,
    [tgl, kategori, jumlah, keterangan || null, req.user.id]
  );
  res.status(201).json({ id: r.insertId });
});

// PUT /api/expenses/:id  (hanya pengeluaran manual yg bisa diedit penuh)
router.put('/:id', async (req, res) => {
  const { tanggal, kategori, jumlah, keterangan } = req.body;
  await pool.query(
    `UPDATE pengeluaran SET tanggal=?, kategori=?, jumlah=?, keterangan=?
     WHERE id=? AND sumber='manual'`,
    [tanggal, kategori, jumlah, keterangan || null, req.params.id]
  );
  res.json({ message: 'Pengeluaran diperbarui.' });
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  await pool.query("DELETE FROM pengeluaran WHERE id=? AND sumber='manual'",
    [req.params.id]);
  res.json({ message: 'Pengeluaran dihapus.' });
});

module.exports = router;
