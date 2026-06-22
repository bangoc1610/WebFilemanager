const express = require('express');
const path = require('path');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/storage');
const { appendLog } = require('../utils/logger');
const { resolveStoredFilePath } = require('../utils/fileHelper');

router.get('/:id', (req, res) => {
  const files = readJSON('files');
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy file' });

  const file = files[idx];
  let resolved;
  try {
    resolved = resolveStoredFilePath(file.storedName);
  } catch (e) {
    if (e.code === 'PATH_TRAVERSAL') return res.status(400).json({ error: 'Invalid path' });
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }

  // Increment download count
  files[idx].downloadCount = (files[idx].downloadCount || 0) + 1;
  writeJSON('files', files);

  appendLog({ action: 'download', fileId: file.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });

  res.download(resolved, file.originalName);
});

module.exports = router;
