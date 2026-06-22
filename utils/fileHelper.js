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

module.exports = { validateExtension, generateStoredName, BLOCKED_EXTENSIONS };
