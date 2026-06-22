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
