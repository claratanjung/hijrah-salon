import axios from 'axios';

// Token disimpan di memori + localStorage (agar tetap login saat refresh)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- helper format ----
export const rupiah = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const tanggalID = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const hariIni = () => new Date().toISOString().slice(0, 10);

export const kapitalAwal = (s) => {
  const teks = String(s || '');
  if (!teks) return '-';
  return teks.charAt(0).toUpperCase() + teks.slice(1).toLowerCase();
};

export const labelMetode = (metode) =>
  metode === 'qris' ? 'QRIS' : kapitalAwal(metode);

export const tagMetode = (metode) => {
  if (metode === 'transfer') return 'blue';
  if (metode === 'qris') return 'pink';
  return 'green';
};

export const labelKategori = (kategori) => kategori || '-';

export const tagKategori = (kategori) => ({
  hair: 'pink',
  facial: 'green',
  badan: 'blue',
  paket: 'purple',
  lainnya: 'warn',
  'Perawatan Rambut': 'pink',
  'Perawatan Wajah': 'green',
  'Pijat, Lulur & Waxing': 'blue',
  Spa: 'purple',
  'Estebel & Kuku': 'warn',
  'Paket Pra Nikah': 'purple',
}[kategori] || 'green');

export const logoSalonUrl = (setting = {}) => {
  const logo = setting.logo || setting.logo_url || '';
  if (!logo) return '';
  if (/^(data:|https?:\/\/|\/)/i.test(logo)) return logo;
  return `${API_BASE_URL}/uploads/${logo}`.replace(/([^:]\/)\/+/g, '$1');
};

export default api;
