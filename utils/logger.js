const { readJSON, writeJSON } = require('./storage');

function appendLog({ action, fileId = null, fileName = null, ip, userAgent }) {
  const logs = readJSON('logs');
  logs.push({ action, fileId, fileName, ip, userAgent, createdAt: new Date().toISOString() });
  writeJSON('logs', logs);
}

module.exports = { appendLog };
