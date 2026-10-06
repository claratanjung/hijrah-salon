// Rute Manajemen Layanan Salon (CRUD + pencarian + filter kategori)
const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

function normalizeServiceProducts(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => ({
        id: item.id || item.productId || item.product_id || null,
        nama: item.nama || item.name || item.product?.nama || item.product?.name || '',
        qty: Number(item.qty || item.quantity || item.jumlah || 1) || 1,
      }))
      .filter((item) => item.id || item.nama);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeServiceProducts(parsed);
    } catch {}
  }
  return [];
}

function serializeServiceProducts(value) {
  const items = normalizeServiceProducts(value);
  return items.map((item) => ({
    productId: Number(item.id),
    quantity: Number(item.qty || item.quantity || 1) || 1,
  })).filter((item) => item.productId);
}

async function syncServiceProducts(conn, serviceId, value) {
  const items = serializeServiceProducts(value);
  await conn.query('DELETE FROM layanan_produk WHERE service_id=?', [serviceId]);
  for (const item of items) {
    await conn.query(
      'INSERT INTO layanan_produk (service_id, product_id, quantity) VALUES (?, ?, ?)',
      [serviceId, item.productId, item.quantity]
    );
  }
}

async function resolveCategoryId(conn, kategoriId, kategoriName) {
  if (kategoriId) return Number(kategoriId);
  if (!kategoriName) return null;
  const [[row]] = await conn.query(
    'SELECT id FROM kategori_layanan WHERE nama_kategori=? LIMIT 1',
    [kategoriName]
  );
  if (row) return row.id;
  const [created] = await conn.query(
    'INSERT INTO kategori_layanan (nama_kategori) VALUES (?)',
    [kategoriName]
  );
  return created.insertId;
}

const serviceSelect = `
  SELECT
    l.*,
    COALESCE(l.nama_layanan, l.nama) AS nama,
    COALESCE(l.nama_layanan, l.nama) AS nama_layanan,
    COALESCE(l.durasi, l.durasi_menit) AS durasi,
    COALESCE(l.durasi, l.durasi_menit) AS durasi_menit,
    COALESCE(l.status, l.aktif) AS status,
    COALESCE(l.status, l.aktif) AS aktif,
    k.nama_kategori AS kategori,
    k.nama_kategori AS nama_kategori
  FROM layanan l
  LEFT JOIN kategori_layanan k ON k.id = l.kategori_id
`;

// GET /api/services/categories
router.get('/categories', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nama_kategori FROM kategori_layanan ORDER BY id'
  );
  res.json(rows);
});

// GET /api/services?q=&kategori=
router.get('/', auth, async (req, res) => {
  const { q = '', kategori = '', kategori_id = '' } = req.query;
  let sql = `${serviceSelect} WHERE 1=1`;
  const params = [];
  if (q) {
    sql += ' AND COALESCE(l.nama_layanan, l.nama) LIKE ?';
    params.push(`%${q}%`);
  }
  if (kategori_id) {
    sql += ' AND l.kategori_id = ?';
    params.push(kategori_id);
  } else if (kategori) {
    sql += ' AND (k.nama_kategori = ? OR l.kategori = ?)';
    params.push(kategori, kategori);
  }
  sql += ' ORDER BY k.id, COALESCE(l.nama_layanan, l.nama)';
  const [rows] = await pool.query(sql, params);
  const services = await Promise.all(rows.map(async (service) => {
    const [linked] = await pool.query(
      `SELECT lp.product_id AS id, lp.quantity AS qty, p.nama
       FROM layanan_produk lp
       JOIN produk p ON p.id = lp.product_id
       WHERE lp.service_id = ?
       ORDER BY p.nama`,
      [service.id]
    );
    return { ...service, serviceProducts: linked };
  }));
  res.json(services);
});

// GET /api/services/:id
router.get('/:id', auth, async (req, res) => {
  const [[service]] = await pool.query(`${serviceSelect} WHERE l.id=?`, [req.params.id]);
  if (!service) return res.status(404).json({ message: 'Layanan tidak ditemukan.' });
  const [linked] = await pool.query(
    `SELECT lp.product_id AS id, lp.quantity AS qty, p.nama
     FROM layanan_produk lp
     JOIN produk p ON p.id = lp.product_id
     WHERE lp.service_id = ?
     ORDER BY p.nama`,
    [req.params.id]
  );
  res.json({ ...service, serviceProducts: linked });
});

function serializeProdukTerpakai(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// POST /api/services
router.post('/', auth, requireRole('pemilik'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      nama,
      nama_layanan,
      harga,
      durasi,
      durasi_menit,
      kategori_id,
      kategori,
      keterangan,
      sub_kategori,
      harga_pendek,
      harga_sedang,
      harga_panjang,
      produk_terpakai,
      serviceProducts,
    } = req.body;
    const serviceName = nama_layanan || nama;
    if (!serviceName) return res.status(400).json({ message: 'Nama layanan wajib diisi.' });
    await conn.beginTransaction();
    const resolvedCategoryId = await resolveCategoryId(conn, kategori_id, kategori);
    const resolvedDuration = durasi || durasi_menit || 60;
    const [r] = await conn.query(
      `INSERT INTO layanan (
        kategori_id, nama_layanan, nama, harga, durasi, durasi_menit, status, aktif,
        kategori, keterangan, sub_kategori, harga_pendek, harga_sedang, harga_panjang,
        produk_terpakai
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        resolvedCategoryId,
        serviceName,
        serviceName,
        harga || 0,
        resolvedDuration,
        resolvedDuration,
        1,
        1,
        kategori || null,
        keterangan || null,
        sub_kategori || null,
        harga_pendek || null,
        harga_sedang || null,
        harga_panjang || null,
        serializeProdukTerpakai(produk_terpakai || serviceProducts),
      ]
    );
    await syncServiceProducts(conn, r.insertId, serviceProducts || produk_terpakai);
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || 'Gagal menyimpan layanan.' });
  } finally {
    conn.release();
  }
});

// PUT /api/services/:id
router.put('/:id', auth, requireRole('pemilik'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      nama,
      nama_layanan,
      harga,
      durasi,
      durasi_menit,
      kategori_id,
      kategori,
      keterangan,
      aktif,
      status,
      sub_kategori,
      harga_pendek,
      harga_sedang,
      harga_panjang,
      produk_terpakai,
      serviceProducts,
    } = req.body;
    await conn.beginTransaction();
    const serviceName = nama_layanan || nama;
    const resolvedCategoryId = await resolveCategoryId(conn, kategori_id, kategori);
    const resolvedDuration = durasi || durasi_menit || 60;
    const resolvedStatus = status === undefined
      ? (aktif === undefined ? 1 : aktif)
      : status;
    await conn.query(
      `UPDATE layanan SET kategori_id=?, nama_layanan=?, nama=?, harga=?,
       durasi=?, durasi_menit=?, status=?, aktif=?, kategori=?, keterangan=?,
       sub_kategori=?, harga_pendek=?, harga_sedang=?, harga_panjang=?, produk_terpakai=?
       WHERE id=?`,
      [
        resolvedCategoryId,
        serviceName,
        serviceName,
        harga || 0,
        resolvedDuration,
        resolvedDuration,
        resolvedStatus,
        resolvedStatus,
        kategori || null,
        keterangan || null,
        sub_kategori || null,
        harga_pendek || null,
        harga_sedang || null,
        harga_panjang || null,
        serializeProdukTerpakai(produk_terpakai || serviceProducts),
        req.params.id,
      ]
    );
    await syncServiceProducts(conn, req.params.id, serviceProducts || produk_terpakai);
    await conn.commit();
    res.json({ message: 'Layanan diperbarui.' });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || 'Gagal memperbarui layanan.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/services/:id
router.delete('/:id', auth, requireRole('pemilik'), async (req, res) => {
  await pool.query('DELETE FROM layanan WHERE id=?', [req.params.id]);
  res.json({ message: 'Layanan dihapus.' });
});

module.exports = router;
