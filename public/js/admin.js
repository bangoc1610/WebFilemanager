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
