// ====================================================================
//  SERVER UTAMA - Aplikasi Kasir + Laporan Keuangan Salon
// ====================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rute API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) =>
  res.json({
    status: 'OK',
    app: 'Salon Kasir API',
    versi: '1.0.0'
  })
);

// Penanganan error global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'Terjadi kesalahan pada server.'
  });
});

// Kalau dijalankan langsung di komputer, tetap pakai port 4000.
// Kalau dijalankan Netlify, Netlify yang menangani servernya.
if (require.main === module) {
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan pada port ${PORT}`);
  });
}

module.exports = app;