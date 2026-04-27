<!-- ganti file vision.js dengan kode di bawah -->

// js/vision.js - Dream Board Version (Mimpi Bareng)
// FULL REVISED VERSION - Tanpa prompt browser, dengan fitur uang terkumpul

import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml, privacyHidden, setMasterData } from './utils.js';

// ============ STATE ============
let currentDreamId = null;
let currentGoalId = null;
let currentBucketId = null;
let currentFundingModalDreamId = null;

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

// Format mata uang untuk input
function formatNumberInput(value) {
  if (!value) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumberInput(value) {
  return parseInt(value.replace(/\./g, '')) || 0;
}

// ============ DREAM/VISION FUNCTIONS ============
export async function saveDream() {
  const editId = document.getElementById('dreamEditId')?.value;
  const title = document.getElementById('dreamTitle')?.value.trim();
  const desc = document.getElementById('dreamDesc')?.value || '';
  const year = parseInt(document.getElementById('dreamYear')?.value);
  const budget = parseNumberInput(document.getElementById('dreamBudget')?.value || '0');
  const savedAmount = parseNumberInput(document.getElementById('dreamSavedAmount')?.value || '0');
  const isAchieved = document.getElementById('dreamIsAchieved')?.checked || false;
  const imageFile = document.getElementById('dreamImage')?.files[0];
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!title) {
    showNotif('❌ Judul visi harus diisi!', true);
    return;
  }
  
  if (year < 1 || year > 10) {
    showNotif('❌ Target tahun harus antara 1-10 tahun', true);
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
    savedAmount: savedAmount,
    isAchieved: isAchieved || (savedAmount >= budget && budget > 0),
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

// Update uang terkumpul untuk dream
export async function updateDreamSavedAmount(dreamId, newAmount) {
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[dreamId];
  if (!dream) return;
  
  const parsedAmount = parseInt(newAmount) || 0;
  const isAchieved = parsedAmount >= dream.budget && dream.budget > 0;
  
  await update(ref(db, `data/dreams/${dreamId}`), { 
    savedAmount: parsedAmount,
    isAchieved: isAchieved,
    updatedAt: Date.now()
  });
  
  await refreshData();
  renderDreamBoard();
  showNotif(isAchieved ? '🎉 Selamat! Mimpi telah tercapai! 🎉' : '💰 Uang terkumpul diperbarui');
}

// Open funding modal
export function openFundingModal(dreamId) {
  currentFundingModalDreamId = dreamId;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[dreamId];
  if (!dream) return;
  
  const modalHtml = `
    <div class="modal fade" id="fundingModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-success text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-cash-stack me-2"></i>Update Tabungan</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="text-center mb-3">
              <i class="bi bi-piggy-bank-fill fs-1 text-success"></i>
              <h6 class="mt-2">${escapeHtml(dream.title)}</h6>
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">💰 Uang yang sudah terkumpul</label>
              <div class="input-group">
                <span class="input-group-text">Rp</span>
                <input type="text" id="fundingAmountInput" class="form-control" 
                       value="${formatNumberInput(dream.savedAmount || 0)}" 
                       placeholder="Masukkan nominal" inputmode="numeric">
              </div>
              <small class="text-muted">Target: ${formatNumberRp(dream.budget)}</small>
            </div>
            <div class="progress mb-3" style="height: 8px;">
              <div class="progress-bar bg-success" style="width: ${dream.budget > 0 ? Math.min(100, (dream.savedAmount / dream.budget) * 100) : 0}%"></div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4">
            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button type="button" onclick="window.confirmUpdateFunding()" class="btn btn-success rounded-pill px-4">
              <i class="bi bi-save me-2"></i>Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('fundingModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Format input as currency
  const amountInput = document.getElementById('fundingAmountInput');
  if (amountInput) {
    amountInput.addEventListener('input', function(e) {
      let value = this.value.replace(/\./g, '');
      if (!isNaN(value) && value !== '') {
        this.value = formatNumberInput(parseInt(value));
      }
    });
  }
  
  const modal = new bootstrap.Modal(document.getElementById('fundingModal'));
  modal.show();
}

export function confirmUpdateFunding() {
  const amountInput = document.getElementById('fundingAmountInput');
  if (amountInput && currentFundingModalDreamId) {
    const rawAmount = parseNumberInput(amountInput.value);
    updateDreamSavedAmount(currentFundingModalDreamId, rawAmount);
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('fundingModal'));
    if (modal) modal.hide();
  }
}

// Delete dream
export async function deleteDreamFromCard(dreamId) {
  const modalHtml = `
    <div class="modal fade" id="confirmDeleteDreamModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-danger text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Konfirmasi Hapus</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4 text-center">
            <i class="bi bi-trash3-fill text-danger fs-1 mb-3 d-block"></i>
            <p>Yakin ingin menghapus mimpi ini?</p>
            <small class="text-muted">Data yang dihapus tidak dapat dikembalikan</small>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4 justify-content-center gap-3">
            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button type="button" id="confirmDeleteDreamBtn" class="btn btn-danger rounded-pill px-4">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('confirmDeleteDreamModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteDreamModal'));
  modal.show();
  
  document.getElementById('confirmDeleteDreamBtn').onclick = async () => {
    await remove(ref(db, `data/dreams/${dreamId}`));
    await refreshData();
    renderDreamBoard();
    showNotif('🗑️ Mimpi dihapus');
    modal.hide();
  };
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
      <div class="col-12">
        <div class="empty-state-card text-center py-5">
          <div class="empty-icon mb-3">
            <i class="bi bi-stars fs-1 text-muted"></i>
          </div>
          <h6 class="fw-semibold">Belum Ada Mimpi</h6>
          <p class="text-muted small">Mulai rencanakan mimpi bersama pasangan</p>
          <button class="btn btn-primary rounded-pill px-4" onclick="window.openDreamModal()">
            <i class="bi bi-plus-lg me-2"></i>Tambah Mimpi Baru
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  gridContainer.innerHTML = dreams.map(([id, d]) => {
    const percentProgress = d.budget > 0 ? Math.min(100, Math.round((d.savedAmount / d.budget) * 100)) : 0;
    const isAchieved = d.isAchieved || (d.savedAmount >= d.budget && d.budget > 0);
    const remainingYears = d.year;
    
    return `
      <div class="col-md-6 col-lg-4">
        <div class="dream-card card border-0 shadow-sm h-100 ${isAchieved ? 'dream-achieved' : ''}">
          ${d.image ? `
            <div class="dream-card-img-wrapper">
              <img src="${d.image}" class="dream-card-img" loading="lazy" onerror="this.src='https://placehold.co/400x200/e2e8f0/64748b?text=Mimpi'">
              ${isAchieved ? '<div class="achieved-badge"><i class="bi bi-trophy-fill"></i> Tercapai!</div>' : ''}
            </div>
          ` : `
            <div class="dream-card-placeholder">
              <i class="bi bi-star-fill fs-1 text-primary opacity-50"></i>
              ${isAchieved ? '<div class="achieved-badge-simple"><i class="bi bi-check-circle-fill"></i> Tercapai</div>' : ''}
            </div>
          `}
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="fw-bold mb-0 ${isAchieved ? 'text-decoration-line-through text-muted' : ''}">
                ${escapeHtml(d.title)}
              </h6>
              <div class="dropdown">
                <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" onclick="window.openDreamModal('${id}')">
                    <i class="bi bi-pencil me-2"></i>Edit
                  </a></li>
                  <li><a class="dropdown-item" onclick="window.openFundingModal('${id}')">
                    <i class="bi bi-cash-stack me-2"></i>Update Tabungan
                  </a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" onclick="window.deleteDreamFromCard('${id}')">
                    <i class="bi bi-trash me-2"></i>Hapus
                  </a></li>
                </ul>
              </div>
            </div>
            
            ${d.desc ? `<p class="small text-muted mb-2">${escapeHtml(d.desc.substring(0, 80))}${d.desc.length > 80 ? '...' : ''}</p>` : ''}
            
            <!-- Target Tahun & Budget -->
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                <i class="bi bi-calendar-range me-1"></i> ${remainingYears} tahun lagi
              </span>
              ${d.budget > 0 ? `
                <span class="badge bg-success bg-opacity-10 text-success px-3 py-2">
                  <i class="bi bi-cash-stack me-1"></i> ${formatBudget(d.budget)}
                </span>
              ` : ''}
            </div>
            
            <!-- Progress Tabungan -->
            ${d.budget > 0 ? `
              <div class="saving-progress mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-muted"><i class="bi bi-piggy-bank me-1"></i> Uang Terkumpul</span>
                  <span class="fw-semibold ${percentProgress >= 100 ? 'text-success' : 'text-primary'}">${formatBudget(d.savedAmount || 0)}</span>
                </div>
                <div class="progress" style="height: 6px; border-radius: 10px;">
                  <div class="progress-bar ${percentProgress >= 100 ? 'bg-success' : 'bg-primary'}" 
                       style="width: ${percentProgress}%; border-radius: 10px;"></div>
                </div>
                <div class="text-end mt-1">
                  <small class="text-muted">${percentProgress}% tercapai</small>
                </div>
              </div>
            ` : `
              <div class="saving-progress mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-muted"><i class="bi bi-piggy-bank me-1"></i> Uang Terkumpul</span>
                  <span class="fw-semibold">${formatBudget(d.savedAmount || 0)}</span>
                </div>
              </div>
            `}
            
            <!-- Action Buttons -->
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-success flex-grow-1 rounded-pill" onclick="window.openFundingModal('${id}')">
                <i class="bi bi-cash-stack me-1"></i>Catat Tabungan
              </button>
            </div>
            
            <!-- Author -->
            <div class="mt-2 pt-2 border-top">
              <small class="text-muted">
                <i class="bi bi-person-circle me-1"></i> ${escapeHtml(d.author)}
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// View dream detail (opsional, bisa tetap atau dihapus)
export async function viewDreamDetail(id) {
  currentDreamId = id;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[id];
  if (!dream) return;
  
  const modalHtml = `
    <div class="modal fade" id="dreamDetailModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-primary text-white py-3">
            <h5 class="fw-bold mb-0">${escapeHtml(dream.title)}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            ${dream.image ? `<img src="${dream.image}" style="width:100%; border-radius: 16px; margin-bottom: 16px;">` : ''}
            <p class="mb-3">${escapeHtml(dream.desc || 'Tidak ada deskripsi')}</p>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-primary">🎯 ${dream.year} tahun lagi</span>
              ${dream.budget > 0 ? `<span class="badge bg-success">💰 ${formatNumberRp(dream.budget)}</span>` : ''}
            </div>
            <div class="mb-2">
              <div class="d-flex justify-content-between small">
                <span>Terkumpul: ${formatNumberRp(dream.savedAmount || 0)}</span>
                <span>${dream.budget > 0 ? Math.round((dream.savedAmount / dream.budget) * 100) : 0}%</span>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar bg-success" style="width: ${dream.budget > 0 ? Math.min(100, (dream.savedAmount / dream.budget) * 100) : 0}%"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0">
            <button class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Tutup</button>
            <button class="btn btn-success rounded-pill" onclick="window.openFundingModal('${id}'); document.getElementById('dreamDetailModal')?.remove();">Update Tabungan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('dreamDetailModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  new bootstrap.Modal(document.getElementById('dreamDetailModal')).show();
}

export function editDreamFromDetail() {
  if (currentDreamId) {
    openDreamModal(currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
    if (modal) modal.hide();
  }
}

export async function deleteDreamFromDetail() {
  if (currentDreamId) {
    await deleteDreamFromCard(currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
    if (modal) modal.hide();
  }
}

export function openDreamModal(editId = null) {
  const data = window.masterData || masterData;
  
  // Remove existing modal first
  const existingModal = document.getElementById('dreamModal');
  if (existingModal) existingModal.remove();
  
  const modalHtml = `
    <div class="modal fade" id="dreamModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-primary text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-star-fill me-2"></i>${editId ? 'Edit Mimpi' : 'Tambah Mimpi Baru'}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" style="max-height: 70vh; overflow-y: auto;">
            <input type="hidden" id="dreamEditId" value="${editId || ''}">
            
            <div class="mb-3">
              <label class="form-label fw-semibold">🎯 Judul Mimpi <span class="text-danger">*</span></label>
              <input type="text" id="dreamTitle" class="form-control rounded-3" placeholder="Contoh: Punya Rumah Impian">
            </div>
            
            <div class="mb-3">
              <label class="form-label fw-semibold">📝 Cerita / Rincian</label>
              <textarea id="dreamDesc" class="form-control rounded-3" rows="3" placeholder="Ceritakan mimpi ini..."></textarea>
            </div>
            
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold">📅 Target (tahun lagi)</label>
                <select id="dreamYear" class="form-select rounded-3">
                  <option value="1">1 tahun lagi</option>
                  <option value="2">2 tahun lagi</option>
                  <option value="3">3 tahun lagi</option>
                  <option value="4">4 tahun lagi</option>
                  <option value="5">5 tahun lagi</option>
                  <option value="6">6 tahun lagi</option>
                  <option value="7">7 tahun lagi</option>
                  <option value="8">8 tahun lagi</option>
                  <option value="9">9 tahun lagi</option>
                  <option value="10">10 tahun lagi</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">💰 Estimasi Budget</label>
                <div class="input-group">
                  <span class="input-group-text">Rp</span>
                  <input type="text" id="dreamBudget" class="form-control rounded-3" placeholder="0" inputmode="numeric">
                </div>
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label fw-semibold">💵 Uang yang Sudah Terkumpul</label>
              <div class="input-group">
                <span class="input-group-text">Rp</span>
                <input type="text" id="dreamSavedAmount" class="form-control rounded-3" placeholder="0" inputmode="numeric">
              </div>
              <small class="text-muted">Catat tabungan yang sudah disiapkan untuk mimpi ini</small>
            </div>
            
            <div class="mb-3">
              <label class="form-label fw-semibold">🖼️ Gambar (opsional)</label>
              <input type="file" id="dreamImage" accept="image/*" class="form-control rounded-3">
              <small class="text-muted">Upload gambar representasi mimpi (max 1MB)</small>
              <div id="dreamImagePreview" class="mt-2" style="display:none">
                <img id="dreamImagePreviewImg" style="max-width: 100%; max-height: 120px; border-radius: 12px;">
              </div>
            </div>
            
            <div class="form-check">
              <input type="checkbox" id="dreamIsAchieved" class="form-check-input">
              <label class="form-check-label">✅ Tandai sudah tercapai</label>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4">
            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button type="button" onclick="window.saveDream()" class="btn btn-primary rounded-pill px-4">
              <i class="bi bi-save me-2"></i>Simpan Mimpi
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Format currency inputs
  const budgetInput = document.getElementById('dreamBudget');
  const savedInput = document.getElementById('dreamSavedAmount');
  
  if (budgetInput) {
    budgetInput.addEventListener('input', function(e) {
      let value = this.value.replace(/\./g, '');
      if (!isNaN(value) && value !== '') {
        this.value = formatNumberInput(parseInt(value));
      }
    });
  }
  
  if (savedInput) {
    savedInput.addEventListener('input', function(e) {
      let value = this.value.replace(/\./g, '');
      if (!isNaN(value) && value !== '') {
        this.value = formatNumberInput(parseInt(value));
      }
    });
  }
  
  // If editing, populate data
  if (editId && data?.dreams?.[editId]) {
    const dream = data.dreams[editId];
    document.getElementById('dreamTitle').value = dream.title;
    document.getElementById('dreamDesc').value = dream.desc || '';
    document.getElementById('dreamYear').value = dream.year || 1;
    if (budgetInput) budgetInput.value = formatNumberInput(dream.budget || 0);
    if (savedInput) savedInput.value = formatNumberInput(dream.savedAmount || 0);
    document.getElementById('dreamIsAchieved').checked = dream.isAchieved || false;
    
    if (dream.image) {
      const preview = document.getElementById('dreamImagePreview');
      const previewImg = document.getElementById('dreamImagePreviewImg');
      if (preview && previewImg) {
        previewImg.src = dream.image;
        preview.style.display = 'block';
      }
    }
  }
  
  // Image preview
  const imageInput = document.getElementById('dreamImage');
  if (imageInput) {
    imageInput.addEventListener('change', function(input) {
      const preview = document.getElementById('dreamImagePreview');
      const previewImg = document.getElementById('dreamImagePreviewImg');
      if (input.target.files && input.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(input.target.files[0]);
      }
    });
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dreamModal'));
  modal.show();
}

function closeDreamModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('dreamModal'));
  if (modal) modal.hide();
}

// ============ GOALS FUNCTIONS (tetap sama) ============
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
  
  const existingModal = document.getElementById('goalModal');
  if (existingModal) existingModal.remove();
  
  const modalHtml = `
    <div class="modal fade" id="goalModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-success text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i>${editId ? 'Edit Goal' : 'Tambah Goal'}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <input type="hidden" id="goalEditId" value="${editId || ''}">
            <div class="mb-3">
              <label class="form-label fw-semibold">🎯 Goal <span class="text-danger">*</span></label>
              <input type="text" id="goalText" class="form-control rounded-3" placeholder="Contoh: Beli rumah pertama">
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">📅 Target Tahun ke-</label>
              <select id="goalYear" class="form-select rounded-3">
                <option value="1">Tahun 1</option>
                <option value="2">Tahun 2</option>
                <option value="3">Tahun 3</option>
                <option value="4">Tahun 4</option>
                <option value="5">Tahun 5</option>
              </select>
            </div>
            <div class="form-check">
              <input type="checkbox" id="goalDone" class="form-check-input">
              <label class="form-check-label">✅ Sudah tercapai</label>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4">
            <button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button onclick="window.saveGoal()" class="btn btn-success rounded-pill px-4">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  if (editId && data?.goals?.[editId]) {
    const goal = data.goals[editId];
    document.getElementById('goalText').value = goal.text;
    document.getElementById('goalYear').value = goal.year;
    document.getElementById('goalDone').checked = goal.isDone;
  } else if (presetYear) {
    document.getElementById('goalYear').value = presetYear;
  }
  
  const modal = new bootstrap.Modal(document.getElementById('goalModal'));
  modal.show();
}

export async function deleteGoal(goalId) {
  const modalHtml = `
    <div class="modal fade" id="confirmDeleteGoalModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-danger text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Konfirmasi Hapus</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4 text-center">
            <i class="bi bi-trash3-fill text-danger fs-1 mb-3 d-block"></i>
            <p>Yakin ingin menghapus goal ini?</p>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4 justify-content-center gap-3">
            <button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button id="confirmDeleteGoalBtn" class="btn btn-danger rounded-pill px-4">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('confirmDeleteGoalModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteGoalModal'));
  modal.show();
  
  document.getElementById('confirmDeleteGoalBtn').onclick = async () => {
    await remove(ref(db, `data/goals/${goalId}`));
    await refreshData();
    renderTimelineGoals();
    showNotif('🗑️ Goal dihapus');
    modal.hide();
  };
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
  
  const existingModal = document.getElementById('bucketModal');
  if (existingModal) existingModal.remove();
  
  const modalHtml = `
    <div class="modal fade" id="bucketModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-info text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-bucket me-2"></i>${editId ? 'Edit Bucket List' : 'Tambah Bucket List'}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <input type="hidden" id="bucketEditId" value="${editId || ''}">
            <div class="mb-3">
              <label class="form-label fw-semibold">✨ Yang ingin dilakukan <span class="text-danger">*</span></label>
              <input type="text" id="bucketText" class="form-control rounded-3" placeholder="Contoh: Liburan ke Jepang">
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">🏷️ Kategori</label>
              <select id="bucketCategory" class="form-select rounded-3">
                <option value="travel">✈️ Travel</option>
                <option value="adventure">🧗 Adventure</option>
                <option value="romance">💕 Romance</option>
                <option value="milestone">🏆 Milestone</option>
                <option value="fun">🎉 Fun</option>
              </select>
            </div>
            <div class="form-check">
              <input type="checkbox" id="bucketDone" class="form-check-input">
              <label class="form-check-label">✅ Sudah terlaksana</label>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4">
            <button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button onclick="window.saveBucketItem()" class="btn btn-info rounded-pill px-4 text-white">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  if (editId && data?.buckets?.[editId]) {
    const bucket = data.buckets[editId];
    document.getElementById('bucketText').value = bucket.text;
    document.getElementById('bucketCategory').value = bucket.category;
    document.getElementById('bucketDone').checked = bucket.isDone;
  }
  
  const modal = new bootstrap.Modal(document.getElementById('bucketModal'));
  modal.show();
}

export async function deleteBucketItem(bucketId) {
  const modalHtml = `
    <div class="modal fade" id="confirmDeleteBucketModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-danger text-white py-3">
            <h5 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Konfirmasi Hapus</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4 text-center">
            <i class="bi bi-trash3-fill text-danger fs-1 mb-3 d-block"></i>
            <p>Yakin ingin menghapus item ini?</p>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4 justify-content-center gap-3">
            <button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button id="confirmDeleteBucketBtn" class="btn btn-danger rounded-pill px-4">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('confirmDeleteBucketModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteBucketModal'));
  modal.show();
  
  document.getElementById('confirmDeleteBucketBtn').onclick = async () => {
    await remove(ref(db, `data/buckets/${bucketId}`));
    await refreshData();
    renderBucketList();
    showNotif('🗑️ Item dihapus');
    modal.hide();
  };
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
window.deleteDreamFromCard = deleteDreamFromCard;
window.renderDreamBoard = renderDreamBoard;
window.openFundingModal = openFundingModal;
window.confirmUpdateFunding = confirmUpdateFunding;
window.updateDreamSavedAmount = updateDreamSavedAmount;

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
