import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Services from './pages/Services.jsx';
import Products from './pages/Products.jsx';
import Sales from './pages/Sales.jsx';
import Purchases from './pages/Purchases.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children, pemilikOnly }) {
  const { user, isPemilik } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (pemilikOnly && !isPemilik)
    return (
      <Layout>
        <div className="panel">
          <h3>Akses Ditolak</h3>
          <p style={{ color: 'var(--muted)' }}>
            Halaman ini khusus <b>Pemilik/Admin</b>. Kasir hanya dapat membuka
            dasbor, pemasukan, dan laporan keuangan.
          </p>
        </div>
      </Layout>
    );
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/layanan" element={<Protected pemilikOnly><Services /></Protected>} />
      <Route path="/produk" element={<Protected pemilikOnly><Products /></Protected>} />
      <Route path="/pemasukan" element={<Protected><Sales /></Protected>} />
      <Route path="/pembelian" element={<Protected pemilikOnly><Purchases /></Protected>} />
      <Route path="/pengeluaran" element={<Protected pemilikOnly><Expenses /></Protected>} />
      <Route path="/laporan" element={<Protected><Reports /></Protected>} />
      <Route path="/pengaturan" element={<Protected pemilikOnly><Settings /></Protected>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
