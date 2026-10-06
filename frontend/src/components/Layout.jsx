import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api, { logoSalonUrl } from '../api';
import { useAuth } from '../auth.jsx';

const MENU = [
  { to: '/', label: 'Dashboard' },
  { to: '/layanan', label: 'Layanan', pemilik: true },
  { to: '/produk', label: 'Produk', pemilik: true },
  { to: '/pemasukan', label: 'Pemasukan' },
  { to: '/pembelian', label: 'Pembelian', pemilik: true },
  { to: '/pengeluaran', label: 'Pengeluaran', pemilik: true },
  { to: '/laporan', label: 'Laporan Keuangan' },
  { to: '/pengaturan', label: 'Pengaturan', pemilik: true },
];

export default function Layout({ children }) {
  const { user, logout, isPemilik } = useAuth();
  const [salon, setSalon] = useState({ nama_salon: 'Hijrah Salon', logo_url: '' });
  const nav = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoSalonUrl(salon);

  const doLogout = () => { logout(); nav('/login'); };
  const menu = MENU.filter((m) => !m.pemilik || isPemilik);
  const roleLabel = isPemilik ? 'Pemilik/Admin' : 'Kasir';

  useEffect(() => {
    const muat = () => api.get('/settings').then((r) => setSalon({
      nama_salon: r.data.nama_salon || 'Hijrah Salon',
      logo_url: r.data.logo_url || r.data.logo || '',
    })).then(() => setLogoError(false)).catch(() => {});
    muat();
    window.addEventListener('settings:saved', muat);
    return () => window.removeEventListener('settings:saved', muat);
  }, []);

  return (
    <div className="app sidebar-open">
      <aside className="sidebar">
        <div className="s-brand">
          <div className="dot">
            {logoUrl && !logoError ? (
              <img src={logoUrl} alt="Logo salon" onError={() => setLogoError(true)} />
            ) : 'H'}
          </div>
          <div className="brand-copy">
            <b>{salon.nama_salon}</b>
            <span>Kasir &amp; Keuangan</span>
          </div>
        </div>

        <nav className="nav">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="s-user">
          <div className="who">{user?.nama}</div>
          <span className={`role ${user?.role}`}>
            {roleLabel}
          </span>
          <button className="btn btn-line btn-sm" onClick={doLogout}>
            Keluar
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
