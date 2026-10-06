// Koneksi database MySQL (connection pool)
require('dotenv').config();
const mysql = require('mysql2/promise');
const { categories, services, products } = require('./catalog');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hijrah_salon',

  ssl: process.env.DB_SSL === 'true'
    ? {
        minVersion: 'TLSv1.2',
      }
    : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

async function ensureSchema() {
  try {
    await seedCatalog();
  } catch (e) {
    console.error('Schema auto-check gagal:', e.message);
  }
}

async function seedCatalog() {
  const [categoryRows] = await pool.query('SELECT id, nama_kategori FROM kategori_layanan');
  const categoryMap = Object.fromEntries(categoryRows.map((row) => [row.nama_kategori, row.id]));

  for (const [kategori, nama, harga, durasi] of services) {
    const kategoriId = categoryMap[kategori];
    if (!kategoriId) continue;
    const [[existing]] = await pool.query(
      `SELECT id FROM layanan
       WHERE nama_layanan = ? OR nama = ?
       LIMIT 1`,
      [nama, nama]
    );
    if (existing) {
      await pool.query(
        `UPDATE layanan SET nama_layanan=?, nama=?, kategori_id=?, kategori=?, harga=?,
         durasi=?, durasi_menit=?, status=1, aktif=1 WHERE id=?`,
        [nama, nama, kategoriId, kategori, harga, durasi, durasi, existing.id]
      );
      continue;
    }
    await pool.query(
      `INSERT INTO layanan
       (kategori_id, nama_layanan, nama, harga, durasi, durasi_menit, status, aktif, kategori)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [kategoriId, nama, nama, harga, durasi, durasi, kategori]
    );
  }

  for (const product of products) {
    await pool.query(
      `INSERT IGNORE INTO produk
       (kode, nama, harga_modal, harga_jual, stok, stok_minimum, supplier, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      product
    );
  }
}

ensureSchema();

module.exports = pool;
