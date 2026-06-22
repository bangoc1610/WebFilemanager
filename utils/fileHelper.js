const path = require('path');
const { randomUUID } = require('crypto');

const BLOCKED_EXTENSIONS = new Set([
  '.php', '.exe', '.sh', '.bat', '.cmd',
  '.js', '.mjs', '.cjs', '.py', '.rb',
  '.pl', '.phtml', '.asp', '.aspx',
]);

function validateExtension(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return { ok: !BLOCKED_EXTENSIONS.has(ext), ext };
}

function generateStoredName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${randomUUID()}${ext}`;
}

function resolveStoredFilePath(storedName) {
  const STORAGE_BASE = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  const filesDir = path.join(STORAGE_BASE, 'files');
  const resolved = path.resolve(filesDir, storedName);
  if (!resolved.startsWith(filesDir + path.sep)) {
    const err = new Error('Path traversal detected');
    err.code = 'PATH_TRAVERSAL';
    throw err;
  }
  return resolved;
}

module.exports = { validateExtension, generateStoredName, BLOCKED_EXTENSIONS, resolveStoredFilePath };
