require('dotenv').config();

// Startup validation
const _MB = parseInt(process.env.MAX_FILE_SIZE_MB, 10);
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in .env');
if (!process.env.ADMIN_USERNAME) throw new Error('ADMIN_USERNAME is required in .env');
if (!process.env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is required in .env');
if (isNaN(_MB) || _MB <= 0) throw new Error('MAX_FILE_SIZE_MB must be a positive integer in .env');

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
  secret: process.env.SESSION_SECRET,
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
