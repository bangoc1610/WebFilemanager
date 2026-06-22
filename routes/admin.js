const express = require('express');
const path = require('path');
const router = express.Router();
const { requireAuth } = require('../utils/auth');
const { appendLog } = require('../utils/logger');
const { readJSON, writeJSON } = require('../utils/storage');
const { validateExtension, generateStoredName } = require('../utils/fileHelper');
const { randomUUID: uuidv4 } = require('crypto');
const multer = require('multer');
const fs = require('fs');

// ─── Auth ────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('user-agent') || '';

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    appendLog({ action: 'login', ip, userAgent });
    return res.redirect('/admin');
  }
  res.status(401).sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// ─── Groups ─────────────────────────────────────────────────

router.post('/groups', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên nhóm không được để trống' });
  const groups = readJSON('groups');
  const entry = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  groups.push(entry);
  writeJSON('groups', groups);
  res.json(entry);
});

router.delete('/groups/:id', requireAuth, (req, res) => {
  let groups = readJSON('groups');
  const before = groups.length;
  groups = groups.filter(g => g.id !== req.params.id);
  if (groups.length === before) return res.status(404).json({ error: 'Không tìm thấy nhóm' });
  writeJSON('groups', groups);
  res.json({ ok: true });
});

// ─── Categories ──────────────────────────────────────────────

router.post('/categories', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên loại không được để trống' });
  const cats = readJSON('categories');
  const entry = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  cats.push(entry);
  writeJSON('categories', cats);
  res.json(entry);
});

router.delete('/categories/:id', requireAuth, (req, res) => {
  let cats = readJSON('categories');
  const before = cats.length;
  cats = cats.filter(c => c.id !== req.params.id);
  if (cats.length === before) return res.status(404).json({ error: 'Không tìm thấy loại' });
  writeJSON('categories', cats);
  res.json({ ok: true });
});

// ─── Upload ─────────────────────────────────────────────────

function filesDir() {
  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  return path.join(base, 'files');
}

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir()),
  filename: (req, file, cb) => cb(null, generateStoredName(file.originalname)),
});

function fileFilter(req, file, cb) {
  const { ok } = validateExtension(file.originalname);
  if (!ok) return cb(new Error('BLOCKED_EXT'));
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_MB * 1024 * 1024 } });

router.post('/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err && err.message === 'BLOCKED_EXT') {
      return res.status(400).json({ error: 'Loại file này không được phép upload' });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file nào' });

    const { groupId, categoryId, displayName } = req.body;
    if (!displayName || !displayName.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Tên hiển thị không được để trống' });
    }

    const files = readJSON('files');
    const entry = {
      id: uuidv4(),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      displayName: displayName.trim(),
      groupId: groupId || null,
      categoryId: categoryId || null,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      downloadCount: 0,
    };
    files.push(entry);
    writeJSON('files', files);

    appendLog({ action: 'upload', fileId: entry.id, fileName: entry.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json(entry);
  });
});

// ─── Delete File ─────────────────────────────────────────────

router.delete('/files/:id', requireAuth, (req, res) => {
  let files = readJSON('files');
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'Không tìm thấy file' });

  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  const filePath = path.join(base, 'files', file.storedName);
  const resolved = path.resolve(filePath);
  const expectedPrefix = path.resolve(path.join(base, 'files'));

  // Path traversal check
  if (!resolved.startsWith(expectedPrefix + path.sep) && resolved !== expectedPrefix) {
    return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  }

  try { fs.unlinkSync(resolved); } catch { /* file may already be missing */ }

  files = files.filter(f => f.id !== req.params.id);
  writeJSON('files', files);
  appendLog({ action: 'delete', fileId: req.params.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });
  res.json({ ok: true });
});

// ─── Logs ────────────────────────────────────────────────────

router.get('/logs', requireAuth, (req, res) => {
  const logs = readJSON('logs');
  res.json(logs.slice(-100).reverse());
});

module.exports = router;
