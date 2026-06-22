let allFiles = [], allGroups = [], allCategories = [];

const EXT_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📊', pptx: '📊', txt: '📃', csv: '📊',
  zip: '🗜️', rar: '🗜️', '7z': '🗜️',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
  mp3: '🎵', wav: '🎵', flac: '🎵',
};

const MEDIA_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
};

function getExtension(filename) {
  return (filename.split('.').pop() || '').toLowerCase();
}

function getMediaMimeType(file) {
  if (file.mimeType && /^(image|video)\//.test(file.mimeType)) return file.mimeType;
  return MEDIA_MIME_TYPES[getExtension(file.originalName)] || '';
}

function isMobileDevice() {
  return navigator.maxTouchPoints > 0
    && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || window.matchMedia('(max-width: 900px)').matches);
}

function canUseNativeMediaSave(file) {
  if (!isMobileDevice() || !navigator.share || !navigator.canShare || typeof File === 'undefined') {
    return false;
  }

  const mimeType = getMediaMimeType(file);
  if (!mimeType) return false;

  try {
    const probe = new File([''], file.originalName, { type: mimeType });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function getIcon(filename) {
  const ext = getExtension(filename);
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
    const nativeMediaSave = canUseNativeMediaSave(f);
    const buttonLabel = nativeMediaSave ? 'Lưu vào Ảnh' : 'Tải xuống';
    const mediaAttribute = nativeMediaSave ? ' data-native-media-save="true"' : '';
    return `<div class="file-card">
      <div class="file-icon">${getIcon(f.originalName)}</div>
      <div class="file-name">${escapeHtml(f.displayName)}</div>
      <div class="file-tags">
        ${group ? `<span class="tag">${escapeHtml(group)}</span>` : ''}
        ${cat ? `<span class="tag">${escapeHtml(cat)}</span>` : ''}
      </div>
      <div class="file-meta">${formatSize(f.size)} &bull; ${date}</div>
      <a class="btn-download" href="/download/${encodeURIComponent(f.id)}" data-file-id="${escapeHtml(f.id)}"${mediaAttribute}>⬇ ${buttonLabel}</a>
    </div>`;
  }).join('');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveMediaToPhotos(event, link) {
  event.preventDefault();

  const file = allFiles.find(item => item.id === link.dataset.fileId);
  if (!file) {
    window.location.href = link.href;
    return;
  }

  const originalLabel = link.textContent;
  link.classList.add('is-loading');
  link.textContent = 'Đang chuẩn bị...';

  let blob;
  try {
    const response = await fetch(link.href);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    blob = await response.blob();

    const mimeType = getMediaMimeType(file) || blob.type || 'application/octet-stream';
    const sharedFile = new File([blob], file.originalName, { type: mimeType });

    if (!navigator.canShare({ files: [sharedFile] })) {
      downloadBlob(blob, file.originalName);
      return;
    }

    await navigator.share({
      files: [sharedFile],
      title: file.displayName,
    });
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    if (blob) {
      downloadBlob(blob, file.originalName);
    } else {
      window.location.href = link.href;
    }
  } finally {
    link.classList.remove('is-loading');
    link.textContent = originalLabel;
  }
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
  document.getElementById('fileGrid').addEventListener('click', event => {
    const link = event.target.closest('[data-native-media-save="true"]');
    if (link) saveMediaToPhotos(event, link);
  });
}

init();
