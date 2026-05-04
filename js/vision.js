// js/vision.js - Dream Board Version (FIXED FOR content.html)

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
  console.log("Refreshing data from Firebase...");
  try {
    const snapshot = await get(ref(db, 'data/'));
    const freshData = snapshot.val() || { 
      dreams: {}, 
      plans: {}, 
      finances: {}, 
      settings: {}, 
      comments: {}, 
      likes: {}, 
      moments: {} 
    };
    
    console.log("Fresh data - dreams count:", Object.keys(freshData.dreams || {}).length);
    
    if (window.setMasterData) {
      window.setMasterData(freshData);
    }
    window.masterData = freshData;
    
    return freshData;
  } catch (error) {
    console.error("Error refreshing data:", error);
    return null;
  }
}

function formatNumberInput(value) {
  if (!value || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumberInput(value) {
  if (!value) return 0;
  const cleanValue = value.toString().replace(/\./g, '').replace(/,/g, '');
  return parseInt(cleanValue) || 0;
}

// ============ DREAM FUNCTIONS ============
async function saveDreamFunction() {
  console.log("=== saveDreamFunction called ===");
  
  // Use the correct element IDs from content.html
  const editId = document.getElementById('dreamEditId')?.value;
  const title = document.getElementById('dreamTitle')?.value?.trim();
  const desc = document.getElementById('dreamDesc')?.value || '';
  const year = parseInt(document.getElementById('dreamYear')?.value);
  const budgetInput = document.getElementById('dreamBudget')?.value;
  const savedAmountInput = document.getElementById('dreamSavedAmount')?.value;
  const isAchieved = document.getElementById('dreamIsAchieved')?.checked || false;
  const imageFile = document.getElementById('dreamImage')?.files[0];
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  // Log to debug
  console.log("DOM elements found:", {
    dreamEditId: !!document.getElementById('dreamEditId'),
    dreamTitle: !!document.getElementById('dreamTitle'),
    dreamDesc: !!document.getElementById('dreamDesc'),
    dreamYear: !!document.getElementById('dreamYear'),
    dreamBudget: !!document.getElementById('dreamBudget'),
    dreamSavedAmount: !!document.getElementById('dreamSavedAmount'),
    dreamIsAchieved: !!document.getElementById('dreamIsAchieved'),
    dreamImage: !!document.getElementById('dreamImage')
  });
  
  // Parse numbers
  const budget = parseNumberInput(budgetInput || '0');
  const savedAmount = parseNumberInput(savedAmountInput || '0');
  
  console.log("Form data:", { editId, title, year, budget, savedAmount, isAchieved, currentUser });
  
  // Validation
  if (!title) {
    showNotif('❌ Judul mimpi harus diisi!', true);
    return;
  }
  
  if (isNaN(year) || year < 1 || year > 10) {
    showNotif('❌ Target tahun harus antara 1-10 tahun', true);
    return;
  }
  
  if (!currentUser) {
    showNotif('❌ Sesi login tidak ditemukan, silakan login ulang', true);
    return;
  }
  
  // Process image if exists
  let imageData = null;
  if (imageFile) {
    showNotif('📸 Memproses gambar...', false);
    try {
      imageData = await compressImage(imageFile);
      console.log("Image compressed successfully");
    } catch (err) {
      console.error("Image compression error:", err);
      showNotif('❌ Gagal memproses gambar', true);
      return;
    }
  }
  
  // Prepare dream data
  const dreamData = {
    title: title,
    desc: desc || "",
    year: year,
    budget: budget,
    savedAmount: savedAmount,
    isAchieved: isAchieved || (savedAmount >= budget && budget > 0),
    author: currentUser,
    updatedAt: Date.now()
  };
  
  if (imageData) {
    dreamData.image = imageData;
  }
  
  try {
    if (editId) {
      // Update existing dream
      console.log("Updating existing dream:", editId);
      const data = await refreshData();
      dreamData.createdAt = data.dreams?.[editId]?.createdAt || Date.now();
      await update(ref(db, `data/dreams/${editId}`), dreamData);
      showNotif('✅ Mimpi berhasil diupdate!');
    } else {
      // Create new dream
      console.log("Creating new dream");
      dreamData.createdAt = Date.now();
      await push(ref(db, 'data/dreams'), dreamData);
      showNotif('✨ Mimpi baru ditambahkan! ✨');
    }
    
    // Force refresh data from Firebase
    await refreshData();
    
    // Re-render the dream board
    renderDreamBoardFunction();
    
    // Close the modal properly - using the correct modal ID from content.html
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamModal'));
    if (modal) {
      modal.hide();
    }
    
    // Also refresh dashboard if visible
    if (window.renderAll) {
      window.renderAll();
    }
    
    console.log("Dream saved successfully");
    
  } catch (err) {
    console.error("Error saving dream:", err);
    showNotif('❌ Gagal menyimpan mimpi: ' + err.message, true);
  }
}

async function updateDreamSavedAmountFunction(dreamId, newAmount) {
  console.log("=== updateDreamSavedAmountFunction called ===", dreamId, newAmount);
  
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[dreamId];
  if (!dream) {
    showNotif('❌ Mimpi tidak ditemukan', true);
    return;
  }
  
  const parsedAmount = parseInt(newAmount) || 0;
  const isAchieved = parsedAmount >= dream.budget && dream.budget > 0;
  
  try {
    await update(ref(db, `data/dreams/${dreamId}`), { 
      savedAmount: parsedAmount,
      isAchieved: isAchieved,
      updatedAt: Date.now()
    });
    
    await refreshData();
    renderDreamBoardFunction();
    showNotif(isAchieved ? '🎉 Selamat! Mimpi telah tercapai! 🎉' : '💰 Uang terkumpul diperbarui');
    
    if (window.renderAll) {
      window.renderAll();
    }
  } catch (err) {
    console.error("Error updating saved amount:", err);
    showNotif('❌ Gagal memperbarui tabungan', true);
  }
}

function openFundingModalFunction(dreamId) {
  console.log("=== openFundingModalFunction called ===", dreamId);
  currentFundingModalDreamId = dreamId;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[dreamId];
  if (!dream) {
    showNotif('❌ Mimpi tidak ditemukan', true);
    return;
  }
  
  // Update the existing funding modal in content.html
  const fundingDreamTitle = document.getElementById('fundingDreamTitle');
  const fundingAmountInput = document.getElementById('fundingAmountInput');
  const fundingProgressBar = document.getElementById('fundingProgressBar');
  const fundingTargetText = document.getElementById('fundingTargetText');
  
  if (fundingDreamTitle) {
    fundingDreamTitle.innerText = escapeHtml(dream.title);
  }
  
  if (fundingAmountInput) {
    fundingAmountInput.value = formatNumberInput(dream.savedAmount || 0);
    
    // Remove existing event listener and add new one
    fundingAmountInput.removeEventListener('input', fundingInputHandler);
    fundingAmountInput.addEventListener('input', fundingInputHandler);
    
    function fundingInputHandler(e) {
      let value = e.target.value.replace(/\./g, '');
      if (!isNaN(value) && value !== '') {
        const numValue = parseInt(value);
        e.target.value = formatNumberInput(numValue);
        const percent = dream.budget > 0 ? Math.min(100, (numValue / dream.budget) * 100) : 0;
        if (fundingProgressBar) fundingProgressBar.style.width = `${percent}%`;
      } else if (value === '') {
        if (fundingProgressBar) fundingProgressBar.style.width = '0%';
      }
    }
  }
  
  if (fundingProgressBar) {
    const percent = dream.budget > 0 ? Math.min(100, (dream.savedAmount / dream.budget) * 100) : 0;
    fundingProgressBar.style.width = `${percent}%`;
  }
  
  if (fundingTargetText && dream.budget > 0) {
    fundingTargetText.innerText = `Target: ${formatNumberRp(dream.budget)}`;
  }
  
  // Update confirm button handler
  const confirmBtn = document.getElementById('confirmUpdateFundingBtn');
  if (confirmBtn) {
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.onclick = () => {
      const amountValue = document.getElementById('fundingAmountInput')?.value || '0';
      const rawAmount = parseNumberInput(amountValue);
      updateDreamSavedAmountFunction(dreamId, rawAmount);
      const modal = bootstrap.Modal.getInstance(document.getElementById('fundingModal'));
      if (modal) modal.hide();
    };
  }
  
  const modal = new bootstrap.Modal(document.getElementById('fundingModal'));
  modal.show();
}

function confirmUpdateFundingFunction() {
  console.log('confirmUpdateFunding called - using funding modal flow');
  if (currentFundingModalDreamId) {
    openFundingModalFunction(currentFundingModalDreamId);
  }
}

async function deleteDreamFromCardFunction(dreamId) {
  console.log("=== deleteDreamFromCardFunction called ===", dreamId);
  window.confirmDelete("dreams", dreamId);
}

function renderDreamBoardFunction() {
  console.log("=== renderDreamBoardFunction called ===");
  
  const data = window.masterData || masterData;
  if (!data) {
    console.log("No masterData available yet");
    return;
  }
  
  const dreams = data.dreams ? Object.entries(data.dreams) : [];
  const gridContainer = document.getElementById('visionBoardGrid');
  const visionCountEl = document.getElementById('visionCount');
  const visionAchievedEl = document.getElementById('visionAchievedCount');
  
  console.log("Rendering dreams, count:", dreams.length);
  
  if (!gridContainer) {
    console.log("Grid container not found");
    return;
  }
  
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
  
  // Sort dreams by createdAt (newest first)
  const sortedDreams = [...dreams].sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  
  gridContainer.innerHTML = sortedDreams.map(([id, d]) => {
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
  console.log("=== viewDreamDetailFunction called ===", id);
  currentDreamId = id;
  const data = window.masterData || masterData;
  const dream = data?.dreams?.[id];
  if (!dream) {
    showNotif('❌ Mimpi tidak ditemukan', true);
    return;
  }
  
  const formatBudget = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  
  // Update dream detail modal from content.html
  const detailTitle = document.getElementById('dreamDetailTitle');
  const detailImage = document.getElementById('dreamDetailImage');
  const detailDesc = document.getElementById('dreamDetailDesc');
  const detailYear = document.getElementById('dreamDetailYear');
  const detailBudget = document.getElementById('dreamDetailBudget');
  const detailAuthor = document.getElementById('dreamDetailAuthor');
  
  if (detailTitle) detailTitle.innerText = escapeHtml(dream.title);
  if (detailDesc) detailDesc.innerText = escapeHtml(dream.desc || 'Tidak ada deskripsi');
  if (detailYear) detailYear.innerText = `🎯 ${dream.year} tahun lagi`;
  if (detailBudget && dream.budget > 0) detailBudget.innerText = `💰 ${formatBudget(dream.budget)}`;
  if (detailBudget && (!dream.budget || dream.budget === 0)) detailBudget.style.display = 'none';
  if (detailAuthor) detailAuthor.innerText = dream.author || '';
  
  if (detailImage) {
    if (dream.image) {
      detailImage.src = dream.image;
      detailImage.style.display = 'block';
    } else {
      detailImage.style.display = 'none';
    }
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dreamDetailModal'));
  modal.show();
}

function editDreamFromDetailFunction() {
  console.log("=== editDreamFromDetailFunction called ===", currentDreamId);
  if (currentDreamId) {
    openDreamModalFunction(currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
    if (modal) modal.hide();
  }
}

async function deleteDreamFromDetailFunction() {
  console.log("=== deleteDreamFromDetailFunction called ===", currentDreamId);
  if (currentDreamId) {
    window.confirmDelete("dreams", currentDreamId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('dreamDetailModal'));
    if (modal) modal.hide();
  }
}

function openDreamModalFunction(editId = null) {
  console.log("=== openDreamModalFunction called ===", editId);
  
  const data = window.masterData || masterData;
  
  // Reset form
  const editIdField = document.getElementById('dreamEditId');
  const titleField = document.getElementById('dreamTitle');
  const descField = document.getElementById('dreamDesc');
  const yearField = document.getElementById('dreamYear');
  const budgetField = document.getElementById('dreamBudget');
  const savedAmountField = document.getElementById('dreamSavedAmount');
  const isAchievedField = document.getElementById('dreamIsAchieved');
  const imageField = document.getElementById('dreamImage');
  const imagePreview = document.getElementById('dreamImagePreview');
  const imagePreviewImg = document.getElementById('dreamImagePreviewImg');
  
  if (editIdField) editIdField.value = editId || '';
  if (titleField) titleField.value = '';
  if (descField) descField.value = '';
  if (yearField) yearField.value = '1';
  if (budgetField) budgetField.value = '';
  if (savedAmountField) savedAmountField.value = '';
  if (isAchievedField) isAchievedField.checked = false;
  if (imageField) imageField.value = '';
  if (imagePreview) imagePreview.style.display = 'none';
  if (imagePreviewImg) imagePreviewImg.src = '';
  
  if (editId && data?.dreams?.[editId]) {
    const dream = data.dreams[editId];
    if (titleField) titleField.value = dream.title;
    if (descField) descField.value = dream.desc || '';
    if (yearField) yearField.value = dream.year || 1;
    if (budgetField) budgetField.value = formatNumberInput(dream.budget || 0);
    if (savedAmountField) savedAmountField.value = formatNumberInput(dream.savedAmount || 0);
    if (isAchievedField) isAchievedField.checked = dream.isAchieved || false;
    
    if (dream.image && imagePreview && imagePreviewImg) {
      imagePreviewImg.src = dream.image;
      imagePreview.style.display = 'block';
    }
  }
  
  const modal = new bootstrap.Modal(document.getElementById('dreamModal'));
  modal.show();
}

function initDreamBoardFunction() {
  console.log("=== initDreamBoardFunction called ===");
  renderDreamBoardFunction();
}

// Add this function to vision.js
export function previewDreamImage(input) {
  const previewDiv = document.getElementById('dreamImagePreview');
  const previewImg = document.getElementById('dreamImagePreviewImg');
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (previewImg) {
        previewImg.src = e.target.result;
      }
      if (previewDiv) {
        previewDiv.style.display = 'block';
      }
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    if (previewDiv) {
      previewDiv.style.display = 'none';
    }
    if (previewImg) {
      previewImg.src = '';
    }
  }
}

// Export to window
window.previewDreamImage = previewDreamImage;
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
