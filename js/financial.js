// js/financial.js - Fixed version (removed manual target creation)
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml, setMasterData, privacyHidden, formatDateLong } from './utils.js';

let editFinanceId = null;

// Get all unique plan categories from existing plans
export function getPlanCategories() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const categories = new Set();
  
  Object.values(plans).forEach(plan => {
    if (plan.planCategory && plan.planCategory !== 'default' && plan.planCategory !== 'undefined') {
      categories.add(plan.planCategory);
    }
  });
  
  return Array.from(categories);
}

// Get category icon mapping
function getCategoryIcon(category) {
  const icons = {
    'Cincin': '💍',
    'MUA': '💄',
    'Fotografi': '📸',
    'Venue': '🏨',
    'Dekorasi': '💐',
    'Katering': '🍽️',
    'Busana': '👗',
    'Entertainment': '🎤',
    'Dokumen': '📋',
    'Transport': '🚗'
  };
  return icons[category] || '📦';
}

// Validate if plan exists for category
export function validatePlanExistsForCategory(planCategory) {
  if (!planCategory || planCategory === 'Lainnya') return true;
  
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  
  const hasPlan = Object.values(plans).some(plan => 
    plan.planCategory === planCategory && plan.progress < 100
  );
  
  if (!hasPlan) {
    const hasAnyPlan = Object.values(plans).some(plan => plan.planCategory === planCategory);
    if (hasAnyPlan) {
      showNotif(`⚠️ Rencana untuk "${planCategory}" sudah selesai. Buat rencana baru jika ingin menambah tabungan!`, true);
    } else {
      showNotif(`❌ Belum ada rencana untuk "${planCategory}". Silakan buat rencana dulu di menu Rencana!`, true);
    }
    return false;
  }
  
  return true;
}

// Update plan progress based on savings
async function updatePlanProgressFromSavings() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const finances = data?.finances || {};
  
  const savingsByCategory = {};
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.planCategory && f.planCategory !== 'Lainnya') {
      savingsByCategory[f.planCategory] = (savingsByCategory[f.planCategory] || 0) + f.amt;
    }
  });
  
  for (const [planId, plan] of Object.entries(plans)) {
    if (plan.estimatedBudget > 0 && plan.progress < 100 && plan.planCategory) {
      const savedForCategory = savingsByCategory[plan.planCategory] || 0;
      let newProgress = Math.min(100, Math.round((savedForCategory / plan.estimatedBudget) * 100));
      
      if (newProgress !== plan.progress) {
        await update(ref(db, `data/plans/${planId}`), {
          progress: newProgress,
          done: newProgress >= 100,
          updatedAt: Date.now()
        });
      }
    }
  }
}

// Save transaction
export async function saveFinance() {
  const desc = document.getElementById("fDesc")?.value.trim();
  const amt = parseInt(document.getElementById("fAmt")?.value);
  const date = document.getElementById("fDate")?.value;
  const planCategory = document.getElementById("fPlanCategory")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!desc) { showNotif("❌ Keterangan harus diisi", true); return; }
  if (isNaN(amt) || amt <= 0) { showNotif("❌ Nominal harus lebih dari 0", true); return; }
  if (!date) { showNotif("❌ Tanggal harus dipilih", true); return; }
  
  if (planCategory && planCategory !== 'Lainnya') {
    const isValid = validatePlanExistsForCategory(planCategory);
    if (!isValid) return;
  }
  
  if (editFinanceId) {
    await update(ref(db, `data/finances/${editFinanceId}`), { date, desc, amt, type: 'wedding', planCategory });
    showNotif("✅ Tabungan berhasil diupdate");
    editFinanceId = null;
    const btnSave = document.getElementById("btnSaveFinance");
    if (btnSave) btnSave.innerHTML = "<i class='bi bi-save me-1'></i> Catat";
  } else {
    await push(ref(db, "data/finances"), { 
      user: currentUser, 
      date, 
      desc, 
      amt, 
      type: 'wedding',
      planCategory: planCategory || 'Lainnya'
    });
    showNotif(`💰 Tabungan ${formatNumberRp(amt)} berhasil dicatat!`);
  }
  
  await updatePlanProgressFromSavings();
  await refreshData();
  
  const fDesc = document.getElementById("fDesc");
  const fAmt = document.getElementById("fAmt");
  if (fDesc) fDesc.value = "";
  if (fAmt) fAmt.value = "";
  
  if (window.renderAll) window.renderAll();
  if (window.loadSavingTargets) window.loadSavingTargets();
  renderFinances();
  updateSavingsSummary();
}

// Render category dropdown
export function renderFinancialCategoryDropdown() {
  const container = document.getElementById("planCategoryContainer");
  if (!container) return;
  
  const categories = getPlanCategories();
  
  if (categories.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning small mb-0">
        <i class="bi bi-exclamation-triangle me-1"></i>
        Belum ada rencana. <a href="#" onclick="window.showPage('planning'); return false;">Buat rencana</a> dulu sebelum mencatat tabungan!
      </div>
      <input type="hidden" id="fPlanCategory" value="Lainnya">
    `;
    return;
  }
  
  container.innerHTML = `
    <label class="form-label small fw-semibold mb-1">📂 Kategori Rencana <span class="text-danger">*</span></label>
    <select id="fPlanCategory" class="form-select" required>
      <option value="">Pilih kategori rencana...</option>
      ${categories.map(cat => `<option value="${cat}">${getCategoryIcon(cat)} ${cat}</option>`).join('')}
      <option value="Lainnya">📦 Lainnya (tanpa rencana)</option>
    </select>
    <small class="text-muted">Pilih kategori sesuai rencana yang sudah dibuat. Tabungan akan otomatis mempengaruhi progress rencana.</small>
  `;
}

// Render category filter dropdown
export function renderCategoryFilterDropdown() {
  const container = document.getElementById("categoryFilterContainer");
  if (!container) return;
  
  const categories = getPlanCategories();
  
  container.innerHTML = `
    <select id="financeCategoryFilter" class="form-select form-select-sm" style="width: auto;" onchange="window.renderFinances()">
      <option value="all">Semua Kategori</option>
      ${categories.map(cat => `<option value="${cat}">${getCategoryIcon(cat)} ${cat}</option>`).join('')}
      <option value="Lainnya">📦 Lainnya</option>
    </select>
  `;
}

// Render finances table
export function renderFinances() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const tbody = document.getElementById("fTable");
  if (!tbody) return;
  
  const filterVal = document.getElementById("financeFilter")?.value || "all";
  const categoryFilter = document.getElementById("financeCategoryFilter")?.value || "all";
  const finances = data.finances ? Object.entries(data.finances) : [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  let filtered = finances.filter(([id, f]) => f.type === 'wedding');
  
  if (filterVal === 'thisMonth') {
    filtered = filtered.filter(([id, f]) => f.date?.substring(0, 7) === currentMonth);
  } else if (filterVal === 'lastMonth') {
    filtered = filtered.filter(([id, f]) => f.date?.substring(0, 7) === lastMonthStr);
  }
  
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(([id, f]) => (f.planCategory || 'Lainnya') === categoryFilter);
  }
  
  const formatWithPrivacy = (val) => privacyHidden ? "●●● ●●●" : formatNumberRp(val);
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Belum ada data tabungan</td></tr>`;
  } else {
    tbody.innerHTML = filtered.sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
      .map(([id, f]) => `
        <tr>
          <td><span class="badge ${f.user === "FACHMI" ? "badge-fachmi" : "badge-azizah"}">${escapeHtml(f.user)}</span></td>
          <td class="text-nowrap">${formatDateShort(f.date)}</td>
          <td class="text-wrap">${escapeHtml(f.desc)}</td>
          <td><span class="badge bg-secondary">${getCategoryIcon(f.planCategory)} ${escapeHtml(f.planCategory || 'Lainnya')}</span></td>
          <td class="fw-semibold text-success text-nowrap">${formatWithPrivacy(f.amt)}</td>
          <td class="text-nowrap">
            <i class="bi bi-pencil-square text-primary me-2" onclick="window.editFinance('${id}')" style="cursor: pointer;"></i>
            <i class="bi bi-trash3 text-danger" onclick="window.deleteItem('finances','${id}')" style="cursor: pointer;"></i>
          </td>
        </tr>
      `).join("");
  }
  
  updateSavingsSummary();
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  return dateStr;
}

function updateSavingsSummary() {
  const data = window.masterData || masterData;
  const finances = data?.finances || {};
  let total = 0, fachmi = 0, azizah = 0;
  const categoryTotals = {};
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding') {
      total += f.amt;
      if (f.user === 'FACHMI') fachmi += f.amt;
      else if (f.user === 'AZIZAH') azizah += f.amt;
      const cat = f.planCategory || 'Lainnya';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + f.amt;
    }
  });
  
  const formatVal = (val) => privacyHidden ? "●●● ●●●" : formatNumberRp(val);
  
  const totalEl = document.getElementById('totalWeddingSummary');
  const fachmiEl = document.getElementById('fachmiTotal');
  const azizahEl = document.getElementById('azizahTotal');
  if (totalEl) totalEl.innerHTML = formatVal(total);
  if (fachmiEl) fachmiEl.innerHTML = formatVal(fachmi);
  if (azizahEl) azizahEl.innerHTML = formatVal(azizah);
  
  const breakdownContainer = document.getElementById('categoryBreakdown');
  if (breakdownContainer) {
    if (Object.keys(categoryTotals).length > 0) {
      breakdownContainer.innerHTML = `
        <div class="card border-0 shadow-sm">
          <div class="card-body p-3">
            <h6 class="fw-semibold small mb-2"><i class="bi bi-pie-chart me-1"></i> Breakdown per Kategori:</h6>
            <div class="row g-2">
              ${Object.entries(categoryTotals).map(([cat, amt]) => `
                <div class="col-6 col-md-4 col-lg-3">
                  <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded-3">
                    <span class="small">${getCategoryIcon(cat)} ${cat}</span>
                    <span class="fw-semibold small">${formatVal(amt)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      breakdownContainer.innerHTML = '';
    }
  }
}

async function refreshData() {
  try {
    const snapshot = await get(ref(db, 'data/'));
    const freshData = snapshot.val() || {};
    if (window.setMasterData) window.setMasterData(freshData);
    window.masterData = freshData;
    return freshData;
  } catch (error) {
    console.error("Error refreshing data:", error);
    return null;
  }
}

export function editFinance(id) {
  const data = window.masterData || masterData;
  const f = data?.finances?.[id];
  if (!f) return;
  
  const dateEl = document.getElementById("fDate");
  const descEl = document.getElementById("fDesc");
  const amtEl = document.getElementById("fAmt");
  const catEl = document.getElementById("fPlanCategory");
  const btnSave = document.getElementById("btnSaveFinance");
  
  if (dateEl) dateEl.value = f.date;
  if (descEl) descEl.value = f.desc;
  if (amtEl) amtEl.value = f.amt;
  if (catEl) catEl.value = f.planCategory || 'Lainnya';
  editFinanceId = id;
  if (btnSave) btnSave.innerHTML = "<i class='bi bi-pencil me-1'></i> Update";
  
  document.getElementById('financial-page')?.scrollIntoView({ behavior: 'smooth' });
}

function setDefaultDate() {
  const dateInput = document.getElementById("fDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

export async function initFinancialPage() {
  await refreshData();
  setDefaultDate();
  renderFinancialCategoryDropdown();
  renderCategoryFilterDropdown();
  renderFinances();
  if (window.loadSavingTargets) window.loadSavingTargets();
}

// Saving targets - only display, no manual creation
function calculateTotalInPeriod(startDate, endDate) {
  const data = window.masterData || masterData;
  const finances = data?.finances || {};
  let total = 0;
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date && f.date >= startDate && f.date <= endDate) total += f.amt;
  });
  return total;
}

export async function loadSavingTargets() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const targets = data.settings?.savingTargets || {};
  const container = document.getElementById('savingTargetsList');
  if (!container) return;
  
  const formatVal = (val) => privacyHidden ? "●●● ●●●" : formatNumberRp(val);
  const targetEntries = Object.entries(targets);
  
  if (targetEntries.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
        <p class="mb-0">✨ Belum ada target tabungan</p>
        <small class="text-muted">Target akan otomatis dibuat saat menggunakan AI Recommendation di menu Rencana</small>
      </div>
    `;
    return;
  }
  
  container.innerHTML = targetEntries.map(([id, target]) => {
    const totalSaved = calculateTotalInPeriod(target.startDate, target.endDate);
    const percent = target.amount > 0 ? Math.min(100, (totalSaved / target.amount) * 100) : 0;
    const isAchieved = totalSaved >= target.amount;
    
    return `
      <div class="target-period-card mb-4 p-4 bg-light rounded-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h5 class="fw-bold mb-1"><i class="bi bi-trophy-fill ${isAchieved ? 'text-success' : 'text-warning'} me-2"></i>Target Tabungan</h5>
            ${target.fromAI ? '<span class="badge bg-info">🎯 Dari AI Recommendation</span>' : ''}
            ${target.description ? `<div class="small text-muted mt-1">${target.description}</div>` : ''}
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteSavingTarget('${id}')"><i class="bi bi-trash"></i> Hapus</button>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-4"><div class="text-center p-2 bg-white rounded-3"><small class="text-muted">🎯 Target</small><h4 class="fw-bold text-primary mb-0">${formatVal(target.amount)}</h4></div></div>
          <div class="col-md-4"><div class="text-center p-2 bg-white rounded-3"><small class="text-muted">💰 Terkumpul</small><h4 class="fw-bold ${isAchieved ? 'text-success' : 'text-warning'} mb-0">${formatVal(totalSaved)}</h4></div></div>
          <div class="col-md-4"><div class="text-center p-2 bg-white rounded-3"><small class="text-muted">📊 Progress</small><h4 class="fw-bold mb-0">${Math.round(percent)}%</h4></div></div>
        </div>
        <div class="progress" style="height: 10px;"><div class="progress-bar ${isAchieved ? 'bg-success' : 'bg-primary'}" style="width: ${percent}%"></div></div>
        <div class="mt-3 small text-muted">
          <i class="bi bi-calendar-range me-1"></i> Periode: ${formatDateLong(target.startDate)} - ${formatDateLong(target.endDate)}
        </div>
        ${isAchieved ? '<div class="alert alert-success mt-3 mb-0 py-2"><i class="bi bi-trophy-fill me-1"></i> 🎉 Selamat! Target tabungan telah tercapai! 🎉</div>' : ''}
      </div>
    `;
  }).join('');
}

export async function deleteSavingTarget(id) {
  showCustomConfirm("Yakin ingin menghapus target tabungan ini?", async () => {
    const settingsRef = ref(db, 'data/settings');
    const snapshot = await get(settingsRef);
    const currentSettings = snapshot.val() || {};
    const currentTargets = currentSettings.savingTargets || {};
    delete currentTargets[id];
    await update(ref(db, 'data/settings'), { savingTargets: currentTargets });
    showNotif('✅ Target tabungan dihapus');
    await refreshData();
    loadSavingTargets();
    if (window.renderAll) window.renderAll();
  });
}

// Export ke window
window.saveFinance = saveFinance;
window.editFinance = editFinance;
window.renderFinances = renderFinances;
window.initFinancialPage = initFinancialPage;
window.loadSavingTargets = loadSavingTargets;
window.deleteSavingTarget = deleteSavingTarget;
window.renderFinancialCategoryDropdown = renderFinancialCategoryDropdown;
window.getPlanCategories = getPlanCategories;
window.validatePlanExistsForCategory = validatePlanExistsForCategory;
window.updatePlanProgressFromSavings = updatePlanProgressFromSavings;
