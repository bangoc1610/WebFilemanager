const path = require('path');
const fs = require('fs');

process.env.STORAGE_BASE = path.join(__dirname, 'tmp-api-storage');
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'password';
process.env.MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB || '100';

const request = require('supertest');
const app = require('../server');
const { readJSON, writeJSON } = require('../utils/storage');

const tmpBase = path.join(__dirname, 'tmp-api-storage');

beforeAll(() => {
  fs.mkdirSync(path.join(tmpBase, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tmpBase, 'files'), { recursive: true });
  writeJSON('files', []);
  writeJSON('groups', [{ id: 'g1', name: 'Tài chính', createdAt: '2024-01-01T00:00:00Z' }]);
  writeJSON('categories', [{ id: 'c1', name: 'Báo cáo', createdAt: '2024-01-01T00:00:00Z' }]);
  writeJSON('logs', []);
});

afterAll(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

// ─── Public API ──────────────────────────────────────────────

test('GET /api/files returns empty array', async () => {
  const res = await request(app).get('/api/files');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('GET /api/groups returns seeded group', async () => {
  const res = await request(app).get('/api/groups');
  expect(res.status).toBe(200);
  expect(res.body[0].name).toBe('Tài chính');
});

test('GET /api/categories returns seeded category', async () => {
  const res = await request(app).get('/api/categories');
  expect(res.status).toBe(200);
  expect(res.body[0].name).toBe('Báo cáo');
});

// ─── Auth ────────────────────────────────────────────────────

test('GET /admin redirects to /admin/login when unauthenticated', async () => {
  const res = await request(app).get('/admin');
  expect(res.status).toBe(302);
  expect(res.headers.location).toContain('/admin/login');
});

test('POST /admin/login with wrong password redirects to login with error', async () => {
  const res = await request(app)
    .post('/admin/login')
    .type('form')
    .send({ username: 'admin', password: 'wrong' });
  expect(res.status).toBe(302);
  expect(res.headers.location).toContain('/admin/login?error=1');
});

test('POST /admin/login with correct credentials redirects to /admin', async () => {
  const res = await request(app)
    .post('/admin/login')
    .type('form')
    .send({ username: 'admin', password: 'password' });
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/admin');
});

// ─── Groups & Categories ─────────────────────────────────────

let adminAgent;

beforeAll(async () => {
  adminAgent = request.agent(app);
  await adminAgent.post('/admin/login').type('form').send({ username: 'admin', password: 'password' });
});

test('POST /admin/groups creates a group', async () => {
  const res = await adminAgent
    .post('/admin/groups')
    .set('Content-Type', 'application/json')
    .send({ name: 'Nhân sự' });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Nhân sự');
  expect(res.body.id).toBeDefined();
});

test('POST /admin/groups with empty name returns 400', async () => {
  const res = await adminAgent
    .post('/admin/groups')
    .set('Content-Type', 'application/json')
    .send({ name: '   ' });
  expect(res.status).toBe(400);
});

test('DELETE /admin/groups/:id removes the group', async () => {
  const createRes = await adminAgent
    .post('/admin/groups')
    .set('Content-Type', 'application/json')
    .send({ name: 'ToDelete' });
  const id = createRes.body.id;
  const delRes = await adminAgent.delete(`/admin/groups/${id}`);
  expect(delRes.status).toBe(200);
  const groups = readJSON('groups');
  expect(groups.find(g => g.id === id)).toBeUndefined();
});

test('POST /admin/categories creates a category', async () => {
  const res = await adminAgent
    .post('/admin/categories')
    .set('Content-Type', 'application/json')
    .send({ name: 'Hợp đồng' });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Hợp đồng');
});

test('DELETE /admin/categories/:id removes the category', async () => {
  const createRes = await adminAgent
    .post('/admin/categories')
    .set('Content-Type', 'application/json')
    .send({ name: 'TmpCat' });
  const id = createRes.body.id;
  const delRes = await adminAgent.delete(`/admin/categories/${id}`);
  expect(delRes.status).toBe(200);
  const cats = readJSON('categories');
  expect(cats.find(c => c.id === id)).toBeUndefined();
});

// ─── Upload ──────────────────────────────────────────────────

test('POST /admin/upload stores file and returns entry', async () => {
  const tmpFile = path.join(__dirname, 'test-upload.pdf');
  fs.writeFileSync(tmpFile, 'fake pdf content');

  const res = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('groupId', 'g1')
    .field('categoryId', 'c1')
    .field('displayName', 'Tài liệu test');

  fs.unlinkSync(tmpFile);
  expect(res.status).toBe(200);
  expect(res.body.displayName).toBe('Tài liệu test');
  expect(res.body.id).toBeDefined();
  expect(res.body.storedName).toMatch(/\.pdf$/);
});

test('POST /admin/upload blocks .exe files', async () => {
  const tmpFile = path.join(__dirname, 'virus.exe');
  fs.writeFileSync(tmpFile, 'bad');

  const res = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('groupId', 'g1')
    .field('categoryId', 'c1')
    .field('displayName', 'Bad');

  fs.unlinkSync(tmpFile);
  expect(res.status).toBe(400);
});

test('POST /admin/upload without displayName returns 400', async () => {
  const tmpFile = path.join(__dirname, 'nodisplay.pdf');
  fs.writeFileSync(tmpFile, 'content');

  const res = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('displayName', '   ');

  try { fs.unlinkSync(tmpFile); } catch {}
  expect(res.status).toBe(400);
});

// ─── Delete & Logs ───────────────────────────────────────────

test('DELETE /admin/files/:id removes JSON entry and physical file', async () => {
  const tmpFile = path.join(__dirname, 'to-delete.pdf');
  fs.writeFileSync(tmpFile, 'delete me');

  const uploadRes = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('groupId', 'g1')
    .field('categoryId', 'c1')
    .field('displayName', 'Xóa tôi');
  fs.unlinkSync(tmpFile);

  const fileId = uploadRes.body.id;
  const storedName = uploadRes.body.storedName;
  const storedPath = path.join(tmpBase, 'files', storedName);
  expect(fs.existsSync(storedPath)).toBe(true);

  const delRes = await adminAgent.delete(`/admin/files/${fileId}`);
  expect(delRes.status).toBe(200);
  expect(fs.existsSync(storedPath)).toBe(false);
  expect(readJSON('files').find(f => f.id === fileId)).toBeUndefined();
});

test('DELETE /admin/files/:id returns 404 for unknown id', async () => {
  const res = await adminAgent.delete('/admin/files/nonexistent-id');
  expect(res.status).toBe(404);
});

test('GET /admin/logs returns array of log entries', async () => {
  const res = await adminAgent.get('/admin/logs');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  expect(res.body[0].action).toBeDefined();
});

// ─── Download ────────────────────────────────────────────────

test('GET /download/:id streams file with original filename', async () => {
  const tmpFile = path.join(__dirname, 'downloadable.pdf');
  fs.writeFileSync(tmpFile, 'downloadable content');

  const uploadRes = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('groupId', 'g1')
    .field('categoryId', 'c1')
    .field('displayName', 'Download me');
  fs.unlinkSync(tmpFile);

  const fileId = uploadRes.body.id;
  const res = await request(app).get(`/download/${fileId}`);
  expect(res.status).toBe(200);
  expect(res.headers['content-disposition']).toContain('downloadable.pdf');
});

test('GET /download/:id increments downloadCount', async () => {
  const tmpFile = path.join(__dirname, 'counter.pdf');
  fs.writeFileSync(tmpFile, 'counter test');

  const uploadRes = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('groupId', 'g1')
    .field('categoryId', 'c1')
    .field('displayName', 'Counter test');
  fs.unlinkSync(tmpFile);

  const fileId = uploadRes.body.id;
  await request(app).get(`/download/${fileId}`);
  await request(app).get(`/download/${fileId}`);

  const files = readJSON('files');
  const file = files.find(f => f.id === fileId);
  expect(file.downloadCount).toBe(2);
});

test('uploaded media keeps its MIME type for mobile sharing', async () => {
  const tmpFile = path.join(__dirname, 'photo.png');
  fs.writeFileSync(tmpFile, Buffer.from('fake png'));

  const uploadRes = await adminAgent
    .post('/admin/upload')
    .attach('file', tmpFile)
    .field('displayName', 'Mobile photo');
  fs.unlinkSync(tmpFile);

  expect(uploadRes.status).toBe(200);
  expect(uploadRes.body.mimeType).toBe('image/png');

  const res = await request(app).get(`/download/${uploadRes.body.id}`);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('image/png');
});

test('GET /download/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/download/totally-unknown-id');
  expect(res.status).toBe(404);
});
