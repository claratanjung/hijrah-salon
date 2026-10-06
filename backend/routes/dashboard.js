// Rute dashboard (ringkasan + data grafik)
const express = require('express');
const pool = require('../db');
const { auth, requireAdminOrKasir } = require('../middleware/auth');
const router = express.Router();

function tanggalLokal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/dashboard
router.get('/', auth, requireAdminOrKasir, async (req, res) => {
  const periode = ['hari', 'minggu', 'bulan'].includes(req.query.periode)
    ? req.query.periode
    : 'hari';
  const filterTanggal =
    periode === 'bulan'
      ? `tanggal >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND tanggal <= CURDATE()`
      : periode === 'minggu'
        ? `tanggal BETWEEN (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY)
           AND (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY + INTERVAL 6 DAY)`
        : 'tanggal = CURDATE()';

  const [[pendapatanHari]] = await pool.query(
    'SELECT COALESCE(SUM(total),0) v FROM transaksi WHERE tanggal = CURDATE()'
  );
  const [[pendapatanBulan]] = await pool.query(
    `SELECT COALESCE(SUM(total),0) v FROM transaksi
     WHERE YEAR(tanggal)=YEAR(CURDATE()) AND MONTH(tanggal)=MONTH(CURDATE())`
  );
  const [[pengeluaranHari]] = await pool.query(
    'SELECT COALESCE(SUM(jumlah),0) v FROM pengeluaran WHERE tanggal = CURDATE()'
  );
  const [[pengeluaranBulan]] = await pool.query(
    `SELECT COALESCE(SUM(jumlah),0) v FROM pengeluaran
     WHERE YEAR(tanggal)=YEAR(CURDATE()) AND MONTH(tanggal)=MONTH(CURDATE())`
  );

  // Transaksi terakhir sesuai filter dashboard
  const [transaksiTerakhir] = await pool.query(
    `SELECT id, tanggal, nama_pelanggan, total, metode_bayar
     FROM transaksi WHERE ${filterTanggal} ORDER BY tanggal DESC, id DESC LIMIT 8`
  );

  const [grafikHarian] =
    periode === 'bulan'
      ? await pool.query(
          `WITH RECURSIVE d AS (
             SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 0 DAY AS tgl
             UNION ALL
             SELECT tgl + INTERVAL 1 DAY FROM d WHERE tgl < CURDATE()
           )
           SELECT d.tgl,
             COALESCE(p.masuk,0) AS pemasukan,
             COALESCE(e.keluar,0) AS pengeluaran
           FROM d
           LEFT JOIN (SELECT tanggal, SUM(total) masuk FROM transaksi GROUP BY tanggal) p
             ON p.tanggal = d.tgl
           LEFT JOIN (SELECT tanggal, SUM(jumlah) keluar FROM pengeluaran GROUP BY tanggal) e
             ON e.tanggal = d.tgl
           ORDER BY d.tgl`
        )
      : periode === 'minggu'
        ? await pool.query(
            `WITH RECURSIVE d AS (
               SELECT CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY AS tgl
               UNION ALL
               SELECT tgl + INTERVAL 1 DAY
               FROM d
               WHERE tgl < (CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY + INTERVAL 6 DAY)
             )
             SELECT d.tgl,
               COALESCE(p.masuk,0) AS pemasukan,
               COALESCE(e.keluar,0) AS pengeluaran
             FROM d
             LEFT JOIN (SELECT tanggal, SUM(total) masuk FROM transaksi GROUP BY tanggal) p
               ON p.tanggal = d.tgl
             LEFT JOIN (SELECT tanggal, SUM(jumlah) keluar FROM pengeluaran GROUP BY tanggal) e
               ON e.tanggal = d.tgl
             ORDER BY d.tgl`
          )
      : await pool.query(
          `SELECT CURDATE() AS tgl,
             COALESCE((SELECT SUM(total) FROM transaksi WHERE tanggal = CURDATE()),0) AS pemasukan,
             COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE tanggal = CURDATE()),0) AS pengeluaran`
        );

  // Stok menipis
  const [stokMenipis] = await pool.query(
    'SELECT id, nama, stok, stok_minimum FROM produk WHERE stok <= stok_minimum ORDER BY stok ASC'
  );

  res.json({
    pendapatan_hari: Number(pendapatanHari.v),
    pendapatan_bulan: Number(pendapatanBulan.v),
    pengeluaran_hari: Number(pengeluaranHari.v),
    pengeluaran_bulan: Number(pengeluaranBulan.v),
    periode,
    tanggal_hari_ini: tanggalLokal(new Date()),
    tanggal_awal_minggu: tanggalLokal(
      new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000)
    ),
    tanggal_awal_bulan: tanggalLokal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    transaksi_terakhir: transaksiTerakhir,
    grafik_harian: grafikHarian,
    stok_menipis: stokMenipis,
  });
});

module.exports = router;
