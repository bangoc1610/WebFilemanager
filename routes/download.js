const express = require('express');
const path = require('path');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/storage');
const { appendLog } = require('../utils/logger');

router.get('/:id', (req, res) => {
  const files = readJSON('files');
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy file' });

  const file = files[idx];
  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  const filePath = path.join(base, 'files', file.storedName);
  const resolved = path.resolve(filePath);
  const expectedPrefix = path.resolve(path.join(base, 'files'));

  // Path traversal check
  if (!resolved.startsWith(expectedPrefix + path.sep) && resolved !== expectedPrefix) {
    return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  }

  // Increment download count
  files[idx].downloadCount = (files[idx].downloadCount || 0) + 1;
  writeJSON('files', files);

  appendLog({ action: 'download', fileId: file.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });

  res.download(resolved, file.originalName);
});

module.exports = router;
