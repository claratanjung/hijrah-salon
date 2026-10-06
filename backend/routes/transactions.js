// Rute PEMASUKAN (penjualan layanan & produk)
// Jika item produk terjual -> stok produk otomatis BERKURANG (jadi pemasukan)
const express = require('express');
const pool = require('../db');
const { auth, requireAdminOrKasir } = require('../middleware/auth');
const router = express.Router();

router.use(auth, requireAdminOrKasir);

// Bantu: filter tanggal (hari ini / minggu ini / rentang)
function buildDateFilter(query) {
  const { periode, dari, sampai } = query;
  if (periode === 'hari') return { clause: ' AND t.tanggal = CURDATE()', params: [] };
  if (periode === 'minggu')
    return { clause: ' AND YEARWEEK(t.tanggal,1) = YEARWEEK(CURDATE(),1)', params: [] };
  if (dari && sampai)
    return { clause: ' AND t.tanggal BETWEEN ? AND ?', params: [dari, sampai] };
  return { clause: '', params: [] };
}

function parseProdukTerpakai(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => ({
        id: item.id || item.ID || null,
        nama: item.nama || item.name || item.label || '',
        jumlah: Number(item.qty || item.jumlah || 1) || 1,
      }))
      .filter((item) => item.nama);
  }
  if (typeof value === 'object') {
    return Object.values(value).map((item) => ({
      id: item.id || item.ID || null,
      nama: item.nama || item.name || item.label || '',
      jumlah: Number(item.qty || item.jumlah || 1) || 1,
    })).filter((item) => item.nama);
  }
  let parsed = value;
  try {
    parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(Boolean)
        .map((item) => ({
          nama: item.nama || item.name || item.label || '',
          jumlah: Number(item.qty || item.jumlah || 1) || 1,
        }))
        .filter((item) => item.nama);
    }
  } catch {}
  return String(value)
    .split(/[;\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(.*?)\s*x\s*(\d+)$/i);
      if (match) return { nama: match[1].trim(), jumlah: Number(match[2]) || 1 };
      return { nama: s, jumlah: 1 };
    })
    .filter((item) => item.nama);
}

async function getLayananProduk(conn, layananId) {
  const [rows] = await conn.query(
    `SELECT lp.product_id AS id, lp.quantity AS jumlah, p.nama, p.stok
     FROM layanan_produk lp
     JOIN produk p ON p.id = lp.product_id
     WHERE lp.service_id = ?
     ORDER BY p.nama`,
    [layananId]
  );
  return rows;
}

async function kurangiProdukDariLayanan(conn, layananId, tgl, trxId, jumlah = 1) {
  const list = await getLayananProduk(conn, layananId);
  for (const item of list) {
    const qty = Number(item.jumlah) * Number(jumlah);
    if (qty <= 0) continue;
    const [[produk]] = await conn.query(
      'SELECT id, nama, stok FROM produk WHERE id=? LIMIT 1',
      [item.id]
    );
    if (!produk) continue;
    const stokBaru = Number(produk.stok) - qty;
    if (stokBaru < 0) {
      throw new Error(`Stok ${produk.nama} tidak mencukupi.`);
    }
    await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, produk.id]);
    await conn.query(
      `INSERT INTO mutasi_stok
       (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan)
       VALUES (?, ?, 'keluar', ?, ?, 'layanan', ?, ?)`,
      [tgl, produk.id, qty, stokBaru, trxId, `Terpakai untuk layanan #${trxId}`]
    );
  }
}

async function kembalikanProdukDariLayanan(conn, layananId, jumlah = 1, trxId) {
  const list = await getLayananProduk(conn, layananId);
  for (const item of list) {
    const qty = Number(item.jumlah) * Number(jumlah);
    if (qty <= 0) continue;
    const [[produk]] = await conn.query(
      'SELECT id, nama, stok FROM produk WHERE id=? LIMIT 1',
      [item.id]
    );
    if (!produk) continue;
    const stokBaru = Number(produk.stok) + qty;
    await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, produk.id]);
    await conn.query(
      `INSERT INTO mutasi_stok
       (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan)
       VALUES (?, ?, 'masuk', ?, ?, 'pengembalian', ?, ?)`,
      [new Date().toISOString().slice(0, 10), produk.id, qty, stokBaru, trxId, `Pengembalian untuk transaksi #${trxId}`]
    );
  }
}

// GET /api/transactions?periode=&dari=&sampai=&q=&metode=
router.get('/', auth, async (req, res) => {
  const { q = '', metode = '' } = req.query;
  const f = buildDateFilter(req.query);
  let sql = `SELECT t.*, u.nama AS kasir
             FROM transaksi t LEFT JOIN pengguna u ON u.id = t.pengguna_id
             WHERE 1=1${f.clause}`;
  const params = [...f.params];
  if (['tunai', 'transfer', 'qris'].includes(metode)) {
    sql += ' AND t.metode_bayar = ?';
    params.push(metode);
  }
  if (q) {
    sql += ' AND (t.nama_pelanggan LIKE ? OR t.keterangan LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY t.tanggal DESC, t.id DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/transactions/:id  (beserta item)
router.get('/:id', auth, async (req, res) => {
  const [[trx]] = await pool.query('SELECT * FROM transaksi WHERE id=?', [req.params.id]);
  if (!trx) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
  const [items] = await pool.query(
    `SELECT id, transaksi_id AS transaction_id, jenis, referensi_id AS ref_id,
            nama_item, harga_satuan, jumlah, subtotal
     FROM detail_transaksi WHERE transaksi_id=?`,
    [req.params.id]
  );
  res.json({ ...trx, items });
});

// POST /api/transactions  body: { tanggal, nama_pelanggan, metode_bayar, keterangan, items:[{jenis,ref_id,nama_item,harga_satuan,jumlah}] }
router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { tanggal, nama_pelanggan, metode_bayar, keterangan, items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ message: 'Minimal 1 item transaksi.' });

    await conn.beginTransaction();
    const total = items.reduce(
      (s, i) => s + Number(i.harga_satuan) * Number(i.jumlah), 0
    );
    const tgl = tanggal || new Date().toISOString().slice(0, 10);

    const [r] = await conn.query(
      `INSERT INTO transaksi (tanggal, nama_pelanggan, total, metode_bayar, keterangan, pengguna_id)
       VALUES (?,?,?,?,?,?)`,
      [tgl, nama_pelanggan || 'Umum', total, metode_bayar || 'tunai',
       keterangan || null, req.user.id]
    );
    const trxId = r.insertId;

    for (const it of items) {
      const sub = Number(it.harga_satuan) * Number(it.jumlah);
      await conn.query(
        `INSERT INTO detail_transaksi
         (transaksi_id, jenis, referensi_id, nama_item, harga_satuan, jumlah, subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        [trxId, it.jenis, it.ref_id || null, it.nama_item,
         it.harga_satuan, it.jumlah, sub]
      );
      if (it.jenis === 'produk' && it.ref_id) {
        const [[p]] = await conn.query('SELECT stok FROM produk WHERE id=?', [it.ref_id]);
        const stokBaru = (p ? p.stok : 0) - Number(it.jumlah);
        if (stokBaru < 0) {
          throw new Error('Stok produk tidak mencukupi.');
        }
        await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, it.ref_id]);
        await conn.query(
          `INSERT INTO mutasi_stok
           (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan)
           VALUES (?,?,'keluar',?,?,'penjualan',?,?)`,
          [tgl, it.ref_id, it.jumlah, stokBaru, trxId,
           `Terjual via transaksi #${trxId}`]
        );
      }
      if (it.jenis === 'layanan' && it.ref_id) {
        await kurangiProdukDariLayanan(conn, it.ref_id, tgl, trxId, Number(it.jumlah));
      }
    }
    await conn.commit();
    res.status(201).json({ id: trxId, total });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || 'Gagal menyimpan transaksi.' });
  } finally {
    conn.release();
  }
});

// PUT /api/transactions/:id  (edit header dan item)
router.put('/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { tanggal, nama_pelanggan, metode_bayar, keterangan, items } = req.body;
    const trxId = req.params.id;

    await conn.beginTransaction();
    const [[trx]] = await conn.query(
      'SELECT id, tanggal, pengguna_id FROM transaksi WHERE id=?',
      [trxId]
    );
    if (!trx) {
      await conn.rollback();
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    if (Number(trx.pengguna_id) !== Number(req.user.id)) {
      await conn.rollback();
      return res.status(403).json({
        message: 'Hanya pemilik transaksi yang dapat mengeditnya.',
      });
    }

    if (req.user.role === 'kasir') {
      const today = new Date().toISOString().slice(0, 10);
      if (trx.tanggal !== today) {
        await conn.rollback();
        return res.status(403).json({
          message: 'Kasir hanya dapat mengedit transaksi miliknya sendiri pada hari yang sama.',
        });
      }
    }

    if (!Array.isArray(items)) {
      await conn.query(
        `UPDATE transaksi SET tanggal=?, nama_pelanggan=?, metode_bayar=?, keterangan=?
         WHERE id=?`,
        [tanggal, nama_pelanggan || 'Umum', metode_bayar || 'tunai', keterangan || null, trxId]
      );
      await conn.commit();
      return res.json({ message: 'Transaksi diperbarui.' });
    }

    if (items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Minimal 1 item transaksi.' });
    }

    const [oldProductItems] = await conn.query(
      "SELECT referensi_id AS ref_id, jumlah FROM detail_transaksi WHERE transaksi_id=? AND jenis='produk'",
      [trxId]
    );
    for (const it of oldProductItems) {
      if (it.ref_id) {
        await conn.query('UPDATE produk SET stok = stok + ? WHERE id=?',
          [it.jumlah, it.ref_id]);
      }
    }

    const [oldServiceItems] = await conn.query(
      "SELECT referensi_id AS ref_id, jumlah FROM detail_transaksi WHERE transaksi_id=? AND jenis='layanan'",
      [trxId]
    );
    for (const it of oldServiceItems) {
      if (it.ref_id) {
        await kembalikanProdukDariLayanan(conn, it.ref_id, it.jumlah, trxId);
      }
    }

    await conn.query('DELETE FROM detail_transaksi WHERE transaksi_id=?', [trxId]);

    const total = items.reduce(
      (s, i) => s + Number(i.harga_satuan || 0) * Number(i.jumlah || 0), 0
    );
    const tgl = tanggal || new Date().toISOString().slice(0, 10);

    await conn.query(
      `UPDATE transaksi SET tanggal=?, nama_pelanggan=?, metode_bayar=?, keterangan=?, total=?
       WHERE id=?`,
      [tgl, nama_pelanggan || 'Umum', metode_bayar || 'tunai', keterangan || null, total, trxId]
    );

    for (const it of items) {
      const jumlah = Number(it.jumlah || 0);
      const harga = Number(it.harga_satuan || 0);
      if (!it.jenis || !it.nama_item || jumlah <= 0) {
        throw new Error('Data item transaksi tidak valid.');
      }

      const sub = harga * jumlah;
      await conn.query(
        `INSERT INTO detail_transaksi
         (transaksi_id, jenis, referensi_id, nama_item, harga_satuan, jumlah, subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        [trxId, it.jenis, it.ref_id || null, it.nama_item, harga, jumlah, sub]
      );

      if (it.jenis === 'produk' && it.ref_id) {
        const [[p]] = await conn.query('SELECT stok FROM produk WHERE id=?', [it.ref_id]);
        const stokBaru = (p ? p.stok : 0) - jumlah;
        if (stokBaru < 0) {
          throw new Error('Stok produk tidak mencukupi.');
        }
        await conn.query('UPDATE produk SET stok=? WHERE id=?', [stokBaru, it.ref_id]);
        await conn.query(
          `INSERT INTO mutasi_stok
           (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan)
           VALUES (?,?,'keluar',?,?,'penjualan',?,?)`,
          [tgl, it.ref_id, jumlah, stokBaru, trxId,
           `Terjual via transaksi #${trxId}`]
        );
      }

      if (it.jenis === 'layanan' && it.ref_id) {
        await kurangiProdukDariLayanan(conn, it.ref_id, tgl, trxId, jumlah);
      }
    }

    await conn.commit();
    res.json({ message: 'Transaksi diperbarui.', total });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || 'Gagal memperbarui transaksi.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
