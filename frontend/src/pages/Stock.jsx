import { useEffect, useState } from 'react';
import api, { tanggalID } from '../api';
import Modal from '../components/Modal.jsx';

export default function Stock() {
  const [mov, setMov] = useState([]);
  const [low, setLow] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ product_id: '', tipe: 'masuk', jumlah: 1, keterangan: '' });

  const muat = () => {
    api.get('/stock/movements', { params: { q, dari, sampai } }).then((r) => setMov(r.data));
    api.get('/products/low-stock').then((r) => setLow(r.data));
  };
  useEffect(() => { muat(); }, [q, dari, sampai]);
  useEffect(() => { api.get('/products').then((r) => setProducts(r.data)); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const simpan = async () => {
    if (!form.product_id) return alert('Pilih produk');
    await api.post('/stock/adjust', form);
    setShow(false);
    setForm({ product_id: '', tipe: 'masuk', jumlah: 1, keterangan: '' });
    muat();
    api.get('/products').then((r) => setProducts(r.data));
  };

  return (
    <>
      <div className="page-head">
        <h2>Stok &amp; Inventori</h2>
        <p>Riwayat pergerakan stok masuk/keluar &amp; notifikasi stok menipis</p>
      </div>

      {low.length > 0 && (
        <div className="notif">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span>
            <b>Minimum Stock Alert:</b>{' '}
            {low.map((p) => `${p.nama} (sisa ${p.stok})`).join(' • ')}
          </span>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search" placeholder="Cari produk / kode..."
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        <button className="btn btn-green" style={{ width: 'auto' }} onClick={() => setShow(true)}>
          + Penyesuaian Stok
        </button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Produk</th><th>Tipe</th>
                <th>Jumlah</th><th>Stok Akhir</th><th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {mov.length === 0 ? (
                <tr><td colSpan="6" className="empty">Belum ada pergerakan stok</td></tr>
              ) : mov.map((m) => (
                <tr key={m.id}>
                  <td>{tanggalID(m.tanggal)}</td>
                  <td><b>{m.nama_produk}</b></td>
                  <td>
                    <span className={`tag ${m.tipe === 'keluar' ? 'pink' : ''}`}>
                      {m.tipe === 'masuk' ? '↓ Masuk' : '↑ Keluar'}
                    </span>
                  </td>
                  <td>{m.jumlah}</td>
                  <td><b>{m.stok_akhir}</b></td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <Modal
          title="Penyesuaian Stok (Koreksi)"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-green" style={{ width: 'auto' }} onClick={simpan}>Simpan</button>
            </>
          }
        >
          <div className="field">
            <label>Produk</label>
            <select value={form.product_id} onChange={set('product_id')}>
              <option value="">— Pilih produk —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nama} (stok {p.stok})</option>
              ))}
            </select>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Tipe</label>
              <select value={form.tipe} onChange={set('tipe')}>
                <option value="masuk">Masuk (+)</option>
                <option value="keluar">Keluar (−)</option>
              </select>
            </div>
            <div className="field">
              <label>Jumlah</label>
              <input type="number" value={form.jumlah} onChange={set('jumlah')} />
            </div>
          </div>
          <div className="field">
            <label>Keterangan</label>
            <input value={form.keterangan} onChange={set('keterangan')}
              placeholder="mis. barang rusak / koreksi hitung" />
          </div>
          <p className="hint" style={{ textAlign: 'left' }}>
            Penyesuaian manual tidak memengaruhi laporan keuangan (bukan
            pemasukan/pengeluaran). Untuk restok pakai menu Pembelian.
          </p>
        </Modal>
      )}
    </>
  );
}
