// FILE BARU: js/integration-planning-vendor.js
// Menghubungkan Planning, Vendor, dan Countdown

import { db, ref, update, get } from './firebase-config.js';
import { showNotif, formatNumberRp, masterData } from './utils.js';

// ============ 1. ASSIGN VENDOR KE RENCANA ============
// Menambahkan tombol "Assign Vendor" di card rencana

export function addVendorAssignmentToPlans() {
  // Fungsi ini akan dipanggil saat render planning
  // Menambahkan dropdown vendor di setiap plan card
  
  const planCards = document.querySelectorAll('.plan-card');
  planCards.forEach(card => {
    const planId = card.dataset.planId;
    if (!planId) return;
    
    // Cek apakah sudah ada tombol assign vendor
    if (card.querySelector('.vendor-assign-btn')) return;
    
    const actionButtons = card.querySelector('.d-flex.gap-2');
    if (!actionButtons) return;
    
    const assignedVendorId = getAssignedVendorForPlan(planId);
    const vendor = getVendorById(assignedVendorId);
    
    const vendorBtn = document.createElement('button');
    vendorBtn.className = `btn btn-sm ${vendor ? 'btn-success' : 'btn-outline-secondary'} rounded-pill vendor-assign-btn`;
    vendorBtn.innerHTML = vendor ? `<i class="bi bi-building me-1"></i>${vendor.name.substring(0, 15)}` : '<i class="bi bi-building me-1"></i>Assign Vendor';
    vendorBtn.onclick = (e) => {
      e.stopPropagation();
      openVendorSelector(planId);
    };
    
    actionButtons.appendChild(vendorBtn);
  });
}

// Mendapatkan vendor yang terassign ke plan
function getAssignedVendorForPlan(planId) {
  const data = window.masterData || masterData;
  return data?.planVendors?.[planId] || null;
}

// Mendapatkan data vendor by ID
function getVendorById(vendorId) {
  if (!vendorId) return null;
  const data = window.masterData || masterData;
  return data?.vendors?.[vendorId] || null;
}

// Open modal untuk memilih vendor
function openVendorSelector(planId) {
  const data = window.masterData || masterData;
  const vendors = data?.vendors || {};
  const currentVendorId = getAssignedVendorForPlan(planId);
  
  // Buat modal dinamis
  const modalHtml = `
    <div class="modal fade" id="vendorSelectorModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-primary text-white">
            <h5 class="fw-bold mb-0"><i class="bi bi-building me-2"></i>Pilih Vendor</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div id="vendorSelectorList" class="mb-3" style="max-height: 400px; overflow-y: auto;">
              ${Object.keys(vendors).length === 0 ? `
                <div class="text-center py-4">
                  <i class="bi bi-shop fs-1 text-muted"></i>
                  <p class="mt-2">Belum ada vendor. <a href="#" onclick="window.openVendorModal(); $('#vendorSelectorModal').modal('hide');">Tambah vendor dulu</a></p>
                </div>
              ` : `
                <div class="list-group">
                  <div class="list-group-item ${!currentVendorId ? 'active' : ''}" style="cursor: pointer;" onclick="selectVendorForPlan('${planId}', null)">
                    <div class="d-flex align-items-center gap-2">
                      <i class="bi bi-ban"></i>
                      <div>
                        <strong>Tidak ada vendor</strong>
                        <small class="d-block text-muted">Hapus assignment vendor</small>
                      </div>
                    </div>
                  </div>
                  ${Object.entries(vendors).map(([vid, v]) => `
                    <div class="list-group-item ${currentVendorId === vid ? 'active' : ''}" style="cursor: pointer;" onclick="selectVendorForPlan('${planId}', '${vid}')">
                      <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-building"></i>
                        <div class="flex-grow-1">
                          <strong>${escapeHtml(v.name)}</strong>
                          <small class="d-block text-muted">${v.category} • ${formatNumberRp(v.dealPrice || v.estimatedPrice || 0)}</small>
                        </div>
                        ${v.isBooked ? '<i class="bi bi-check-circle-fill text-success"></i>' : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Hapus modal lama jika ada
  const existingModal = document.getElementById('vendorSelectorModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('vendorSelectorModal'));
  modal.show();
}

// Simpan assignment vendor ke plan
window.selectVendorForPlan = async (planId, vendorId) => {
  try {
    if (vendorId) {
      await update(ref(db, `data/planVendors/${planId}`), {
        vendorId: vendorId,
        assignedAt: Date.now()
      });
      
      // Update juga di vendor side (list rencana yang menggunakan vendor ini)
      const vendorRef = ref(db, `data/vendors/${vendorId}/assignedPlans`);
      const snapshot = await get(vendorRef);
      const assignedPlans = snapshot.val() || {};
      assignedPlans[planId] = true;
      await update(ref(db, `data/vendors/${vendorId}`), { assignedPlans });
      
      showNotif('✅ Vendor berhasil di-assign ke rencana');
    } else {
      // Hapus assignment
      await update(ref(db, `data/planVendors/${planId}`), null);
      showNotif('🗑️ Assignment vendor dihapus');
    }
    
    // Tutup modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('vendorSelectorModal'));
    if (modal) modal.hide();
    
    // Refresh tampilan
    if (window.renderAll) window.renderAll();
    
  } catch (err) {
    showNotif('❌ Gagal assign vendor: ' + err.message, true);
  }
};

// ============ 2. BUDGET SUMMARY DARI RENCANA & VENDOR ============

export async function calculateTotalWeddingBudget() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const vendors = data?.vendors || {};
  const planVendors = data?.planVendors || {};
  
  let totalEstimated = 0;
  let totalActual = 0;
  let totalFromVendors = 0;
  
  // Hitung dari plans
  Object.values(plans).forEach(plan => {
    totalEstimated += plan.estimatedBudget || 0;
    totalActual += plan.actualBudget || 0;
  });
  
  // Hitung dari vendors yang sudah dideal
  Object.values(vendors).forEach(vendor => {
    if (vendor.dealPrice) {
      totalFromVendors += vendor.dealPrice;
    }
  });
  
  return {
    fromPlans: { estimated: totalEstimated, actual: totalActual },
    fromVendors: totalFromVendors,
    totalEstimated: Math.max(totalEstimated, totalFromVendors),
    totalActual: totalActual
  };
}

// ============ 3. INTEGRASI COUNTDOWN DENGAN RENCANA ============

export function addDeadlineWarningsToPlans() {
  const planCards = document.querySelectorAll('.plan-card');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  planCards.forEach(card => {
    const targetDateStr = card.dataset.targetDate;
    if (!targetDateStr) return;
    
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    // Cek apakah sudah ada warning
    if (card.querySelector('.deadline-warning')) return;
    
    let warningHtml = '';
    let warningClass = '';
    
    if (diffDays < 0) {
      warningHtml = `<div class="deadline-warning mt-2 p-2 bg-danger bg-opacity-10 text-danger rounded-2 small">
        <i class="bi bi-exclamation-triangle-fill me-1"></i>Terlambat ${Math.abs(diffDays)} hari!
      </div>`;
      warningClass = 'border-start border-danger border-3';
    } else if (diffDays <= 7) {
      warningHtml = `<div class="deadline-warning mt-2 p-2 bg-warning bg-opacity-10 text-warning rounded-2 small">
        <i class="bi bi-clock-fill me-1"></i>Tinggal ${diffDays} hari lagi!
      </div>`;
      warningClass = 'border-start border-warning border-3';
    } else if (diffDays <= 30) {
      warningHtml = `<div class="deadline-warning mt-2 p-2 bg-info bg-opacity-10 text-info rounded-2 small">
        <i class="bi bi-calendar-week me-1"></i>${diffDays} hari menuju deadline
      </div>`;
    }
    
    if (warningHtml) {
      const cardBody = card.querySelector('.card-body');
      if (cardBody && !card.querySelector('.deadline-warning')) {
        cardBody.insertAdjacentHTML('beforeend', warningHtml);
        card.classList.add(warningClass);
      }
    }
  });
}

// ============ 4. UPDATE RENDER FUNCTIONS ============

// Override renderBoardPlans untuk menambahkan vendor info dan deadline warning
export const enhancedRenderBoardPlans = (plansMap) => {
  // Panggil render asli dulu
  if (window.originalRenderBoardPlans) {
    window.originalRenderBoardPlans(plansMap);
  } else {
    // Backup original jika belum ada
    window.originalRenderBoardPlans = window.renderBoardPlans;
  }
  
  // Tunggu DOM update, lalu tambahkan integrasi
  setTimeout(() => {
    addVendorAssignmentToPlans();
    addDeadlineWarningsToPlans();
  }, 100);
};

// ============ 5. VENDOR PAGE - TAMPILKAN RENCANA TERKAIT ============

export function showVendorRelatedPlans(vendorId) {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const planVendors = data?.planVendors || {};
  
  // Cari semua plan yang menggunakan vendor ini
  const relatedPlans = [];
  for (const [planId, assignment] of Object.entries(planVendors)) {
    if (assignment.vendorId === vendorId && plans[planId]) {
      relatedPlans.push({ id: planId, ...plans[planId] });
    }
  }
  
  if (relatedPlans.length === 0) return [];
  
  // Tampilkan modal daftar rencana
  const modalHtml = `
    <div class="modal fade" id="vendorPlansModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-info text-white">
            <h5 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i>Rencana Terkait</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="list-group">
              ${relatedPlans.map(plan => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>${escapeHtml(plan.text)}</strong>
                    <br>
                    <small class="text-muted">Progress: ${plan.progress || 0}%</small>
                  </div>
                  <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="window.showPage('planning'); window.scrollToPlan('${plan.id}')">
                    <i class="bi bi-eye"></i> Lihat
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existing = document.getElementById('vendorPlansModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  new bootstrap.Modal(document.getElementById('vendorPlansModal')).show();
  
  return relatedPlans;
}

// Scroll ke plan tertentu
window.scrollToPlan = (planId) => {
  setTimeout(() => {
    const planElement = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
    if (planElement) {
      planElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      planElement.style.transition = 'all 0.3s';
      planElement.style.boxShadow = '0 0 0 3px #6366f1';
      setTimeout(() => {
        planElement.style.boxShadow = '';
      }, 2000);
    }
  }, 300);
};

// ============ 6. UPDATE VENDOR CARD ============

export const enhancedRenderVendors = () => {
  if (window.originalRenderVendors) {
    window.originalRenderVendors();
  } else {
    window.originalRenderVendors = window.renderVendors;
  }
  
  // Tambahkan tombol "Lihat Rencana" di setiap vendor card
  setTimeout(() => {
    const vendorCards = document.querySelectorAll('.vendor-card');
    vendorCards.forEach(card => {
      const vendorId = card.dataset.vendorId;
      if (!vendorId) return;
      
      if (card.querySelector('.view-plans-btn')) return;
      
      const cardBody = card.querySelector('.card-body');
      if (cardBody) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-info rounded-pill w-100 mt-2 view-plans-btn';
        btn.innerHTML = '<i class="bi bi-calendar-check me-1"></i>Lihat Rencana Terkait';
        btn.onclick = (e) => {
          e.stopPropagation();
          showVendorRelatedPlans(vendorId);
        };
        cardBody.appendChild(btn);
      }
    });
  }, 100);
};

// ============ 7. COUNTDOWN WIDGET INTEGRATION ============

export function syncCountdownWithPlans() {
  // Cek semua plan yang target date-nya sama dengan wedding date
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const weddingDate = data?.settings?.weddingDate;
  
  if (!weddingDate) return;
  
  const criticalPlans = [];
  const weddingDateObj = new Date(weddingDate);
  weddingDateObj.setHours(0, 0, 0, 0);
  
  Object.entries(plans).forEach(([id, plan]) => {
    if (plan.targetDate && plan.progress < 100) {
      const planDate = new Date(plan.targetDate);
      planDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((planDate - weddingDateObj) / (1000 * 60 * 60 * 24));
      
      // Plan yang targetnya mendekati wedding date
      if (Math.abs(diffDays) <= 7) {
        criticalPlans.push({ id, ...plan, diffDays });
      }
    }
  });
  
  // Tampilkan warning di countdown widget
  const widget = document.getElementById('countdownWidget');
  if (widget && criticalPlans.length > 0) {
    const warningDiv = widget.querySelector('.countdown-warnings') || (() => {
      const div = document.createElement('div');
      div.className = 'countdown-warnings mt-3';
      widget.querySelector('.text-center').appendChild(div);
      return div;
    })();
    
    warningDiv.innerHTML = `
      <div class="alert alert-warning small p-2 mt-2">
        <i class="bi bi-exclamation-triangle me-1"></i>
        <strong>Pengingat:</strong> ${criticalPlans.length} rencana mendekati hari pernikahan!
        <button class="btn btn-sm btn-link text-warning p-0 ms-2" onclick="window.showCriticalPlans()">Lihat</button>
      </div>
    `;
  }
}

window.showCriticalPlans = () => {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const weddingDate = data?.settings?.weddingDate;
  
  if (!weddingDate) return;
  
  const critical = [];
  const weddingDateObj = new Date(weddingDate);
  
  Object.entries(plans).forEach(([id, plan]) => {
    if (plan.targetDate && plan.progress < 100) {
      const planDate = new Date(plan.targetDate);
      const diffDays = Math.ceil((planDate - weddingDateObj) / (1000 * 60 * 60 * 24));
      if (Math.abs(diffDays) <= 7) {
        critical.push({ id, ...plan, diffDays });
      }
    }
  });
  
  if (critical.length === 0) {
    showNotif('✅ Semua rencana sudah sesuai jadwal!');
    return;
  }
  
  const modalHtml = `
    <div class="modal fade" id="criticalPlansModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-warning">
            <h5 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Rencana Mendekati H-0</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="list-group">
              ${critical.map(plan => `
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>${escapeHtml(plan.text)}</strong>
                      <br>
                      <small class="text-muted">
                        ${plan.diffDays < 0 ? `${Math.abs(plan.diffDays)} hari setelah H-0` : `${plan.diffDays} hari sebelum H-0`}
                      </small>
                    </div>
                    <span class="badge ${plan.progress >= 100 ? 'bg-success' : 'bg-warning'}">${plan.progress || 0}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existing = document.getElementById('criticalPlansModal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  new bootstrap.Modal(document.getElementById('criticalPlansModal')).show();
};

// ============ 8. INITIALIZATION ============

export function initIntegrations() {
  // Override render functions
  window.renderBoardPlans = enhancedRenderBoardPlans;
  window.renderVendors = enhancedRenderVendors;
  
  // Add event listener untuk data changes
  const originalRenderAll = window.renderAll;
  window.renderAll = function() {
    if (originalRenderAll) originalRenderAll();
    setTimeout(() => {
      addVendorAssignmentToPlans();
      addDeadlineWarningsToPlans();
      syncCountdownWithPlans();
    }, 200);
  };
  
  console.log('✅ Integrations: Planning - Vendor - Countdown connected');
}

// Export ke window
window.initIntegrations = initIntegrations;
window.selectVendorForPlan = selectVendorForPlan;
window.showVendorRelatedPlans = showVendorRelatedPlans;
window.calculateTotalWeddingBudget = calculateTotalWeddingBudget;
window.syncCountdownWithPlans = syncCountdownWithPlans;
window.addVendorAssignmentToPlans = addVendorAssignmentToPlans;
window.addDeadlineWarningsToPlans = addDeadlineWarningsToPlans;
