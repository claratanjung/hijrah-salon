-- =====================================================================
--  SALON KASIR - SKEMA DATABASE MySQL
--  Aplikasi Kasir + Laporan Keuangan UMKM Salon (Hijrah Salon)
-- =====================================================================
--  Cara pakai:
--    1. Buka MySQL / phpMyAdmin / DBeaver
--    2. Jalankan seluruh file ini (Import / Run SQL)
--    Database, tabel, dan data contoh akan dibuat otomatis.
-- =====================================================================

DROP DATABASE IF EXISTS hijrah_salon;
CREATE DATABASE hijrah_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hijrah_salon;

-- ---------------------------------------------------------------------
-- 1. PENGGUNA  (pemilik/admin & kasir)
-- ---------------------------------------------------------------------
CREATE TABLE pengguna (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100)  NOT NULL,
  email         VARCHAR(120)  NOT NULL UNIQUE,
  kata_sandi    VARCHAR(120)  NOT NULL,           -- password biasa sesuai permintaan
  peran         ENUM('pemilik','kasir') NOT NULL DEFAULT 'kasir',
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. PENGATURAN  (identitas salon)
-- ---------------------------------------------------------------------
CREATE TABLE pengaturan (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nama_salon    VARCHAR(150) NOT NULL DEFAULT 'Hijrah Salon',
  alamat        VARCHAR(255) DEFAULT '',
  telepon       VARCHAR(50)  DEFAULT '',
  logo_url      TEXT,
  diubah_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 3. KATEGORI_LAYANAN  (kategori katalog Hijrah Salon)
-- ---------------------------------------------------------------------
CREATE TABLE kategori_layanan (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori  VARCHAR(120) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- 4. LAYANAN  (daftar layanan salon dari katalog Hijrah Salon)
-- ---------------------------------------------------------------------
CREATE TABLE layanan (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  kategori_id    INT NOT NULL,
  nama_layanan   VARCHAR(150) NOT NULL,
  harga          DECIMAL(12,2) NOT NULL DEFAULT 0,
  durasi         INT NOT NULL DEFAULT 60,
  status         TINYINT(1) NOT NULL DEFAULT 1,
  -- kolom kompatibilitas aplikasi lama
  nama           VARCHAR(150) DEFAULT NULL,
  durasi_menit   INT DEFAULT NULL,
  kategori       VARCHAR(120) DEFAULT NULL,
  sub_kategori   VARCHAR(60) DEFAULT NULL,
  harga_pendek   DECIMAL(12,2) DEFAULT NULL,
  harga_sedang   DECIMAL(12,2) DEFAULT NULL,
  harga_panjang  DECIMAL(12,2) DEFAULT NULL,
  produk_terpakai TEXT,
  keterangan     TEXT,
  aktif          TINYINT(1) NOT NULL DEFAULT 1,
  dibuat_pada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kategori_id) REFERENCES kategori_layanan(id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 5. PRODUK  (produk yang dijual / dipakai)
-- ---------------------------------------------------------------------
CREATE TABLE produk (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  kode          VARCHAR(40) NOT NULL UNIQUE,
  nama          VARCHAR(150) NOT NULL,
  harga_modal   DECIMAL(12,2) NOT NULL DEFAULT 0,
  harga_jual    DECIMAL(12,2) NOT NULL DEFAULT 0,
  stok          INT NOT NULL DEFAULT 0,
  stok_minimum  INT NOT NULL DEFAULT 5,
  supplier      VARCHAR(150) DEFAULT '',
  aktif         TINYINT(1) NOT NULL DEFAULT 1,
  expired       DATE DEFAULT NULL,
  keterangan    TEXT,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 5. TRANSAKSI  (PEMASUKAN - penjualan layanan & produk)
-- ---------------------------------------------------------------------
CREATE TABLE transaksi (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  nama_pelanggan VARCHAR(120) DEFAULT 'Umum',
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  metode_bayar  VARCHAR(40) DEFAULT 'tunai',
  keterangan    TEXT,
  pengguna_id   INT,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE SET NULL
);

CREATE TABLE detail_transaksi (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  transaksi_id   INT NOT NULL,
  jenis          ENUM('layanan','produk') NOT NULL,
  referensi_id   INT,                       -- id layanan atau id produk
  nama_item      VARCHAR(160) NOT NULL,
  harga_satuan   DECIMAL(12,2) NOT NULL DEFAULT 0,
  jumlah         INT NOT NULL DEFAULT 1,
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6. PENGELUARAN  (biaya operasional)
-- ---------------------------------------------------------------------
CREATE TABLE pengeluaran (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  kategori      VARCHAR(60) NOT NULL,        -- sewa, gaji, listrik, beli_produk, lainnya
  jumlah        DECIMAL(12,2) NOT NULL DEFAULT 0,
  keterangan    TEXT,
  sumber        VARCHAR(30) DEFAULT 'manual', -- 'manual' atau 'pembelian'
  referensi_id  INT,                          -- id pembelian jika dari stok masuk
  pengguna_id   INT,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 7. PEMBELIAN  (produk ke supplier -> stok masuk)
-- ---------------------------------------------------------------------
CREATE TABLE pembelian (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  produk_id     INT NOT NULL,
  supplier      VARCHAR(150) DEFAULT '',
  jumlah        INT NOT NULL DEFAULT 1,
  harga_satuan  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  keterangan    TEXT,
  pengguna_id   INT,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE CASCADE,
  FOREIGN KEY (pengguna_id) REFERENCES pengguna(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 8. MUTASI_STOK  (riwayat pergerakan stok masuk/keluar)
-- ---------------------------------------------------------------------
CREATE TABLE mutasi_stok (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  produk_id     INT NOT NULL,
  tipe          ENUM('masuk','keluar') NOT NULL,
  jumlah        INT NOT NULL DEFAULT 0,
  stok_akhir    INT NOT NULL DEFAULT 0,
  sumber        VARCHAR(40) DEFAULT 'manual', -- pembelian, penjualan, manual, koreksi
  referensi_id  INT,
  keterangan    TEXT,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE CASCADE
);

-- =====================================================================
-- 9. LAYANAN_PRODUK  (relasi layanan dengan produk yang digunakan)
-- =====================================================================
CREATE TABLE layanan_produk (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  service_id    INT NOT NULL,
  product_id    INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  dibuat_pada   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES layanan(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES produk(id) ON DELETE CASCADE,
  UNIQUE KEY uk_service_product (service_id, product_id)
);

-- =====================================================================
--  DATA AWAL
-- =====================================================================

-- Pengaturan salon
INSERT INTO pengaturan (nama_salon, alamat, telepon, logo_url) VALUES
('Hijrah Salon', 'Depok, Jawa Barat', '0821 1598 6004', '');

-- User default
--   pemilik@salon.com  ->  pemilik123
--   kasir@salon.com    ->  kasir123
INSERT INTO pengguna (nama, email, kata_sandi, peran) VALUES
('Pemilik Salon', 'pemilik@salon.com', 'pemilik123', 'pemilik'),
('Kasir Salon',   'kasir@salon.com',   'kasir123', 'kasir');
-- Akun baru dibuat oleh pemilik/admin di menu Pengaturan.

-- Kategori layanan katalog Hijrah Salon
INSERT INTO kategori_layanan (nama_kategori) VALUES
('Perawatan Rambut'),
('Perawatan Wajah'),
('Pijat, Lulur & Waxing'),
('Spa'),
('Estebel & Kuku'),
('Paket Pra Nikah');

-- Layanan (sesuai data yang tampil di aplikasi produksi Hijrah Salon)
INSERT INTO layanan
(kategori_id, nama_layanan, nama, harga, durasi, durasi_menit, status, aktif, kategori, sub_kategori, keterangan) VALUES
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Bleaching Rambut', 'Bleaching Rambut', 125000, 90, 90, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 70000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 55000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 'Blow Variasi / Catok Setelah Creambath / Pewarnaan', 80000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat / Toning + Cuci + Blow', 'Cat / Toning + Cuci + Blow', 225000, 120, 120, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat / Toning + Cuci + Blow', 'Cat / Toning + Cuci + Blow', 200000, 120, 120, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat / Toning + Cuci + Blow', 'Cat / Toning + Cuci + Blow', 240000, 120, 120, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat Henna + Cuci + Blow', 'Cat Henna + Cuci + Blow', 150000, 90, 90, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat Henna + Cuci + Blow', 'Cat Henna + Cuci + Blow', 95000, 90, 90, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cat Henna + Cuci + Blow', 'Cat Henna + Cuci + Blow', 190000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Creambath Tradisional', 'Creambath Tradisional', 95000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Creambath Tradisional', 'Creambath Tradisional', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Creambath Tradisional', 'Creambath Tradisional', 105000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Cuci + Blow + Hair Tonic', 'Cuci + Blow + Hair Tonic', 95000, 59, 59, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Loreal', 'Hairspa Loreal', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Loreal', 'Hairspa Loreal', 155000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Loreal', 'Hairspa Loreal', 120000, 90, 90, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa NR', 'Hairspa NR', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa NR', 'Hairspa NR', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa NR', 'Hairspa NR', 120000, 90, 90, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Texture Makarizo', 'Hairspa Texture Makarizo', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Texture Makarizo', 'Hairspa Texture Makarizo', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Hairspa Texture Makarizo', 'Hairspa Texture Makarizo', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Highlight + Bleaching + Cuci', 'Highlight + Bleaching + Cuci', 260000, 150, 150, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Highlight + Bleaching + Cuci', 'Highlight + Bleaching + Cuci', 280000, 150, 150, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Highlight + Bleaching + Cuci', 'Highlight + Bleaching + Cuci', 220000, 150, 150, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Keriting Model + Cuci + Blow', 'Keriting Model + Cuci + Blow', 160000, 120, 120, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Gingseng', 'Masker Gingseng', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Gingseng', 'Masker Gingseng', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Gingseng', 'Masker Gingseng', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Green Tea', 'Masker Green Tea', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Green Tea', 'Masker Green Tea', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Green Tea', 'Masker Green Tea', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Kiwi', 'Masker Kiwi', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Kiwi', 'Masker Kiwi', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Kiwi', 'Masker Kiwi', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Lumpur', 'Masker Lumpur', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Lumpur', 'Masker Lumpur', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Lumpur (Rambut)', 'Masker Lumpur (Rambut)', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Madu', 'Masker Madu', 130000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Madu', 'Masker Madu', 145000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Masker Madu (Rambut)', 'Masker Madu (Rambut)', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Potong Poni', 'Potong Poni', 30000, 15, 15, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Potong Rambut + Cuci + Hair Tonic + Blow', 'Potong Rambut + Cuci + Hair Tonic + Blow', 85000, 60, 60, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Potong Rambut + Cuci + Hair Tonic + Blow', 'Potong Rambut + Cuci + Hair Tonic + Blow', 120000, 60, 60, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Potong Rambut + Cuci + Hair Tonic + Blow', 'Potong Rambut + Cuci + Hair Tonic + Blow', 75000, 60, 60, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Potong Setelah Creambath', 'Potong Setelah Creambath', 40000, 20, 20, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Smoothing Loreal + Cuci + Potong + Catok', 'Smoothing Loreal + Cuci + Potong + Catok', 360000, 180, 180, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Smoothing Loreal + Cuci + Potong + Catok', 'Smoothing Loreal + Cuci + Potong + Catok', 380000, 180, 180, 1, 1, 'Perawatan Rambut', 'Pendek', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Smoothing Loreal + Cuci + Potong + Catok', 'Smoothing Loreal + Cuci + Potong + Catok', 500000, 210, 210, 1, 1, 'Perawatan Rambut', 'Sedang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Smoothing Loreal + Cuci + Potong + Catok', 'Smoothing Loreal + Cuci + Potong + Catok', 520000, 250, 250, 1, 1, 'Perawatan Rambut', 'Panjang', NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Rambut'), 'Styling / Set / Blow Out + Cuci Blow', 'Styling / Set / Blow Out + Cuci Blow', 120000, 60, 60, 1, 1, 'Perawatan Rambut', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Bulu Mata', 'Bulu Mata', 50000, 30, 30, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial Biokos', 'Facial Biokos', 85000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, 'Massage + Wajah + Leher + Masker + Rapi Alis'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial Estebel', 'Facial Estebel', 225000, 75, 75, 1, 1, 'Perawatan Wajah', NULL, 'Mengencangkan kulit wajah'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial La Tulip', 'Facial La Tulip', 85000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, 'Massage + Wajah + Leher + Masker + Rapi Alis'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial Novage (Oriflame)', 'Facial Novage (Oriflame)', 200000, 75, 75, 1, 1, 'Perawatan Wajah', NULL, 'Mencerahkan kulit wajah'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial Ristra', 'Facial Ristra', 85000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, 'Massage + Wajah + Leher + Masker + Rapi Alis'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Facial Sari Ayu', 'Facial Sari Ayu', 75000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, 'Massage + Wajah + Leher + Masker + Rapi Alis'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Make-Up Pro (Full/Lengkap)', 'Make-Up Pro (Full/Lengkap)', 100000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Make-Up Pro (Natural)', 'Make-Up Pro (Natural)', 80000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Masker Berlian', 'Masker Berlian', 60000, 30, 30, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Masker Gold', 'Masker Gold', 60000, 30, 30, 1, 1, 'Perawatan Wajah', NULL, 'Mencegah kulit keriput'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Masker Lumpur', 'Masker Lumpur', 30000, 30, 30, 1, 1, 'Perawatan Wajah', NULL, 'Detoksifikasi kulit'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Pemakaian Vitamin C Setelah Facial', 'Pemakaian Vitamin C Setelah Facial', 45000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Rapi Alis', 'Rapi Alis', 20000, 15, 15, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Sanggul / Jilbab', 'Sanggul / Jilbab', 80000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Sanggul / Jilbab', 'Sanggul / Jilbab', 75000, 45, 45, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Setrika Wajah', 'Setrika Wajah', 115000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, 'Mengencangkan kulit wajah'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Tambah Masker Topeng Saat Facial', 'Tambah Masker Topeng Saat Facial', 30000, 60, 60, 1, 1, 'Perawatan Wajah', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Perawatan Wajah'), 'Totok Wajah', 'Totok Wajah', 75000, 45, 45, 1, 1, 'Perawatan Wajah', NULL, 'Menghilangkan kerutan'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Aroma Rempah Dupa Ratus', 'Aroma Rempah Dupa Ratus', 50000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Bleaching Badan', 'Bleaching Badan', 120000, 60, 60, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Bleaching Tangan + Kaki', 'Bleaching Tangan + Kaki', 90000, 45, 45, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Kerokan (Daerah Bahu dan Punggung)', 'Kerokan (Daerah Bahu dan Punggung)', 50000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Kerokan (Seluruh Badan)', 'Kerokan (Seluruh Badan)', 60000, 45, 45, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Lulur Keraton Putih', 'Lulur Keraton Putih', 115000, 60, 60, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Lulur Tradisional', 'Lulur Tradisional', 115000, 60, 60, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Masker Hijau Daun', 'Masker Hijau Daun', 25000, 15, 15, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Masker Madu', 'Masker Madu', 25000, 15, 15, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Masker Rumput Laut Mati', 'Masker Rumput Laut Mati', 115000, 45, 45, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Massage Tangan / Kaki', 'Massage Tangan / Kaki', 45000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Pijat Tradisional', 'Pijat Tradisional', 115000, 60, 60, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Sauna', 'Sauna', 45000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Waxing Bikini', 'Waxing Bikini', 105000, 40, 40, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Waxing Kaki', 'Waxing Kaki', 80000, 40, 40, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Waxing Ketiak', 'Waxing Ketiak', 50000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Pijat, Lulur & Waxing'), 'Waxing Tangan', 'Waxing Tangan', 70000, 30, 30, 1, 1, 'Pijat, Lulur & Waxing', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Bengkoang Spa', 'Bengkoang Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Mencegah penuaan dini'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Chocolate Spa', 'Chocolate Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Aroma coklat, regenerasi kulit'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Coffee & Cinnamon Spa', 'Coffee & Cinnamon Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Scrub kopi murni + kayu manis'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Ginger Spa', 'Ginger Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Ramuan jahe menghangatkan tubuh'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Green Tea Spa', 'Green Tea Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Anti oksidan & menjaga kelembapan'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Jasmine Spa', 'Jasmine Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Ekstrak bunga melati untuk nutrisi kulit'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Keraton Spa', 'Keraton Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Lulur ramuan asli khas keraton Yogyakarta'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Light Glow Spa', 'Light Glow Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Mencerahkan & menghaluskan kulit'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Spa'), 'Strawberry Spa', 'Strawberry Spa', 160000, 90, 90, 1, 1, 'Spa', NULL, 'Sari buah strawberry, anti oksidan'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Estebel Spa', 'Estebel Spa', 190000, 90, 90, 1, 1, 'Estebel & Kuku', NULL, 'Detoksifikasi & aroma essential oil'),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Manicure Oriflame', 'Manicure Oriflame', 75000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Massage & Pedicure Oriflame', 'Massage & Pedicure Oriflame', 130000, 60, 60, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Menicure Oriflame', 'Menicure Oriflame', 65000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Pedicure Oriflame', 'Pedicure Oriflame', 75000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Perawatan Estebel Untuk Lemak Di Perut', 'Perawatan Estebel Untuk Lemak Di Perut', 25000, 30, 30, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Perawatan Estebel Untuk Lengan', 'Perawatan Estebel Untuk Lengan', 100000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Perawatan Estebel Untuk Payudara', 'Perawatan Estebel Untuk Payudara', 100000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Perawatan Estebel Untuk Selulite Di Bokong', 'Perawatan Estebel Untuk Selulite Di Bokong', 100000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Estebel & Kuku'), 'Perawatan Estebel Untuk Selulite Di Paha', 'Perawatan Estebel Untuk Selulite Di Paha', 100000, 45, 45, 1, 1, 'Estebel & Kuku', NULL, NULL),
((SELECT id FROM kategori_layanan WHERE nama_kategori='Paket Pra Nikah'), 'Paket Pra Nikah 4x (Hemat)', 'Paket Pra Nikah 4x (Hemat)', 1550000, 480, 480, 1, 1, 'Paket Pra Nikah', NULL, '4x kunjungan, FREE masker wajah, potong rambut, waxing underarm');

-- Produk retail (sesuai data yang tampil di aplikasi produksi Hijrah Salon)
-- Catatan: kolom harga_jual disamakan dgn harga_modal karena tabel Produk di admin
-- hanya menampilkan Harga Beli. Silakan sesuaikan margin harga_jual sesuai kebijakan salon.
INSERT INTO produk (kode, nama, harga_modal, harga_jual, stok, stok_minimum, supplier, keterangan) VALUES
('PRD-001', 'Shampoo Loreal Professionnel 250ml', 45000, 45000, 10, 5, 'PT L''Oreal Indonesia', NULL),
('PRD-002', 'Conditioner Makarizo 200ml', 38000, 38000, 10, 5, 'Makarizo Distributor', NULL),
('PRD-003', 'Hair Tonic NR 100ml', 22000, 22000, 10, 5, 'PT NR Indonesia', NULL),
('PRD-004', 'Vitamin Rambut Serum 100ml', 30000, 30000, 10, 5, 'PT Miranda', NULL),
('PRD-005', 'Krim Bleaching Rambut 500g', 95000, 95000, 10, 5, 'Supplier Kosmetik Depok', NULL),
('PRD-006', 'Pewarna Rambut Loreal Majirel', 120000, 120000, 10, 5, 'PT L''Oreal Indonesia', NULL);

-- Contoh transaksi pemasukan (beberapa hari terakhir)
INSERT INTO transaksi (tanggal, nama_pelanggan, total, metode_bayar, keterangan, pengguna_id) VALUES
(CURDATE(),                       'Ibu Sari',  205000, 'tunai',    'Facial + produk', 2),
(CURDATE(),                       'Ibu Rina',  140000, 'transfer', 'Keraton Spa',     2),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Ibu Dewi', 90000,  'tunai',  'Pijat Tradisional', 2),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Ibu Maya', 175000, 'tunai',  'Hairspa + Shampoo', 2),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Ibu Lia',  150000, 'transfer','Estebel Spa',     2);

INSERT INTO detail_transaksi (transaksi_id, jenis, referensi_id, nama_item, harga_satuan, jumlah, subtotal) VALUES
(1, 'layanan', 25, 'Facial Biokos', 75000, 1, 75000),
(1, 'produk',  1,  'Shampoo Loreal 250ml', 65000, 2, 130000),
(2, 'layanan', 1,  'Keraton Spa', 140000, 1, 140000),
(3, 'layanan', 11, 'Pijat Tradisional', 90000, 1, 90000),
(4, 'layanan', 52, 'Hairspa Loreal', 105000, 1, 105000),
(4, 'produk',  3,  'Vitamin Rambut Serum', 50000, 1, 50000),
(5, 'layanan', 10, 'Estebel Spa', 150000, 1, 150000);

-- Contoh pengeluaran
INSERT INTO pengeluaran (tanggal, kategori, jumlah, keterangan, sumber, pengguna_id) VALUES
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'sewa',    2500000, 'Sewa ruko bulan ini', 'manual', 1),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'gaji',    4000000, 'Gaji 2 terapis',      'manual', 1),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'listrik', 650000,  'Token listrik',       'manual', 1),
(CURDATE(),                           'lainnya', 120000,  'ATK & perlengkapan',  'manual', 1);

-- Contoh pembelian produk ke supplier (otomatis jadi pengeluaran + stok masuk)
INSERT INTO pembelian (tanggal, produk_id, supplier, jumlah, harga_satuan, total, keterangan, pengguna_id) VALUES
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 1, 'PT Loreal Indonesia', 12, 45000, 540000, 'Restok shampoo', 1);

INSERT INTO pengeluaran (tanggal, kategori, jumlah, keterangan, sumber, referensi_id, pengguna_id) VALUES
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'beli_produk', 540000, 'Pembelian: Shampoo Loreal 250ml x12', 'pembelian', 1, 1);

INSERT INTO mutasi_stok (tanggal, produk_id, tipe, jumlah, stok_akhir, sumber, referensi_id, keterangan) VALUES
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 1, 'masuk', 12, 24, 'pembelian', 1, 'Restok dari PT Loreal Indonesia'),
(CURDATE(), 1, 'keluar', 2, 22, 'penjualan', 1, 'Terjual via transaksi #1');

-- selesai
SELECT 'Database hijrah_salon berhasil dibuat beserta data contoh.' AS info;