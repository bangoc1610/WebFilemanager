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

module.exports = router;
