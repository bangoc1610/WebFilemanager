const express = require('express');
const path = require('path');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/storage');
const { appendLog } = require('../utils/logger');
const { resolveStoredFilePath } = require('../utils/fileHelper');

const MEDIA_MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.3gp': 'video/3gpp',
};

function findFile(req, res) {
  const files = readJSON('files');
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Không tìm thấy file' });
    return null;
  }

  const file = files[idx];
  let resolved;
  try {
    resolved = resolveStoredFilePath(file.storedName);
  } catch (e) {
    if (e.code === 'PATH_TRAVERSAL') res.status(400).json({ error: 'Invalid path' });
    else res.status(500).json({ error: 'Lỗi hệ thống' });
    return null;
  }

  return { file, files, idx, resolved };
}

function recordDownload(req, result) {
  const { file, files, idx } = result;
  files[idx].downloadCount = (files[idx].downloadCount || 0) + 1;
  writeJSON('files', files);

  appendLog({ action: 'download', fileId: file.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });
}

// iOS Safari needs media served inline so it is recognized as a photo/video
// instead of being forced into the Files download manager.
router.get('/:id/media', (req, res) => {
  const result = findFile(req, res);
  if (!result) return;

  const { file, resolved } = result;
  const mimeType = file.mimeType && /^(image|video)\//.test(file.mimeType)
    ? file.mimeType
    : MEDIA_MIME_TYPES[path.extname(file.originalName).toLowerCase()];
  if (!mimeType) return res.status(415).json({ error: 'File không phải ảnh hoặc video' });

  recordDownload(req, result);
  res.type(mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(resolved);
});

router.get('/:id', (req, res) => {
  const result = findFile(req, res);
  if (!result) return;

  recordDownload(req, result);
  res.download(result.resolved, result.file.originalName);
});

module.exports = router;
