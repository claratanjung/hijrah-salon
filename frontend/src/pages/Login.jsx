import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { logoSalonUrl } from '../api';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [setting, setSetting] = useState({ nama_salon: 'Hijrah Salon', logo: '' });
  const [logoError, setLogoError] = useState(false);
  const logoUrl = logoSalonUrl(setting);

  useEffect(() => {
    api.get('/settings').then((r) => {
      setSetting({
        nama_salon: r.data.nama_salon || 'Hijrah Salon',
        logo: r.data.logo || r.data.logo_url || '',
      });
      setLogoError(false);
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      nav('/');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Gagal masuk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt="Logo Salon"
              className="logo logo-img"
              onError={() => setLogoError(true)}
            />
          ) : (
            <DefaultAvatar />
          )}
          <h1>{setting.nama_salon}</h1>
          <p>Aplikasi Kasir &amp; Laporan Keuangan</p>
        </div>
        {err && <div className="alert">{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              placeholder="email@salon.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DefaultAvatar() {
  return <div className="logo">H</div>;
}
