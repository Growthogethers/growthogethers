// js/moment.js - Full version with sorting & special moment priority
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { masterData, escapeHtml } from './utils.js';

// State
let currentViewDate = new Date();
let currentDetailMomentId = null;
let currentMomentPhotos = [];
let pendingDeleteCallback = null;

// ============ HELPER FUNCTIONS ============
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

// Show toast custom
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
    const t = document.getElementById('momentToast');
    if (t) t.style.display = 'none';
  }, 3000);
}

window.hideMomentToast = function() {
  const toast = document.getElementById('momentToast');
  if (toast) toast.style.display = 'none';
};

function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById('customConfirmModal');
  const messageEl = document.getElementById('customConfirmMessage');
  const okBtn = document.getElementById('customConfirmOkBtn');
  
  if (!modal || !messageEl || !okBtn) {
    if (confirm(message)) onConfirm();
    return;
  }
  
  messageEl.innerText = message;
  modal.style.display = 'flex';
  
  const handleConfirm = () => {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', handleConfirm);
    onConfirm();
  };
  
  okBtn.addEventListener('click', handleConfirm, { once: true });
}

window.hideCustomConfirm = function() {
  const modal = document.getElementById('customConfirmModal');
  if (modal) modal.style.display = 'none';
};

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
        
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
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

function renderPhotoGrid() {
  const grid = document.getElementById('photoUploadGrid');
  if (!grid) return;
  
  const existingPhotos = currentMomentPhotos.map((photo, idx) => `
    <div class="photo-preview-item">
      <img src="${photo}" alt="Preview" style="width:100%; height:100%; object-fit:cover;">
      <button class="remove-photo-btn" onclick="window.removePhotoAtIndex(${idx})">✕</button>
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

export async function handleMultiplePhotos(input) {
  const files = Array.from(input.files);
  const remainingSlots = 5 - currentMomentPhotos.length;
  
  if (files.length > remainingSlots) {
    showMomentToast(`❌ Maksimal 5 foto, tersisa ${remainingSlots} slot`, true);
    input.value = '';
    return;
  }
  
  showMomentToast('📸 Memproses foto...', false);
  
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      showMomentToast(`❌ Foto ${file.name} terlalu besar (max 5MB)`, true);
      continue;
    }
    
    if (!file.type.startsWith('image/')) {
      showMomentToast(`❌ File ${file.name} bukan gambar`, true);
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
  if (files.length > 0) {
    showMomentToast(`✅ ${files.length} foto berhasil ditambahkan`);
  }
}

export function removePhotoAtIndex(index) {
  currentMomentPhotos.splice(index, 1);
  renderPhotoGrid();
}

export function initMomentPage() {
  renderCalendar();
  renderMomentsList();
  
  document.querySelectorAll('.moment-mood-option').forEach(opt => {
    opt.addEventListener('click', function() {
      document.querySelectorAll('.moment-mood-option').forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('momentMood').value = this.getAttribute('data-mood');
    });
  });
  
  const defaultMood = document.querySelector('.moment-mood-option[data-mood="🥰"]');
  if (defaultMood) defaultMood.classList.add('active');
}

export function renderCalendar() {
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthYearEl = document.getElementById('currentMonthYear');
  if (monthYearEl) monthYearEl.innerHTML = `${monthNames[month]} ${year}`;
  
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
    const momentOnDate = Object.values(moments).find(m => m.date === dateKey);
    const hasMoment = !!momentOnDate;
    const isSpecial = momentOnDate?.isSpecial || false;
    const isToday = cellYear === today.getFullYear() && cellMonth === today.getMonth() && cellDate === today.getDate();
    
    let cellClass = `calendar-day ${!isCurrentMonth ? 'other-month' : ''}`;
    if (isToday && isCurrentMonth) cellClass += ' today';
    if (hasMoment && isCurrentMonth) cellClass += ' has-moment';
    if (isSpecial && isCurrentMonth) cellClass += ' special-moment';
    
    calendarHtml += `
      <div class="${cellClass}" onclick="window.selectMomentDate('${dateKey}')">
        <span class="day-number">${displayDate}</span>
        ${hasMoment ? `<span class="moment-dot ${isSpecial ? 'special-dot' : ''}"></span>` : ''}
      </div>
    `;
  }
  
  grid.innerHTML = calendarHtml;
}

export function renderMomentsList() {
  const data = masterData;
  if (!data) return;
  
  const moments = data.moments || {};
  const momentsListEl = document.getElementById('momentsList');
  const momentsCountEl = document.getElementById('momentsCount');
  if (!momentsListEl) return;
  
  // Convert to array for sorting
  const momentsArray = Object.entries(moments).map(([id, m]) => ({ id, ...m }));
  
  // SORTING LOGIC:
  // 1. Special moments (isSpecial = true) appear first
  // 2. Then sort by date (newest to oldest)
  momentsArray.sort((a, b) => {
    // Prioritize special moments
    if (a.isSpecial && !b.isSpecial) return -1;
    if (!a.isSpecial && b.isSpecial) return 1;
    
    // Both have same special status, sort by date (newest first)
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });
  
  if (momentsCountEl) momentsCountEl.innerHTML = `${momentsArray.length} momen`;
  
  if (momentsArray.length === 0) {
    momentsListEl.innerHTML = `
      <div class="col-12">
        <div class="empty-moments text-center py-5">
          <i class="bi bi-calendar-heart fs-1 text-muted"></i>
          <h6 class="mt-2">Belum ada momen</h6>
          <p class="text-muted small">Klik tanggal pada kalender untuk menambah momen</p>
        </div>
      </div>
    `;
    return;
  }
  
  momentsListEl.innerHTML = momentsArray.map((moment) => {
    const specialClass = moment.isSpecial ? 'special-card' : '';
    const moodEmoji = moment.mood || '🥰';
    const firstPhoto = moment.photos && moment.photos[0] ? moment.photos[0] : null;
    const moodText = getMoodText(moment.mood);
    const dateFormatted = formatDate(moment.date);
    
    // Add special badge
    const specialBadge = moment.isSpecial ? 
      '<span class="badge bg-warning text-dark ms-1"><i class="bi bi-star-fill me-1"></i>Spesial</span>' : '';
    
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card moment-card ${specialClass} h-100" onclick="window.viewMomentDetail('${moment.id}')" style="cursor: pointer;">
          ${firstPhoto ? `
            <img src="${firstPhoto}" class="moment-image" loading="lazy">
          ` : `
            <div class="moment-image-placeholder">
              <i class="bi bi-camera-fill"></i>
            </div>
          `}
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div class="d-flex align-items-center gap-1 flex-wrap">
                <span class="moment-mood-badge small">${moodEmoji} ${moodText}</span>
                ${specialBadge}
              </div>
            </div>
            <h6 class="fw-bold mb-0 small">${escapeHtml(moment.title || 'Momen Tak Terlupakan')}</h6>
            <small class="text-muted">${dateFormatted}</small>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function selectMomentDate(dateKey) {
  const data = masterData;
  const moments = data?.moments || {};
  const existingEntry = Object.entries(moments).find(([id, m]) => m.date === dateKey);
  
  if (existingEntry) {
    viewMomentDetail(existingEntry[0]);
  } else {
    document.getElementById('momentEditId').value = '';
    document.getElementById('momentDate').value = dateKey;
    document.getElementById('momentTitle').value = '';
    document.getElementById('momentStory').value = '';
    document.getElementById('momentIsSpecial').checked = false;
    document.getElementById('momentMood').value = '🥰';
    currentMomentPhotos = [];
    
    document.querySelectorAll('.moment-mood-option').forEach(opt => {
      if (opt.getAttribute('data-mood') === '🥰') {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    
    renderPhotoGrid();
    
    const modal = new bootstrap.Modal(document.getElementById('momentModal'));
    modal.show();
  }
}

export function openMomentModal(momentId) {
  if (!momentId) {
    document.getElementById('momentModalTitle').innerText = 'Tambah Momen';
    document.getElementById('momentEditId').value = '';
    if (!document.getElementById('momentDate').value) {
      document.getElementById('momentDate').value = new Date().toISOString().split('T')[0];
    }
    document.getElementById('momentTitle').value = '';
    document.getElementById('momentStory').value = '';
    document.getElementById('momentIsSpecial').checked = false;
    document.getElementById('momentMood').value = '🥰';
    currentMomentPhotos = [];
    
    document.querySelectorAll('.moment-mood-option').forEach(opt => {
      if (opt.getAttribute('data-mood') === '🥰') {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    
    renderPhotoGrid();
  } else {
    document.getElementById('momentModalTitle').innerText = 'Edit Momen';
    const data = masterData;
    const moment = data?.moments?.[momentId];
    if (moment) {
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
      
      currentMomentPhotos = moment.photos ? [...moment.photos] : [];
      renderPhotoGrid();
    }
  }
  
  const modal = new bootstrap.Modal(document.getElementById('momentModal'));
  modal.show();
}

export async function saveMoment() {
  const editId = document.getElementById('momentEditId').value;
  const date = document.getElementById('momentDate').value;
  const title = document.getElementById('momentTitle').value;
  const story = document.getElementById('momentStory').value;
  const mood = document.getElementById('momentMood').value;
  const isSpecial = document.getElementById('momentIsSpecial').checked;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!date) {
    showMomentToast('❌ Tanggal harus diisi', true);
    return;
  }
  
  if (currentMomentPhotos.length === 0) {
    showMomentToast('❌ Minimal upload 1 foto', true);
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
      showMomentToast('✅ Momen berhasil ditambahkan! 🎉');
    } else {
      const existing = masterData?.moments?.[editId];
      momentData.createdAt = existing?.createdAt || Date.now();
      momentData.likes = existing?.likes || {};
      momentData.comments = existing?.comments || {};
      await update(ref(db, `data/moments/${editId}`), momentData);
      showMomentToast('✅ Momen berhasil diupdate! ✨');
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('momentModal'));
    if (modal) modal.hide();
    
    renderCalendar();
    renderMomentsList();
  } catch (err) {
    console.error(err);
    showMomentToast('❌ Gagal menyimpan momen', true);
  }
}

export async function viewMomentDetail(momentId) {
  currentDetailMomentId = momentId;
  const data = masterData;
  const moment = data?.moments?.[momentId];
  
  if (!moment) return;
  
  document.getElementById('detailTitle').innerHTML = escapeHtml(moment.title || 'Momen Spesial');
  document.getElementById('detailMood').innerHTML = `${moment.mood || '🥰'} ${getMoodText(moment.mood)}`;
  document.getElementById('detailDate').innerHTML = formatDate(moment.date);
  document.getElementById('detailStory').innerHTML = escapeHtml(moment.story || 'Tidak ada cerita yang ditulis.').replace(/\n/g, '<br>');
  document.getElementById('detailAuthor').innerHTML = moment.author || '';
  
  const dateCreatedEl = document.getElementById('detailDateCreated');
  if (dateCreatedEl && moment.createdAt) {
    dateCreatedEl.innerHTML = `Dibuat: ${new Date(moment.createdAt).toLocaleDateString('id-ID')}`;
  }
  
  const carouselInner = document.getElementById('detailCarouselInner');
  const photos = moment.photos || [];
  
  if (!carouselInner) return;
  
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
        <img src="${photo}" alt="Moment photo" style="width:100%; max-height: 300px; object-fit: contain;">
      </div>
    `).join('');
    
    const carouselElement = document.getElementById('detailCarousel');
    if (carouselElement && typeof bootstrap !== 'undefined') {
      new bootstrap.Carousel(carouselElement, {
        interval: false
      });
    }
  }
  
  const modal = new bootstrap.Modal(document.getElementById('momentDetailModal'));
  modal.show();
}

export function editMomentFromDetail() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
  if (modal) modal.hide();
  openMomentModal(currentDetailMomentId);
}

export async function deleteMomentFromDetail() {
  showCustomConfirm('Yakin ingin menghapus momen ini?', async () => {
    try {
      await remove(ref(db, `data/moments/${currentDetailMomentId}`));
      showMomentToast('🗑️ Momen berhasil dihapus');
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('momentDetailModal'));
      if (modal) modal.hide();
      
      renderCalendar();
      renderMomentsList();
    } catch (err) {
      console.error(err);
      showMomentToast('❌ Gagal menghapus momen', true);
    }
  });
}

export function changeMonth(delta) {
  currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + delta, 1);
  renderCalendar();
}

// Export to window
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
window.changeMonth = changeMonth;
