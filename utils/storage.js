const fs = require('fs');
const path = require('path');

function dataDir() {
  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  return path.join(base, 'data');
}

function readJSON(name) {
  try {
    const raw = fs.readFileSync(path.join(dataDir(), `${name}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(name, data) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(path.join(dataDir(), `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON };
