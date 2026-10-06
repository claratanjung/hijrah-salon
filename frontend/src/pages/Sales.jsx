import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import api, { rupiah, tanggalID, hariIni, labelMetode, tagMetode } from '../api';
import Modal from '../components/Modal.jsx';

// Format display nama layanan sesuai requirement: dengan sub_kategori jika ada
function formatServiceDisplay(service) {
  if (service.sub_kategori && service.sub_kategori.trim()) {
    return `${service.nama} • ${service.sub_kategori} • Rp ${(Number(service.harga) || 0).toLocaleString('id-ID')}`;
  }
  return `${service.nama} • Rp ${(Number(service.harga) || 0).toLocaleString('id-ID')}`;
}

function tanggalInput(value) {
  if (!value) return hariIni();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatServiceOption(service) {
  const maxNama = 42;
  const nama = service.sub_kategori && service.sub_kategori.trim()
    ? `${service.nama} - ${service.sub_kategori}`
    : service.nama;
  const namaRingkas = nama.length > maxNama ? `${nama.slice(0, maxNama - 3)}...` : nama;
  const harga = (Number(service.harga) || 0).toLocaleString('id-ID');

  return `${namaRingkas} - Rp ${harga}`;
}

export default function Sales() {
  const [list, setList] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [q, setQ] = useState('');
  const [metode, setMetode] = useState('');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    tanggal: hariIni(), nama_pelanggan: '', metode_bayar: 'tunai', keterangan: '',
  });
  const [editItems, setEditItems] = useState([]);
  const [editPick, setEditPick] = useState({ kategori_id: '', ref_id: '', jumlah: 1 });

  const [head, setHead] = useState({
    tanggal: hariIni(), nama_pelanggan: '', metode_bayar: 'tunai', keterangan: '',
  });
  const [items, setItems] = useState([]);
  const [pick, setPick] = useState({ kategori_id: '', ref_id: '', jumlah: 1 });

  const muat = () => {
    const params = { q };
    if (dari && sampai) { params.dari = dari; params.sampai = sampai; }
    if (metode) params.metode = metode;
    api.get('/transactions', { params }).then((r) => setList(r.data));
  };
  useEffect(() => { muat(); }, [dari, sampai, q, metode]);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data));
    api.get('/services/categories').then((r) => setCategories(r.data));
  }, []);

  const filteredServices = pick.kategori_id
    ? services.filter((x) => String(x.kategori_id) === String(pick.kategori_id))
    : services;
  const selectedService = services.find((x) => x.id === Number(pick.ref_id));
  const filteredEditServices = editPick.kategori_id
    ? services.filter((x) => String(x.kategori_id) === String(editPick.kategori_id))
    : services;
  const selectedEditService = services.find((x) => x.id === Number(editPick.ref_id));

  const addItem = () => {
    if (!pick.ref_id) return;
    const obj = services.find((x) => x.id === Number(pick.ref_id));
    if (!obj) return;
    const harga = Number(obj.harga || 0);
    setItems([...items, {
      jenis: 'layanan', ref_id: obj.id, nama_item: obj.nama,
      harga_satuan: Number(harga), jumlah: Number(pick.jumlah),
    }]);
    setPick({ kategori_id: pick.kategori_id, ref_id: '', jumlah: 1 });
  };
  const total = items.reduce((s, i) => s + i.harga_satuan * i.jumlah, 0);
  const editTotal = editItems.reduce((s, i) => s + Number(i.harga_satuan) * Number(i.jumlah), 0);

  const addEditItem = () => {
    if (!editPick.ref_id) return;
    const obj = services.find((x) => x.id === Number(editPick.ref_id));
    if (!obj) return;
    const harga = Number(obj.harga || 0);
    setEditItems([...editItems, {
      jenis: 'layanan', ref_id: obj.id, nama_item: obj.nama,
      harga_satuan: Number(harga), jumlah: Number(editPick.jumlah),
    }]);
    setEditPick({ kategori_id: editPick.kategori_id, ref_id: '', jumlah: 1 });
  };

  const simpan = async () => {
    if (items.length === 0) return alert('Tambahkan minimal 1 item');
    await api.post('/transactions', { ...head, items });
    setShow(false); setItems([]);
    setHead({ tanggal: hariIni(), nama_pelanggan: '', metode_bayar: 'tunai', keterangan: '' });
    muat();
  };

  const bukaEdit = async (id) => {
    const { data } = await api.get(`/transactions/${id}`);
    setEdit(data);
    setEditForm({
      tanggal: tanggalInput(data.tanggal),
      nama_pelanggan: data.nama_pelanggan || '',
      metode_bayar: data.metode_bayar || 'tunai',
      keterangan: data.keterangan || '',
    });
    setEditItems((data.items || []).map((it) => ({
      jenis: it.jenis,
      ref_id: it.ref_id,
      nama_item: it.nama_item,
      harga_satuan: Number(it.harga_satuan || 0),
      jumlah: Number(it.jumlah || 1),
    })));
    setEditPick({ kategori_id: '', ref_id: '', jumlah: 1 });
  };
  const simpanEdit = async () => {
    if (editItems.length === 0) return alert('Tambahkan minimal 1 item');
    await api.put(`/transactions/${edit.id}`, { ...editForm, items: editItems });
    setEdit(null);
    setEditItems([]);
    muat();
  };

  const totalPeriode = list.reduce((s, t) => s + Number(t.total), 0);

  const canEditTransaction = (t) => {
    if (!user) return false;
    if (Number(t.pengguna_id) !== Number(user.id)) return false;
    if (user.role === 'kasir') {
      return t.tanggal === hariIni();
    }
    return true;
  };

  return (
    <>
      <div className="page-head">
        <h2>Pemasukan</h2>
        <p>Transaksi layanan salon dengan stok produk otomatis</p>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat">
          <div className="lbl">JUMLAH TRANSAKSI</div>
          <div className="val">{list.length}</div>
        </div>
        <div className="stat">
          <div className="lbl">TOTAL PEMASUKAN</div>
          <div className="val green">{rupiah(totalPeriode)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Cari pelanggan / keterangan..."
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={metode} onChange={(e) => setMetode(e.target.value)}>
          <option value="">Semua Metode</option>
          <option value="tunai">Tunai</option>
          <option value="transfer">Transfer</option>
          <option value="qris">QRIS</option>
        </select>
        <input type="date" value={dari}
          onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai}
          onChange={(e) => setSampai(e.target.value)} />
        <button className="btn btn-primary" style={{ width: 'auto' }}
          onClick={() => setShow(true)}>+ Transaksi Baru</button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
          <div className="table-wrap">
          <table className="table-aksi-centered">
            <thead>
              <tr>
                <th>No</th><th>Tanggal</th><th>Pelanggan</th>
                <th>Metode</th><th>Total</th><th>Kasir</th><th className="aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="7" className="empty">Belum ada transaksi</td></tr>
              ) : list.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td>{tanggalID(t.tanggal)}</td>
                  <td><b>{t.nama_pelanggan}</b></td>
                  <td>
                    <span className={`tag ${tagMetode(t.metode_bayar)}`}>
                      {labelMetode(t.metode_bayar)}
                    </span>
                  </td>
                  <td><b>{rupiah(t.total)}</b></td>
                  <td style={{ fontSize: 13 }}>{t.kasir || '-'}</td>
                  <td className="aksi">
                    <div className="row-actions center">
                      {canEditTransaction(t) ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => bukaEdit(t.id)}>Edit</button>
                      ) : (
                        <span className="aksi-empty" style={{ fontSize: 12 }}>-</span>
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
          title="Transaksi Baru" wide
          onClose={() => setShow(false)}
          footer={
            <>
              <div style={{ marginRight: 'auto', fontFamily: 'var(--serif)', fontSize: 19 }}>
                Total: <b style={{ color: 'var(--green-600)' }}>{rupiah(total)}</b>
              </div>
              <button className="btn btn-line" onClick={() => setShow(false)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={simpan}>
                Simpan Transaksi
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={head.tanggal}
                onChange={(e) => setHead({ ...head, tanggal: e.target.value })} />
            </div>
            <div className="field">
              <label>Nama Pelanggan</label>
              <input value={head.nama_pelanggan} placeholder="Umum"
                onChange={(e) => setHead({ ...head, nama_pelanggan: e.target.value })} />
            </div>
            <div className="field">
              <label>Metode Bayar</label>
              <select value={head.metode_bayar}
                onChange={(e) => setHead({ ...head, metode_bayar: e.target.value })}>
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div className="field">
              <label>Keterangan</label>
              <input value={head.keterangan}
                onChange={(e) => setHead({ ...head, keterangan: e.target.value })} />
            </div>
          </div>

          <div className="panel" style={{ background: 'var(--pink-50)', margin: '6px 0 16px' }}>
            <div
              className="form-grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select
                  value={pick.kategori_id}
                  onChange={(e) => setPick({ ...pick, kategori_id: e.target.value, ref_id: '' })}
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((x) => (
                    <option key={x.id} value={x.id}>{x.nama_kategori}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Layanan</label>
                <select
                  value={pick.ref_id}
                  onChange={(e) => setPick({ ...pick, ref_id: e.target.value })}
                >
                  <option value="">Pilih layanan</option>
                  {filteredServices.map((x) => (
                    <option key={x.id} value={x.id}>{formatServiceOption(x)}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Harga</label>
                <input readOnly value={selectedService ? rupiah(selectedService.harga) : ''} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Qty</label>
                <input type="number" min="1" value={pick.jumlah}
                  onChange={(e) => setPick({ ...pick, jumlah: e.target.value })} />
              </div>
              <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-green btn-sm" onClick={addItem}>+ Tambah</button>
              </div>
            </div>
            <p className="hint" style={{ marginTop: 8, textAlign: 'left' }}>
              Harga layanan mengikuti harga utama yang diatur saat menambah layanan.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Item</th><th>Jenis</th><th>Harga</th><th>Qty</th><th>Subtotal</th><th></th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="6" className="empty">Belum ada item</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={idx}>
                    <td><b>{it.nama_item}</b></td>
                    <td><span className="tag">{it.jenis}</span></td>
                    <td>{rupiah(it.harga_satuan)}</td>
                    <td>{it.jumlah}</td>
                    <td><b>{rupiah(it.harga_satuan * it.jumlah)}</b></td>
                    <td>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal
          title={`Edit Transaksi #${edit.id}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <div style={{ marginRight: 'auto', fontFamily: 'var(--serif)', fontSize: 19 }}>
                Total: <b style={{ color: 'var(--green-600)' }}>{rupiah(editTotal)}</b>
              </div>
              <button className="btn btn-line" onClick={() => setEdit(null)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={simpanEdit}>
                Simpan Perubahan
              </button>
            </>
          }
          wide
        >
          <div className="form-grid">
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={editForm.tanggal}
                onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })} />
            </div>
            <div className="field">
              <label>Nama Pelanggan</label>
              <input value={editForm.nama_pelanggan} placeholder="Umum"
                onChange={(e) => setEditForm({ ...editForm, nama_pelanggan: e.target.value })} />
            </div>
            <div className="field">
              <label>Metode Bayar</label>
              <select value={editForm.metode_bayar}
                onChange={(e) => setEditForm({ ...editForm, metode_bayar: e.target.value })}>
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div className="field">
              <label>Keterangan</label>
              <input value={editForm.keterangan}
                onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })} />
            </div>
          </div>

          <div className="panel" style={{ background: 'var(--pink-50)', margin: '6px 0 16px' }}>
            <div
              className="form-grid"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select
                  value={editPick.kategori_id}
                  onChange={(e) => setEditPick({ ...editPick, kategori_id: e.target.value, ref_id: '' })}
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((x) => (
                    <option key={x.id} value={x.id}>{x.nama_kategori}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Layanan</label>
                <select
                  value={editPick.ref_id}
                  onChange={(e) => setEditPick({ ...editPick, ref_id: e.target.value })}
                >
                  <option value="">Pilih layanan</option>
                  {filteredEditServices.map((x) => (
                    <option key={x.id} value={x.id}>{formatServiceOption(x)}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Harga</label>
                <input readOnly value={selectedEditService ? rupiah(selectedEditService.harga) : ''} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Qty</label>
                <input type="number" min="1" value={editPick.jumlah}
                  onChange={(e) => setEditPick({ ...editPick, jumlah: e.target.value })} />
              </div>
              <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-green btn-sm" style={{ width: '100%' }} onClick={addEditItem}>
                  + Tambah
                </button>
              </div>
            </div>
            <p className="hint" style={{ marginTop: 8, textAlign: 'left' }}>
              Harga layanan mengikuti harga utama yang diatur saat menambah layanan.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Jenis</th><th>Harga</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {editItems.length === 0 ? (
                  <tr><td colSpan="6" className="empty">Belum ada item</td></tr>
                ) : editItems.map((it, idx) => (
                  <tr key={`${it.jenis}-${it.ref_id || it.nama_item}-${idx}`}>
                    <td><b>{it.nama_item}</b></td>
                    <td><span className="tag">{it.jenis}</span></td>
                    <td>{rupiah(it.harga_satuan)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={it.jumlah}
                        style={{ width: 76, padding: '8px 10px' }}
                        onChange={(e) => setEditItems(editItems.map((row, i) => (
                          i === idx ? { ...row, jumlah: Number(e.target.value) || 1 } : row
                        )))}
                      />
                    </td>
                    <td><b>{rupiah(Number(it.harga_satuan) * Number(it.jumlah))}</b></td>
                    <td>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ textAlign: 'right', marginTop: 14, fontFamily: 'var(--serif)', fontSize: 19 }}>
            Total: <b style={{ color: 'var(--green-600)' }}>{rupiah(editTotal)}</b>
          </p>
        </Modal>
      )}
    </>
  );
}
