import { useEffect, useRef, useState } from 'react';
import api, { logoSalonUrl } from '../api';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';

const userKosong = { nama: '', email: '', password: '', role: 'kasir' };

export default function Settings() {
  const { user } = useAuth();
  const [salon, setSalon] = useState({
    nama_salon: '', alamat: '', telepon: '', logo_url: '',
  });
  const [pesan, setPesan] = useState('');
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [baru, setBaru] = useState(null);
  const [pwBaru, setPwBaru] = useState('');
  const logoInputRef = useRef(null);

  const muatUsers = () => api.get('/auth/users').then((r) => setUsers(r.data));
  useEffect(() => {
    api.get('/settings').then((r) => setSalon({
      nama_salon: r.data.nama_salon || '',
      alamat: r.data.alamat || '',
      telepon: r.data.telepon || '',
      logo_url: r.data.logo_url ?? r.data.logo ?? null,
    }));
    muatUsers();
  }, []);

  const simpanSalon = async () => {
    await api.put('/settings', salon);
    window.dispatchEvent(new Event('settings:saved'));
    setPesan('Pengaturan tersimpan');
    setTimeout(() => setPesan(''), 2500);
  };

  const pilihLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('File logo harus berupa gambar');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 360;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setSalon({ ...salon, logo_url: canvas.toDataURL('image/jpeg', 0.85) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const kosongkanLogo = () => {
    if (logoInputRef.current) logoInputRef.current.value = '';
    setSalon({ ...salon, logo_url: null });
  };

  const tambahUser = async () => {
    if (!baru.nama || !baru.email || !baru.password) {
      return alert('Nama, email, dan password wajib diisi');
    }
    await api.post('/auth/users', baru);
    setBaru(null);
    muatUsers();
  };

  const simpanUser = async () => {
    const body = { nama: edit.nama, role: edit.role };
    if (pwBaru) body.password = pwBaru;
    await api.put(`/auth/users/${edit.id}`, body);
    setEdit(null);
    setPwBaru('');
    muatUsers();
  };

  const hapusUser = async (id) => {
    if (confirm('Hapus user ini?')) {
      try {
        await api.delete(`/auth/users/${id}`);
        muatUsers();
      } catch (e) {
        alert(e.response?.data?.message || 'Gagal menghapus user');
      }
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>Pengaturan</h2>
        <p>Identitas salon &amp; manajemen pengguna</p>
      </div>

      <div className="panel">
        <h3>Identitas Salon</h3>
        <div className="form-grid">
          <div className="field full">
            <label>Nama Salon</label>
            <input value={salon.nama_salon}
              onChange={(e) => setSalon({ ...salon, nama_salon: e.target.value })} />
          </div>
          <div className="field full">
            <label>Alamat</label>
            <input value={salon.alamat}
              onChange={(e) => setSalon({ ...salon, alamat: e.target.value })} />
          </div>
          <div className="field">
            <label>Telepon</label>
            <input value={salon.telepon}
              onChange={(e) => setSalon({ ...salon, telepon: e.target.value })} />
          </div>
          <div className="field">
            <label>Logo</label>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={pilihLogo} />
          </div>
        </div>
        {salon.logo_url && (
          <div className="logo-preview-wrap">
            <img src={logoSalonUrl(salon)} alt="logo" className="logo-preview"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <button className="btn btn-line btn-sm" type="button" onClick={kosongkanLogo}>
              Kosongkan Logo
            </button>
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" style={{ width: 'auto' }}
            onClick={simpanSalon}>Simpan Pengaturan</button>
          {pesan && <span className="val green" style={{ fontSize: 14 }}>{pesan}</span>}
        </div>
      </div>

      <div className="panel">
        <h3>
          Pengguna &amp; Peran
          <button className="btn btn-green btn-sm" onClick={() => setBaru(userKosong)}>
            + Tambah Pengguna
          </button>
        </h3>
        <p className="hint" style={{ marginBottom: 12, textAlign: 'left' }}>
          Akun dibuat dari sini oleh pemilik/admin. Password disimpan dan ditampilkan langsung.
        </p>
        <div className="table-wrap">
          <table className="table-aksi-centered users-table">
            <thead>
              <tr><th>No</th><th>Nama</th><th>Email</th><th>Password</th><th>Peran</th><th className="aksi">Aksi</th></tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td><b>{u.nama}</b></td>
                  <td>{u.email}</td>
                  <td><code>{u.password || '-'}</code></td>
                  <td>
                    <span className={`tag ${u.role === 'pemilik' ? '' : 'pink'}`}>
                      {u.role === 'pemilik' ? 'Pemilik/Admin' : 'Kasir'}
                    </span>
                  </td>
                  <td className="aksi">
                    <div className="user-actions">
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => { setEdit({ ...u }); setPwBaru(''); }}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => hapusUser(u.id)}
                        style={u.id === user.id ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
                      >Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {baru && (
        <Modal
          title="Tambah Pengguna"
          onClose={() => setBaru(null)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setBaru(null)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={tambahUser}>Simpan</button>
            </>
          }
        >
          <UserForm form={baru} setForm={setBaru} />
        </Modal>
      )}

      {edit && (
        <Modal
          title={`Edit Pengguna: ${edit.email}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn btn-line" onClick={() => setEdit(null)}>Batal</button>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                onClick={simpanUser}>Simpan</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field full">
              <label>Nama</label>
              <input value={edit.nama}
                onChange={(e) => setEdit({ ...edit, nama: e.target.value })} />
            </div>
            <div className="field">
              <label>Peran</label>
              <select value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="kasir">Kasir</option>
                <option value="pemilik">Pemilik/Admin</option>
              </select>
            </div>
            <div className="field">
              <label>Password Baru</label>
              <input type="text" value={pwBaru} placeholder="kosongkan jika tidak diubah"
                onChange={(e) => setPwBaru(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function UserForm({ form, setForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="form-grid">
      <div className="field full">
        <label>Nama</label>
        <input required value={form.nama} onChange={set('nama')} />
      </div>
      <div className="field full">
        <label>Email / Username</label>
        <input type="email" required value={form.email} onChange={set('email')} />
      </div>
      <div className="field">
        <label>Peran</label>
        <select value={form.role} onChange={set('role')}>
          <option value="kasir">Kasir</option>
          <option value="pemilik">Pemilik/Admin</option>
        </select>
      </div>
      <div className="field">
        <label>Password</label>
        <input type="text" required value={form.password} onChange={set('password')} />
      </div>
    </div>
  );
}
