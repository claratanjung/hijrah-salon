// ====================================================================
//  SEED COMPREHENSIVE - Data awal lengkap Hijrah Salon
//  Jalankan setelah import schema.sql: npm run seed
// ====================================================================
require('dotenv').config();
const pool = require('./db');

(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    console.log('🌟 Memulai seeding database Hijrah Salon...\n');

    // ========== 1. PRODUK (16 item) ==========
    console.log('📦 Menambahkan produk...');
    const produk = [
      { kode: 'PRD-001', nama: 'Minyak Zaitun 250ml', hargaModal: 28000, hargaJual: 45000, stok: 20, supplier: 'PT Sehat Jaya' },
      { kode: 'PRD-002', nama: 'Hair Tonic 100ml', hargaModal: 22000, hargaJual: 38000, stok: 15, supplier: 'PT Sehat Jaya' },
      { kode: 'PRD-003', nama: 'Conditioner Makarizo 200ml', hargaModal: 38000, hargaJual: 55000, stok: 18, supplier: 'Makarizo Distributor' },
      { kode: 'PRD-004', nama: 'Masker Rambut Kemasan', hargaModal: 25000, hargaJual: 40000, stok: 12, supplier: 'Supplier Kosmetik Depok' },
      { kode: 'PRD-005', nama: 'Lulur Bengkoang 500gr', hargaModal: 40000, hargaJual: 70000, stok: 15, supplier: 'CV Herbal Nusantara' },
      { kode: 'PRD-006', nama: 'Body Scrub Coffee', hargaModal: 35000, hargaJual: 60000, stok: 8, supplier: 'CV Herbal Nusantara' },
      { kode: 'PRD-007', nama: 'Krim Bleaching', hargaModal: 45000, hargaJual: 75000, stok: 10, supplier: 'Supplier Kosmetik Depok' },
      { kode: 'PRD-008', nama: 'Shampoo Makarizo 500ml', hargaModal: 50000, hargaJual: 75000, stok: 14, supplier: 'Makarizo Distributor' },
      { kode: 'PRD-009', nama: 'Vitamin Rambut', hargaModal: 30000, hargaJual: 50000, stok: 20, supplier: 'Supplier Kosmetik Depok' },
      { kode: 'PRD-010', nama: 'Serum Rambut', hargaModal: 32000, hargaJual: 55000, stok: 16, supplier: 'Supplier Kosmetik Depok' },
      { kode: 'PRD-011', nama: 'Cream Oxidant', hargaModal: 42000, hargaJual: 70000, stok: 12, supplier: 'PT Loreal Indonesia' },
      { kode: 'PRD-012', nama: 'Cat Rambut Loreal', hargaModal: 55000, hargaJual: 90000, stok: 10, supplier: 'PT Loreal Indonesia' },
      { kode: 'PRD-013', nama: 'Cat Rambut Matrix', hargaModal: 50000, hargaJual: 85000, stok: 8, supplier: 'Matrix Distributor' },
      { kode: 'PRD-014', nama: 'Henna Rambut', hargaModal: 28000, hargaJual: 50000, stok: 18, supplier: 'CV Herbal Nusantara' },
      { kode: 'PRD-015', nama: 'Facial Cleanser', hargaModal: 35000, hargaJual: 60000, stok: 14, supplier: 'Supplier Kecantikan' },
      { kode: 'PRD-016', nama: 'Masker Wajah Gold', hargaModal: 40000, hargaJual: 70000, stok: 12, supplier: 'Supplier Kecantikan' },
    ];

    const produkIds = {};
    for (const p of produk) {
      const [result] = await conn.query(
        'INSERT INTO produk (kode, nama, harga_modal, harga_jual, stok, stok_minimum, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.kode, p.nama, p.hargaModal, p.hargaJual, p.stok, 5, p.supplier]
      );
      produkIds[p.nama] = result.insertId;
      console.log(`  ✓ ${p.nama}`);
    }

    // ========== 2. LAYANAN (dengan sub_kategori) ==========
    console.log('\n💅 Menambahkan layanan...');
    const layanan = [
      // Hair
      { nama: 'Potong Rambut', kategori: 'hair', subKategori: 'Pendek', harga: 50000, durasi: 45 },
      { nama: 'Potong Rambut', kategori: 'hair', subKategori: 'Sedang', harga: 90000, durasi: 60 },
      { nama: 'Potong Rambut', kategori: 'hair', subKategori: 'Panjang', harga: 120000, durasi: 75 },
      { nama: 'Potong Poni', kategori: 'hair', subKategori: '', harga: 25000, durasi: 20 },
      { nama: 'Hairspa Loreal', kategori: 'hair_spa', subKategori: 'Sedang', harga: 105000, durasi: 60 },
      { nama: 'Hairspa Loreal', kategori: 'hair_spa', subKategori: 'Panjang', harga: 135000, durasi: 75 },
      { nama: 'Hairspa NR', kategori: 'hair_spa', subKategori: 'Sedang', harga: 105000, durasi: 60 },
      { nama: 'Creambath Tradisional', kategori: 'creambath', subKategori: 'Sedang', harga: 85000, durasi: 60 },
      { nama: 'Cat Henna + Cuci + Blow', kategori: 'coloring', subKategori: 'Sedang', harga: 120000, durasi: 90 },
      { nama: 'Cat/Toning + Cuci + Blow', kategori: 'coloring', subKategori: 'Sedang', harga: 205000, durasi: 120 },
      { nama: 'Bleaching Rambut', kategori: 'coloring', subKategori: 'Sedang', harga: 100000, durasi: 90 },
      { nama: 'Highlight + Bleaching + Cuci', kategori: 'coloring', subKategori: 'Panjang', harga: 250000, durasi: 150 },
      { nama: 'Keriting Model + Cuci + Blow', kategori: 'treatment', subKategori: 'Panjang', harga: 300000, durasi: 180 },
      { nama: 'Smoothing Loreal + Cuci + Potong + Catok', kategori: 'treatment', subKategori: 'Panjang', harga: 350000, durasi: 180 },
      { nama: 'Styling / Set / Blow Out + Cuci Blow', kategori: 'treatment', subKategori: 'Sedang', harga: 95000, durasi: 60 },
      // Face
      { nama: 'Facial Gold', kategori: 'face', subKategori: 'Gold', harga: 150000, durasi: 75 },
      { nama: 'Facial Biokos', kategori: 'face', subKategori: 'Reguler', harga: 75000, durasi: 60 },
      { nama: 'Masker Gold', kategori: 'face', subKategori: 'Premium', harga: 55000, durasi: 30 },
      // Makeup
      { nama: 'Make Up Pro', kategori: 'makeup', subKategori: 'Wisuda', harga: 80000, durasi: 60 },
      { nama: 'Make Up Pro', kategori: 'makeup', subKategori: 'Wedding', harga: 100000, durasi: 75 },
      // Package
      { nama: 'Paket Pra Nikah 4x (Hemat)', kategori: 'package', subKategori: 'Hemat', harga: 500000, durasi: 240 },
      { nama: 'Paket Pra Nikah 4x (VIP)', kategori: 'package', subKategori: 'VIP', harga: 800000, durasi: 300 },
    ];

    const layananIds = {};
    for (const l of layanan) {
      const key = `${l.nama}|${l.subKategori}`;
      const [result] = await conn.query(
        'INSERT INTO layanan (nama, kategori, sub_kategori, harga, durasi_menit, aktif) VALUES (?, ?, ?, ?, ?, 1)',
        [l.nama, l.kategori, l.subKategori || null, l.harga, l.durasi]
      );
      layananIds[key] = result.insertId;
      console.log(`  ✓ ${l.nama} ${l.subKategori ? `(${l.subKategori})` : ''}`);
    }

    // ========== 3. RELASI LAYANAN - PRODUK ==========
    console.log('\n🔗 Menambahkan relasi layanan & produk...');
    const relasi = [
      { layananKey: 'Potong Rambut|Sedang', produk: ['Hair Tonic 100ml'] },
      { layananKey: 'Creambath Tradisional|Sedang', produk: ['Minyak Zaitun 250ml', 'Lulur Bengkoang 500gr'] },
      { layananKey: 'Hairspa Loreal|Sedang', produk: ['Conditioner Makarizo 200ml', 'Masker Rambut Kemasan'] },
      { layananKey: 'Hairspa Loreal|Panjang', produk: ['Conditioner Makarizo 200ml', 'Masker Rambut Kemasan'] },
      { layananKey: 'Bleaching Rambut|Sedang', produk: ['Krim Bleaching', 'Cream Oxidant'] },
      { layananKey: 'Cat Henna + Cuci + Blow|Sedang', produk: ['Henna Rambut', 'Shampoo Makarizo 500ml'] },
      { layananKey: 'Cat/Toning + Cuci + Blow|Sedang', produk: ['Cat Rambut Loreal', 'Cream Oxidant'] },
    ];

    for (const rel of relasi) {
      const layananId = layananIds[rel.layananKey];
      if (!layananId) {
        console.warn(`  ⚠ Layanan tidak ditemukan: ${rel.layananKey}`);
        continue;
      }
      for (const produkName of rel.produk) {
        const produkId = produkIds[produkName];
        if (!produkId) {
          console.warn(`  ⚠ Produk tidak ditemukan: ${produkName}`);
          continue;
        }
        await conn.query(
          'INSERT INTO layanan_produk (service_id, product_id, quantity) VALUES (?, ?, 1)',
          [layananId, produkId]
        );
      }
      console.log(`  ✓ ${rel.layananKey} -> ${rel.produk.join(', ')}`);
    }

    // ========== 4. CONTOH TRANSAKSI ==========
    console.log('\n💳 Menambahkan contoh transaksi...');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    const transaksiData = [
      { tanggal: today, pelanggan: 'Ibu Sari', metode: 'tunai', total: 0 },
      { tanggal: today, pelanggan: 'Ibu Rina', metode: 'transfer', total: 0 },
      { tanggal: yesterday, pelanggan: 'Ibu Dewi', metode: 'tunai', total: 0 },
    ];

    const transaksiIds = [];
    for (const t of transaksiData) {
      const [result] = await conn.query(
        'INSERT INTO transaksi (tanggal, nama_pelanggan, metode_bayar, total, pengguna_id) VALUES (?, ?, ?, ?, ?)',
        [t.tanggal, t.pelanggan, t.metode, 0, 2] // user kasir (id=2)
      );
      transaksiIds.push(result.insertId);
      console.log(`  ✓ Transaksi #${result.insertId} - ${t.pelanggan}`);
    }

    // Contoh detail transaksi
    const detailTransaksi = [
      { transaksiIdx: 0, jenis: 'layanan', refId: layananIds['Potong Rambut|Sedang'], nama: 'Potong Rambut (Sedang)', harga: 90000, qty: 1 },
      { transaksiIdx: 0, jenis: 'produk', refId: produkIds['Hair Tonic 100ml'], nama: 'Hair Tonic 100ml', harga: 38000, qty: 1 },
      { transaksiIdx: 1, jenis: 'layanan', refId: layananIds['Creambath Tradisional|Sedang'], nama: 'Creambath Tradisional', harga: 85000, qty: 1 },
      { transaksiIdx: 2, jenis: 'layanan', refId: layananIds['Hairspa Loreal|Sedang'], nama: 'Hairspa Loreal', harga: 105000, qty: 1 },
    ];

    let totalPerTransaksi = {};
    for (const detail of detailTransaksi) {
      const transaksiId = transaksiIds[detail.transaksiIdx];
      const subtotal = detail.harga * detail.qty;
      
      await conn.query(
        'INSERT INTO detail_transaksi (transaksi_id, jenis, referensi_id, nama_item, harga_satuan, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [transaksiId, detail.jenis, detail.refId, detail.nama, detail.harga, detail.qty, subtotal]
      );
      
      totalPerTransaksi[transaksiId] = (totalPerTransaksi[transaksiId] || 0) + subtotal;
    }

    // Update total transaksi
    for (const transaksiId in totalPerTransaksi) {
      await conn.query(
        'UPDATE transaksi SET total = ? WHERE id = ?',
        [totalPerTransaksi[transaksiId], transaksiId]
      );
    }

    await conn.commit();
    console.log('\n✅ Seeding berhasil! Database siap digunakan.\n');
    console.log('📊 Ringkasan:');
    console.log(`   - ${produk.length} produk ditambahkan`);
    console.log(`   - ${layanan.length} layanan ditambahkan`);
    console.log(`   - ${relasi.length} relasi layanan-produk dibuat`);
    console.log(`   - ${transaksiIds.length} contoh transaksi ditambahkan\n`);
    console.log('🔑 Login dengan:');
    console.log('   Pemilik: pemilik@salon.com / pemilik123');
    console.log('   Kasir  : kasir@salon.com / kasir123\n');

    process.exit(0);
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('❌ Gagal seeding:', e.message);
    console.error(e);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
})();
