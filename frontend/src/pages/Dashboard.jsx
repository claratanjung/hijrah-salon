import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api, { rupiah, tanggalID } from '../api';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const { user, isPemilik } = useAuth();
  const [d, setD] = useState(null);
  const [periode, setPeriode] = useState('hari');

  useEffect(() => {
    api.get('/dashboard', { params: { periode } }).then((r) => setD(r.data));
  }, [periode]);

  if (!d) return <div className="spin">Memuat dashboard...</div>;

  const grafik = d.grafik_harian.map((g) => ({
    hari: tanggalID(g.tgl).slice(0, 6),
    Pemasukan: Number(g.pemasukan),
    Pengeluaran: Number(g.pengeluaran),
  }));
  const labelPeriode = periode === 'hari'
    ? 'Hari Ini'
    : periode === 'minggu'
      ? 'Minggu Ini'
      : 'Bulan Ini';
  const awalBulan = tanggalID(d.tanggal_awal_bulan);
  const hariIni = tanggalID(d.tanggal_hari_ini);

  return (
    <>
      <div className="page-head">
        <h2>Selamat datang, {user?.nama}</h2>
        <p>Ringkasan keuangan dan aktivitas salon</p>
      </div>

      {isPemilik && d.stok_menipis.length > 0 && (
        <div className="notif">
          <span>
            <b>{d.stok_menipis.length} produk</b> stoknya menipis:{' '}
            {d.stok_menipis.map((p) => p.nama).join(', ')}.
          </span>
        </div>
      )}

      <div className="cards dashboard-summary">
        <div className="stat">
          <div className="lbl">PEMASUKAN HARI INI</div>
          <div className="val green">{rupiah(d.pendapatan_hari)}</div>
          <div className="sub">Tanggal {hariIni}</div>
        </div>
        {isPemilik && (
          <div className="stat">
            <div className="lbl">PENGELUARAN HARI INI</div>
            <div className="val pink">{rupiah(d.pengeluaran_hari)}</div>
            <div className="sub">Tanggal {hariIni}</div>
          </div>
        )}
        <div className="stat">
          <div className="lbl">PEMASUKAN BULAN INI</div>
          <div className="val green">{rupiah(d.pendapatan_bulan)}</div>
          <div className="sub">{awalBulan} s/d {hariIni}</div>
        </div>
        {isPemilik && (
          <div className="stat">
            <div className="lbl">PENGELUARAN BULAN INI</div>
            <div className="val pink">{rupiah(d.pengeluaran_bulan)}</div>
            <div className="sub">{awalBulan} s/d {hariIni}</div>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Grafik {labelPeriode}</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grafik}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0dde6" />
              <XAxis dataKey="hari" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => v / 1000 + 'k'} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => rupiah(v)} />
              <Legend />
              <Bar dataKey="Pemasukan" fill="#4c9a5e" radius={[6, 6, 0, 0]} />
              {isPemilik && (
                <Bar dataKey="Pengeluaran" fill="#d8447f" radius={[6, 6, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Transaksi Terakhir</h3>
            <PeriodeButtons periode={periode} setPeriode={setPeriode} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tanggal</th><th>Pelanggan</th><th>Total</th></tr>
              </thead>
              <tbody>
                {d.transaksi_terakhir.map((t) => (
                  <tr key={t.id}>
                    <td>{tanggalID(t.tanggal)}</td>
                    <td>{t.nama_pelanggan}</td>
                    <td><b>{rupiah(t.total)}</b></td>
                  </tr>
                ))}
                {d.transaksi_terakhir.length === 0 && (
                  <tr><td colSpan="3" className="empty">Belum ada transaksi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function PeriodeButtons({ periode, setPeriode }) {
  return (
    <div className="chip-group">
      <button
        className={`chip ${periode === 'hari' ? 'active' : ''}`}
        onClick={() => setPeriode('hari')}
      >
        Hari Ini
      </button>
      <button
        className={`chip ${periode === 'minggu' ? 'active' : ''}`}
        onClick={() => setPeriode('minggu')}
      >
        Minggu Ini
      </button>
      <button
        className={`chip ${periode === 'bulan' ? 'active' : ''}`}
        onClick={() => setPeriode('bulan')}
      >
        Bulan Ini
      </button>
    </div>
  );
}
