// ====================================================================
//  SEED - Account initial & basic setup
//  Run ONCE after import schema.sql: npm run seed
// ====================================================================
require('dotenv').config();
const pool = require('./db');

(async () => {
  try {
    console.log('🌟 Initializing Hijrah Salon database...\n');

    // 1. Create default accounts
    console.log('👤 Setting up default accounts...');
    const accounts = [
      { nama: 'Pemilik Salon', email: 'pemilik@salon.com', pass: 'pemilik123', role: 'pemilik' },
      { nama: 'Kasir Salon', email: 'kasir@salon.com', pass: 'kasir123', role: 'kasir' },
    ];

    for (const a of accounts) {
      const [ada] = await pool.query('SELECT id FROM pengguna WHERE email=?', [a.email]);
      if (ada.length > 0) {
        await pool.query(
          'UPDATE pengguna SET kata_sandi=?, nama=?, peran=? WHERE email=?',
          [a.pass, a.nama, a.role, a.email]
        );
        console.log(`  ✓ Account updated: ${a.email}`);
      } else {
        await pool.query(
          'INSERT INTO pengguna (nama,email,kata_sandi,peran) VALUES (?,?,?,?)',
          [a.nama, a.email, a.pass, a.role]
        );
        console.log(`  ✓ Account created: ${a.email}`);
      }
    }

    // 2. Setup salon settings
    console.log('\n⚙️ Setting up salon info...');
    const [settings] = await pool.query('SELECT id FROM pengaturan');
    if (settings.length === 0) {
      await pool.query(
        'INSERT INTO pengaturan (nama_salon, alamat, telepon) VALUES (?, ?, ?)',
        ['Hijrah Salon', 'Depok, Jawa Barat', '0821 1598 6004']
      );
      console.log('  ✓ Salon settings created');
    } else {
      console.log('  ✓ Salon settings already exists');
    }

    console.log('\n✅ Database initialization complete!\n');
    console.log('🔑 Login credentials:');
    console.log('   Owner : pemilik@salon.com / pemilik123');
    console.log('   Cashier: kasir@salon.com / kasir123\n');
    console.log('📚 To load sample data (products, services, transactions):');
    console.log('   node seed-comprehensive.js\n');

    process.exit(0);
  } catch (e) {
    console.error('❌ Setup failed:', e.message);
    process.exit(1);
  }
})();
