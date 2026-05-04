// js/planning.js - Complete version with all missing functions
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, escapeHtml, formatNumberRp, privacyHidden, showCustomConfirm, truncateText } from './utils.js';

// Category mapping
export const planCategoryToFinancialCategory = {
  'Cincin': '💍 Cincin & Perhiasan',
  'MUA': '💄 MUA & Makeup',
  'Fotografi': '📸 Photography & Videography',
  'Venue': '🏨 Venue / Gedung',
  'Dekorasi': '💐 Dekorasi',
  'Katering': '🍽️ Catering',
  'Busana': '👗 Busana Pengantin',
  'Entertainment': '🎤 Entertainment & MC',
  'Dokumen': '📋 Administrasi',
  'Transport': '🚗 Transportasi',
  'default': '📦 Lainnya'
};

// Template items
const categoryTemplates = {
  "💍 Lamaran": [
    { text: "💍 Cincin lamaran", estimatedBudget: 5000000, planCategory: "Cincin" },
    { text: "📅 Tentukan tanggal lamaran", estimatedBudget: 0, planCategory: "Dokumen" },
    { text: "🏨 Booking venue/restoran", estimatedBudget: 3000000, planCategory: "Venue" },
    { text: "📸 Sewa fotografer/videografer", estimatedBudget: 2500000, planCategory: "Fotografi" },
    { text: "💐 Dekorasi dan bunga", estimatedBudget: 1500000, planCategory: "Dekorasi" },
    { text: "🍽️ Katering snack", estimatedBudget: 1000000, planCategory: "Katering" },
    { text: "👗 Busana lamaran", estimatedBudget: 2000000, planCategory: "Busana" },
    { text: "🎁 Seserahan", estimatedBudget: 3000000, planCategory: "default" }
  ],
  "💍 Menikah": [
    { text: "📅 Tentukan tanggal pernikahan", estimatedBudget: 0, planCategory: "Dokumen" },
    { text: "📝 Urus dokumen KUA", estimatedBudget: 500000, planCategory: "Dokumen" },
    { text: "🏨 Booking gedung pernikahan", estimatedBudget: 15000000, planCategory: "Venue" },
    { text: "💄 MUA (Makeup Artist)", estimatedBudget: 3500000, planCategory: "MUA" },
    { text: "👗 Busana pengantin", estimatedBudget: 5000000, planCategory: "Busana" },
    { text: "📸 Dokumentasi & prewedding", estimatedBudget: 8000000, planCategory: "Fotografi" },
    { text: "💐 Dekorasi pelaminan", estimatedBudget: 5000000, planCategory: "Dekorasi" },
    { text: "🍽️ Katering resepsi", estimatedBudget: 20000000, planCategory: "Katering" },
    { text: "🎤 MC & Entertainment", estimatedBudget: 3000000, planCategory: "Entertainment" },
    { text: "📨 Undangan pernikahan", estimatedBudget: 2000000, planCategory: "default" },
    { text: "💍 Cincin kawin", estimatedBudget: 5000000, planCategory: "Cincin" },
    { text: "✈️ Honeymoon", estimatedBudget: 10000000, planCategory: "Transport" }
  ],
  "✈️ Liburan": [
    { text: "📍 Tentukan destinasi", estimatedBudget: 0, planCategory: "Dokumen" },
    { text: "📅 Tentukan tanggal", estimatedBudget: 0, planCategory: "Dokumen" },
    { text: "✈️ Booking tiket pesawat", estimatedBudget: 3000000, planCategory: "Transport" },
    { text: "🏨 Booking hotel", estimatedBudget: 4000000, planCategory: "Venue" },
    { text: "🗺️ Buat itinerary", estimatedBudget: 0, planCategory: "Dokumen" },
    { text: "💰 Siapkan budget", estimatedBudget: 5000000, planCategory: "default" },
    { text: "🧳 Siapkan barang", estimatedBudget: 1000000, planCategory: "default" },
    { text: "🛂 Urus paspor/visa", estimatedBudget: 1000000, planCategory: "Dokumen" }
  ]
};

// Get financial category from plan
export function getFinancialCategoryFromPlan(plan) {
  if (plan.planCategory && planCategoryToFinancialCategory[plan.planCategory]) {
    return planCategoryToFinancialCategory[plan.planCategory];
  }
  
  const title = plan.text.toLowerCase();
  if (title.includes('cincin')) return '💍 Cincin & Perhiasan';
  if (title.includes('mua') || title.includes('makeup')) return '💄 MUA & Makeup';
  if (title.includes('foto') || title.includes('video')) return '📸 Photography & Videography';
  if (title.includes('venue') || title.includes('gedung')) return '🏨 Venue / Gedung';
  if (title.includes('dekorasi')) return '💐 Dekorasi';
  if (title.includes('katering') || title.includes('makan')) return '🍽️ Catering';
  if (title.includes('busana') || title.includes('baju')) return '👗 Busana Pengantin';
  if (title.includes('mc') || title.includes('hiburan')) return '🎤 Entertainment & MC';
  if (title.includes('dokumen') || title.includes('surat')) return '📋 Administrasi';
  if (title.includes('transport') || title.includes('travel')) return '🚗 Transportasi';
  
  return '📦 Lainnya';
}

// Get all financial categories from plans
export function getFinancialCategoriesFromPlans() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const categories = new Set();
  
  Object.values(plans).forEach(plan => {
    if (plan.planCategory && plan.planCategory !== 'default' && plan.planCategory !== 'undefined') {
      const category = planCategoryToFinancialCategory[plan.planCategory] || plan.planCategory;
      categories.add(category);
    }
  });
  
  return Array.from(categories);
}

// Get all unique plan categories
export function getPlanCategories() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const categories = new Set();
  
  Object.values(plans).forEach(plan => {
    if (plan.planCategory && plan.planCategory !== 'default') {
      categories.add(plan.planCategory);
    }
  });
  
  return Array.from(categories);
}

// Update plan progress based on savings
export async function updatePlanProgressFromSavings() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const finances = data?.finances || {};
  
  // Group savings by category
  const savingsByCategory = {};
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.planCategory && f.planCategory !== 'Lainnya') {
      savingsByCategory[f.planCategory] = (savingsByCategory[f.planCategory] || 0) + f.amt;
    }
  });
  
  // Update each plan's progress
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

// Save plan
export async function savePlan() {
  const text = document.getElementById("planText")?.value.trim();
  if (!text) { 
    showNotif("❌ Nama rencana harus diisi!", true); 
    return; 
  }
  
  const cat = document.getElementById("planCat")?.value || "💍 Menikah";
  const targetDate = document.getElementById("planTargetDate")?.value;
  const description = document.getElementById("planDesc")?.value || "";
  const estimatedBudget = parseInt(document.getElementById("planBudget")?.value) || 0;
  const planCategorySelect = document.getElementById("planCategory")?.value;
  
  let planCategory = planCategorySelect;
  if (!planCategory || planCategory === '') {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('cincin')) planCategory = 'Cincin';
    else if (lowerText.includes('mua') || lowerText.includes('makeup')) planCategory = 'MUA';
    else if (lowerText.includes('foto')) planCategory = 'Fotografi';
    else if (lowerText.includes('venue')) planCategory = 'Venue';
    else if (lowerText.includes('dekorasi')) planCategory = 'Dekorasi';
    else if (lowerText.includes('katering')) planCategory = 'Katering';
    else if (lowerText.includes('busana')) planCategory = 'Busana';
    else if (lowerText.includes('mc') || lowerText.includes('entertainment')) planCategory = 'Entertainment';
    else planCategory = 'default';
  }
  
  try {
    await push(ref(db, "data/plans"), {
      text: text,
      cat: cat,
      targetDate: targetDate || null,
      progress: 0,
      done: false,
      sub: {},
      description: description,
      estimatedBudget: estimatedBudget,
      actualBudget: 0,
      planCategory: planCategory,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    showNotif("✅ Rencana berhasil ditambahkan!");
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("addPlanManualModal"));
    if (modal) modal.hide();
    
    // Reset form
    const planText = document.getElementById("planText");
    const planTargetDate = document.getElementById("planTargetDate");
    const planDesc = document.getElementById("planDesc");
    const planBudget = document.getElementById("planBudget");
    const planCategoryEl = document.getElementById("planCategory");
    
    if (planText) planText.value = "";
    if (planTargetDate) planTargetDate.value = "";
    if (planDesc) planDesc.value = "";
    if (planBudget) planBudget.value = "";
    if (planCategoryEl) planCategoryEl.value = "";
    
    if (window.renderAll) window.renderAll();
    if (window.renderFinances) window.renderFinances();
    
  } catch (err) {
    console.error("Error saving plan:", err);
    showNotif("❌ Gagal menyimpan rencana: " + err.message, true);
  }
}

// Add template to category
export async function addTemplateToCategory(category) {
  const templates = categoryTemplates[category];
  if (!templates) {
    showNotif("❌ Template tidak ditemukan", true);
    return;
  }
  
  showNotif(`📋 Menambahkan template ${category}...`, false);
  
  for (const item of templates) {
    await push(ref(db, "data/plans"), {
      text: item.text,
      cat: category,
      targetDate: "",
      progress: 0,
      done: false,
      sub: {},
      description: `${item.text} - Persiapan ${category}`,
      estimatedBudget: item.estimatedBudget,
      actualBudget: 0,
      planCategory: item.planCategory || 'default',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  showNotif(`✅ Template ${category} berhasil ditambahkan!`);
  if (window.renderAll) window.renderAll();
  if (window.renderFinances) window.renderFinances();
}

export function confirmAddTemplate(category) {
  showCustomConfirm(
    `Tambahkan template ${category}?\n\nAkan menambahkan ${categoryTemplates[category]?.length || 0} item rencana.`,
    () => addTemplateToCategory(category)
  );
}

// Update plan
export async function updatePlan() {
  const id = document.getElementById("editPlanId")?.value;
  const text = document.getElementById("editPlanText")?.value.trim();
  
  if (!text) { 
    showNotif("❌ Nama rencana harus diisi!", true); 
    return; 
  }
  
  const cat = document.getElementById("editPlanCat")?.value;
  const targetDate = document.getElementById("editPlanTargetDate")?.value;
  const description = document.getElementById("editPlanDesc")?.value;
  const budget = parseInt(document.getElementById("editPlanBudget")?.value) || 0;
  const priority = document.getElementById("editPlanPriority")?.value;
  const isUrgent = document.getElementById("editPlanIsUrgent")?.checked || false;
  const planCategory = document.getElementById("editPlanCategory")?.value;
  
  const updateData = { 
    text, 
    cat, 
    targetDate: targetDate || null, 
    description: description || "",
    estimatedBudget: budget,
    priority: priority || "medium",
    isUrgent: isUrgent,
    updatedAt: Date.now()
  };
  
  if (planCategory && planCategory !== 'auto') {
    updateData.planCategory = planCategory;
  }
  
  await update(ref(db, `data/plans/${id}`), updateData);
  
  showNotif("✅ Rencana berhasil diupdate");
  
  const modal = bootstrap.Modal.getInstance(document.getElementById("planModal"));
  if (modal) modal.hide();
  
  if (window.renderAll) window.renderAll();
  if (window.renderFinances) window.renderFinances();
}

// Delete plan
export async function deletePlanItem() {
  const { id, pid } = window.currentDeletePlanId || {};
  if (!id) return;
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await remove(ref(db, path));
  showNotif("🗑️ Rencana dihapus");
  
  const modal = bootstrap.Modal.getInstance(document.getElementById("planModal"));
  if (modal) modal.hide();
  if (window.renderAll) window.renderAll();
}

export function deletePlanItemById(id) {
  window.confirmDelete("plans", id);
}

// Sub plan functions
function calculateProgressFromSubs(subs) {
  if (!subs || Object.keys(subs).length === 0) return 0;
  const total = Object.keys(subs).length;
  const completed = Object.values(subs).filter(s => s.done).length;
  return Math.round((completed / total) * 100);
}

async function updateParentProgress(pid) {
  const data = window.masterData || masterData;
  const plan = data?.plans?.[pid];
  if (plan && plan.sub) {
    const newProgress = calculateProgressFromSubs(plan.sub);
    await update(ref(db, `data/plans/${pid}`), { 
      progress: newProgress,
      done: newProgress >= 100,
      updatedAt: Date.now()
    });
    return newProgress;
  }
  return 0;
}

export async function addSubPlan() {
  const pid = document.getElementById("editPlanId")?.value;
  if (!pid) {
    showNotif("❌ ID rencana tidak ditemukan", true);
    return;
  }
  
  const text = document.getElementById("newSubText")?.value.trim();
  if (!text) { 
    showNotif("❌ Isi checklist terlebih dahulu", true); 
    return; 
  }
  
  await push(ref(db, `data/plans/${pid}/sub`), { 
    text: text, 
    done: false, 
    estimatedCost: 0, 
    actualCost: 0,
    createdAt: Date.now()
  });
  
  const newSubText = document.getElementById("newSubText");
  if (newSubText) newSubText.value = "";
  
  showNotif("✅ Checklist ditambahkan");
  await updateParentProgress(pid);
  if (window.renderAll) window.renderAll();
}

export async function addSubPlanWithDetails(pid) {
  const text = prompt("Nama item:", "");
  if (!text || !text.trim()) { showNotif("❌ Nama harus diisi", true); return; }
  
  const estimatedCost = parseInt(prompt("Estimasi biaya (opsional):", "0")) || 0;
  const note = prompt("Catatan:", "");
  
  await push(ref(db, `data/plans/${pid}/sub`), { 
    text: text.trim(), 
    note: note || "",
    estimatedCost: estimatedCost,
    actualCost: 0,
    done: false,
    createdAt: Date.now()
  });
  
  await updateParentProgress(pid);
  
  const data = window.masterData || masterData;
  const plan = data?.plans?.[pid];
  if (plan && plan.sub) {
    let totalEstimated = 0;
    Object.values(plan.sub).forEach(sub => {
      totalEstimated += sub.estimatedCost || 0;
    });
    await update(ref(db, `data/plans/${pid}`), { estimatedBudget: totalEstimated });
  }
  
  showNotif("✅ Item berhasil ditambahkan!");
  if (window.renderAll) window.renderAll();
}

export async function addBudgetToPlan(pid, currentEstimated, currentActual) {
  const newActual = parseInt(prompt(`Catat biaya yang sudah keluar:\nEstimasi: ${formatNumberRp(currentEstimated)}\nTerpakai: ${formatNumberRp(currentActual)}\n\nMasukkan total biaya:`, currentActual)) || 0;
  
  if (newActual >= 0) {
    await update(ref(db, `data/plans/${pid}`), { actualBudget: newActual });
    showNotif(`✅ Biaya diupdate ke ${formatNumberRp(newActual)}`);
    if (window.renderAll) window.renderAll();
  }
}

export async function deleteSubPlan(pid, sid) {
  await remove(ref(db, `data/plans/${pid}/sub/${sid}`));
  await updateParentProgress(pid);
  showNotif("🗑️ Item dihapus");
  if (window.renderAll) window.renderAll();
}

export async function togglePlan(id, status, pid = null) {
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await update(ref(db, path), { done: !status });
  
  if (!pid) {
    const newProgress = !status ? 100 : 0;
    await update(ref(db, `data/plans/${id}`), { progress: newProgress, updatedAt: Date.now() });
  } else {
    await updateParentProgress(pid);
  }
  
  showNotif(!status ? "✅ Selesai!" : "⏸️ Dibatalkan");
  if (window.renderAll) window.renderAll();
}

export async function toggleSubPlanCheckbox(pid, sid, currentStatus) {
  await update(ref(db, `data/plans/${pid}/sub/${sid}`), { done: !currentStatus });
  const newProgress = await updateParentProgress(pid);
  showNotif(!currentStatus ? `✅ Checklist selesai! Progress: ${newProgress}%` : `⏸️ Checklist dibatalkan`);
  if (window.renderAll) window.renderAll();
}

// Open edit plan
export function openEditPlan(id, pid = null) {
  const data = window.masterData || masterData;
  const plan = pid ? data?.plans?.[pid]?.sub?.[id] : data?.plans?.[id];
  if (!plan) return;
  
  const editPlanId = document.getElementById("editPlanId");
  const editPlanParentId = document.getElementById("editPlanParentId");
  const editPlanText = document.getElementById("editPlanText");
  const editPlanCat = document.getElementById("editPlanCat");
  const editPlanTargetDate = document.getElementById("editPlanTargetDate");
  const editPlanDesc = document.getElementById("editPlanDesc");
  const editPlanBudget = document.getElementById("editPlanBudget");
  const editPlanPriority = document.getElementById("editPlanPriority");
  const editPlanIsUrgent = document.getElementById("editPlanIsUrgent");
  const editPlanCategory = document.getElementById("editPlanCategory");
  
  if (editPlanId) editPlanId.value = id;
  if (editPlanParentId) editPlanParentId.value = pid || "";
  if (editPlanText) editPlanText.value = plan.text;
  if (editPlanCat) editPlanCat.value = plan.cat || "💍 Menikah";
  if (editPlanTargetDate) editPlanTargetDate.value = plan.targetDate || "";
  if (editPlanDesc) editPlanDesc.value = plan.description || "";
  if (editPlanBudget) editPlanBudget.value = plan.estimatedBudget || 0;
  if (editPlanPriority) editPlanPriority.value = plan.priority || "medium";
  if (editPlanIsUrgent) editPlanIsUrgent.checked = plan.isUrgent || false;
  if (editPlanCategory && plan.planCategory) editPlanCategory.value = plan.planCategory;
  
  window.currentDeletePlanId = { id, pid };
  
  const modalEl = document.getElementById("planModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

// Render board plans
export function renderBoardPlans(plansMap) {
  const categories = {
    "💍 Menikah": { id: "menikahPlans", color: "danger", icon: "bi-heart-fill" },
    "💍 Lamaran": { id: "lamaranPlans", color: "info", icon: "bi-gem-fill" },
    "✈️ Liburan": { id: "liburanPlans", color: "warning", icon: "bi-airplane-fill" }
  };
  
  const formatWithPrivacy = (value) => {
    if (privacyHidden) return "●●● ●●●";
    return formatNumberRp(value);
  };
  
  // Update counts
  for (const [cat, config] of Object.entries(categories)) {
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    const countEl = document.getElementById(config.id.replace("Plans", "Count"));
    if (countEl) countEl.innerText = catPlans.length;
  }
  
  for (const [cat, config] of Object.entries(categories)) {
    const container = document.getElementById(config.id);
    if (!container) continue;
    
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    
    if (catPlans.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state-card text-center py-5">
            <i class="bi ${config.icon} fs-1 text-muted"></i>
            <p class="text-muted mt-2 mb-0">Belum ada rencana</p>
            <button class="btn btn-sm btn-outline-${config.color} mt-2 rounded-pill" onclick="window.confirmAddTemplate('${cat}')">
              <i class="bi bi-magic me-1"></i>Gunakan Template
            </button>
          </div>
        </div>
      `;
      continue;
    }
    
    container.innerHTML = catPlans.map(([id, p]) => {
      const currentProgress = p.sub && Object.keys(p.sub).length > 0 
        ? calculateProgressFromSubs(p.sub)
        : (p.progress || 0);
      
      const isDone = currentProgress >= 100;
      const budgetUsed = p.estimatedBudget > 0 ? Math.round(((p.actualBudget || 0) / p.estimatedBudget) * 100) : 0;
      const daysLeft = p.targetDate ? Math.ceil((new Date(p.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      
      return `
        <div class="col-md-6 col-lg-4">
          <div class="plan-card card border-0 shadow-sm h-100 ${isDone ? 'border-start border-success border-3' : ''}" 
               data-plan-id="${id}" data-target-date="${p.targetDate || ''}">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <h6 class="fw-bold mb-0 ${isDone ? 'text-decoration-line-through text-muted' : ''}">
                      ${escapeHtml(truncateText(p.text, 40))}
                    </h6>
                    ${isDone ? '<i class="bi bi-check-circle-fill text-success"></i>' : ''}
                  </div>
                  ${p.description ? `<p class="small text-muted mt-1 mb-0">${escapeHtml(truncateText(p.description, 60))}</p>` : ''}
                </div>
                <div class="dropdown">
                  <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" onclick="window.togglePlan('${id}', ${isDone})"><i class="bi bi-check-circle me-2"></i>${isDone ? 'Batal Selesai' : 'Tandai Selesai'}</a></li>
                    <li><a class="dropdown-item" onclick="window.openEditPlan('${id}')"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" onclick="window.deletePlanItemById('${id}')"><i class="bi bi-trash me-2"></i>Hapus</a></li>
                  </ul>
                </div>
              </div>
              
              <div class="mt-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-muted">Progress</span>
                  <span class="fw-semibold ${currentProgress >= 100 ? 'text-success' : 'text-primary'}">${currentProgress}%</span>
                </div>
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar ${currentProgress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${currentProgress}%"></div>
                </div>
              </div>
              
              ${p.estimatedBudget > 0 ? `
                <div class="mt-2 pt-2 border-top">
                  <div class="d-flex justify-content-between small">
                    <span class="text-muted"><i class="bi bi-cash-stack"></i> Budget</span>
                    <span class="fw-semibold">${formatWithPrivacy(p.estimatedBudget)}</span>
                  </div>
                  ${p.actualBudget > 0 ? `
                    <div class="d-flex justify-content-between small mt-1">
                      <span class="text-muted"><i class="bi bi-wallet2"></i> Terpakai</span>
                      <span class="fw-semibold ${budgetUsed > 100 ? 'text-danger' : 'text-success'}">${formatWithPrivacy(p.actualBudget)}</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${p.targetDate ? `<div class="mt-2 small text-muted"><i class="bi bi-calendar"></i> ${daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} hari lagi` : `${Math.abs(daysLeft)} hari terlambat`) : ''}</div>` : ''}
              
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary flex-grow-1 rounded-pill" onclick="window.addSubPlanWithDetails('${id}')"><i class="bi bi-plus-circle"></i> Checklist</button>
                <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="window.addBudgetToPlan('${id}', ${p.estimatedBudget || 0}, ${p.actualBudget || 0})"><i class="bi bi-cash-stack"></i> Budget</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Filter functions
export function initPlanFilter() {
  const filterBtns = document.querySelectorAll('.filter-cat');
  const categories = document.querySelectorAll('.plan-category');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const cat = btn.dataset.cat;
      
      categories.forEach(category => {
        if (cat === 'all') {
          category.style.display = 'block';
        } else {
          const categoryType = category.dataset.category;
          category.style.display = categoryType === cat ? 'block' : 'none';
        }
      });
    });
  });
}

// Export to window
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.togglePlan = togglePlan;
window.toggleSubPlanCheckbox = toggleSubPlanCheckbox;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.addTemplateToCategory = addTemplateToCategory;
window.confirmAddTemplate = confirmAddTemplate;
window.addSubPlanWithDetails = addSubPlanWithDetails;
window.addSubPlan = addSubPlan;
window.addBudgetToPlan = addBudgetToPlan;
window.initPlanFilter = initPlanFilter;
window.renderBoardPlans = renderBoardPlans;
window.deleteSubPlan = deleteSubPlan;
window.getFinancialCategoriesFromPlans = getFinancialCategoriesFromPlans;
window.getPlanCategories = getPlanCategories;
window.updatePlanProgressFromSavings = updatePlanProgressFromSavings;
window.getFinancialCategoryFromPlan = getFinancialCategoryFromPlan;
