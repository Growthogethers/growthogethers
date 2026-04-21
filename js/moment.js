// js/moment.js - Buat file baru
import { db, ref, push, update, remove, get, set } from './firebase-config.js';
import { showNotif, masterData, escapeHtml } from './utils.js';

// State
let currentDate = new Date();
let currentViewDate = new Date();
let currentDetailMomentId = null;
let currentMomentPhotos = [];

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
  
  // Set month/year display
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  document.getElementById('currentMonthYear').innerHTML = `${monthNames[month]} ${year}`;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get previous month days
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  // Get moments data
  const moments = masterData?.moments || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let calendarHtml = '';
  
  // Add day names (already in grid, but we need to fill dates)
  // We'll rebuild the entire grid
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  
  // Clear existing (keep day names)
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  grid.innerHTML = dayNames.map(day => `<div class="calendar-day-name">${day}</div>`).join('');
  
  // Calculate total cells needed (6 rows x 7 days = 42)
  let date = 1;
  let nextMonthDate = 1;
  
  for (let i = 0; i < 42; i++) {
    let cellDate = null;
    let isCurrentMonth = true;
    let displayDate = '';
    
    if (i < startDay) {
      // Previous month days
      cellDate = prevMonthDays - (startDay - i) + 1;
      displayDate = cellDate;
      isCurrentMonth = false;
    } else if (date <= daysInMonth) {
      // Current month days
      cellDate = date;
      displayDate = date;
      isCurrentMonth = true;
      date++;
    } else {
      // Next month days
      cellDate = nextMonthDate;
      displayDate = cellDate;
      isCurrentMonth = false;
      nextMonthDate++;
    }
    
    const cellYear = isCurrentMonth ? year : (month === 0 ? year - 1 : year);
    const cellMonth = isCurrentMonth ? month : (month === 0 ? 11 : month - 1);
    const cellDateObj = new Date(cellYear, cellMonth, cellDate);
    const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDate).padStart(2, '0')}`;
    
    const hasMoment = moments && Object.values(moments).some(m => m.date === dateKey);
    const isToday = cellYear === today.getFullYear() && cellMonth === today.getMonth() && cellDate === today.getDate();
    
    let cellClass = `calendar-day ${!isCurrentMonth ? 'other-month' : ''}`;
    if (isToday && isCurrentMonth) cellClass += ' today';
    if (hasMoment && isCurrentMonth) cellClass += ' has-moment';
    
    calendarHtml += `
      <div class="${cellClass}" onclick="window.selectMomentDate('${dateKey}')">
        <span class="day-number">${displayDate}</span>
        ${hasMoment ? '<span class="day-moment-indicator">❤️</span>' : ''}
      </div>
    `;
  }
  
  grid.innerHTML += calendarHtml;
}

// Render Moments List
export function renderMomentsList() {
  const data = masterData;
  if (!data) return;
  
  const moments = data.moments || {};
  const momentsListEl = document.getElementById('momentsList');
  if (!momentsListEl) return;
  
  const momentsArray = Object.entries(moments).sort((a, b) => b[1].createdAt - a[1].createdAt);
  
  if (momentsArray.length === 0) {
    momentsListEl.innerHTML = `
      <div class="col-12">
        <div class="empty-moments">
          <i class="bi bi-calendar-heart"></i>
          <h5>Belum ada momen</h5>
          <p class="text-muted">Mulai abadikan momen spesial kalian</p>
          <button class="btn btn-danger mt-2" onclick="window.openMomentModal(null)">
            <i class="bi bi-plus-circle me-2"></i>Tambah Momen Pertama
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
    
    return `
      <div class="col-md-4 col-sm-6">
        <div class="card moment-card ${specialClass} h-100">
          ${firstPhoto ? `
            <img src="${firstPhoto}" class="moment-image" onclick="window.viewMomentDetail('${id}')" loading="lazy">
          ` : `
            <div class="moment-image d-flex align-items-center justify-content-center bg-light" onclick="window.viewMomentDetail('${id}')">
              <i class="bi bi-image fs-1 text-muted"></i>
            </div>
          `}
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="moment-mood-badge">${moodEmoji} ${getMoodText(m.mood)}</span>
              ${m.isSpecial ? '<span class="badge bg-warning text-dark">⭐ Spesial</span>' : ''}
            </div>
            <h6 class="fw-bold mb-1">${escapeHtml(m.title || 'Momen Tak Terlupakan')}</h6>
            <p class="small text-muted mb-2">${escapeHtml(m.date)}</p>
            <p class="small mb-2">${escapeHtml((m.story || '').substring(0, 100))}${(m.story || '').length > 100 ? '...' : ''}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="d-flex gap-3">
                <span class="small text-muted">
                  <i class="bi bi-heart text-danger"></i> ${Object.keys(m.likes || {}).length}
                </span>
                <span class="small text-muted">
                  <i class="bi bi-chat"></i> ${Object.keys(m.comments || {}).length}
                </span>
                <span class="small text-muted">
                  <i class="bi bi-images"></i> ${(m.photos || []).length}
                </span>
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="window.viewMomentDetail('${id}')">
                <i class="bi bi-eye"></i> Lihat
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
  // Set date in modal
  document.getElementById('momentDate').value = dateKey;
  openMomentModal(null);
}

// Open modal for add/edit
export function openMomentModal(momentId) {
  currentMomentPhotos = [];
  
  if (momentId) {
    // Edit mode
    const data = masterData;
    const moment = data?.moments?.[momentId];
    if (moment) {
      document.getElementById('momentModalTitle').innerText = 'Edit Momen';
      document.getElementById('momentEditId').value = momentId;
      document.getElementById('momentDate').value = moment.date || '';
      document.getElementById('momentTitle').value = moment.title || '';
      document.getElementById('momentStory').value = moment.story || '';
      document.getElementById('momentIsSpecial').checked = moment.isSpecial || false;
      
      // Set mood
      const mood = moment.mood || '🥰';
      document.getElementById('momentMood').value = mood;
      document.querySelectorAll('.moment-mood-option').forEach(opt => {
        if (opt.getAttribute('data-mood') === mood) {
          opt.classList.add('active');
        } else {
          opt.classList.remove('active');
        }
      });
      
      // Show existing photos
      if (moment.photos && moment.photos.length > 0) {
        currentMomentPhotos = [...moment.photos];
        const previewDiv = document.getElementById('photoPreview');
        const previewImg = document.getElementById('previewImg');
        if (previewImg && currentMomentPhotos[0]) {
          previewImg.src = currentMomentPhotos[0];
          previewDiv.style.display = 'block';
          document.getElementById('photoUploadArea').style.display = 'none';
        }
      } else {
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('photoUploadArea').style.display = 'block';
      }
    }
  } else {
    // Add mode
    document.getElementById('momentModalTitle').innerText = 'Tambah Momen';
    document.getElementById('momentEditId').value = '';
    document.getElementById('momentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('momentTitle').value = '';
    document.getElementById('momentStory').value = '';
    document.getElementById('momentIsSpecial').checked = false;
    document.getElementById('momentMood').value = '🥰';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoUploadArea').style.display = 'block';
    
    // Reset mood selector
    document.querySelectorAll('.moment-mood-option').forEach(opt => {
      if (opt.getAttribute('data-mood') === '🥰') {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }
  
  const modal = new bootstrap.Modal(document.getElementById('momentModal'));
  modal.show();
}

// Preview photo before upload
export function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotif('Ukuran foto maksimal 5MB', true);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      currentMomentPhotos = [e.target.result];
      const previewImg = document.getElementById('previewImg');
      const previewDiv = document.getElementById('photoPreview');
      const uploadArea = document.getElementById('photoUploadArea');
      
      previewImg.src = e.target.result;
      previewDiv.style.display = 'block';
      uploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

// Remove photo
export function removePhoto() {
  currentMomentPhotos = [];
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoUploadArea').style.display = 'block';
  document.getElementById('momentPhotoInput').value = '';
}

// Save moment to Firebase
export async function saveMoment() {
  const editId = document.getElementById('momentEditId').value;
  const date = document.getElementById('momentDate').value;
  const title = document.getElementById('momentTitle').value;
  const story = document.getElementById('momentStory').value;
  const mood = document.getElementById('momentMood').value;
  const isSpecial = document.getElementById('momentIsSpecial').checked;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!date) {
    showNotif('Tanggal harus diisi', true);
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
    updatedAt: Date.now(),
    likes: {},
    comments: {}
  };
  
  if (!editId) {
    momentData.createdAt = Date.now();
    await push(ref(db, 'data/moments'), momentData);
    showNotif('Momen berhasil ditambahkan! 🎉');
  } else {
    await update(ref(db, `data/moments/${editId}`), momentData);
    showNotif('Momen berhasil diupdate! ✨');
  }
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('momentModal'));
  if (modal) modal.hide();
  
  // Reset form
  document.getElementById('momentPhotoInput').value = '';
  removePhoto();
  
  // Refresh views
  renderCalendar();
  renderMomentsList();
}

// View moment detail
export async function viewMomentDetail(momentId) {
  currentDetailMomentId = momentId;
  const data = masterData;
  const moment = data?.moments?.[momentId];
  
  if (!moment) return;
  
  document.getElementById('detailTitle').innerHTML = escapeHtml(moment.title || 'Momen Spesial');
  document.getElementById('detailMood').innerHTML = `${moment.mood || '🥰'} ${getMoodText(moment.mood)}`;
  document.getElementById('detailDate').innerHTML = moment.date;
  document.getElementById('detailStory').innerHTML = escapeHtml(moment.story || 'Tidak ada cerita yang ditulis.');
  document.getElementById('detailLikes').innerHTML = Object.keys(moment.likes || {}).length;
  document.getElementById('detailComments').innerHTML = Object.keys(moment.comments || {}).length;
  document.getElementById('detailAuthor').innerHTML = `Dibuat oleh: ${moment.author}`;
  
  // Render carousel
  const carouselInner = document.getElementById('detailCarouselInner');
  const photos = moment.photos || [];
  
  if (photos.length === 0) {
    carouselInner.innerHTML = `
      <div class="carousel-item active">
        <div class="d-flex align-items-center justify-content-center" style="height: 300px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <i class="bi bi-camera-fill text-white" style="font-size: 64px; opacity: 0.5;"></i>
        </div>
      </div>
    `;
  } else {
    carouselInner.innerHTML = photos.map((photo, idx) => `
      <div class="carousel-item ${idx === 0 ? 'active' : ''}">
        <img src="${photo}" class="d-block w-100" alt="Moment photo">
      </div>
    `).join('');
  }
  
  // Render comments
  renderMomentComments(momentId);
  
  const modal = new bootstrap.Modal(document.getElementById('momentDetailModal'));
  modal.show();
}

// Render comments in detail modal
function renderMomentComments(momentId) {
  const data = masterData;
  const moment = data?.moments?.[momentId];
  const comments = moment?.comments || {};
  const commentList = document.getElementById('momentCommentList');
  
  if (Object.keys(comments).length === 0) {
    commentList.innerHTML = '<p class="text-muted text-center py-2">Belum ada komentar. Jadilah yang pertama!</p>';
    return;
  }
  
  commentList.innerHTML = Object.entries(comments)
    .sort((a, b) => b[1].time - a[1].time)
    .map(([id, c]) => `
      <div class="moment-comment-item">
        <div class="d-flex justify-content-between align-items-center">
          <span class="comment-author">${escapeHtml(c.user)}</span>
          <span class="comment-time">${new Date(c.time).toLocaleString()}</span>
        </div>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>
    `).join('');
}

// Add comment to moment
export async function addMomentComment() {
  const text = document.getElementById('momentCommentInput').value.trim();
  if (!text) {
    showNotif('Komentar tidak boleh kosong', true);
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
  
  // Update comment count in detail view
  const data = masterData;
  const moment = data?.moments?.[currentDetailMomentId];
  if (moment) {
    document.getElementById('detailComments').innerHTML = Object.keys(moment.comments || {}).length + 1;
  }
  
  showNotif('Komentar terkirim! 💬');
}

// Edit moment from detail
export function editMomentFromDetail() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
  if (modal) modal.hide();
  
  openMomentModal(currentDetailMomentId);
}

// Delete moment from detail
export async function deleteMomentFromDetail() {
  if (confirm('Yakin ingin menghapus momen ini?')) {
    await remove(ref(db, `data/moments/${currentDetailMomentId}`));
    showNotif('Momen berhasil dihapus');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
    if (modal) modal.hide();
    
    renderCalendar();
    renderMomentsList();
  }
}

// Delete moment
export async function deleteMoment(momentId) {
  if (confirm('Yakin ingin menghapus momen ini?')) {
    await remove(ref(db, `data/moments/${momentId}`));
    showNotif('Momen berhasil dihapus');
    renderCalendar();
    renderMomentsList();
  }
}

// Change month
export function changeMonth(delta) {
  currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + delta, 1);
  renderCalendar();
}

// Export moments as JSON
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
    commentsCount: Object.keys(m.comments || {}).length
  }));
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `growthogether_moments_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotif('Momen berhasil diexport! 📥');
}

// Like moment
export async function likeMoment(momentId) {
  const currentUser = sessionStorage.getItem('progrowth_user');
  const data = masterData;
  const moment = data?.moments?.[momentId];
  const likes = moment?.likes || {};
  
  if (likes[currentUser]) {
    delete likes[currentUser];
  } else {
    likes[currentUser] = true;
  }
  
  await update(ref(db, `data/moments/${momentId}/likes`), likes);
  showNotif(likes[currentUser] ? '❤️ Menyukai momen ini' : 'Batal suka');
  
  if (currentDetailMomentId === momentId) {
    document.getElementById('detailLikes').innerHTML = Object.keys(likes).length;
  }
}

// Export to window
window.initMomentPage = initMomentPage;
window.renderCalendar = renderCalendar;
window.renderMomentsList = renderMomentsList;
window.selectMomentDate = selectMomentDate;
window.openMomentModal = openMomentModal;
window.previewPhoto = previewPhoto;
window.removePhoto = removePhoto;
window.saveMoment = saveMoment;
window.viewMomentDetail = viewMomentDetail;
window.editMomentFromDetail = editMomentFromDetail;
window.deleteMomentFromDetail = deleteMomentFromDetail;
window.deleteMoment = deleteMoment;
window.changeMonth = changeMonth;
window.exportMoments = exportMoments;
window.likeMoment = likeMoment;
window.addMomentComment = addMomentComment;