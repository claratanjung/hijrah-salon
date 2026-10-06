# Aplikasi Kasir dan Laporan Keuangan Hijrah Salon

Aplikasi web sederhana untuk kasir salon, manajemen layanan, produk, stok,
pembelian, pengeluaran, dan laporan keuangan.

## Teknologi

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL / MariaDB
- Login: JWT Auth

## Struktur Folder

```text
salon-kasir/
+-- backend/              # Server API
|   +-- middleware/       # Middleware login dan hak akses
|   +-- routes/           # Route fitur aplikasi
|   +-- db.js             # Koneksi database
|   +-- seed.js           # Membuat akun default
|   +-- server.js         # File utama backend
+-- database/
|   +-- schema.sql        # Satu file database utama
+-- frontend/             # Tampilan web
|   +-- src/
|       +-- components/   # Komponen umum
|       +-- pages/        # Halaman aplikasi
|       +-- api.js        # Koneksi frontend ke API
|       +-- App.jsx       # Routing halaman
|       +-- styles.css    # Tampilan aplikasi
+-- .gitignore
+-- README.md
```

Catatan: folder `node_modules` dan `dist` disembunyikan dari Explorer VS Code agar
tampilan folder lebih rapi. Folder tersebut tetap ada dan tetap dipakai aplikasi.

## Database

Database hanya memakai satu file:

```text
database/schema.sql
```

File ini berisi pembuatan database, tabel, data awal, akun default, layanan,
produk, dan contoh transaksi.

## Cara Menjalankan

### 1. Siapkan Database

1. Buka phpMyAdmin, DBeaver, atau MySQL Workbench.
2. Import file `database/schema.sql`.
3. Database `hijrah_saslon` akan dibuat otomatis.

### 2. Jalankan Backend

```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm start
```

Backend berjalan di:

```text
http://localhost:4000
```

### 3. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di:

```text
http://localhost:5173
```

Jika ingin dibuka dari HP satu WiFi, gunakan IP laptop, contoh:

```text
http://192.168.1.10:5173
```

## Akun Default

| Role | Email | Password | Akses |
|---|---|---|---|
| Pemilik/Admin | pemilik@salon.com | pemilik123 | Semua menu |
| Kasir | kasir@salon.com | kasir123 | Dashboard, Pemasukan, Laporan Keuangan |

## Fitur Utama

- Dashboard ringkasan pendapatan dan transaksi.
- Pemasukan untuk transaksi layanan dan produk.
- Layanan untuk mengelola daftar layanan salon.
- Produk untuk mengelola barang dan stok.
- Pembelian untuk restok produk dari supplier.
- Pengeluaran untuk biaya operasional salon.
- Laporan Keuangan dengan filter rentang tanggal dan cetak Excel.
- Pengaturan untuk identitas salon, logo, dan pengguna.

## Hak Akses

Kasir dapat mengakses:

- Dashboard
- Pemasukan
- Laporan Keuangan

Pemilik/Admin dapat mengakses semua menu, termasuk:

- Layanan
- Produk
- Pembelian
- Pengeluaran
- Pengaturan

## Catatan Stok dan Keuangan

- Produk terjual melalui Pemasukan akan mengurangi stok otomatis.
- Pembelian produk akan menambah stok otomatis.
- Pembelian produk juga otomatis dicatat sebagai pengeluaran.
- Produk dengan stok rendah akan diberi tanda `Menipis`.

## Masalah Umum

- Jika tidak bisa login, jalankan `npm run seed` di folder `backend`.
- Jika frontend kosong, pastikan backend sudah berjalan.
- Jika database gagal terkoneksi, cek file `.env` dan pastikan MySQL menyala.
- Jika ingin akses dari HP, pastikan laptop dan HP berada di jaringan WiFi yang sama.
