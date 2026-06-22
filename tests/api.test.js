const path = require('path');
const fs = require('fs');

process.env.STORAGE_BASE = path.join(__dirname, 'tmp-api-storage');
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'password';

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

test('POST /admin/login with wrong password returns 401', async () => {
  const res = await request(app)
    .post('/admin/login')
    .type('form')
    .send({ username: 'admin', password: 'wrong' });
  expect(res.status).toBe(401);
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
