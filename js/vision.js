// js/vision.js - Dream Board Version (Hanya Mimpi Bareng - Tanpa Goals & Bucket List)

import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml, privacyHidden, setMasterData } from './utils.js';

// ============ STATE ============
let currentDreamId = null;
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
  const freshData = snapshot.val() || { dreams: {}, plans: {}, finances: {}, settings: {}, comments: {}, likes: {}, moments: {} };
  if (window.setMasterData) window.setMasterData(freshData);
  window.masterData = freshData;
  return freshData;
}

function formatNumberInput(value) {
  if (!value || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumberInput(value) {
  if (!value) return 0;
  return parseInt(value.replace(/\./g, '')) || 0;
}

// ============ DREAM FUNCTIONS ============
async function saveDreamFunction() {
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
    showNotif('❌ Judul mimpi harus diisi!', true);
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
      showNotif('✅ Mimpi berhasil diupdate!');
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
    showNotif('❌ Gagal menyimpan mimpi', true);
  }
}

async function updateDreamSavedAmountFunction(dreamId, newAmount) {
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

function openFundingModalFunction(dreamId) {
  currentFundingModalDreamId = dreamId;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[dreamId];
  if (!dream) return;
  
  const modalHtml = `
    <div class="modal fade" id="fundingModalNew" tabindex="-1" data-bs-backdrop="static">
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
                <input type="text" id="fundingAmountInputNew" class="form-control" placeholder="Masukkan nominal" inputmode="numeric" value="${formatNumberInput(dream.savedAmount || 0)}">
              </div>
              <small class="text-muted">Target: ${formatNumberRp(dream.budget)}</small>
            </div>
            <div class="progress mb-3" style="height: 8px;">
              <div id="fundingProgressBarNew" class="progress-bar bg-success" style="width: ${dream.budget > 0 ? Math.min(100, (dream.savedAmount / dream.budget) * 100) : 0}%"></div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 pb-4">
            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Batal</button>
            <button type="button" id="confirmFundingBtnNew" class="btn btn-success rounded-pill px-4">
              <i class="bi bi-save me-2"></i>Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('fundingModalNew');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const amountInput = document.getElementById('fundingAmountInputNew');
  const progressBar = document.getElementById('fundingProgressBarNew');
  
  if (amountInput) {
    amountInput.addEventListener('input', function(e) {
      let value = this.value.replace(/\./g, '');
      if (!isNaN(value) && value !== '') {
        const numValue = parseInt(value);
        this.value = formatNumberInput(numValue);
        const percent = dream.budget > 0 ? Math.min(100, (numValue / dream.budget) * 100) : 0;
        if (progressBar) progressBar.style.width = `${percent}%`;
      } else if (value === '') {
        if (progressBar) progressBar.style.width = '0%';
      }
    });
  }
  
  const confirmBtn = document.getElementById('confirmFundingBtnNew');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const amountValue = document.getElementById('fundingAmountInputNew')?.value || '0';
      const rawAmount = parseNumberInput(amountValue);
      updateDreamSavedAmountFunction(dreamId, rawAmount);
      const modal = bootstrap.Modal.getInstance(document.getElementById('fundingModalNew'));
      if (modal) modal.hide();
    };
  }
  
  const modal = new bootstrap.Modal(document.getElementById('fundingModalNew'));
  modal.show();
  
  document.getElementById('fundingModalNew').addEventListener('hidden.bs.modal', function() {
    const modalEl = document.getElementById('fundingModalNew');
    if (modalEl) modalEl.remove();
  });
}

function confirmUpdateFundingFunction() {
  console.log('confirmUpdateFunding called - using new funding modal flow');
  if (currentFundingModalDreamId) {
    openFundingModalFunction(currentFundingModalDreamId);
  }
}

async function deleteDreamFromCardFunction(dreamId) {
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
  
  document.getElementById('confirmDeleteDreamModal').addEventListener('hidden.bs.modal', function() {
    const modalEl = document.getElementById('confirmDeleteDreamModal');
    if (modalEl) modalEl.remove();
  });
  
  document.getElementById('confirmDeleteDreamBtn').onclick = async () => {
    await remove(ref(db, `data/dreams/${dreamId}`));
    await refreshData();
    renderDreamBoard();
    showNotif('🗑️ Mimpi dihapus');
    modal.hide();
  };
}

function renderDreamBoardFunction() {
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
            
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                <i class="bi bi-calendar-range me-1"></i> ${d.year} tahun lagi
              </span>
              ${d.budget > 0 ? `
                <span class="badge bg-success bg-opacity-10 text-success px-3 py-2">
                  <i class="bi bi-cash-stack me-1"></i> ${formatBudget(d.budget)}
                </span>
              ` : ''}
            </div>
            
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
            
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-success flex-grow-1 rounded-pill" onclick="window.openFundingModal('${id}')">
                <i class="bi bi-cash-stack me-1"></i>Catat Tabungan
              </button>
            </div>
            
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

function viewDreamDetailFunction(id) {
  currentDreamId = id;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[id];
  if (!dream) return;
  
  const formatBudget = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  
  const modalHtml = `
    <div class="modal fade" id="dreamDetailModalNew" tabindex="-1">
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
              ${dream.budget > 0 ? `<span class="badge bg-success">💰 ${formatBudget(dream.budget)}</span>` : ''}
            </div>
            <div class="mb-2">
              <div class="d-flex justify-content-between small">
                <span>Terkumpul: ${formatBudget(dream.savedAmount || 0)}</span>
                <span>${dream.budget > 0 ? Math.round((dream.savedAmount / dream.budget) * 100) : 0}%</span>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar bg-success" style="width: ${dream.budget > 0 ? Math.min(100, (dream.savedAmount / dream.budget) * 100) : 0}%"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0">
            <button class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Tutup</button>
            <button class="btn btn-success rounded-pill" onclick="window.openFundingModal('${id}'); document.getElementById('dreamDetailModalNew')?.remove();">Update Tabungan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('dreamDetailModalNew');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = new bootstrap.Modal(document.getElementById('dreamDetailModalNew'));
  modal.show();
  
  document.getElementById('dreamDetailModalNew').addEventListener('hidden.bs.modal', function() {
    const modalEl = document.getElementById('dreamDetailModalNew');
    if (modalEl) modalEl.remove();
  });
}

function editDreamFromDetailFunction() {
  if (currentDreamId) {
    openDreamModalFunction(currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModalNew'));
    if (modal) modal.hide();
  }
}

async function deleteDreamFromDetailFunction() {
  if (currentDreamId) {
    await deleteDreamFromCardFunction(currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModalNew'));
    if (modal) modal.hide();
  }
}

function openDreamModalFunction(editId = null) {
  const data = window.masterData || masterData;
  
  const existingModal = document.getElementById('dreamModalNew');
  if (existingModal) existingModal.remove();
  
  const modalHtml = `
    <div class="modal fade" id="dreamModalNew" tabindex="-1" data-bs-backdrop="static">
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
            <button type="button" id="saveDreamBtn" class="btn btn-primary rounded-pill px-4">
              <i class="bi bi-save me-2"></i>Simpan Mimpi
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const budgetInput = document.getElementById('dreamBudget');
  const savedInput = document.getElementById('dreamSavedAmount');
  
  const formatCurrencyInput = (input) => {
    if (input) {
      input.addEventListener('input', function(e) {
        let value = this.value.replace(/\./g, '');
        if (!isNaN(value) && value !== '' && value !== '0') {
          const numValue = parseInt(value);
          this.value = formatNumberInput(numValue);
        } else if (value === '' || value === '0') {
          this.value = '';
        }
      });
    }
  };
  
  formatCurrencyInput(budgetInput);
  formatCurrencyInput(savedInput);
  
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
  
  const saveBtn = document.getElementById('saveDreamBtn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      saveDreamFunction();
    };
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dreamModalNew'));
  modal.show();
  
  document.getElementById('dreamModalNew').addEventListener('hidden.bs.modal', function() {
    const modalEl = document.getElementById('dreamModalNew');
    if (modalEl) modalEl.remove();
  });
}

function closeDreamModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('dreamModalNew'));
  if (modal) modal.hide();
}

function initDreamBoardFunction() {
  renderDreamBoardFunction();
}

// Preview image function for window
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

// ============ EXPOSE FUNCTIONS TO WINDOW ============
window.saveDream = saveDreamFunction;
window.openDreamModal = openDreamModalFunction;
window.viewDreamDetail = viewDreamDetailFunction;
window.editDreamFromDetail = editDreamFromDetailFunction;
window.deleteDreamFromDetail = deleteDreamFromDetailFunction;
window.deleteDreamFromCard = deleteDreamFromCardFunction;
window.renderDreamBoard = renderDreamBoardFunction;
window.openFundingModal = openFundingModalFunction;
window.confirmUpdateFunding = confirmUpdateFundingFunction;
window.updateDreamSavedAmount = updateDreamSavedAmountFunction;
window.initDreamBoard = initDreamBoardFunction;

// ============ EXPORTS FOR MODULE ============
export const saveDream = saveDreamFunction;
export const openDreamModal = openDreamModalFunction;
export const viewDreamDetail = viewDreamDetailFunction;
export const editDreamFromDetail = editDreamFromDetailFunction;
export const deleteDreamFromDetail = deleteDreamFromDetailFunction;
export const deleteDreamFromCard = deleteDreamFromCardFunction;
export const renderDreamBoard = renderDreamBoardFunction;
export const openFundingModal = openFundingModalFunction;
export const confirmUpdateFunding = confirmUpdateFundingFunction;
export const updateDreamSavedAmount = updateDreamSavedAmountFunction;
export const initDreamBoard = initDreamBoardFunction;
