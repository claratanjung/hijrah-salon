// Middleware autentikasi & otorisasi role
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'rahasia';

function normalizeRole(role) {
  if (!role) return null;
  if (role === 'pemilik' || role === 'admin') return 'admin';
  if (role === 'kasir') return 'kasir';
  return role;
}

// Verifikasi token JWT
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token tidak ada, silakan login.' });
  try {
    const decoded = jwt.verify(token, SECRET); // { id, nama, email, role }
    req.user = { ...decoded, role: normalizeRole(decoded.role) };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Sesi habis / token tidak valid.' });
  }
}

// Hanya role tertentu yang boleh (mis. 'admin')
function requireRole(...roles) {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);
    if (!req.user || !allowed.includes(userRole)) {
      return res.status(403).json({
        message: 'Akses ditolak. Fitur ini khusus ' + roles.join('/') + '.',
      });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireAdminOrKasir = requireRole('admin', 'kasir');

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireAdminOrKasir,
  normalizeRole,
  SECRET,
};
