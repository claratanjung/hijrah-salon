import { useEffect, useState } from 'react';
import api, { rupiah, tanggalID, hariIni } from '../api';
import Modal from '../components/Modal.jsx';

const kosong = {
  tanggal: hariIni(), product_id: '', supplier: '',
  jumlah: 1, harga_satuan: '', keterangan: '',
};

export default function Purchases() {
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(kosong);

  const muat = () => {
    const params = { q };
    if (dari && sampai) { params.dari = dari; params.sampai = sampai; }
    api.get('/purchases', { params }).then((r) => setList(r.data));
  };
  const muatProduk = () => api.get('/products').then((r) => setProducts(r.data));
  useEffect(() => { muat(); }, [dari, sampai, q]);
  useEffect(() => { muatProduk(); }, []);

  const pilihProduk = (id) => {
    const p = products.find((x) => x.id === Number(id));
    setForm({
      ...form, product_id: id,
      supplier: p?.supplier || '',
      harga_satuan: p?.harga_modal || '',
    });
  };

  const simpan = async () => {
    if (!form.product_id) return alert('Pilih produk dulu');
    if (!form.jumlah || Number(form.jumlah) <= 0) return alert('Jumlah harus lebih dari 0');
    await api.post('/purchases', form);
    setShow(false);
    setForm(kosong);
    muat();
    muatProduk();
  };
  const hapus = async (id) => {
    if (confirm('Batalkan pembelian ini? Stok & pengeluaran terkait akan dihapus.')) {
      await api.delete(`/purchases/${id}`);
      muat();
      muatProduk();
    }
  };

  const total = list.reduce((s, p) => s + Number(p.total), 0);
  const subtotal = Number(form.jumlah || 0) * Number(form.harga_satuan || 0);

  return (
    <>
      <div className="page-head">
        <h2>Pembelian ke Supplier</h2>
        <p>Beli stok produk — otomatis menambah stok &amp; tercatat sebagai pengeluaran</p>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat">
          <div className="lbl">JUMLAH PEMBELIAN</div>
          <div className="val">{list.length}</div>
        </div>
        <div className="stat">
          <div className="lbl">TOTAL BELANJA</div>
          <div className="val pink">{rupiah(total)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Cari produk / supplier..."
          value={q} onChange={(e) => setQ(e.target.value)} />
        <input type="date" value={dari}
          onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai}
          onChange={(e) => setSampai(e.target.value)} />
        <button className="btn btn-primary" style={{ width: 'auto' }}
          onClick={() => { setForm(kosong); setShow(true); }}>+ Tambah</button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-aksi-centered">
            <thead>
              <tr>
                <th>No</th><th>Tanggal</th><th>Produk</th><th>Supplier</th>
                <th>Jumlah</th><th>Harga Satuan</th><th>Total</th><th className="col-aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="8" className="empty">Belum ada pembelian</td></tr>
              ) : list.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{tanggalID(p.tanggal)}</td>
                  <td><b>{p.nama_produk}</b></td>
                  <td>{p.supplier || '-'}</td>
                  <td>{p.jumlah}</td>
                  <td>{rupiah(p.harga_satuan)}</td>
                  <td><b>{rupiah(p.total)}</b></td>
                  <td className="col-aksi">
                    <div className="row-actions center">
                      <button className="btn btn-danger btn-sm"
                        onClick={() => hapus(p.id)}>Batalkan</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <Modal
          title="Pembelian Baru"
          onClose={() => setShow(false)}
          footer={
            <>
              <div style={{ marginRight: 'auto', fontFamily: 'var(--serif)', fontSize: 18 }}>
                Total: <b style={{ color: 'var(--pink-600)' }}>{rupiah(subtotal)}</b>
              </div>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={simpan}>Simpan</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field full">
              <label>Produk</label>
              <select value={form.product_id}
                onChange={(e) => pilihProduk(e.target.value)}>
                <option value="">— Pilih produk —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} (stok: {p.stok})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div className="field">
              <label>Supplier</label>
              <input value={form.supplier} placeholder="Nama supplier"
                onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="field">
              <label>Jumlah</label>
              <input type="number" min="1" value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
            </div>
            <div className="field">
              <label>Harga Satuan (Rp)</label>
              <input type="number" min="0" value={form.harga_satuan}
                onChange={(e) => setForm({ ...form, harga_satuan: e.target.value })} />
            </div>
            <div className="field full">
              <label>Keterangan</label>
              <input value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
          <div className="alert alert-info">
            Menyimpan pembelian akan otomatis menambah stok produk dan mencatat
            pengeluaran kategori <b>Beli Produk</b>.
          </div>
        </Modal>
      )}
    </>
  );
}
