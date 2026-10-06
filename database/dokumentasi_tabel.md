# Dokumentasi Tabel Database Salon Kasir

Database yang digunakan bernama `hijrah_salon`. Penamaan tabel dan kolom utama dibuat memakai bahasa Indonesia agar mudah dijelaskan dalam laporan.

## Daftar Tabel

| No | Nama Tabel | Fungsi |
| --- | --- | --- |
| 1 | `pengguna` | Menyimpan akun pemilik/admin dan kasir yang dapat masuk ke aplikasi. |
| 2 | `pengaturan` | Menyimpan identitas salon seperti nama salon, alamat, telepon, dan logo. |
| 3 | `kategori_layanan` | Menyimpan kategori layanan dari katalog Hijrah Salon. |
| 4 | `layanan` | Menyimpan daftar jasa salon beserta harga, durasi, kategori, dan status aktif. |
| 5 | `produk` | Menyimpan data produk yang dijual atau dipakai salon, termasuk harga dan stok. |
| 6 | `transaksi` | Menyimpan data pemasukan dari penjualan layanan dan produk. |
| 7 | `detail_transaksi` | Menyimpan rincian item layanan atau produk pada setiap transaksi. |
| 8 | `pengeluaran` | Menyimpan biaya operasional salon, termasuk pengeluaran manual dan pembelian produk. |
| 9 | `pembelian` | Menyimpan transaksi pembelian produk dari supplier yang menambah stok. |
| 10 | `mutasi_stok` | Menyimpan riwayat perubahan stok, baik masuk, keluar, maupun koreksi manual. |

## Relasi Utama

| Relasi | Keterangan |
| --- | --- |
| `transaksi.pengguna_id` -> `pengguna.id` | Menunjukkan kasir/pengguna yang mencatat pemasukan. |
| `layanan.kategori_id` -> `kategori_layanan.id` | Menghubungkan layanan dengan kategori katalog. |
| `detail_transaksi.transaksi_id` -> `transaksi.id` | Menghubungkan rincian item dengan transaksi utama. |
| `pengeluaran.pengguna_id` -> `pengguna.id` | Menunjukkan pengguna yang mencatat pengeluaran. |
| `pembelian.produk_id` -> `produk.id` | Menunjukkan produk yang dibeli dari supplier. |
| `pembelian.pengguna_id` -> `pengguna.id` | Menunjukkan pengguna yang mencatat pembelian. |
| `mutasi_stok.produk_id` -> `produk.id` | Menunjukkan produk yang stoknya berubah. |

## Struktur Kolom Ringkas

### `pengguna`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama pengguna. |
| `nama` | Nama pengguna. |
| `email` | Email untuk login. |
| `kata_sandi` | Kata sandi akun. |
| `peran` | Hak akses pengguna, yaitu `pemilik` atau `kasir`. |
| `dibuat_pada` | Waktu data pengguna dibuat. |

### `pengaturan`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama pengaturan. |
| `nama_salon` | Nama salon. |
| `alamat` | Alamat salon. |
| `telepon` | Nomor telepon salon. |
| `logo_url` | Lokasi atau data logo salon. |
| `diubah_pada` | Waktu terakhir data pengaturan diubah. |

### `kategori_layanan`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama kategori layanan. |
| `nama_kategori` | Nama kategori layanan, misalnya Perawatan Rambut atau Spa. |

### `layanan`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama layanan. |
| `kategori_id` | Relasi ke tabel `kategori_layanan`. |
| `nama_layanan` | Nama layanan salon. |
| `harga` | Harga layanan. |
| `durasi` | Perkiraan durasi layanan dalam menit. |
| `status` | Status layanan aktif atau tidak. |
| `dibuat_pada` | Waktu data layanan dibuat. |

### `produk`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama produk. |
| `kode` | Kode unik produk. |
| `nama` | Nama produk. |
| `harga_modal` | Harga beli/modal produk. |
| `harga_jual` | Harga jual produk. |
| `stok` | Jumlah stok tersedia. |
| `stok_minimum` | Batas minimum stok untuk peringatan restok. |
| `supplier` | Nama supplier produk. |
| `keterangan` | Catatan tambahan produk. |
| `dibuat_pada` | Waktu data produk dibuat. |

### `transaksi`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama transaksi. |
| `tanggal` | Tanggal transaksi. |
| `nama_pelanggan` | Nama pelanggan. |
| `total` | Total pemasukan transaksi. |
| `metode_bayar` | Metode pembayaran, misalnya tunai, transfer, atau QRIS. |
| `keterangan` | Catatan transaksi. |
| `pengguna_id` | Pengguna/kasir yang mencatat transaksi. |
| `dibuat_pada` | Waktu data transaksi dibuat. |

### `detail_transaksi`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama detail transaksi. |
| `transaksi_id` | Relasi ke tabel `transaksi`. |
| `jenis` | Jenis item, yaitu `layanan` atau `produk`. |
| `referensi_id` | ID layanan atau produk yang dipilih. |
| `nama_item` | Nama item saat transaksi dicatat. |
| `harga_satuan` | Harga per item. |
| `jumlah` | Jumlah item. |
| `subtotal` | Total harga item. |

### `pengeluaran`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama pengeluaran. |
| `tanggal` | Tanggal pengeluaran. |
| `kategori` | Kategori pengeluaran, misalnya sewa, gaji, listrik, beli_produk, atau lainnya. |
| `jumlah` | Nominal pengeluaran. |
| `keterangan` | Catatan pengeluaran. |
| `sumber` | Asal pencatatan, yaitu manual atau pembelian. |
| `referensi_id` | ID pembelian jika pengeluaran berasal dari pembelian produk. |
| `pengguna_id` | Pengguna yang mencatat pengeluaran. |
| `dibuat_pada` | Waktu data pengeluaran dibuat. |

### `pembelian`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama pembelian. |
| `tanggal` | Tanggal pembelian produk. |
| `produk_id` | Produk yang dibeli. |
| `supplier` | Supplier tempat pembelian. |
| `jumlah` | Jumlah produk yang dibeli. |
| `harga_satuan` | Harga beli per produk. |
| `total` | Total biaya pembelian. |
| `keterangan` | Catatan pembelian. |
| `pengguna_id` | Pengguna yang mencatat pembelian. |
| `dibuat_pada` | Waktu data pembelian dibuat. |

### `mutasi_stok`

| Kolom | Keterangan |
| --- | --- |
| `id` | Kunci utama mutasi stok. |
| `tanggal` | Tanggal perubahan stok. |
| `produk_id` | Produk yang stoknya berubah. |
| `tipe` | Jenis perubahan stok, yaitu masuk atau keluar. |
| `jumlah` | Jumlah stok yang berubah. |
| `stok_akhir` | Jumlah stok setelah perubahan. |
| `sumber` | Sumber perubahan, misalnya pembelian, penjualan, manual, atau koreksi. |
| `referensi_id` | ID transaksi atau pembelian terkait. |
| `keterangan` | Catatan perubahan stok. |
| `dibuat_pada` | Waktu data mutasi stok dibuat. |

## Catatan Alur Data

- Penjualan layanan atau produk dicatat pada tabel `transaksi`.
- Rincian item penjualan dicatat pada tabel `detail_transaksi`.
- Jika item yang dijual adalah produk, stok pada tabel `produk` berkurang dan dicatat pada `mutasi_stok`.
- Pembelian produk dari supplier dicatat pada tabel `pembelian`.
- Pembelian produk otomatis menambah stok produk, membuat catatan `mutasi_stok`, dan membuat data `pengeluaran`.
- Pengeluaran manual seperti sewa, gaji, listrik, dan biaya lain dicatat pada tabel `pengeluaran`.
