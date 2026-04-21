// js/moment.js - Update dengan kompresi foto dan multiple upload
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, escapeHtml } from './utils.js';

// State
let currentDate = new Date();
let currentViewDate = new Date();
let currentDetailMomentId = null;
let currentMomentPhotos = [];
let tempPhotoFiles = [];

// Kompresi foto
async function compressImage(file, maxSizeMB = 2) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 1024px
        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Kompresi kualitas
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        // Jika masih terlalu besar, turunkan kualitas
        while (result.length > maxSizeMB * 1024 * 1024 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Handle multiple photos
export async function handleMultiplePhotos(input) {
  const files = Array.from(input.files);
  const remainingSlots = 5 - currentMomentPhotos.length;
  
  if (files.length > remainingSlots) {
    showMomentToast(`Maksimal 5 foto, tersisa ${remainingSlots} slot`, true);
    input.value = '';
    return;
  }
  
  showMomentToast('Memproses foto...', false);
  
  for (const file of files) {
    // Check file size
    if (file.size > 5 * 1024 * 1024) {
      showMomentToast(`Foto ${file.name} terlalu besar (max 5MB)`, true);
      continue;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      showMomentToast(`File ${file.name} bukan gambar`, true);
      continue;
    }
    
    try {
      const compressed = await compressImage(file, 2);
      currentMomentPhotos.push(compressed);
    } catch (err) {
      console.error('Compression error:', err);
    }
  }
  
  input.value = '';
  renderPhotoGrid();
  showMomentToast(`${files.length} foto berhasil ditambahkan`);
}

// Render photo grid
function renderPhotoGrid() {
  const grid = document.getElementById('photoUploadGrid');
  if (!grid) return;
  
  const existingPhotos = currentMomentPhotos.map((photo, idx) => `
    <div class="photo-preview-item">
      <img src="${photo}" alt="Preview">
      <button class="remove-photo-btn" onclick="removePhotoAtIndex(${idx})">✕</button>
    </div>
  `).join('');
  
  const addButton = currentMomentPhotos.length < 5 ? `
    <div class="photo-upload-item" onclick="document.getElementById('momentPhotoInput').click()">
      <i class="bi bi-plus-circle-fill"></i>
      <span>Tambah</span>
    </div>
  ` : '';
  
  grid.innerHTML = existingPhotos + addButton;
}

// Remove photo at index
export function removePhotoAtIndex(index) {
  currentMomentPhotos.splice(index, 1);
  renderPhotoGrid();
}

// Show toast khusus moment
function showMomentToast(msg, isError = false) {
  const toast = document.getElementById('momentToast');
  const messageEl = document.getElementById('momentToastMessage');
  if (!toast || !messageEl) return;
  
  messageEl.innerText = msg;
  toast.style.display = 'block';
  const toastDiv = toast.querySelector('.toast');
  if (toastDiv) {
    toastDiv.className = `toast align-items-center border-0 ${isError ? 'text-bg-danger' : 'text-bg-success'}`;
  }
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

window.hideMomentToast = () => {
  const toast = document.getElementById('momentToast');
  if (toast) toast.style.display = 'none';
};

// Initialize moment page
export function initMomentPage() {
  renderCalendar();
  renderMomentsList();
  
  // Setup mood selector
  document.querySelectorAll('.moment-mood-option').forEach(opt => {
    opt.addEventListener('click', function() {
      document.querySelectorAll('.moment-mood-option').forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('momentMood').value = this.getAttribute('data-mood');
    });
  });
  
  // Set default active mood
  const defaultMood = document.querySelector('.moment-mood-option[data-mood="🥰"]');
  if (defaultMood) defaultMood.classList.add('active');
}

// Render Calendar
export function renderCalendar() {
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('currentMonthYear').innerHTML = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const moments = masterData?.moments || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  let calendarHtml = dayNames.map(day => `<div class="calendar-day-name">${day}</div>`).join('');
  
  let date = 1;
  let nextMonthDate = 1;
  
  for (let i = 0; i < 42; i++) {
    let cellDate = null;
    let isCurrentMonth = true;
    let displayDate = '';
    let cellYear = year;
    let cellMonth = month;
    
    if (i < startDay) {
      cellDate = prevMonthDays - (startDay - i) + 1;
      displayDate = cellDate;
      isCurrentMonth = false;
      cellYear = month === 0 ? year - 1 : year;
      cellMonth = month === 0 ? 11 : month - 1;
    } else if (date <= daysInMonth) {
      cellDate = date;
      displayDate = date;
      isCurrentMonth = true;
      date++;
    } else {
      cellDate = nextMonthDate;
      displayDate = cellDate;
      isCurrentMonth = false;
      cellYear = month === 11 ? year + 1 : year;
      cellMonth = month === 11 ? 0 : month + 1;
      nextMonthDate++;
    }
    
    const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDate).padStart(2, '0')}`;
    const hasMoment = moments && Object.values(moments).some(m => m.date === dateKey);
    const isToday = cellYear === today.getFullYear() && cellMonth === today.getMonth() && cellDate === today.getDate();
    
    let cellClass = `calendar-day ${!isCurrentMonth ? 'other-month' : ''}`;
    if (isToday && isCurrentMonth) cellClass += ' today';
    if (hasMoment && isCurrentMonth) cellClass += ' has-moment';
    
    calendarHtml += `
      <div class="${cellClass}" onclick="window.selectMomentDate('${dateKey}')">
        <span class="day-number">${displayDate}</span>
      </div>
    `;
  }
  
  grid.innerHTML = calendarHtml;
}

// Render Moments List
export function renderMomentsList() {
  const data = masterData;
  if (!data) return;
  
  const moments = data.moments || {};
  const momentsListEl = document.getElementById('momentsList');
  const momentsCountEl = document.getElementById('momentsCount');
  if (!momentsListEl) return;
  
  const momentsArray = Object.entries(moments).sort((a, b) => b[1].createdAt - a[1].createdAt);
  
  if (momentsCountEl) momentsCountEl.innerHTML = `${momentsArray.length} momen`;
  
  if (momentsArray.length === 0) {
    momentsListEl.innerHTML = `
      <div class="col-12">
        <div class="empty-moments">
          <i class="bi bi-calendar-heart"></i>
          <h6>Belum ada momen</h6>
          <p class="text-muted small">Mulai abadikan momen spesial kalian</p>
          <button class="btn btn-danger btn-sm mt-2" onclick="window.openMomentModal(null)">
            <i class="bi bi-plus-circle me-1"></i>Tambah Momen
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  momentsListEl.innerHTML = momentsArray.map(([id, m]) => {
    const specialClass = m.isSpecial ? 'special' : '';
    const moodEmoji = m.mood || '🥰';
    const firstPhoto = m.photos && m.photos[0] ? m.photos[0] : null;
    const moodText = getMoodText(m.mood);
    
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card moment-card ${specialClass} h-100">
          ${firstPhoto ? `
            <img src="${firstPhoto}" class="moment-image" onclick="window.viewMomentDetail('${id}')" loading="lazy">
          ` : `
            <div class="moment-image-placeholder" onclick="window.viewMomentDetail('${id}')">
              <i class="bi bi-camera-fill"></i>
            </div>
          `}
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <span class="moment-mood-badge small">${moodEmoji} ${moodText}</span>
              ${m.isSpecial ? '<span class="badge bg-warning text-dark p-1">⭐</span>' : ''}
            </div>
            <h6 class="fw-bold mb-0 small">${escapeHtml(m.title || 'Momen Tak Terlupakan')}</h6>
            <small class="text-muted">${formatDate(m.date)}</small>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getMoodText(mood) {
  const moods = {
    '🥰': 'Romantis',
    '🎉': 'Bahagia',
    '😢': 'Haru',
    '😂': 'Lucu',
    '💪': 'Berkesan'
  };
  return moods[mood] || 'Spesial';
}

// Select date from calendar
export function selectMomentDate(dateKey) {
  document.getElementById('momentDate').value = dateKey;
  openMomentModal(null);
}

// Open modal for add/edit
export function openMomentModal(momentId) {
  currentMomentPhotos = [];
  
  if (momentId) {
    const data = masterData;
    const moment = data?.moments?.[momentId];
    if (moment) {
      document.getElementById('momentModalTitle').innerText = 'Edit Momen';
      document.getElementById('momentEditId').value = momentId;
      document.getElementById('momentDate').value = moment.date || '';
      document.getElementById('momentTitle').value = moment.title || '';
      document.getElementById('momentStory').value = moment.story || '';
      document.getElementById('momentIsSpecial').checked = moment.isSpecial || false;
      
      const mood = moment.mood || '🥰';
      document.getElementById('momentMood').value = mood;
      document.querySelectorAll('.moment-mood-option').forEach(opt => {
        if (opt.getAttribute('data-mood') === mood) {
          opt.classList.add('active');
        } else {
          opt.classList.remove('active');
        }
      });
      
      if (moment.photos && moment.photos.length > 0) {
        currentMomentPhotos = [...moment.photos];
      }
    }
  } else {
    document.getElementById('momentModalTitle').innerText = 'Tambah Momen';
    document.getElementById('momentEditId').value = '';
    if (!document.getElementById('momentDate').value) {
      document.getElementById('momentDate').value = new Date().toISOString().split('T')[0];
    }
    document.getElementById('momentTitle').value = '';
    document.getElementById('momentStory').value = '';
    document.getElementById('momentIsSpecial').checked = false;
    document.getElementById('momentMood').value = '🥰';
    
    document.querySelectorAll('.moment-mood-option').forEach(opt => {
      if (opt.getAttribute('data-mood') === '🥰') {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }
  
  renderPhotoGrid();
  
  const modal = new bootstrap.Modal(document.getElementById('momentModal'));
  modal.show();
}

// Save moment
export async function saveMoment() {
  const editId = document.getElementById('momentEditId').value;
  const date = document.getElementById('momentDate').value;
  const title = document.getElementById('momentTitle').value;
  const story = document.getElementById('momentStory').value;
  const mood = document.getElementById('momentMood').value;
  const isSpecial = document.getElementById('momentIsSpecial').checked;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!date) {
    showMomentToast('Tanggal harus diisi', true);
    return;
  }
  
  if (currentMomentPhotos.length === 0) {
    showMomentToast('Minimal upload 1 foto', true);
    return;
  }
  
  const momentData = {
    date: date,
    title: title || `Momen di ${date}`,
    story: story || '',
    mood: mood,
    isSpecial: isSpecial,
    photos: currentMomentPhotos,
    author: currentUser,
    updatedAt: Date.now()
  };
  
  try {
    if (!editId) {
      momentData.createdAt = Date.now();
      momentData.likes = {};
      momentData.comments = {};
      await push(ref(db, 'data/moments'), momentData);
      showMomentToast('Momen berhasil ditambahkan! 🎉');
    } else {
      // Preserve existing likes and comments
      const existing = masterData?.moments?.[editId];
      momentData.likes = existing?.likes || {};
      momentData.comments = existing?.comments || {};
      momentData.createdAt = existing?.createdAt || Date.now();
      await update(ref(db, `data/moments/${editId}`), momentData);
      showMomentToast('Momen berhasil diupdate! ✨');
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('momentModal'));
    if (modal) modal.hide();
    
    renderCalendar();
    renderMomentsList();
  } catch (err) {
    console.error(err);
    showMomentToast('Gagal menyimpan momen', true);
  }
}

// View moment detail
export async function viewMomentDetail(momentId) {
  currentDetailMomentId = momentId;
  const data = masterData;
  const moment = data?.moments?.[momentId];
  
  if (!moment) return;
  
  document.getElementById('detailTitle').innerHTML = escapeHtml(moment.title || 'Momen Spesial');
  document.getElementById('detailMood').innerHTML = `${moment.mood || '🥰'} ${getMoodText(moment.mood)}`;
  document.getElementById('detailDate').innerHTML = formatDate(moment.date);
  document.getElementById('detailStory').innerHTML = escapeHtml(moment.story || 'Tidak ada cerita yang ditulis.').replace(/\n/g, '<br>');
  document.getElementById('detailLikes').innerHTML = Object.keys(moment.likes || {}).length;
  document.getElementById('detailComments').innerHTML = Object.keys(moment.comments || {}).length;
  document.getElementById('detailAuthor').innerHTML = `${moment.author}`;
  
  // Render carousel
  const carouselInner = document.getElementById('detailCarouselInner');
  const photos = moment.photos || [];
  
  if (photos.length === 0) {
    carouselInner.innerHTML = `
      <div class="carousel-item active">
        <div class="d-flex align-items-center justify-content-center" style="height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <i class="bi bi-camera-fill text-white" style="font-size: 48px; opacity: 0.5;"></i>
        </div>
      </div>
    `;
  } else {
    carouselInner.innerHTML = photos.map((photo, idx) => `
      <div class="carousel-item ${idx === 0 ? 'active' : ''}">
        <img src="${photo}" alt="Moment photo">
      </div>
    `).join('');
  }
  
  renderMomentComments(momentId);
  
  const modal = new bootstrap.Modal(document.getElementById('momentDetailModal'));
  modal.show();
}

// Render comments
function renderMomentComments(momentId) {
  const data = masterData;
  const moment = data?.moments?.[momentId];
  const comments = moment?.comments || {};
  const commentList = document.getElementById('momentCommentList');
  
  if (Object.keys(comments).length === 0) {
    commentList.innerHTML = '<p class="text-muted text-center py-2 small">Belum ada komentar</p>';
    return;
  }
  
  commentList.innerHTML = Object.entries(comments)
    .sort((a, b) => b[1].time - a[1].time)
    .map(([id, c]) => `
      <div class="moment-comment-item">
        <div class="d-flex justify-content-between align-items-center">
          <span class="comment-author">${escapeHtml(c.user)}</span>
          <span class="comment-time">${new Date(c.time).toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</span>
        </div>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>
    `).join('');
}

// Add comment
export async function addMomentComment() {
  const text = document.getElementById('momentCommentInput').value.trim();
  if (!text) {
    showMomentToast('Komentar tidak boleh kosong', true);
    return;
  }
  
  const currentUser = sessionStorage.getItem('progrowth_user');
  const commentData = {
    user: currentUser,
    text: text,
    time: Date.now()
  };
  
  await push(ref(db, `data/moments/${currentDetailMomentId}/comments`), commentData);
  
  document.getElementById('momentCommentInput').value = '';
  renderMomentComments(currentDetailMomentId);
  
  const data = masterData;
  const moment = data?.moments?.[currentDetailMomentId];
  if (moment) {
    document.getElementById('detailComments').innerHTML = Object.keys(moment.comments || {}).length + 1;
  }
  
  showMomentToast('Komentar terkirim! 💬');
}

// Like moment
export async function likeMoment(momentId) {
  const currentUser = sessionStorage.getItem('progrowth_user');
  const data = masterData;
  const moment = data?.moments?.[momentId];
  const likes = moment?.likes || {};
  
  if (likes[currentUser]) {
    delete likes[currentUser];
    showMomentToast('Batal menyukai');
  } else {
    likes[currentUser] = true;
    showMomentToast('❤️ Menyukai momen ini');
  }
  
  await update(ref(db, `data/moments/${momentId}/likes`), likes);
  
  if (currentDetailMomentId === momentId) {
    document.getElementById('detailLikes').innerHTML = Object.keys(likes).length;
  }
}

// Edit from detail
export function editMomentFromDetail() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
  if (modal) modal.hide();
  openMomentModal(currentDetailMomentId);
}

// Delete from detail
export async function deleteMomentFromDetail() {
  if (confirm('Yakin ingin menghapus momen ini?')) {
    await remove(ref(db, `data/moments/${currentDetailMomentId}`));
    showMomentToast('Momen berhasil dihapus');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
    if (modal) modal.hide();
    
    renderCalendar();
    renderMomentsList();
  }
}

// Change month
export function changeMonth(delta) {
  currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + delta, 1);
  renderCalendar();
}

// Export moments
export function exportMoments() {
  const data = masterData;
  const moments = data?.moments || {};
  const exportData = Object.entries(moments).map(([id, m]) => ({
    id: id,
    date: m.date,
    title: m.title,
    story: m.story,
    mood: m.mood,
    isSpecial: m.isSpecial,
    author: m.author,
    createdAt: new Date(m.createdAt).toLocaleString(),
    updatedAt: new Date(m.updatedAt).toLocaleString(),
    likesCount: Object.keys(m.likes || {}).length,
    commentsCount: Object.keys(m.comments || {}).length,
    photosCount: (m.photos || []).length
  }));
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `growthogether_moments_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showMomentToast('Momen berhasil diexport! 📥');
}

// Export ke window
window.initMomentPage = initMomentPage;
window.renderCalendar = renderCalendar;
window.renderMomentsList = renderMomentsList;
window.selectMomentDate = selectMomentDate;
window.openMomentModal = openMomentModal;
window.handleMultiplePhotos = handleMultiplePhotos;
window.removePhotoAtIndex = removePhotoAtIndex;
window.saveMoment = saveMoment;
window.viewMomentDetail = viewMomentDetail;
window.editMomentFromDetail = editMomentFromDetail;
window.deleteMomentFromDetail = deleteMomentFromDetail;
window.likeMoment = likeMoment;
window.addMomentComment = addMomentComment;
window.changeMonth = changeMonth;
window.exportMoments = exportMoments;
