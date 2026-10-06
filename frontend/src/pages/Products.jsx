import { useEffect, useState } from 'react';
import api, { rupiah } from '../api';
import Modal from '../components/Modal.jsx';

const KOSONG = {
  kode: '', nama: '', harga_modal: '',
  stok: 0, stok_minimum: 5, supplier: '', keterangan: '', expired: '',
};

export default function Products() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [stokFilter, setStokFilter] = useState('semua');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(KOSONG);
  const [loading, setLoading] = useState(true);

  const muat = () => {
    setLoading(true);
    api.get('/products', { params: { q } })
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { muat(); }, [q]);

  const buka = (p) => {
    if (p) { setEdit(p); setForm(p); } else { setEdit(null); setForm(KOSONG); }
    setShow(true);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const simpan = async () => {
    if (!form.nama) return alert('Nama produk wajib diisi');
    try {
      if (edit) await api.put(`/products/${edit.id}`, form);
      else await api.post('/products', form);
      setShow(false); muat();
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan');
    }
  };
  const hapus = async (id) => {
    if (confirm('Hapus produk ini?')) { await api.delete(`/products/${id}`); muat(); }
  };

  const produkMenipis = list.filter((p) => Number(p.stok) <= Number(p.stok_minimum));
  const produkAman = list.filter((p) => Number(p.stok) > Number(p.stok_minimum));
  const filteredList = stokFilter === 'menipis'
    ? produkMenipis
    : stokFilter === 'aman'
      ? produkAman
      : list;

  return (
    <>
      <div className="page-head">
        <h2>Manajemen Produk</h2>
        <p>Produk salon yang dipakai untuk layanan dan stok terintegrasi otomatis</p>
      </div>

      <div className="cards product-summary">
        <button className={`stat stat-button ${stokFilter === 'semua' ? 'selected' : ''}`}
          onClick={() => setStokFilter('semua')}>
          <div className="lbl">SEMUA PRODUK</div>
          <div className="val">{list.length}</div>
        </button>
        <button className={`stat stat-button ${stokFilter === 'menipis' ? 'selected' : ''}`}
          onClick={() => setStokFilter('menipis')}>
          <div className="lbl">STOK MENIPIS</div>
          <div className="val pink">{produkMenipis.length}</div>
        </button>
        <button className={`stat stat-button ${stokFilter === 'aman' ? 'selected' : ''}`}
          onClick={() => setStokFilter('aman')}>
          <div className="lbl">STOK AMAN</div>
          <div className="val green">{produkAman.length}</div>
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search" placeholder="Cari produk / kode / supplier..."
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <select value={stokFilter} onChange={(e) => setStokFilter(e.target.value)}>
          <option value="semua">Semua Stok</option>
          <option value="menipis">Stok Menipis</option>
          <option value="aman">Stok Aman</option>
        </select>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => buka(null)}>
          + Tambah Produk
        </button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-aksi-centered">
            <thead>
              <tr>
                <th>Kode</th><th>Nama Produk</th><th>Harga Beli</th>
                <th>Stok</th><th>Expired</th><th>Supplier</th><th className="aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty">Memuat...</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan="7" className="empty">Tidak ada produk</td></tr>
              ) : filteredList.map((p) => (
                <tr key={p.id}>
                  <td><span className="tag pink">{p.kode}</span></td>
                  <td>
                    <b>{p.nama}</b>
                  </td>
                  <td>{rupiah(p.harga_modal)}</td>
                  <td>
                    {p.stok}
                    {p.stok <= p.stok_minimum ? (
                      <span className="tag warn" style={{ marginLeft: 6 }}>Menipis</span>
                    ) : null}
                  </td>
                  <td>{p.expired ? p.expired : '-'}</td>
                  <td style={{ fontSize: 13 }}>{p.supplier || '-'}</td>
                  <td className="aksi">
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => buka(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => hapus(p.id)}>
                        Hapus
                      </button>
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
          title={edit ? 'Edit Produk' : 'Tambah Produk'}
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={simpan}>Simpan</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Kode Produk</label>
              <input value={form.kode} onChange={set('kode')} placeholder="otomatis bila kosong" />
            </div>
            <div className="field">
              <label>Nama Produk</label>
              <input value={form.nama} onChange={set('nama')} />
            </div>
            <div className="field">
              <label>Harga Beli (Rp)</label>
              <input type="number" value={form.harga_modal} onChange={set('harga_modal')} />
            </div>
            <div className="field">
              <label>Stok Minimum</label>
              <input type="number" value={form.stok_minimum} onChange={set('stok_minimum')} />
            </div>
            <div className="field">
              <label>Expired</label>
              <input type="date" value={form.expired || ''} onChange={set('expired')} />
            </div>
            <div className="field">
              <label>Supplier</label>
              <input value={form.supplier} onChange={set('supplier')} />
            </div>
            <div className="field full">
              <label>Keterangan</label>
              <textarea rows="2" value={form.keterangan || ''} onChange={set('keterangan')} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
