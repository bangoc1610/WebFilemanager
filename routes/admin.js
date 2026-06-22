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

// ─── Placeholders for Tasks 6-8 ──────

module.exports = router;
