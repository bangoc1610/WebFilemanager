# Web App Quản Lý File — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete file management web app with Node.js/Express, JSON-file storage, Vietnamese UI, admin dashboard with upload/CRUD, and a public client download page.

**Architecture:** Modular Express app — `routes/admin.js`, `routes/api.js`, `routes/download.js` each own one concern; `utils/` layer owns all JSON I/O, logging, and file-name logic. HTML views are static files served directly. Storage directory is never exposed as Express static — all file access goes through backend routes.

**Tech Stack:** Node.js 18+, Express 4.18, Multer 1.x (lts), express-session 1.17, uuid 9.x, dotenv 16.x · Dev: Jest, Supertest

## Global Constraints

- All UI text in Vietnamese (labels, buttons, error messages)
- File storage: `./storage/files/` · JSON data: `./storage/data/`
- Blocked upload extensions: `.php .exe .sh .bat .cmd .js .mjs .cjs .py .rb .pl .phtml .asp .aspx`
- Max file size: `MAX_FILE_SIZE_MB` env var (default 100 MB)
- `./storage/` is NEVER mounted as Express static
- Download only via `/download/:id` — always path-traversal-checked
- Session cookie: `httpOnly: true`, `sameSite: 'lax'`, secret from `SESSION_SECRET` env var
- Uploaded files renamed to `{uuid}.{ext}` on disk; original name kept in JSON
- Deploy: PM2 process manager + Nginx HTTP reverse proxy on Ubuntu VPS

---

## File Map

| File | Responsibility |
|------|---------------|
| `server.js` | App bootstrap, middleware, route mounting, storage init |
| `utils/storage.js` | `readJSON` / `writeJSON` — single source for all JSON I/O |
| `utils/logger.js` | `appendLog` — appends structured entry to `logs.json` |
| `utils/fileHelper.js` | `validateExtension`, `generateStoredName` |
| `utils/auth.js` | `requireAuth` middleware |
| `routes/api.js` | GET `/api/files`, `/api/groups`, `/api/categories` |
| `routes/admin.js` | Login/logout, upload, groups CRUD, categories CRUD, delete file, logs |
| `routes/download.js` | GET `/download/:id` — stream file, increment counter, log |
| `views/index.html` | Client page |
| `views/admin.html` | Admin dashboard |
| `views/login.html` | Admin login form |
| `public/css/style.css` | Client styles |
| `public/css/admin.css` | Admin + login styles |
| `public/js/client.js` | Client-side filter/search/render |
| `public/js/admin.js` | Admin-side upload/CRUD/tabs |
| `ecosystem.config.js` | PM2 config |
| `README.md` | Install + VPS deploy guide |
| `tests/utils.test.js` | Unit tests for storage, logger, fileHelper |
| `tests/api.test.js` | Integration tests for all routes |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `server.js`

**Interfaces:**
- Produces: `app` (Express instance, exported for testing), `initStorage()` (creates dirs + empty JSON files on boot)

- [ ] **Step 1: Init npm and install dependencies**

```bash
cd g:\5.Tool\JS\webfilemanager
npm init -y
npm install express multer@1.4.5-lts.1 express-session uuid dotenv
npm install --save-dev jest supertest
```

- [ ] **Step 2: Create `.env.example`**

```env
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
SESSION_SECRET=replace-with-long-random-string-here
MAX_FILE_SIZE_MB=100
APP_NAME=Quản Lý File
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
storage/files/*
storage/data/*
!storage/files/.gitkeep
!storage/data/.gitkeep
```

- [ ] **Step 4: Update `package.json` scripts section**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "jest --runInBand --forceExit"
  }
}
```

- [ ] **Step 5: Create `server.js`**

```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();

function initStorage() {
  const base = process.env.STORAGE_BASE || path.join(__dirname, 'storage');
  const dirs = [path.join(base, 'files'), path.join(base, 'data')];
  dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

  ['files', 'groups', 'categories', 'logs'].forEach(name => {
    const p = path.join(base, 'data', `${name}.json`);
    if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf8');
  });
}

initStorage();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/download', require('./routes/download'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
}

module.exports = app;
```

- [ ] **Step 6: Create stub route files and placeholder views so server starts**

Create `routes/api.js`:
```javascript
const express = require('express');
module.exports = express.Router();
```

Create `routes/admin.js`:
```javascript
const express = require('express');
module.exports = express.Router();
```

Create `routes/download.js`:
```javascript
const express = require('express');
module.exports = express.Router();
```

Create dirs: `views/`, `public/css/`, `public/js/`

Create `views/index.html`:
```html
<!DOCTYPE html><html><body><p>Client placeholder</p></body></html>
```
Create `views/admin.html`:
```html
<!DOCTYPE html><html><body><p>Admin placeholder</p></body></html>
```
Create `views/login.html`:
```html
<!DOCTYPE html><html><body><p>Login placeholder</p></body></html>
```

- [ ] **Step 7: Verify server starts**

```bash
cp .env.example .env
node server.js
# Expected: Server chạy tại http://localhost:3000
# Ctrl+C to stop
```

- [ ] **Step 8: Commit**

```bash
git init
git add package.json .env.example .gitignore server.js routes/ views/ public/
git commit -m "feat: project scaffold — Express boot, storage init, stub routes"
```

---

### Task 2: Storage & Logger Utils

**Files:**
- Create: `utils/storage.js`
- Create: `utils/logger.js`
- Create: `tests/utils.test.js`

**Interfaces:**
- Produces: `readJSON(name)` → `Array` (returns `[]` on missing/corrupt file), `writeJSON(name, data)` → void, `appendLog({ action, fileId, fileName, ip, userAgent })` → void
- `name` is the base filename (e.g. `'files'`) — path resolved internally to `{STORAGE_BASE}/data/{name}.json`

- [ ] **Step 1: Create `tests/utils.test.js` with failing tests**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/utils.test.js --no-coverage
# Expected: FAIL — Cannot find module '../utils/storage'
```

- [ ] **Step 3: Create `utils/storage.js`**

```javascript
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
```

- [ ] **Step 4: Create `utils/logger.js`**

```javascript
const { readJSON, writeJSON } = require('./storage');

function appendLog({ action, fileId = null, fileName = null, ip, userAgent }) {
  const logs = readJSON('logs');
  logs.push({ action, fileId, fileName, ip, userAgent, createdAt: new Date().toISOString() });
  writeJSON('logs', logs);
}

module.exports = { appendLog };
```

- [ ] **Step 5: Run — verify pass**

```bash
npx jest tests/utils.test.js --no-coverage
# Expected: PASS — 4 tests
```

- [ ] **Step 6: Commit**

```bash
git add utils/storage.js utils/logger.js tests/utils.test.js
git commit -m "feat: storage readJSON/writeJSON and logger appendLog"
```

---

### Task 3: File Helper Util

**Files:**
- Create: `utils/fileHelper.js`
- Modify: `tests/utils.test.js` — append 4 tests at end of file

**Interfaces:**
- Produces: `validateExtension(originalName)` → `{ ok: boolean, ext: string }`, `generateStoredName(originalName)` → `string` (format: `uuid.ext`)

- [ ] **Step 1: Append failing tests to end of `tests/utils.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/utils.test.js --no-coverage
# Expected: FAIL — Cannot find module '../utils/fileHelper'
```

- [ ] **Step 3: Create `utils/fileHelper.js`**

```javascript
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
  return `${uuidv4()}${ext}`;
}

module.exports = { validateExtension, generateStoredName, BLOCKED_EXTENSIONS };
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/utils.test.js --no-coverage
# Expected: PASS — 9 tests
```

- [ ] **Step 5: Commit**

```bash
git add utils/fileHelper.js tests/utils.test.js
git commit -m "feat: fileHelper validateExtension and generateStoredName"
```

---

### Task 4: API Routes

**Files:**
- Create: `routes/api.js` (replace stub)
- Create: `tests/api.test.js`

**Interfaces:**
- Consumes: `readJSON('files')`, `readJSON('groups')`, `readJSON('categories')`
- Produces: `GET /api/files` → JSON array, `GET /api/groups` → JSON array, `GET /api/categories` → JSON array

- [ ] **Step 1: Create `tests/api.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — routes respond with empty router (no routes defined)
```

- [ ] **Step 3: Replace `routes/api.js`**

```javascript
const express = require('express');
const router = express.Router();
const { readJSON } = require('../utils/storage');

router.get('/files', (req, res) => res.json(readJSON('files')));
router.get('/groups', (req, res) => res.json(readJSON('groups')));
router.get('/categories', (req, res) => res.json(readJSON('categories')));

module.exports = router;
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 3 tests
```

- [ ] **Step 5: Commit**

```bash
git add routes/api.js tests/api.test.js
git commit -m "feat: public API routes for files, groups, categories"
```

---

### Task 5: Admin Auth (Login / Logout / requireAuth)

**Files:**
- Create: `utils/auth.js`
- Modify: `routes/admin.js` (replace stub — auth routes only; more routes added in Tasks 6–8)
- Modify: `tests/api.test.js` — append auth tests

**Interfaces:**
- Produces: `requireAuth` middleware (redirects to `/admin/login` if not authenticated), `POST /admin/login`, `POST /admin/logout`, `GET /admin/login`, `GET /admin`

- [ ] **Step 1: Append auth tests to end of `tests/api.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — GET /admin returns 404
```

- [ ] **Step 3: Create `utils/auth.js`**

```javascript
function requireAuth(req, res, next) {
  if (req.session && req.session.admin === true) return next();
  res.redirect('/admin/login');
}

module.exports = { requireAuth };
```

- [ ] **Step 4: Replace `routes/admin.js` with auth routes**

```javascript
const express = require('express');
const path = require('path');
const router = express.Router();
const { requireAuth } = require('../utils/auth');
const { appendLog } = require('../utils/logger');
const { readJSON, writeJSON } = require('../utils/storage');
const { validateExtension, generateStoredName } = require('../utils/fileHelper');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');

// ─── Auth ────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('user-agent') || '';

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    appendLog({ action: 'login', ip, userAgent });
    return res.redirect('/admin');
  }
  res.status(401).sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// ─── Placeholders for Tasks 6-8 (filled in next tasks) ──────

module.exports = router;
```

- [ ] **Step 5: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 6 tests
```

- [ ] **Step 6: Commit**

```bash
git add utils/auth.js routes/admin.js tests/api.test.js
git commit -m "feat: admin auth — login, logout, requireAuth middleware"
```

---

### Task 6: Admin Groups & Categories CRUD

**Files:**
- Modify: `routes/admin.js` — insert groups and categories routes before `module.exports`
- Modify: `tests/api.test.js` — append CRUD tests

**Interfaces:**
- Consumes: `readJSON('groups')`, `writeJSON('groups', ...)`, same for categories, `uuidv4()`
- Produces: `POST /admin/groups` → `{ id, name, createdAt }`, `DELETE /admin/groups/:id` → `{ ok: true }`, same pattern for categories

- [ ] **Step 1: Append CRUD tests to end of `tests/api.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — POST /admin/groups returns 404
```

- [ ] **Step 3: Insert groups and categories routes into `routes/admin.js`** (before the final `module.exports` line)

```javascript
// ─── Groups ─────────────────────────────────────────────────

router.post('/groups', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên nhóm không được để trống' });
  const groups = readJSON('groups');
  const entry = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  groups.push(entry);
  writeJSON('groups', groups);
  res.json(entry);
});

router.delete('/groups/:id', requireAuth, (req, res) => {
  let groups = readJSON('groups');
  const before = groups.length;
  groups = groups.filter(g => g.id !== req.params.id);
  if (groups.length === before) return res.status(404).json({ error: 'Không tìm thấy nhóm' });
  writeJSON('groups', groups);
  res.json({ ok: true });
});

// ─── Categories ──────────────────────────────────────────────

router.post('/categories', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên loại không được để trống' });
  const cats = readJSON('categories');
  const entry = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  cats.push(entry);
  writeJSON('categories', cats);
  res.json(entry);
});

router.delete('/categories/:id', requireAuth, (req, res) => {
  let cats = readJSON('categories');
  const before = cats.length;
  cats = cats.filter(c => c.id !== req.params.id);
  if (cats.length === before) return res.status(404).json({ error: 'Không tìm thấy loại' });
  writeJSON('categories', cats);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 11 tests
```

- [ ] **Step 5: Commit**

```bash
git add routes/admin.js tests/api.test.js
git commit -m "feat: admin groups and categories CRUD endpoints"
```

---

### Task 7: Admin Upload

**Files:**
- Modify: `routes/admin.js` — insert upload route before `module.exports`
- Modify: `tests/api.test.js` — append upload tests

**Interfaces:**
- Consumes: `validateExtension`, `generateStoredName`, `readJSON('files')`, `writeJSON('files', ...)`, `appendLog`, Multer disk storage
- Produces: `POST /admin/upload` (multipart: `file`, `groupId`, `categoryId`, `displayName`) → `{ id, originalName, storedName, displayName, groupId, categoryId, size, uploadedAt, downloadCount }`

- [ ] **Step 1: Append upload tests to end of `tests/api.test.js`**

```javascript
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

  fs.unlinkSync(tmpFile);
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — POST /admin/upload returns 404
```

- [ ] **Step 3: Insert upload route into `routes/admin.js`** (after categories block, before `module.exports`)

```javascript
// ─── Upload ─────────────────────────────────────────────────

function filesDir() {
  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  return path.join(base, 'files');
}

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir()),
  filename: (req, file, cb) => {
    const { ok } = validateExtension(file.originalname);
    if (!ok) return cb(new Error('BLOCKED_EXT'));
    cb(null, generateStoredName(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: MAX_MB * 1024 * 1024 } });

router.post('/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err && err.message === 'BLOCKED_EXT') {
      return res.status(400).json({ error: 'Loại file này không được phép upload' });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file nào' });

    const { groupId, categoryId, displayName } = req.body;
    if (!displayName || !displayName.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Tên hiển thị không được để trống' });
    }

    const files = readJSON('files');
    const entry = {
      id: uuidv4(),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      displayName: displayName.trim(),
      groupId: groupId || null,
      categoryId: categoryId || null,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      downloadCount: 0,
    };
    files.push(entry);
    writeJSON('files', files);

    appendLog({ action: 'upload', fileId: entry.id, fileName: entry.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json(entry);
  });
});
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 14 tests
```

- [ ] **Step 5: Commit**

```bash
git add routes/admin.js tests/api.test.js
git commit -m "feat: admin upload with Multer, extension validation, logging"
```

---

### Task 8: Admin Delete File + Logs Endpoint

**Files:**
- Modify: `routes/admin.js` — insert delete and logs routes before `module.exports`
- Modify: `tests/api.test.js` — append delete and logs tests

**Interfaces:**
- Consumes: `readJSON('files')`, `writeJSON('files', ...)`, `readJSON('logs')`, `appendLog`, `fs.unlinkSync`
- Produces: `DELETE /admin/files/:id` → `{ ok: true }` (removes JSON entry and physical file), `GET /admin/logs` → last 100 log entries, most recent first

- [ ] **Step 1: Append delete and logs tests to end of `tests/api.test.js`**

```javascript
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
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — DELETE /admin/files/:id returns 404
```

- [ ] **Step 3: Insert delete and logs routes into `routes/admin.js`** (before `module.exports`)

```javascript
// ─── Delete File ─────────────────────────────────────────────

router.delete('/files/:id', requireAuth, (req, res) => {
  let files = readJSON('files');
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'Không tìm thấy file' });

  const base = process.env.STORAGE_BASE || path.join(__dirname, '..', 'storage');
  const filePath = path.join(base, 'files', file.storedName);
  const resolved = path.resolve(filePath);
  const expectedPrefix = path.resolve(path.join(base, 'files'));

  if (!resolved.startsWith(expectedPrefix + path.sep) && resolved !== expectedPrefix) {
    return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  }

  try { fs.unlinkSync(resolved); } catch { /* file may already be missing */ }

  files = files.filter(f => f.id !== req.params.id);
  writeJSON('files', files);
  appendLog({ action: 'delete', fileId: req.params.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });
  res.json({ ok: true });
});

// ─── Logs ────────────────────────────────────────────────────

router.get('/logs', requireAuth, (req, res) => {
  const logs = readJSON('logs');
  res.json(logs.slice(-100).reverse());
});
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 17 tests
```

- [ ] **Step 5: Commit**

```bash
git add routes/admin.js tests/api.test.js
git commit -m "feat: admin delete file (removes physical file + JSON) and logs endpoint"
```

---

### Task 9: Download Route

**Files:**
- Modify: `routes/download.js` (replace stub)
- Modify: `tests/api.test.js` — append download tests

**Interfaces:**
- Consumes: `readJSON('files')`, `writeJSON('files', ...)`, `appendLog`
- Produces: `GET /download/:id` — sets `Content-Disposition: attachment; filename="originalName"`, increments `downloadCount` in JSON, logs the download

- [ ] **Step 1: Append download tests to end of `tests/api.test.js`**

```javascript
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

test('GET /download/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/download/totally-unknown-id');
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: FAIL — GET /download/:id returns 404 (empty router)
```

- [ ] **Step 3: Replace `routes/download.js`**

```javascript
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

  if (!resolved.startsWith(expectedPrefix + path.sep) && resolved !== expectedPrefix) {
    return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  }

  files[idx].downloadCount = (files[idx].downloadCount || 0) + 1;
  writeJSON('files', files);

  appendLog({ action: 'download', fileId: file.id, fileName: file.originalName, ip: req.ip, userAgent: req.get('user-agent') || '' });

  res.download(resolved, file.originalName);
});

module.exports = router;
```

- [ ] **Step 4: Run — verify pass**

```bash
npx jest tests/api.test.js --no-coverage
# Expected: PASS — 20 tests
```

- [ ] **Step 5: Commit**

```bash
git add routes/download.js tests/api.test.js
git commit -m "feat: download route with path traversal check, counter increment, logging"
```

---

### Task 10: Client View

**Files:**
- Modify: `views/index.html` (replace placeholder — full page)
- Create: `public/css/style.css`
- Create: `public/js/client.js`

**Interfaces:**
- Consumes: `GET /api/files`, `GET /api/groups`, `GET /api/categories` on page load
- Produces: Filterable/searchable card grid with download buttons, fully client-side filtering (no extra API calls after load)

- [ ] **Step 1: Create `public/css/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F8FAFC;
  color: #1E293B;
  min-height: 100vh;
}

header {
  background: #2563EB;
  color: #fff;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}

header h1 { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.01em; }

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  gap: 0.5rem;
  flex: 1;
  max-width: 340px;
}

.search-box input {
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 0.9rem;
  width: 100%;
}

.search-box input::placeholder { color: rgba(255,255,255,0.65); }

.filters {
  background: #fff;
  border-bottom: 1px solid #E2E8F0;
  padding: 0.75rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.filters label { font-size: 0.85rem; color: #64748B; font-weight: 500; }

.filters select {
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  font-size: 0.875rem;
  color: #374151;
  background: #fff;
  cursor: pointer;
}

.filters select:focus { outline: 2px solid #2563EB; outline-offset: 1px; }

.container { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }

.results-info { color: #64748B; font-size: 0.825rem; margin-bottom: 1rem; }

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.file-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: box-shadow 0.15s, transform 0.15s;
}

.file-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }

.file-icon { font-size: 2rem; line-height: 1; }

.file-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1E293B;
  line-height: 1.35;
  word-break: break-word;
}

.file-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.1rem; }

.tag {
  background: #EFF6FF;
  color: #2563EB;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.file-meta { font-size: 0.78rem; color: #94A3B8; margin-top: auto; padding-top: 0.25rem; }

.btn-download {
  margin-top: 0.5rem;
  background: #2563EB;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  display: block;
  transition: background 0.15s;
}

.btn-download:hover { background: #1D4ED8; }

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #94A3B8;
  grid-column: 1 / -1;
}

.empty-state .icon { font-size: 3rem; margin-bottom: 0.75rem; }
.empty-state p { font-size: 0.9rem; }

@media (max-width: 640px) {
  .file-grid { grid-template-columns: 1fr; }
  header { padding: 0.75rem 1rem; }
  .container { padding: 1rem; }
  .search-box { max-width: 100%; }
}
```

- [ ] **Step 2: Create `public/js/client.js`**

```javascript
let allFiles = [], allGroups = [], allCategories = [];

const EXT_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📊', pptx: '📊', txt: '📃', csv: '📊',
  zip: '🗜️', rar: '🗜️', '7z': '🗜️',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
  mp3: '🎵', wav: '🎵', flac: '🎵',
};

function getIcon(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return EXT_ICONS[ext] || '📁';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getGroupName(id) { return (allGroups.find(g => g.id === id) || {}).name || ''; }
function getCatName(id) { return (allCategories.find(c => c.id === id) || {}).name || ''; }

function renderFiles(files) {
  const grid = document.getElementById('fileGrid');
  const info = document.getElementById('resultsInfo');
  info.textContent = `Hiển thị ${files.length} tài liệu`;

  if (files.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <div class="icon">📭</div>
      <p>Không tìm thấy tài liệu nào phù hợp</p>
    </div>`;
    return;
  }

  grid.innerHTML = files.map(f => {
    const group = getGroupName(f.groupId);
    const cat = getCatName(f.categoryId);
    const date = new Date(f.uploadedAt).toLocaleDateString('vi-VN');
    return `<div class="file-card">
      <div class="file-icon">${getIcon(f.originalName)}</div>
      <div class="file-name">${escapeHtml(f.displayName)}</div>
      <div class="file-tags">
        ${group ? `<span class="tag">${escapeHtml(group)}</span>` : ''}
        ${cat ? `<span class="tag">${escapeHtml(cat)}</span>` : ''}
      </div>
      <div class="file-meta">${formatSize(f.size)} &bull; ${date}</div>
      <a class="btn-download" href="/download/${f.id}">⬇ Tải xuống</a>
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const groupId = document.getElementById('groupFilter').value;
  const catId = document.getElementById('catFilter').value;

  const filtered = allFiles.filter(f => {
    const matchSearch = !search
      || f.displayName.toLowerCase().includes(search)
      || f.originalName.toLowerCase().includes(search);
    const matchGroup = !groupId || f.groupId === groupId;
    const matchCat = !catId || f.categoryId === catId;
    return matchSearch && matchGroup && matchCat;
  });
  renderFiles(filtered);
}

async function init() {
  try {
    const [files, groups, categories] = await Promise.all([
      fetch('/api/files').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    allFiles = files; allGroups = groups; allCategories = categories;
  } catch {
    document.getElementById('resultsInfo').textContent = 'Lỗi tải dữ liệu. Vui lòng thử lại.';
    return;
  }

  const groupSel = document.getElementById('groupFilter');
  const catSel = document.getElementById('catFilter');

  allGroups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id; opt.textContent = g.name;
    groupSel.appendChild(opt);
  });

  allCategories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    catSel.appendChild(opt);
  });

  renderFiles(allFiles);

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  groupSel.addEventListener('change', applyFilters);
  catSel.addEventListener('change', applyFilters);
}

init();
```

- [ ] **Step 3: Replace `views/index.html` with full client page**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kho Tài Liệu</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <header>
    <h1>📁 Kho Tài Liệu</h1>
    <div class="search-box">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input id="searchInput" type="search" placeholder="Tìm kiếm tài liệu..." autocomplete="off" />
    </div>
  </header>

  <div class="filters">
    <label for="groupFilter">Nhóm:</label>
    <select id="groupFilter">
      <option value="">-- Tất cả --</option>
    </select>
    <label for="catFilter">Loại:</label>
    <select id="catFilter">
      <option value="">-- Tất cả --</option>
    </select>
  </div>

  <div class="container">
    <div class="results-info" id="resultsInfo">Đang tải...</div>
    <div class="file-grid" id="fileGrid"></div>
  </div>

  <script src="/js/client.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify manually**

```bash
node server.js
# Open http://localhost:3000
# Expected: header with search, filter dropdowns, file grid (empty if no uploads yet)
# Upload a test file via /admin first, then verify the card appears with download button
```

- [ ] **Step 5: Commit**

```bash
git add views/index.html public/css/style.css public/js/client.js
git commit -m "feat: client page — card grid, real-time search, group/category filters"
```

---

### Task 11: Admin Dashboard View

**Files:**
- Modify: `views/login.html` (replace placeholder — full login page)
- Modify: `views/admin.html` (replace placeholder — full dashboard)
- Create: `public/css/admin.css`
- Create: `public/js/admin.js`

**Interfaces:**
- Consumes: all admin API endpoints (login, logout, upload, groups/categories CRUD, delete file, logs)
- Produces: Full Vietnamese dashboard with Stats Bar + 5 tabs (Upload, Danh sách file, Nhóm, Loại, Log)

- [ ] **Step 1: Create `public/css/admin.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8FAFC; color: #1E293B; }

/* ── Login ── */
.login-body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); }
.login-card { background: #fff; border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 380px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.login-icon { font-size: 2.5rem; text-align: center; margin-bottom: 1rem; }
.login-card h2 { text-align: center; margin-bottom: 1.5rem; font-size: 1.25rem; color: #1E293B; }
.error-banner { background: #FEE2E2; color: #991B1B; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.85rem; margin-bottom: 1rem; display: none; }

/* ── Forms ── */
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.825rem; font-weight: 600; color: #475569; margin-bottom: 0.35rem; }
.form-group input, .form-group select {
  width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #CBD5E1; border-radius: 8px;
  font-size: 0.9rem; color: #1E293B; background: #fff; transition: border-color 0.15s;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

/* ── Buttons ── */
.btn { padding: 0.55rem 1.1rem; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s, opacity 0.15s; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #2563EB; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1D4ED8; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-secondary { background: #E2E8F0; color: #374151; }
.btn-secondary:hover { background: #CBD5E1; }
.btn-full { width: 100%; padding: 0.7rem; font-size: 0.95rem; }

/* ── Alert ── */
.alert-toast {
  position: fixed; top: 1rem; right: 1rem; padding: 0.75rem 1.25rem;
  border-radius: 10px; font-size: 0.875rem; z-index: 9999; max-width: 320px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: none; animation: slideIn 0.2s ease;
}
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
.alert-toast.success { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; }
.alert-toast.error { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }

/* ── Admin header ── */
.admin-header {
  background: #1E293B; color: #fff; padding: 0.85rem 1.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
}
.admin-header h1 { font-size: 1.05rem; font-weight: 700; }

/* ── Stats bar ── */
.stats-bar { background: #fff; border-bottom: 1px solid #E2E8F0; display: flex; flex-wrap: wrap; }
.stat-item {
  flex: 1; min-width: 100px; padding: 1rem 1.5rem; text-align: center;
  border-right: 1px solid #E2E8F0;
}
.stat-item:last-child { border-right: none; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: #2563EB; line-height: 1; }
.stat-label { font-size: 0.775rem; color: #64748B; margin-top: 0.25rem; }

/* ── Tabs ── */
.tabs { background: #fff; border-bottom: 2px solid #E2E8F0; display: flex; overflow-x: auto; }
.tab-btn {
  padding: 0.85rem 1.25rem; border: none; background: none; font-size: 0.875rem;
  color: #64748B; cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s;
}
.tab-btn:hover { color: #2563EB; }
.tab-btn.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }

.tab-pane { display: none; padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
.tab-pane.active { display: block; }

/* ── Tables ── */
.tbl-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { background: #F1F5F9; text-align: left; padding: 0.7rem 1rem; color: #475569; font-weight: 600; white-space: nowrap; }
.data-table td { padding: 0.7rem 1rem; border-top: 1px solid #E2E8F0; vertical-align: middle; }
.data-table tr:hover td { background: #F8FAFC; }

/* ── Upload card ── */
.upload-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.5rem; max-width: 540px; }
.upload-card h3 { margin-bottom: 1.25rem; font-size: 1rem; }
.dropzone {
  border: 2px dashed #CBD5E1; border-radius: 10px; padding: 1.75rem 1rem;
  text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; margin-bottom: 1rem;
}
.dropzone:hover, .dropzone.drag-over { border-color: #2563EB; background: #EFF6FF; }
.dropzone input { display: none; }
.dropzone-label { color: #64748B; font-size: 0.875rem; pointer-events: none; }

/* ── Inline form ── */
.inline-form { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1.25rem; }
.inline-form .form-group { flex: 1; min-width: 180px; margin-bottom: 0; }

/* ── Log badges ── */
.log-badge { padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
.log-badge.upload { background: #D1FAE5; color: #065F46; }
.log-badge.download { background: #DBEAFE; color: #1E40AF; }
.log-badge.delete { background: #FEE2E2; color: #991B1B; }
.log-badge.login { background: #FEF3C7; color: #92400E; }

@media (max-width: 640px) {
  .stat-item { min-width: 80px; padding: 0.75rem 0.5rem; }
  .stat-value { font-size: 1.35rem; }
  .tab-pane { padding: 1rem; }
  .admin-header { padding: 0.75rem 1rem; }
}
```

- [ ] **Step 2: Replace `views/login.html`**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đăng nhập — Admin</title>
  <link rel="stylesheet" href="/css/admin.css" />
</head>
<body class="login-body">
  <div class="login-card">
    <div class="login-icon">🔐</div>
    <h2>Đăng nhập Admin</h2>
    <div class="error-banner" id="errBanner">Sai tên đăng nhập hoặc mật khẩu</div>
    <form method="POST" action="/admin/login">
      <div class="form-group">
        <label for="username">Tên đăng nhập</label>
        <input type="text" id="username" name="username" placeholder="Username" required autofocus autocomplete="username" />
      </div>
      <div class="form-group">
        <label for="password">Mật khẩu</label>
        <input type="password" id="password" name="password" placeholder="Password" required autocomplete="current-password" />
      </div>
      <button type="submit" class="btn btn-primary btn-full">Đăng nhập</button>
    </form>
  </div>
  <script>
    // Show error banner if redirected back after 401
    if (document.referrer.includes('/admin/login')) {
      document.getElementById('errBanner').style.display = 'block';
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Create `public/js/admin.js`**

```javascript
'use strict';

let allFiles = [], allGroups = [], allCategories = [];

// ── Helpers ────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getGroupName(id) { return (allGroups.find(g => g.id === id) || {}).name || '-'; }
function getCatName(id)   { return (allCategories.find(c => c.id === id) || {}).name || '-'; }

function toast(msg, type = 'error') {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.className = `alert-toast ${type}`;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ── Stats ──────────────────────────────────────────────────

function updateStats() {
  document.getElementById('stFiles').textContent = allFiles.length;
  document.getElementById('stDownloads').textContent = allFiles.reduce((s, f) => s + (f.downloadCount || 0), 0);
  document.getElementById('stGroups').textContent = allGroups.length;
  document.getElementById('stCats').textContent = allCategories.length;
}

// ── File list ──────────────────────────────────────────────

function renderFiles() {
  const tbody = document.getElementById('filesTbody');
  if (!allFiles.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:2rem">Chưa có file nào</td></tr>';
    return;
  }
  tbody.innerHTML = allFiles.map(f => `<tr>
    <td>${esc(f.displayName)}</td>
    <td style="color:#64748B;font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.originalName)}</td>
    <td>${esc(getGroupName(f.groupId))}</td>
    <td>${esc(getCatName(f.categoryId))}</td>
    <td style="white-space:nowrap">${formatSize(f.size)}</td>
    <td>${f.downloadCount || 0}</td>
    <td><button class="btn btn-danger" style="font-size:0.775rem;padding:0.3rem 0.7rem"
      onclick="deleteFile('${esc(f.id)}','${esc(f.displayName).replace(/'/g,"\\'")}')">Xóa</button></td>
  </tr>`).join('');
}

async function deleteFile(id, name) {
  if (!confirm(`Xóa file "${name}"?\nHành động này không thể hoàn tác.`)) return;
  const res = await fetch(`/admin/files/${id}`, { method: 'DELETE' });
  if (res.ok) {
    allFiles = allFiles.filter(f => f.id !== id);
    renderFiles(); updateStats();
    toast('Đã xóa file thành công', 'success');
  } else {
    const d = await res.json().catch(() => ({}));
    toast(d.error || 'Lỗi khi xóa file');
  }
}

// ── Upload ─────────────────────────────────────────────────

function setupUpload() {
  const zone = document.getElementById('dropzone');
  const input = document.getElementById('fileInput');
  const label = document.getElementById('dropLabel');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; label.textContent = e.dataTransfer.files[0].name; }
  });
  input.addEventListener('change', () => {
    label.textContent = input.files[0] ? input.files[0].name : '📎 Chọn file hoặc kéo thả vào đây';
  });

  document.getElementById('uploadForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!input.files[0]) { toast('Vui lòng chọn file'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Đang upload...'; btn.disabled = true;

    const fd = new FormData(e.target);
    const res = await fetch('/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    btn.textContent = 'Upload'; btn.disabled = false;

    if (res.ok) {
      allFiles.push(data); renderFiles(); updateStats();
      e.target.reset(); label.textContent = '📎 Chọn file hoặc kéo thả vào đây';
      toast('Upload thành công: ' + data.displayName, 'success');
    } else {
      toast(data.error || 'Lỗi upload');
    }
  });
}

// ── Groups ─────────────────────────────────────────────────

function renderGroups() {
  const tbody = document.getElementById('groupsTbody');
  const sel = document.getElementById('upGroupId');
  sel.innerHTML = '<option value="">-- Không chọn --</option>' +
    allGroups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');

  tbody.innerHTML = !allGroups.length
    ? '<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:1.5rem">Chưa có nhóm nào</td></tr>'
    : allGroups.map(g => `<tr>
        <td>${esc(g.name)}</td>
        <td>${new Date(g.createdAt).toLocaleDateString('vi-VN')}</td>
        <td><button class="btn btn-danger" style="font-size:0.775rem;padding:0.3rem 0.7rem"
          onclick="delGroup('${esc(g.id)}','${esc(g.name).replace(/'/g,"\\'")}')">Xóa</button></td>
      </tr>`).join('');
}

async function addGroup() {
  const input = document.getElementById('newGroup');
  const name = input.value.trim();
  if (!name) { toast('Nhập tên nhóm'); return; }
  const res = await fetch('/admin/groups', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
  const data = await res.json();
  if (res.ok) { allGroups.push(data); renderGroups(); input.value = ''; toast('Đã thêm nhóm', 'success'); }
  else toast(data.error || 'Lỗi thêm nhóm');
}

async function delGroup(id, name) {
  if (!confirm(`Xóa nhóm "${name}"?`)) return;
  const res = await fetch(`/admin/groups/${id}`, { method: 'DELETE' });
  if (res.ok) { allGroups = allGroups.filter(g => g.id !== id); renderGroups(); toast('Đã xóa nhóm', 'success'); }
  else toast('Lỗi xóa nhóm');
}

// ── Categories ─────────────────────────────────────────────

function renderCats() {
  const tbody = document.getElementById('catsTbody');
  const sel = document.getElementById('upCatId');
  sel.innerHTML = '<option value="">-- Không chọn --</option>' +
    allCategories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

  tbody.innerHTML = !allCategories.length
    ? '<tr><td colspan="3" style="text-align:center;color:#94A3B8;padding:1.5rem">Chưa có loại nào</td></tr>'
    : allCategories.map(c => `<tr>
        <td>${esc(c.name)}</td>
        <td>${new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
        <td><button class="btn btn-danger" style="font-size:0.775rem;padding:0.3rem 0.7rem"
          onclick="delCat('${esc(c.id)}','${esc(c.name).replace(/'/g,"\\'")}')">Xóa</button></td>
      </tr>`).join('');
}

async function addCat() {
  const input = document.getElementById('newCat');
  const name = input.value.trim();
  if (!name) { toast('Nhập tên loại'); return; }
  const res = await fetch('/admin/categories', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
  const data = await res.json();
  if (res.ok) { allCategories.push(data); renderCats(); input.value = ''; toast('Đã thêm loại', 'success'); }
  else toast(data.error || 'Lỗi thêm loại');
}

async function delCat(id, name) {
  if (!confirm(`Xóa loại "${name}"?`)) return;
  const res = await fetch(`/admin/categories/${id}`, { method: 'DELETE' });
  if (res.ok) { allCategories = allCategories.filter(c => c.id !== id); renderCats(); toast('Đã xóa loại', 'success'); }
  else toast('Lỗi xóa loại');
}

// ── Logs ───────────────────────────────────────────────────

async function loadLogs() {
  const res = await fetch('/admin/logs');
  const logs = await res.json();
  const tbody = document.getElementById('logsTbody');
  tbody.innerHTML = !logs.length
    ? '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:1.5rem">Chưa có log nào</td></tr>'
    : logs.map(l => `<tr>
        <td><span class="log-badge ${l.action}">${l.action}</span></td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.fileName || '-')}</td>
        <td>${esc(l.ip || '-')}</td>
        <td style="font-size:0.775rem;color:#64748B;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.userAgent || '-')}</td>
        <td style="font-size:0.8rem;white-space:nowrap">${new Date(l.createdAt).toLocaleString('vi-VN')}</td>
      </tr>`).join('');
}

// ── Tabs ───────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'tabLogs') loadLogs();
    });
  });
}

// ── Init ───────────────────────────────────────────────────

async function init() {
  const [files, groups, cats] = await Promise.all([
    fetch('/api/files').then(r => r.json()),
    fetch('/api/groups').then(r => r.json()),
    fetch('/api/categories').then(r => r.json()),
  ]);
  allFiles = files; allGroups = groups; allCategories = cats;
  updateStats(); renderFiles(); renderGroups(); renderCats();
  setupUpload(); setupTabs();
}

init();
```

- [ ] **Step 4: Replace `views/admin.html` with full dashboard**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin — Quản Lý File</title>
  <link rel="stylesheet" href="/css/admin.css" />
</head>
<body>

<div id="toastEl" class="alert-toast"></div>

<header class="admin-header">
  <h1>🗂️ Quản Lý File — Admin</h1>
  <form method="POST" action="/admin/logout" style="margin:0">
    <button type="submit" class="btn btn-secondary">Đăng xuất</button>
  </form>
</header>

<div class="stats-bar">
  <div class="stat-item"><div class="stat-value" id="stFiles">0</div><div class="stat-label">Tổng file</div></div>
  <div class="stat-item"><div class="stat-value" id="stDownloads">0</div><div class="stat-label">Lượt tải</div></div>
  <div class="stat-item"><div class="stat-value" id="stGroups">0</div><div class="stat-label">Nhóm</div></div>
  <div class="stat-item"><div class="stat-value" id="stCats">0</div><div class="stat-label">Loại</div></div>
</div>

<nav class="tabs">
  <button class="tab-btn active" data-tab="tabUpload">⬆ Upload</button>
  <button class="tab-btn" data-tab="tabFiles">📋 Danh sách file</button>
  <button class="tab-btn" data-tab="tabGroups">🗂 Nhóm</button>
  <button class="tab-btn" data-tab="tabCats">🏷 Loại</button>
  <button class="tab-btn" data-tab="tabLogs">📜 Log</button>
</nav>

<!-- Upload -->
<div id="tabUpload" class="tab-pane active">
  <div class="upload-card">
    <h3>Upload tài liệu mới</h3>
    <form id="uploadForm" enctype="multipart/form-data">
      <div class="dropzone" id="dropzone" onclick="document.getElementById('fileInput').click()">
        <input type="file" name="file" id="fileInput" />
        <div class="dropzone-label" id="dropLabel">📎 Chọn file hoặc kéo thả vào đây</div>
      </div>
      <div class="form-group">
        <label>Tên hiển thị <span style="color:#EF4444">*</span></label>
        <input type="text" name="displayName" placeholder="Tên hiển thị cho tài liệu" required />
      </div>
      <div class="form-group">
        <label>Nhóm</label>
        <select name="groupId" id="upGroupId"><option value="">-- Không chọn --</option></select>
      </div>
      <div class="form-group">
        <label>Loại</label>
        <select name="categoryId" id="upCatId"><option value="">-- Không chọn --</option></select>
      </div>
      <button type="submit" class="btn btn-primary btn-full">⬆ Upload</button>
    </form>
  </div>
</div>

<!-- File list -->
<div id="tabFiles" class="tab-pane">
  <h3 style="margin-bottom:1rem;font-size:1rem">Danh sách file đã upload</h3>
  <div class="tbl-wrap">
    <table class="data-table">
      <thead><tr><th>Tên hiển thị</th><th>File gốc</th><th>Nhóm</th><th>Loại</th><th>Kích thước</th><th>Lượt tải</th><th></th></tr></thead>
      <tbody id="filesTbody"></tbody>
    </table>
  </div>
</div>

<!-- Groups -->
<div id="tabGroups" class="tab-pane">
  <h3 style="margin-bottom:1rem;font-size:1rem">Quản lý nhóm</h3>
  <div class="inline-form">
    <div class="form-group">
      <label>Tên nhóm mới</label>
      <input type="text" id="newGroup" placeholder="VD: Tài chính, Nhân sự..." />
    </div>
    <button class="btn btn-primary" onclick="addGroup()">+ Thêm</button>
  </div>
  <div class="tbl-wrap">
    <table class="data-table">
      <thead><tr><th>Tên nhóm</th><th>Ngày tạo</th><th></th></tr></thead>
      <tbody id="groupsTbody"></tbody>
    </table>
  </div>
</div>

<!-- Categories -->
<div id="tabCats" class="tab-pane">
  <h3 style="margin-bottom:1rem;font-size:1rem">Quản lý loại tài liệu</h3>
  <div class="inline-form">
    <div class="form-group">
      <label>Tên loại mới</label>
      <input type="text" id="newCat" placeholder="VD: Báo cáo, Hợp đồng..." />
    </div>
    <button class="btn btn-primary" onclick="addCat()">+ Thêm</button>
  </div>
  <div class="tbl-wrap">
    <table class="data-table">
      <thead><tr><th>Tên loại</th><th>Ngày tạo</th><th></th></tr></thead>
      <tbody id="catsTbody"></tbody>
    </table>
  </div>
</div>

<!-- Logs -->
<div id="tabLogs" class="tab-pane">
  <h3 style="margin-bottom:1rem;font-size:1rem">Lịch sử hệ thống (100 gần nhất)</h3>
  <div class="tbl-wrap">
    <table class="data-table">
      <thead><tr><th>Hành động</th><th>File</th><th>IP</th><th>User Agent</th><th>Thời gian</th></tr></thead>
      <tbody id="logsTbody"><tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:1.5rem">Chọn tab Log để tải dữ liệu</td></tr></tbody>
    </table>
  </div>
</div>

<script src="/js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify admin UI manually**

```bash
node server.js
# Open http://localhost:3000/admin/login
# Login with credentials from .env
# Expected: dashboard with stats bar (all 0), Upload tab active
# Add a group in Nhóm tab → check it appears in upload form select
# Upload a PDF → check it appears in Danh sách file tab
# Open http://localhost:3000 → check file card appears with download button
# Click Tải xuống → file downloads with original filename
# Delete file from admin → confirm dialog appears, file removed from list
```

- [ ] **Step 6: Commit**

```bash
git add views/login.html views/admin.html public/css/admin.css public/js/admin.js
git commit -m "feat: full admin dashboard — upload, file list, groups, categories, logs tabs"
```

---

### Task 12: PM2 Config + README Deploy Guide

**Files:**
- Create: `ecosystem.config.js`
- Create: `README.md`

**Interfaces:**
- Produces: Complete VPS deploy instructions (Node install, PM2, Nginx HTTP config, firewall)

- [ ] **Step 1: Create `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [{
    name: 'webfilemanager',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: { NODE_ENV: 'production' },
  }],
};
```

- [ ] **Step 2: Create `README.md`**

````markdown
# Quản Lý File — Web App

Ứng dụng quản lý và chia sẻ file chạy trên VPS Ubuntu. Không dùng database — dữ liệu lưu bằng JSON.

## Chạy local

```bash
git clone <repo> webfilemanager && cd webfilemanager
npm install
cp .env.example .env
# Chỉnh sửa .env — bắt buộc đổi ADMIN_PASSWORD và SESSION_SECRET
npm start
```

- Client: http://localhost:3000
- Admin: http://localhost:3000/admin

## Deploy VPS Ubuntu + Nginx + PM2

### 1. Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Cài PM2

```bash
sudo npm install -g pm2
```

### 3. Upload source lên VPS

```bash
# Tùy chọn A — SCP
scp -r ./webfilemanager ubuntu@YOUR_VPS_IP:/home/ubuntu/

# Tùy chọn B — Git
ssh ubuntu@YOUR_VPS_IP
git clone <repo> /home/ubuntu/webfilemanager
```

### 4. Cấu hình .env

```bash
cd /home/ubuntu/webfilemanager
cp .env.example .env
nano .env
# Bắt buộc đổi ADMIN_PASSWORD và SESSION_SECRET thành giá trị ngẫu nhiên mạnh
```

### 5. Cài dependencies và khởi động với PM2

```bash
cd /home/ubuntu/webfilemanager
npm install --production
pm2 start ecosystem.config.js
pm2 startup   # Copy lệnh hiển thị và chạy với sudo
pm2 save
```

### 6. Kiểm tra app đang chạy

```bash
pm2 status
curl http://localhost:3000
# Expected: HTML của trang client
```

### 7. Cài và cấu hình Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo nano /etc/nginx/sites-available/webfilemanager
```

Nội dung file cấu hình Nginx:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Khớp với MAX_FILE_SIZE_MB + dư 10MB
    client_max_body_size 110M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/webfilemanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

App live tại: **http://YOUR_DOMAIN_OR_IP**  
Admin tại: **http://YOUR_DOMAIN_OR_IP/admin**

## Cập nhật app

```bash
cd /home/ubuntu/webfilemanager
git pull
npm install --production
pm2 restart webfilemanager
```

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `PORT` | Port lắng nghe | `3000` |
| `ADMIN_USERNAME` | Tên đăng nhập admin | `admin` |
| `ADMIN_PASSWORD` | Mật khẩu admin | **Bắt buộc đổi** |
| `SESSION_SECRET` | Secret cho session cookie | **Bắt buộc đổi** |
| `MAX_FILE_SIZE_MB` | Giới hạn dung lượng file | `100` |
| `APP_NAME` | Tên hiển thị | `Quản Lý File` |

## Bảo mật

- File nguy hiểm bị chặn: `.php .exe .sh .bat .cmd .js .py .asp` và các biến thể
- Storage không bao giờ được expose làm static directory
- Mọi download đi qua route backend với kiểm tra path traversal
- Session admin dùng httpOnly cookie
- **Bắt buộc thay `ADMIN_PASSWORD` và `SESSION_SECRET`** trước khi deploy production
````

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
# Expected: PASS — all test files (utils.test.js, api.test.js)
```

- [ ] **Step 4: Commit**

```bash
git add ecosystem.config.js README.md
git commit -m "feat: PM2 config and VPS deploy guide in README"
```

---

## Final Verification Checklist

- [ ] `npx jest --no-coverage` → all tests pass
- [ ] `node server.js` → starts without error
- [ ] `http://localhost:3000` → client page loads, shows "Đang tải..." then file grid
- [ ] `http://localhost:3000/admin` → redirects to `/admin/login`
- [ ] Login with `.env` credentials → admin dashboard loads
- [ ] Tạo nhóm và loại → xuất hiện trong form upload
- [ ] Upload PDF → xuất hiện trong Danh sách file và trang client
- [ ] Download từ trang client → file tải về với tên gốc
- [ ] Xóa file từ admin → confirm dialog, file biến khỏi danh sách và đĩa
- [ ] Tab Log → hiện các hành động đã thực hiện
- [ ] Upload file .exe → bị từ chối với thông báo lỗi tiếng Việt
