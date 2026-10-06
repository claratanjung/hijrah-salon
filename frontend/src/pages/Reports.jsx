import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api, {
  rupiah, tanggalID, hariIni, kapitalAwal, labelMetode, tagMetode, labelKategori,
} from '../api';
import { useAuth } from '../auth.jsx';

const excelCell = (v) => String(v ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const awalBulanIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const tanggalParts = (tanggal) => {
  const [year, month, day] = String(tanggal || '').slice(0, 10).split('-').map(Number);
  return { year, month, day };
};

const selisihHari = (dari, sampai) => {
  const start = new Date(`${dari}T00:00:00`);
  const end = new Date(`${sampai}T00:00:00`);
  return Math.round((end - start) / 86400000) + 1;
};

const labelGrafikTanggal = (tanggal, totalHari) => {
  const { month, day } = tanggalParts(tanggal);
  if (totalHari <= 31) return String(day);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
};

const labelTipe = (tipe) => (tipe === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan');
const tagTipe = (tipe) => (tipe === 'pengeluaran' ? 'pink' : 'green');

export default function Reports() {
  const { isPemilik } = useAuth();
  const [dari, setDari] = useState(awalBulanIni());
  const [sampai, setSampai] = useState(hariIni());
  const [tipe, setTipe] = useState('semua');
  const [metode, setMetode] = useState('');
  const [data, setData] = useState(null);

  const paramsLaporan = () => {
    const params = {
      dari,
      sampai,
      tipe: isPemilik ? tipe : 'pemasukan',
    };

    if (!isPemilik && metode) params.metode = metode;
    return params;
  };

  const muat = () => api.get('/reports', { params: paramsLaporan() }).then((r) => setData(r.data));
  useEffect(() => { muat(); /* eslint-disable-next-line */ }, []);

  const dataRincian = data?.rincian || [];
  const tipeAktif = data?.periode?.tipe || tipe;
  const tampilKolomAdmin = isPemilik;

  const headerExcel = tampilKolomAdmin
    ? ['No', 'Tanggal', 'Tipe', 'Nama', 'Kategori / Metode', 'Nominal']
    : ['No', 'Tanggal', 'Pelanggan', 'Metode', 'Total'];

  const rowsExcel = dataRincian.map((t, i) => (tampilKolomAdmin
    ? [
      i + 1,
      tanggalID(t.tanggal),
      labelTipe(t.tipe),
      t.nama,
      t.kategori_metode,
      Number(t.nominal || 0),
    ]
    : [
      i + 1,
      tanggalID(t.tanggal),
      t.nama,
      labelMetode(t.kategori_metode),
      Number(t.nominal || 0),
    ]));

  const unduhExcel = () => {
    if (!data) return;
    const isi = `
      <table>
        <thead><tr>${headerExcel.map((h) => `<th>${excelCell(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rowsExcel.map((row) => `<tr>${row.map((cell) => `<td>${excelCell(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;
    const blob = new Blob([`\uFEFF${isi}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${data.periode.dari}-${data.periode.sampai}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <div className="page-head"><h2>Laporan Keuangan</h2><p>Memuat...</p></div>;

  const tampilGrafikPemasukan = tipeAktif !== 'pengeluaran';
  const tampilGrafikPengeluaran = isPemilik && tipeAktif !== 'pemasukan';
  const totalHariGrafik = selisihHari(data.periode.dari, data.periode.sampai);
  const grafik = (data.grafik || []).map((g) => ({
    tanggal: labelGrafikTanggal(g.tanggal, totalHariGrafik),
    tanggalLengkap: tanggalID(g.tanggal),
    Pemasukan: Number(g.pemasukan || 0),
    Pengeluaran: g.pengeluaran == null ? 0 : Number(g.pengeluaran),
  }));

  return (
    <>
      <div className="page-head no-print">
        <h2>Laporan Keuangan</h2>
        <p>Penjualan, pengeluaran, dan laba rugi</p>
      </div>

      <div className="toolbar no-print">
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        {isPemilik ? (
          <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
            <option value="semua">Semua</option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>
        ) : (
          <select value={metode} onChange={(e) => setMetode(e.target.value)}>
            <option value="">Semua Metode</option>
            <option value="tunai">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
          </select>
        )}
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={muat}>
          Tampilkan
        </button>
        <button className="btn btn-line" style={{ width: 'auto' }} onClick={unduhExcel}>
          Cetak
        </button>
      </div>

      <p className="hint" style={{ marginBottom: 14 }}>
        Periode: <b>{tanggalID(data.periode.dari)}</b> s/d <b>{tanggalID(data.periode.sampai)}</b>
        {isPemilik ? (
          <> | Jenis Laporan: <b>{kapitalAwal(tipeAktif)}</b></>
        ) : (
          <> | Metode: <b>{data.periode.metode ? labelMetode(data.periode.metode) : 'Semua Metode'}</b></>
        )}
      </p>

      <div className="cards report-summary">
        <div className="stat">
          <div className="lbl">TOTAL TRANSAKSI</div>
          <div className="val">{data.penjualan.jumlah_transaksi}</div>
        </div>
        <div className="stat">
          <div className="lbl">TOTAL PEMASUKAN</div>
          <div className="val green">{rupiah(data.penjualan.total_pendapatan)}</div>
        </div>
        {isPemilik && data.pengeluaran && (
          <div className="stat">
            <div className="lbl">TOTAL PENGELUARAN</div>
            <div className="val pink">{rupiah(data.pengeluaran.total_pengeluaran)}</div>
          </div>
        )}
        {isPemilik && data.laba_rugi && (
          <div className="stat">
            <div className="lbl">LABA BERSIH</div>
            <div className={`val ${data.laba_rugi.laba_bersih >= 0 ? 'green' : 'pink'}`}>
              {rupiah(data.laba_rugi.laba_bersih)}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>{isPemilik ? 'Grafik Pemasukan vs Pengeluaran' : 'Grafik Pemasukan'}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={grafik}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0dde6" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => v / 1000 + 'k'} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => rupiah(v)} labelFormatter={(_, payload) => payload?.[0]?.payload?.tanggalLengkap || ''} />
            <Legend />
            {tampilGrafikPemasukan && (
              <Bar dataKey="Pemasukan" fill="#4c9a5e" radius={[6, 6, 0, 0]} />
            )}
            {tampilGrafikPengeluaran && (
              <Bar dataKey="Pengeluaran" fill="#d8447f" radius={[6, 6, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Rincian Transaksi</h3>
        <div className="table-wrap">
          <table>
            <thead>
              {tampilKolomAdmin ? (
                <tr>
                  <th>No</th><th>Tanggal</th><th>Tipe</th><th>Nama</th>
                  <th>Kategori / Metode</th><th>Nominal</th>
                </tr>
              ) : (
                <tr>
                  <th>No</th><th>Tanggal</th><th>Pelanggan</th><th>Metode</th><th>Total</th>
                </tr>
              )}
            </thead>
            <tbody>
              {dataRincian.length === 0 ? (
                <tr>
                  <td colSpan={tampilKolomAdmin ? 6 : 5} className="empty">
                    Tidak ada transaksi pada periode ini
                  </td>
                </tr>
              ) : dataRincian.map((t, i) => (
                tampilKolomAdmin ? (
                  <tr key={`${t.tipe}-${t.id}`}>
                    <td>{i + 1}</td>
                    <td>{tanggalID(t.tanggal)}</td>
                    <td><span className={`tag ${tagTipe(t.tipe)}`}>{labelTipe(t.tipe)}</span></td>
                    <td>{t.nama}</td>
                    <td>
                      {t.tipe === 'pemasukan' ? (
                        <span className={`tag ${tagMetode(t.kategori_metode)}`}>
                          {labelMetode(t.kategori_metode)}
                        </span>
                      ) : (
                        <span className="tag pink">{labelKategori(t.kategori_metode)}</span>
                      )}
                    </td>
                    <td><b>{rupiah(t.nominal)}</b></td>
                  </tr>
                ) : (
                  <tr key={`${t.tipe}-${t.id}`}>
                    <td>{i + 1}</td>
                    <td>{tanggalID(t.tanggal)}</td>
                    <td>{t.nama}</td>
                    <td>
                      <span className={`tag ${tagMetode(t.kategori_metode)}`}>
                        {labelMetode(t.kategori_metode)}
                      </span>
                    </td>
                    <td><b>{rupiah(t.nominal)}</b></td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
