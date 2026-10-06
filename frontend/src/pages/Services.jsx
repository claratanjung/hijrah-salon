import { useEffect, useState } from 'react';
import api, { rupiah, labelKategori, tagKategori } from '../api';
import Modal from '../components/Modal.jsx';

const KOSONG = {
  nama: '',
  harga: '',
  durasi: 60,
  durasi_menit: 60,
  kategori_id: '',
  kategori: '',
  sub_kategori: '',
  produk_terpakai: [],
  keterangan: '',
};

// Mapping sub kategori berdasarkan kategori
const SUBCATEGORY_OPTIONS = {
  'Perawatan Rambut': [
    'Pendek',
    'Sedang',
    'Panjang',
  ],

  'Perawatan Wajah': [],

  'Pijat, Lulur & Waxing': [],

  Spa: [],

  'Estebel & Kuku': [],

  'Paket Pra Nikah': [
    'Hemat',
  ],
};

function parseProdukTerpakai(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}



export default function Services() {
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(KOSONG);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);

  const muat = () => {
    setLoading(true);
    api.get('/services', { params: { q, kategori_id: kat } })
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { muat(); }, [q, kat]);
  useEffect(() => {
    api.get('/products').then((r) => setProducts(r.data));
    api.get('/services/categories').then((r) => setCategories(r.data));
  }, []);

  const buka = (s) => {
    setEdit(s || null);
    if (s) {
      const linkedProducts = Array.isArray(s.serviceProducts)
        ? s.serviceProducts.map((item) => ({
            id: item.id,
            nama: item.nama,
            qty: Number(item.qty || 1),
          }))
        : parseProdukTerpakai(s.produk_terpakai);
      setForm({
          ...s,
          nama: s.nama_layanan || s.nama,
          durasi: s.durasi || s.durasi_menit,
          kategori_id: Number(s.kategori_id) || '',
          kategori: s.nama_kategori || s.kategori || '',
          sub_kategori: s.sub_kategori || '',
          produk_terpakai: linkedProducts,
      });
    } else {
      const firstCategory = categories[0];

      const firstSub =
          SUBCATEGORY_OPTIONS[firstCategory?.nama_kategori]?.[0] || '';

      setForm({
          ...KOSONG,
          kategori_id: firstCategory?.id || '',
          kategori: firstCategory?.nama_kategori || '',
          sub_kategori: firstSub,
      });
    }
    setSelectedProductId('');
    setShow(true);
  };

  const tambahProduk = (productId) => {
    const prod = products.find((item) => item.id === Number(productId));
    if (!prod) return;
    setForm((prev) => {
      const current = Array.isArray(prev.produk_terpakai) ? prev.produk_terpakai : [];
      const exists = current.find((item) => item.id === prod.id);
      if (exists) return prev;
      return { ...prev, produk_terpakai: [...current, { id: prod.id, nama: prod.nama, qty: 1 }] };
    });
  };

  const hapusProduk = (id) => {
    setForm((prev) => ({
      ...prev,
      produk_terpakai: (prev.produk_terpakai || []).filter((item) => item.id !== id),
    }));
  };

  const ubahQtyProduk = (id, qty) => {
    setForm((prev) => ({
      ...prev,
      produk_terpakai: (prev.produk_terpakai || []).map((item) => (
        item.id === id ? { ...item, qty: Number(qty) || 1 } : item
      )),
    }));
  };

  const simpan = async () => {
    if (!form.nama) return alert('Nama layanan wajib diisi');
    const payload = {
      ...form,

      durasi: form.durasi,
      durasi_menit: form.durasi,

      produk_terpakai: form.produk_terpakai,
      serviceProducts: form.produk_terpakai,
    };
    if (edit) await api.put(`/services/${edit.id}`, payload);
    else await api.post('/services', payload);
    setShow(false); muat();
  };
  const hapus = async (id) => {
    if (confirm('Hapus layanan ini?')) { await api.delete(`/services/${id}`); muat(); }
  };



  return (
    <>
      <div className="page-head">
        <h2>Manajemen Layanan</h2>
        <p>Daftar layanan salon — tambah, ubah, atau hapus</p>
      </div>

      <div className="toolbar">
        <input
          className="search" placeholder="Cari nama layanan..."
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <select value={kat} onChange={(e) => setKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((k) => (
            <option key={k.id} value={k.id}>{k.nama_kategori}</option>
          ))}
        </select>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => buka(null)}>
          + Tambah Layanan
        </button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-aksi-centered">
            <thead>
              <tr>
                <th>Nama Layanan</th><th>Kategori</th><th>Sub</th><th>Durasi</th>
                <th>Harga</th><th className="aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="empty">Memuat…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan="6" className="empty">Tidak ada layanan</td></tr>
              ) : list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.nama}</b>
                    {s.keterangan && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {s.keterangan}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${tagKategori(s.kategori)}`}>
                      {s.nama_kategori || s.kategori}
                    </span>
                  </td>
                  <td>{s.sub_kategori ? labelKategori(s.sub_kategori) : '-'}</td>
                  <td>{s.durasi || s.durasi_menit} mnt</td>
                  <td><b>{rupiah(s.harga)}</b></td>
                  <td className="aksi">
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => buka(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => hapus(s.id)}>
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
          title={edit ? 'Edit Layanan' : 'Tambah Layanan'}
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={simpan}>Simpan</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field full">
              <label>Nama Layanan</label>
              <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="field">
              <label>Harga Dasar (Rp)</label>
              <input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} />
            </div>
            <div className="field">
              <label>Durasi (menit)</label>
              <input type="number" value={form.durasi}
              onChange={(e)=>
              setForm({
                ...form,
                durasi:e.target.value,
                durasi_menit:e.target.value
              })
              }/>
            </div>
            <div className="field">
              <label>Kategori</label>
              <select
                value={form.kategori_id}
                onChange={(e) => {
                  const selected = categories.find(
                    (item) => item.id === Number(e.target.value)
                  );

                  const nextKategori = selected?.nama_kategori || '';

                  const options = SUBCATEGORY_OPTIONS[nextKategori] || [];

                  const newSubKategori =
                    options.length > 0
                      ? options.includes(form.sub_kategori)
                        ? form.sub_kategori
                        : options[0]
                      : '';

                  setForm((prev) => ({
                    ...prev,
                    kategori_id: selected?.id || '',
                    kategori: nextKategori,
                    sub_kategori: newSubKategori,
                  }));
                }}
              >
                {categories.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kategori}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Sub Kategori</label>
              {SUBCATEGORY_OPTIONS[form.kategori]?.length > 0 ? (
                <select
                  value={form.sub_kategori || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, sub_kategori: e.target.value }))}
                >
                  <option value="">— Pilih sub kategori —</option>
                  {SUBCATEGORY_OPTIONS[form.kategori].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <select disabled>
                  <option>Tidak ada sub kategori</option>
                </select>
              )}
            </div>
            <div className="field full">
              <label>Produk Terpakai</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    tambahProduk(value);
                    setSelectedProductId('');
                  }
                }}
              >
                <option value="">— Pilih produk —</option>
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nama} {prod.stok !== undefined ? `(stok: ${prod.stok})` : ''}
                  </option>
                ))}
              </select>
              <div className="panel" style={{ padding: 10, background: 'var(--pink-50)', marginTop: 8 }}>
                {(form.produk_terpakai || []).length === 0 ? (
                  <div className="empty">Belum ada produk terpakai</div>
                ) : (form.produk_terpakai || []).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ flex: 1 }}>{item.nama}</span>
                    <input type="number" min="1" value={item.qty || 1} style={{ width: 70 }} onChange={(e) => ubahQtyProduk(item.id, e.target.value)} />
                    <button className="btn btn-danger btn-sm" onClick={() => hapusProduk(item.id)}>Hapus</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="field full">
              <label>Keterangan</label>
              <textarea rows="2" value={form.keterangan || ''} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
