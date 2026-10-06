// Rute LAPORAN KEUANGAN
// Filter rentang tanggal, jenis laporan, dan metode pembayaran untuk pemasukan.
// Pengeluaran/laba hanya untuk admin/pemilik.
const express = require('express');
const pool = require('../db');
const { auth, requireAdminOrKasir } = require('../middleware/auth');
const router = express.Router();

function tanggalISO(d) {
  return d.toISOString().slice(0, 10);
}

function range(q) {
  if (q.dari && q.sampai) return { dari: q.dari, sampai: q.sampai };

  const now = new Date();
  const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dari: tanggalISO(awalBulan), sampai: tanggalISO(now) };
}

function tipeLaporan(tipe, isPemilik) {
  if (!isPemilik) return 'pemasukan';
  return ['semua', 'pemasukan', 'pengeluaran'].includes(tipe) ? tipe : 'semua';
}

function metodeLaporan(metode) {
  return ['tunai', 'transfer', 'qris'].includes(metode) ? metode : '';
}

function tanggalRange(dari, sampai) {
  const hasil = [];
  const mulai = new Date(`${dari}T00:00:00`);
  const akhir = new Date(`${sampai}T00:00:00`);

  for (let d = mulai; d <= akhir; d.setDate(d.getDate() + 1)) {
    hasil.push(tanggalISO(d));
  }

  return hasil;
}

// GET /api/reports?dari=&sampai=&tipe=semua|pemasukan|pengeluaran&metode=
router.get('/', auth, requireAdminOrKasir, async (req, res) => {
  const { dari, sampai } = range(req.query);
  const isPemilik = req.user.role === 'admin';
  const tipe = tipeLaporan(req.query.tipe || 'semua', isPemilik);
  const metode = metodeLaporan(req.query.metode || '');
  const metodeSql = metode ? ' AND metode_bayar = ?' : '';
  const metodeParams = metode ? [metode] : [];
  const tampilPemasukan = tipe === 'semua' || tipe === 'pemasukan';
  const tampilPengeluaran = isPemilik && (tipe === 'semua' || tipe === 'pengeluaran');

  const [[penjualan]] = tampilPemasukan
    ? await pool.query(
      `SELECT COUNT(*) jml_transaksi, COALESCE(SUM(total),0) total_pendapatan
       FROM transaksi WHERE tanggal BETWEEN ? AND ?${metodeSql}`,
      [dari, sampai, ...metodeParams]
    )
    : [[{ jml_transaksi: 0, total_pendapatan: 0 }]];

  const [[pengeluaran]] = tampilPengeluaran
    ? await pool.query(
      `SELECT COUNT(*) jml_transaksi, COALESCE(SUM(jumlah),0) total_pengeluaran
       FROM pengeluaran WHERE tanggal BETWEEN ? AND ?`,
      [dari, sampai]
    )
    : [[{ jml_transaksi: 0, total_pengeluaran: 0 }]];

  const [breakdownKategori] = tampilPengeluaran
    ? await pool.query(
      `SELECT kategori, SUM(jumlah) total FROM pengeluaran
       WHERE tanggal BETWEEN ? AND ? GROUP BY kategori ORDER BY total DESC`,
      [dari, sampai]
    )
    : [[]];

  const [grafikPemasukan] = tampilPemasukan
    ? await pool.query(
      `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') tanggal, SUM(total) total
       FROM transaksi WHERE tanggal BETWEEN ? AND ?${metodeSql}
       GROUP BY tanggal ORDER BY tanggal`,
      [dari, sampai, ...metodeParams]
    )
    : [[]];

  const [grafikPengeluaran] = tampilPengeluaran
    ? await pool.query(
      `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') tanggal, SUM(jumlah) total
       FROM pengeluaran WHERE tanggal BETWEEN ? AND ?
       GROUP BY tanggal ORDER BY tanggal`,
      [dari, sampai]
    )
    : [[]];

  const mapPemasukan = new Map(grafikPemasukan.map((g) => [g.tanggal, Number(g.total)]));
  const mapPengeluaran = new Map(grafikPengeluaran.map((g) => [g.tanggal, Number(g.total)]));
  const grafik = tanggalRange(dari, sampai).map((tanggal) => ({
    tanggal,
    pemasukan: tampilPemasukan ? (mapPemasukan.get(tanggal) || 0) : 0,
    pengeluaran: tampilPengeluaran ? (mapPengeluaran.get(tanggal) || 0) : null,
  }));

  const rincianQuery = [];
  const rincianParams = [];

  if (tampilPemasukan) {
    rincianQuery.push(`
      SELECT id, DATE_FORMAT(tanggal, '%Y-%m-%d') tanggal, 'pemasukan' tipe,
             nama_pelanggan nama, metode_bayar kategori_metode, total nominal
      FROM transaksi
      WHERE tanggal BETWEEN ? AND ?${metodeSql}
    `);
    rincianParams.push(dari, sampai, ...metodeParams);
  }

  if (tampilPengeluaran) {
    rincianQuery.push(`
      SELECT id, DATE_FORMAT(tanggal, '%Y-%m-%d') tanggal, 'pengeluaran' tipe,
             COALESCE(NULLIF(keterangan, ''), kategori) nama, kategori kategori_metode, jumlah nominal
      FROM pengeluaran
      WHERE tanggal BETWEEN ? AND ?
    `);
    rincianParams.push(dari, sampai);
  }

  const [rincian] = rincianQuery.length
    ? await pool.query(
      `${rincianQuery.join(' UNION ALL ')}
       ORDER BY tanggal DESC, id DESC LIMIT 300`,
      rincianParams
    )
    : [[]];

  const totalPendapatan = Number(penjualan.total_pendapatan);
  const totalPengeluaran = Number(pengeluaran.total_pengeluaran);
  const jumlahTransaksi = Number(penjualan.jml_transaksi) + Number(pengeluaran.jml_transaksi);

  res.json({
    periode: { dari, sampai, tipe, metode },
    penjualan: {
      jumlah_transaksi: jumlahTransaksi,
      jumlah_pemasukan: Number(penjualan.jml_transaksi),
      total_pendapatan: totalPendapatan,
    },
    pengeluaran: isPemilik
      ? {
        jumlah_pengeluaran: Number(pengeluaran.jml_transaksi),
        total_pengeluaran: totalPengeluaran,
        breakdown: breakdownKategori,
      }
      : null,
    laba_rugi: isPemilik
      ? {
        pendapatan: totalPendapatan,
        pengeluaran: totalPengeluaran,
        laba_bersih: totalPendapatan - totalPengeluaran,
      }
      : null,
    grafik,
    rincian,
  });
});

module.exports = router;
