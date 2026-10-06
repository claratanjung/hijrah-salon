import { useEffect, useState } from 'react';
import api, { rupiah, tanggalID, hariIni } from '../api';
import Modal from '../components/Modal.jsx';

const KATEGORI = [
  ['sewa', 'Sewa Tempat'],
  ['gaji', 'Gaji Karyawan'],
  ['listrik', 'Listrik & Air'],
  ['beli_produk', 'Beli Produk'],
  ['lainnya', 'Lainnya'],
];
const labelKat = (k) => (KATEGORI.find((x) => x[0] === k) || [k, k])[1];

const kosong = { tanggal: hariIni(), kategori: 'lainnya', jumlah: '', keterangan: '' };

export default function Expenses() {
  const [list, setList] = useState([]);
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [kategori, setKategori] = useState('');
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(kosong);
  const [editId, setEditId] = useState(null);

  const muat = () => {
    const params = { q };
    if (dari && sampai) { params.dari = dari; params.sampai = sampai; }
    if (kategori) params.kategori = kategori;
    api.get('/expenses', { params }).then((r) => setList(r.data));
  };
  useEffect(() => { muat(); }, [dari, sampai, kategori, q]);

  const bukaTambah = () => { setForm(kosong); setEditId(null); setShow(true); };
  const bukaEdit = (e) => {
    setForm({
      tanggal: e.tanggal, kategori: e.kategori,
      jumlah: e.jumlah, keterangan: e.keterangan || '',
    });
    setEditId(e.id);
    setShow(true);
  };

  const simpan = async () => {
    if (!form.jumlah) return alert('Jumlah wajib diisi');
    if (editId) await api.put(`/expenses/${editId}`, form);
    else await api.post('/expenses', form);
    setShow(false);
    muat();
  };
  const hapus = async (id) => {
    if (confirm('Hapus pengeluaran ini?')) {
      await api.delete(`/expenses/${id}`);
      muat();
    }
  };

  const total = list.reduce((s, e) => s + Number(e.jumlah), 0);

  return (
    <>
      <div className="page-head">
        <h2>Pengeluaran</h2>
        <p>Biaya operasional salon (sewa, gaji, listrik, dll)</p>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat">
          <div className="lbl">JUMLAH CATATAN</div>
          <div className="val">{list.length}</div>
        </div>
        <div className="stat">
          <div className="lbl">TOTAL PENGELUARAN</div>
          <div className="val pink">{rupiah(total)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Cari keterangan..."
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
          <option value="">Semua kategori</option>
          {KATEGORI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={dari}
          onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai}
          onChange={(e) => setSampai(e.target.value)} />
        <button className="btn btn-primary" style={{ width: 'auto' }}
          onClick={bukaTambah}>+ Tambah</button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-aksi-centered">
            <thead>
              <tr>
                <th>No</th><th>Tanggal</th><th>Kategori</th>
                <th>Keterangan</th><th>Jumlah</th><th className="col-aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="6" className="empty">Belum ada pengeluaran</td></tr>
              ) : list.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{tanggalID(e.tanggal)}</td>
                  <td><span className="tag">{labelKat(e.kategori)}</span></td>
                  <td>{e.keterangan || '-'}</td>
                  <td><b>{rupiah(e.jumlah)}</b></td>
                  <td className="col-aksi">
                    <div className="row-actions">
                      {e.sumber === 'manual' ? (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => bukaEdit(e)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => hapus(e.id)}
                          >
                            Hapus
                          </button>
                        </>
                      ) : (
                        <span className="aksi-empty">-</span>
                      )}
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
          title={editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={simpan}>Simpan</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div className="field">
              <label>Kategori</label>
              <select value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                {KATEGORI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Jumlah (Rp)</label>
              <input type="number" min="0" value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
            </div>
            <div className="field full">
              <label>Keterangan</label>
              <input value={form.keterangan} placeholder="contoh: Sewa ruko bulan Mei"
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
