// js/vision.js - Dream Board Version (Mimpi Bareng)
// GANTI TOTAL file ini dengan kode di bawah

import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml, privacyHidden, setMasterData } from './utils.js';

// ============ STATE ============
let currentDreamId = null;
let currentGoalId = null;
let currentBucketId = null;

// ============ HELPER FUNCTIONS ============
function compressImage(file, maxSizeMB = 1) {
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
        const maxDimension = 500;
        
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
        
        let quality = 0.7;
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

async function refreshData() {
  const snapshot = await get(ref(db, 'data/'));
  const freshData = snapshot.val() || { dreams: {}, goals: {}, buckets: {}, visions: {}, plans: {}, finances: {}, settings: {}, comments: {}, likes: {}, moments: {} };
  if (window.setMasterData) window.setMasterData(freshData);
  window.masterData = freshData;
  return freshData;
}

// ============ DREAM/VISION FUNCTIONS ============
export async function saveDream() {
  const editId = document.getElementById('dreamEditId')?.value;
  const title = document.getElementById('dreamTitle')?.value.trim();
  const desc = document.getElementById('dreamDesc')?.value || '';
  const year = parseInt(document.getElementById('dreamYear')?.value);
  const budget = parseInt(document.getElementById('dreamBudget')?.value) || 0;
  const isAchieved = document.getElementById('dreamIsAchieved')?.checked || false;
  const imageFile = document.getElementById('dreamImage')?.files[0];
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!title) {
    showNotif('❌ Judul visi harus diisi!', true);
    return;
  }
  
  let imageData = null;
  if (imageFile) {
    showNotif('📸 Memproses gambar...', false);
    imageData = await compressImage(imageFile);
  }
  
  const dreamData = {
    title,
    desc,
    year,
    budget,
    isAchieved,
    author: currentUser,
    updatedAt: Date.now()
  };
  
  if (imageData) dreamData.image = imageData;
  
  try {
    if (editId) {
      const data = await refreshData();
      dreamData.createdAt = data.dreams?.[editId]?.createdAt || Date.now();
      await update(ref(db, `data/dreams/${editId}`), dreamData);
      showNotif('✅ Visi berhasil diupdate!');
    } else {
      dreamData.createdAt = Date.now();
      await push(ref(db, 'data/dreams'), dreamData);
      showNotif('✨ Mimpi baru ditambahkan! ✨');
    }
    
    await refreshData();
    renderDreamBoard();
    closeDreamModal();
  } catch (err) {
    console.error(err);
    showNotif('❌ Gagal menyimpan visi', true);
  }
}

export function renderDreamBoard() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const dreams = data.dreams ? Object.entries(data.dreams) : [];
  const gridContainer = document.getElementById('visionBoardGrid');
  const visionCountEl = document.getElementById('visionCount');
  const visionAchievedEl = document.getElementById('visionAchievedCount');
  
  if (!gridContainer) return;
  
  const achievedCount = dreams.filter(([id, d]) => d.isAchieved).length;
  if (visionCountEl) visionCountEl.innerText = dreams.length;
  if (visionAchievedEl) visionAchievedEl.innerText = achievedCount;
  
  const formatBudget = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  
  if (dreams.length === 0) {
    gridContainer.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-images fs-1"></i>
        <p class="mt-2">Belum ada visi. Mulai impian kalian!</p>
        <button class="btn btn-outline-primary rounded-pill" onclick="openDreamModal()">
          <i class="bi bi-plus-circle me-2"></i>Tambah Visi
        </button>
      </div>
    `;
    return;
  }
  
  gridContainer.innerHTML = dreams.map(([id, d]) => `
    <div class="col-md-6 col-lg-4">
      <div class="dream-card card border-0 shadow-sm h-100 ${d.isAchieved ? 'achieved' : ''}" onclick="window.viewDreamDetail('${id}')" style="cursor: pointer;">
        ${d.image ? `
          <img src="${d.image}" class="dream-card-img" loading="lazy" onerror="this.src='https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'">
        ` : `
          <div class="dream-card-placeholder">
            <i class="bi bi-star-fill fs-1 text-primary opacity-50"></i>
          </div>
        `}
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 ${d.isAchieved ? 'text-decoration-line-through text-muted' : ''}">
              ${escapeHtml(d.title)}
            </h6>
            ${d.isAchieved ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>' : ''}
          </div>
          ${d.desc ? `<p class="small text-muted mb-2">${escapeHtml(d.desc.substring(0, 80))}${d.desc.length > 80 ? '...' : ''}</p>` : ''}
          <div class="d-flex justify-content-between mt-2">
            <span class="badge bg-primary">Tahun ${d.year}</span>
            ${d.budget > 0 ? `<span class="badge bg-success">${formatBudget(d.budget)}</span>` : ''}
          </div>
          <div class="mt-2">
            <span class="badge ${d.author === 'FACHMI' ? 'badge-fachmi' : 'badge-azizah'}">${escapeHtml(d.author)}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

export async function viewDreamDetail(id) {
  currentDreamId = id;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[id];
  if (!dream) return;
  
  const titleEl = document.getElementById('dreamDetailTitle');
  const descEl = document.getElementById('dreamDetailDesc');
  const yearEl = document.getElementById('dreamDetailYear');
  const budgetEl = document.getElementById('dreamDetailBudget');
  const imageEl = document.getElementById('dreamDetailImage');
  const authorEl = document.getElementById('dreamDetailAuthor');
  
  if (titleEl) titleEl.innerText = dream.title;
  if (descEl) descEl.innerText = dream.desc || 'Tidak ada deskripsi';
  if (yearEl) yearEl.innerText = `🎯 Target: Tahun ${dream.year}`;
  
  const formatBudget = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  if (budgetEl) budgetEl.innerHTML = dream.budget > 0 ? `💰 ${formatBudget(dream.budget)}` : '💰 Belum ditentukan';
  if (authorEl) authorEl.innerText = dream.author;
  
  if (imageEl) {
    if (dream.image) {
      imageEl.src = dream.image;
      imageEl.style.display = 'block';
    } else {
      imageEl.style.display = 'none';
    }
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dreamDetailModal'));
  modal.show();
}

export function editDreamFromDetail() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
  if (modal) modal.hide();
  openDreamModal(currentDreamId);
}

export async function deleteDreamFromDetail() {
  if (confirm('Yakin ingin menghapus mimpi ini?')) {
    await remove(ref(db, `data/dreams/${currentDreamId}`));
    await refreshData();
    renderDreamBoard();
    showNotif('🗑️ Mimpi dihapus');
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
    if (modal) modal.hide();
  }
}

export function openDreamModal(editId = null) {
  const modal = new bootstrap.Modal(document.getElementById('dreamModal'));
  const data = window.masterData || masterData;
  
  if (editId && data?.dreams?.[editId]) {
    const dream = data.dreams[editId];
    document.getElementById('dreamEditId').value = editId;
    document.getElementById('dreamTitle').value = dream.title;
    document.getElementById('dreamDesc').value = dream.desc || '';
    document.getElementById('dreamYear').value = dream.year || 1;
    document.getElementById('dreamBudget').value = dream.budget || 0;
    document.getElementById('dreamIsAchieved').checked = dream.isAchieved || false;
    
    if (dream.image) {
      const preview = document.getElementById('dreamImagePreview');
      const previewImg = document.getElementById('dreamImagePreviewImg');
      if (preview && previewImg) {
        previewImg.src = dream.image;
        preview.style.display = 'block';
      }
    }
  } else {
    document.getElementById('dreamEditId').value = '';
    document.getElementById('dreamTitle').value = '';
    document.getElementById('dreamDesc').value = '';
    document.getElementById('dreamBudget').value = '';
    document.getElementById('dreamIsAchieved').checked = false;
    document.getElementById('dreamImagePreview').style.display = 'none';
    const imageInput = document.getElementById('dreamImage');
    if (imageInput) imageInput.value = '';
  }
  
  modal.show();
}

function closeDreamModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('dreamModal'));
  if (modal) modal.hide();
}

window.previewDreamImage = function(input) {
  const preview = document.getElementById('dreamImagePreview');
  const previewImg = document.getElementById('dreamImagePreviewImg');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// ============ GOALS FUNCTIONS ============
export async function saveGoal() {
  const editId = document.getElementById('goalEditId')?.value;
  const text = document.getElementById('goalText')?.value.trim();
  const year = parseInt(document.getElementById('goalYear')?.value);
  const isDone = document.getElementById('goalDone')?.checked || false;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!text) {
    showNotif('❌ Goal harus diisi!', true);
    return;
  }
  
  const goalData = { text, year, isDone, author: currentUser, updatedAt: Date.now() };
  
  try {
    if (editId) {
      const data = await refreshData();
      goalData.createdAt = data.goals?.[editId]?.createdAt || Date.now();
      await update(ref(db, `data/goals/${editId}`), goalData);
      showNotif('✅ Goal berhasil diupdate!');
    } else {
      goalData.createdAt = Date.now();
      await push(ref(db, 'data/goals'), goalData);
      showNotif('🎯 Goal baru ditambahkan!');
    }
    
    await refreshData();
    renderTimelineGoals();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('goalModal'));
    if (modal) modal.hide();
    
    document.getElementById('goalEditId').value = '';
    document.getElementById('goalText').value = '';
    document.getElementById('goalDone').checked = false;
  } catch (err) {
    console.error(err);
    showNotif('❌ Gagal menyimpan goal', true);
  }
}

export function renderTimelineGoals() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const goals = data.goals ? Object.values(data.goals) : [];
  const timelineContainer = document.getElementById('timelineGoals');
  const progressBar = document.getElementById('goalsProgressBar');
  const progressPercent = document.getElementById('goalsProgressPercent');
  
  if (!timelineContainer) return;
  
  const totalGoals = goals.length;
  const achievedGoals = goals.filter(g => g.isDone).length;
  const percent = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;
  
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressPercent) progressPercent.innerText = `${percent}%`;
  
  if (totalGoals === 0) {
    timelineContainer.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-calendar fs-1"></i>
        <p class="mt-2">Tambahkan target untuk 5 tahun ke depan</p>
        <button class="btn btn-outline-primary rounded-pill" onclick="openGoalModal()">
          <i class="bi bi-plus-circle me-2"></i>Tambah Goal
        </button>
      </div>
    `;
    return;
  }
  
  const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  goals.forEach(g => {
    if (grouped[g.year]) grouped[g.year].push(g);
  });
  
  timelineContainer.innerHTML = '';
  for (let year = 1; year <= 5; year++) {
    const yearGoals = grouped[year];
    const yearAchieved = yearGoals.filter(g => g.isDone).length;
    const yearPercent = yearGoals.length > 0 ? Math.round((yearAchieved / yearGoals.length) * 100) : 0;
    
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-year-group mb-4';
    timelineItem.innerHTML = `
      <div class="timeline-year-header d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0">🎯 Tahun ${year}</h6>
        <span class="badge ${yearPercent === 100 ? 'bg-success' : 'bg-secondary'}">${yearAchieved}/${yearGoals.length} tercapai</span>
      </div>
      <div class="timeline-goals-list">
        ${yearGoals.map(g => `
          <div class="timeline-goal-item d-flex justify-content-between align-items-center p-2 mb-2 bg-light rounded-3">
            <div class="d-flex align-items-center gap-2 flex-grow-1">
              <input type="checkbox" class="form-check-input" ${g.isDone ? 'checked' : ''} 
                     onchange="window.toggleGoalDone('${g.id}')">
              <span class="${g.isDone ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(g.text)}</span>
            </div>
            <div class="d-flex gap-2">
              <i class="bi bi-pencil text-primary" style="cursor: pointer;" onclick="window.openGoalModal('${g.id}')"></i>
              <i class="bi bi-trash text-danger" style="cursor: pointer;" onclick="window.deleteGoal('${g.id}')"></i>
            </div>
          </div>
        `).join('')}
        <button class="btn btn-sm btn-outline-primary mt-1 rounded-pill" onclick="window.openGoalModal(null, ${year})">
          <i class="bi bi-plus me-1"></i>Tambah
        </button>
      </div>
    `;
    timelineContainer.appendChild(timelineItem);
  }
}

export async function toggleGoalDone(goalId) {
  const data = window.masterData || masterData;
  const goal = data?.goals?.[goalId];
  if (!goal) return;
  
  await update(ref(db, `data/goals/${goalId}`), { isDone: !goal.isDone });
  await refreshData();
  renderTimelineGoals();
  showNotif(goal.isDone ? '⏸️ Goal dibatalkan' : '✅ Goal tercapai!');
}

export function openGoalModal(editId = null, presetYear = null) {
  const data = window.masterData || masterData;
  const modal = new bootstrap.Modal(document.getElementById('goalModal'));
  
  if (editId && data?.goals?.[editId]) {
    const goal = data.goals[editId];
    document.getElementById('goalEditId').value = editId;
    document.getElementById('goalText').value = goal.text;
    document.getElementById('goalYear').value = goal.year;
    document.getElementById('goalDone').checked = goal.isDone;
  } else {
    document.getElementById('goalEditId').value = '';
    document.getElementById('goalText').value = '';
    if (presetYear) document.getElementById('goalYear').value = presetYear;
    else document.getElementById('goalYear').value = '1';
    document.getElementById('goalDone').checked = false;
  }
  
  modal.show();
}

export async function deleteGoal(goalId) {
  if (confirm('Hapus goal ini?')) {
    await remove(ref(db, `data/goals/${goalId}`));
    await refreshData();
    renderTimelineGoals();
    showNotif('🗑️ Goal dihapus');
  }
}

// ============ BUCKET LIST FUNCTIONS ============
export async function saveBucketItem() {
  const editId = document.getElementById('bucketEditId')?.value;
  const text = document.getElementById('bucketText')?.value.trim();
  const category = document.getElementById('bucketCategory')?.value;
  const isDone = document.getElementById('bucketDone')?.checked || false;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!text) {
    showNotif('❌ Bucket item harus diisi!', true);
    return;
  }
  
  const bucketData = { text, category, isDone, author: currentUser, updatedAt: Date.now() };
  
  try {
    if (editId) {
      const data = await refreshData();
      bucketData.createdAt = data.buckets?.[editId]?.createdAt || Date.now();
      await update(ref(db, `data/buckets/${editId}`), bucketData);
      showNotif('✅ Item berhasil diupdate!');
    } else {
      bucketData.createdAt = Date.now();
      await push(ref(db, 'data/buckets'), bucketData);
      showNotif('🎉 Item bucket list ditambahkan!');
    }
    
    await refreshData();
    renderBucketList();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('bucketModal'));
    if (modal) modal.hide();
    
    document.getElementById('bucketEditId').value = '';
    document.getElementById('bucketText').value = '';
    document.getElementById('bucketDone').checked = false;
  } catch (err) {
    console.error(err);
    showNotif('❌ Gagal menyimpan bucket item', true);
  }
}

export function renderBucketList() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const buckets = data.buckets ? Object.entries(data.buckets) : [];
  const container = document.getElementById('bucketListContainer');
  const totalEl = document.getElementById('bucketTotal');
  const doneEl = document.getElementById('bucketDone');
  
  if (!container) return;
  
  const total = buckets.length;
  const done = buckets.filter(([id, b]) => b.isDone).length;
  if (totalEl) totalEl.innerText = total;
  if (doneEl) doneEl.innerText = done;
  
  const categoryIcons = {
    travel: '✈️',
    adventure: '🧗',
    romance: '💕',
    milestone: '🏆',
    fun: '🎉'
  };
  
  const categoryColors = {
    travel: 'bg-info',
    adventure: 'bg-success',
    romance: 'bg-danger',
    milestone: 'bg-warning',
    fun: 'bg-primary'
  };
  
  if (buckets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted" style="grid-column: 1/-1;">
        <i class="bi bi-bucket fs-1"></i>
        <p class="mt-2">Buat daftar keinginan yang ingin dilakukan bersama!</p>
        <button class="btn btn-outline-primary rounded-pill" onclick="openBucketModal()">
          <i class="bi bi-plus-circle me-2"></i>Tambah Item
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = buckets.map(([id, b]) => `
    <div class="bucket-item ${b.isDone ? 'done' : ''}">
      <div class="d-flex gap-3">
        <div class="bucket-category ${categoryColors[b.category]} bg-opacity-10">
          ${categoryIcons[b.category] || '✨'}
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <input type="checkbox" class="form-check-input me-2" ${b.isDone ? 'checked' : ''} 
                     onchange="window.toggleBucketDone('${id}')">
              <span class="${b.isDone ? 'text-decoration-line-through text-muted' : 'fw-medium'}">${escapeHtml(b.text)}</span>
            </div>
            <div class="d-flex gap-2">
              <i class="bi bi-pencil text-primary" style="cursor: pointer;" onclick="window.openBucketModal('${id}')"></i>
              <i class="bi bi-trash text-danger" style="cursor: pointer;" onclick="window.deleteBucketItem('${id}')"></i>
            </div>
          </div>
          <small class="text-muted">${escapeHtml(b.author)} • ${new Date(b.createdAt).toLocaleDateString('id-ID')}</small>
        </div>
      </div>
    </div>
  `).join('');
}

export async function toggleBucketDone(bucketId) {
  const data = window.masterData || masterData;
  const bucket = data?.buckets?.[bucketId];
  if (!bucket) return;
  
  await update(ref(db, `data/buckets/${bucketId}`), { isDone: !bucket.isDone });
  await refreshData();
  renderBucketList();
  showNotif(bucket.isDone ? '⏸️ Dibatalkan' : '✅ Selamat! Bucket item tercapai!');
}

export function openBucketModal(editId = null) {
  const data = window.masterData || masterData;
  const modal = new bootstrap.Modal(document.getElementById('bucketModal'));
  
  if (editId && data?.buckets?.[editId]) {
    const bucket = data.buckets[editId];
    document.getElementById('bucketEditId').value = editId;
    document.getElementById('bucketText').value = bucket.text;
    document.getElementById('bucketCategory').value = bucket.category;
    document.getElementById('bucketDone').checked = bucket.isDone;
  } else {
    document.getElementById('bucketEditId').value = '';
    document.getElementById('bucketText').value = '';
    document.getElementById('bucketCategory').value = 'travel';
    document.getElementById('bucketDone').checked = false;
  }
  
  modal.show();
}

export async function deleteBucketItem(bucketId) {
  if (confirm('Hapus item bucket list ini?')) {
    await remove(ref(db, `data/buckets/${bucketId}`));
    await refreshData();
    renderBucketList();
    showNotif('🗑️ Item dihapus');
  }
}

// ============ INITIAL RENDER ============
export function initDreamBoard() {
  renderDreamBoard();
  renderTimelineGoals();
  renderBucketList();
}

// ============ EXPOSE TO WINDOW ============
window.saveDream = saveDream;
window.openDreamModal = openDreamModal;
window.viewDreamDetail = viewDreamDetail;
window.editDreamFromDetail = editDreamFromDetail;
window.deleteDreamFromDetail = deleteDreamFromDetail;
window.renderDreamBoard = renderDreamBoard;

window.saveGoal = saveGoal;
window.openGoalModal = openGoalModal;
window.toggleGoalDone = toggleGoalDone;
window.deleteGoal = deleteGoal;
window.renderTimelineGoals = renderTimelineGoals;

window.saveBucketItem = saveBucketItem;
window.openBucketModal = openBucketModal;
window.toggleBucketDone = toggleBucketDone;
window.deleteBucketItem = deleteBucketItem;
window.renderBucketList = renderBucketList;
window.initDreamBoard = initDreamBoard;

// Untuk kompatibilitas dengan app.js yang mungkin masih memanggil renderVisions
window.renderVisions = initDreamBoard;
