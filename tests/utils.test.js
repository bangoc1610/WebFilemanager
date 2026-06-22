const fs = require('fs');
const path = require('path');

process.env.STORAGE_BASE = path.join(__dirname, 'tmp-storage');

const { readJSON, writeJSON } = require('../utils/storage');
const { appendLog } = require('../utils/logger');

const tmpData = path.join(__dirname, 'tmp-storage', 'data');

beforeAll(() => fs.mkdirSync(tmpData, { recursive: true }));
afterAll(() => fs.rmSync(path.join(__dirname, 'tmp-storage'), { recursive: true, force: true }));

test('readJSON returns [] for missing file', () => {
  expect(readJSON('nonexistent')).toEqual([]);
});

test('readJSON returns [] for corrupt JSON', () => {
  fs.writeFileSync(path.join(tmpData, 'corrupt.json'), 'not json', 'utf8');
  expect(readJSON('corrupt')).toEqual([]);
});

test('writeJSON then readJSON roundtrip', () => {
  const data = [{ id: '1', name: 'test' }];
  writeJSON('roundtrip', data);
  expect(readJSON('roundtrip')).toEqual(data);
});

test('appendLog adds entry with createdAt to logs.json', () => {
  writeJSON('logs', []);
  appendLog({ action: 'login', fileId: null, fileName: null, ip: '127.0.0.1', userAgent: 'jest' });
  const logs = readJSON('logs');
  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('login');
  expect(logs[0].createdAt).toBeDefined();
  expect(logs[0].ip).toBe('127.0.0.1');
});

const { validateExtension, generateStoredName } = require('../utils/fileHelper');

test('validateExtension blocks .php', () => {
  expect(validateExtension('shell.php').ok).toBe(false);
});

test('validateExtension blocks .exe', () => {
  expect(validateExtension('virus.exe').ok).toBe(false);
});

test('validateExtension blocks .js', () => {
  expect(validateExtension('script.js').ok).toBe(false);
});

test('validateExtension allows .pdf', () => {
  const result = validateExtension('report.pdf');
  expect(result.ok).toBe(true);
  expect(result.ext).toBe('.pdf');
});

test('generateStoredName returns uuid.ext pattern', () => {
  const name = generateStoredName('report.pdf');
  expect(name).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);
});
