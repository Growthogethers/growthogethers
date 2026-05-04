// js/planning.js - Updated with Windows Explorer/Folder view style

import { db, ref, push, update, remove, get } from './firebase-config.js';
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
    { text: "💰 Siapkan budget perjalanan", estimatedBudget: 5000000, planCategory: "default" },
    { text: "🧳 Siapkan perlengkapan", estimatedBudget: 1000000, planCategory: "default" },
    { text: "🛂 Urus paspor/visa jika perlu", estimatedBudget: 1000000, planCategory: "Dokumen" }
  ]
};

// Check if plan already exists (active, not completed)
export function hasActivePlanInCategory(planCategory) {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  
  for (const [id, plan] of Object.entries(plans)) {
    if (plan.planCategory === planCategory && plan.progress < 100) {
      return true;
    }
  }
  return false;
}

// Check if any active plan exists
export function hasAnyActivePlan() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  
  for (const [id, plan] of Object.entries(plans)) {
    if (plan.progress < 100) {
      return true;
    }
  }
  return false;
}

// Update wedding target based on all plan budgets
export async function updateWeddingTargetFromPlans() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const settings = data?.settings || {};
  const currentWeddingTarget = settings.weddingTarget || 50000000;
  
  let totalPlansBudget = 0;
  for (const [id, plan] of Object.entries(plans)) {
    totalPlansBudget += plan.estimatedBudget || 0;
  }
  
  if (totalPlansBudget > currentWeddingTarget) {
    await update(ref(db, 'data/settings'), { 
      weddingTarget: totalPlansBudget,
      lastUpdatedFromPlans: Date.now()
    });
    console.log(`Wedding target updated from ${formatNumberRp(currentWeddingTarget)} to ${formatNumberRp(totalPlansBudget)}`);
    return totalPlansBudget;
  }
  return currentWeddingTarget;
}

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

// Get all plan categories
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
  
  if (planCategory !== 'default' && hasActivePlanInCategory(planCategory)) {
    showNotif(`❌ Rencana untuk kategori "${planCategory}" sudah ada! Selesaikan dulu sebelum membuat baru.`, true);
    return;
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
    
    const newTarget = await updateWeddingTargetFromPlans();
    showNotif(`✅ Rencana berhasil ditambahkan! Total target pernikahan: ${formatNumberRp(newTarget)}`);
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("addPlanManualModal"));
    if (modal) modal.hide();
    
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
    if (window.loadSavingTargets) window.loadSavingTargets();
    
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
  
  const existingCategories = new Set();
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  
  for (const [id, plan] of Object.entries(plans)) {
    if (plan.planCategory && plan.planCategory !== 'default' && plan.progress < 100) {
      existingCategories.add(plan.planCategory);
    }
  }
  
  const templateCategories = templates.map(t => t.planCategory).filter(c => c !== 'default');
  const conflicts = templateCategories.filter(cat => existingCategories.has(cat));
  
  if (conflicts.length > 0) {
    showNotif(`❌ Template mengandung kategori yang sudah ada: ${conflicts.join(', ')}. Selesaikan rencana tersebut dulu!`, true);
    return;
  }
  
  showNotif(`📋 Menambahkan template ${category}...`, false);
  let totalBudget = 0;
  
  for (const item of templates) {
    totalBudget += item.estimatedBudget;
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
  
  const newTarget = await updateWeddingTargetFromPlans();
  
  showNotif(`✅ Template ${category} berhasil ditambahkan! Total budget: ${formatNumberRp(totalBudget)}. Target pernikahan: ${formatNumberRp(newTarget)}`);
  if (window.renderAll) window.renderAll();
  if (window.renderFinances) window.renderFinances();
  if (window.loadSavingTargets) window.loadSavingTargets();
}

export function confirmAddTemplate(category) {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const activePlansCount = Object.values(plans).filter(p => p.progress < 100).length;
  
  if (activePlansCount > 0) {
    showNotif(`⚠️ Anda sudah memiliki ${activePlansCount} rencana aktif. Selesaikan dulu sebelum menambah template!`, true);
    return;
  }
  
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
  
  const oldBudget = masterData?.plans?.[id]?.estimatedBudget || 0;
  
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
  
  await update(ref(db, `data/plans/${id}`), updateData);
  
  if (budget !== oldBudget) {
    await updateWeddingTargetFromPlans();
  }
  
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
  
  if (!pid) {
    await updateWeddingTargetFromPlans();
  }
  
  showNotif("🗑️ Rencana dihapus");
  
  const modal = bootstrap.Modal.getInstance(document.getElementById("planModal"));
  if (modal) modal.hide();
  if (window.renderAll) window.renderAll();
}

export function deletePlanItemById(id) {
  showCustomConfirm("Yakin ingin menghapus rencana ini?", async () => {
    await remove(ref(db, `data/plans/${id}`));
    await updateWeddingTargetFromPlans();
    showNotif("🗑️ Rencana dihapus");
    if (window.renderAll) window.renderAll();
    if (window.loadSavingTargets) window.loadSavingTargets();
  });
}

// Toggle plan completion
export async function togglePlan(id, currentStatus) {
  const newStatus = !currentStatus;
  const progress = newStatus ? 100 : 0;
  
  await update(ref(db, `data/plans/${id}`), { 
    done: newStatus,
    progress: progress,
    updatedAt: Date.now()
  });
  
  if (newStatus) {
    showNotif("✅ Rencana selesai! Target tabungan tetap terhitung.");
  } else {
    showNotif("⏸️ Rencana dibatalkan");
  }
  
  if (window.renderAll) window.renderAll();
  if (window.loadSavingTargets) window.loadSavingTargets();
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
    await updateWeddingTargetFromPlans();
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
  
  if (editPlanId) editPlanId.value = id;
  if (editPlanParentId) editPlanParentId.value = pid || "";
  if (editPlanText) editPlanText.value = plan.text;
  if (editPlanCat) editPlanCat.value = plan.cat || "💍 Menikah";
  if (editPlanTargetDate) editPlanTargetDate.value = plan.targetDate || "";
  if (editPlanDesc) editPlanDesc.value = plan.description || "";
  if (editPlanBudget) editPlanBudget.value = plan.estimatedBudget || 0;
  if (editPlanPriority) editPlanPriority.value = plan.priority || "medium";
  if (editPlanIsUrgent) editPlanIsUrgent.checked = plan.isUrgent || false;
  
  const subPlansList = document.getElementById("subPlansList");
  if (subPlansList && plan.sub) {
    const subs = Object.entries(plan.sub);
    if (subs.length > 0) {
      subPlansList.innerHTML = `
        <ul class="list-group list-group-flush">
          ${subs.map(([sid, sub]) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       ${sub.done ? 'checked' : ''} 
                       onchange="window.toggleSubPlanCheckbox('${pid || id}', '${sid}', ${sub.done})">
                <label class="form-check-label ${sub.done ? 'text-decoration-line-through' : ''}">
                  ${escapeHtml(sub.text)}
                </label>
                ${sub.estimatedCost > 0 ? `<small class="text-muted ms-2">(${formatNumberRp(sub.estimatedCost)})</small>` : ''}
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="window.deleteSubPlan('${pid || id}', '${sid}')">
                <i class="bi bi-trash"></i>
              </button>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      subPlansList.innerHTML = '<p class="text-muted small mb-0">Belum ada checklist</p>';
    }
  }
  
  window.currentDeletePlanId = { id, pid };
  
  const modalEl = document.getElementById("planModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

// ============ NEW: WINDOWS EXPLORER / FOLDER VIEW FOR PLANNING ============

// Render board plans with Folder/List view (like Windows Explorer)
export function renderBoardPlans(plansMap) {
  const categories = {
    "💍 Menikah": { 
      id: "menikahPlans", 
      color: "danger", 
      icon: "bi-heart-fill",
      folderIcon: "📁",
      bgColor: "#fef2f2"
    },
    "💍 Lamaran": { 
      id: "lamaranPlans", 
      color: "info", 
      icon: "bi-gem-fill",
      folderIcon: "📂",
      bgColor: "#eff6ff"
    },
    "✈️ Liburan": { 
      id: "liburanPlans", 
      color: "warning", 
      icon: "bi-airplane-fill",
      folderIcon: "🗂️",
      bgColor: "#fffbeb"
    }
  };
  
  const formatWithPrivacy = (value) => {
    if (privacyHidden) return "●●● ●●●";
    return formatNumberRp(value);
  };
  
  // Update counts in folder headers
  for (const [cat, config] of Object.entries(categories)) {
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    const countEl = document.getElementById(config.id.replace("Plans", "Count"));
    if (countEl) countEl.innerText = catPlans.length;
  }
  
  // Render each category as a folder
  for (const [cat, config] of Object.entries(categories)) {
    const container = document.getElementById(config.id);
    if (!container) continue;
    
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    
    if (catPlans.length === 0) {
      // Empty folder
      container.innerHTML = `
        <div class="folder-empty-state" style="padding: 24px; text-align: center; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border-light);">
          <i class="bi ${config.icon} fs-2 text-muted"></i>
          <p class="text-muted mt-2 mb-0">Folder kosong</p>
          <button class="btn btn-sm btn-outline-${config.color} mt-2 rounded-pill" onclick="window.confirmAddTemplate('${cat}')">
            <i class="bi bi-magic me-1"></i>Gunakan Template
          </button>
        </div>
      `;
      continue;
    }
    
    // Render as list view (like Windows Explorer)
    container.innerHTML = `
      <div class="folder-list-view">
        <!-- List header -->
        <div class="list-header" style="display: grid; grid-template-columns: 40px 1fr 100px 120px 100px 80px; gap: 12px; padding: 10px 16px; background: var(--bg-light); border-radius: 8px; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--text-muted);">
          <div></div>
          <div>Nama Rencana</div>
          <div>Progress</div>
          <div>Budget</div>
          <div>Deadline</div>
          <div>Aksi</div>
        </div>
        
        <!-- List items -->
        <div class="list-items">
          ${catPlans.map(([id, p]) => {
            const currentProgress = p.sub && Object.keys(p.sub).length > 0 
              ? calculateProgressFromSubs(p.sub)
              : (p.progress || 0);
            
            const isDone = currentProgress >= 100;
            const budgetUsed = p.estimatedBudget > 0 ? Math.round(((p.actualBudget || 0) / p.estimatedBudget) * 100) : 0;
            const daysLeft = p.targetDate ? Math.ceil((new Date(p.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            
            const fileIcon = isDone ? '✅' : '📄';
            const statusColor = isDone ? '#10b981' : currentProgress > 0 ? '#6366f1' : '#64748b';
            
            return `
              <div class="list-item" data-plan-id="${id}" data-target-date="${p.targetDate || ''}" 
                   style="display: grid; grid-template-columns: 40px 1fr 100px 120px 100px 80px; gap: 12px; align-items: center; padding: 12px 16px; background: var(--card-bg); border-bottom: 1px solid var(--border-light); transition: background 0.2s; cursor: pointer;"
                   onmouseenter="this.style.backgroundColor='var(--bg-light)'" 
                   onmouseleave="this.style.backgroundColor=''"
                   onclick="event.stopPropagation(); window.openEditPlan('${id}')">
                
                <!-- Icon -->
                <div style="font-size: 20px;">${fileIcon}</div>
                
                <!-- Name -->
                <div>
                  <div class="fw-semibold" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
                    ${escapeHtml(truncateText(p.text, 50))}
                  </div>
                  ${p.description ? `<div class="small text-muted">${escapeHtml(truncateText(p.description, 40))}</div>` : ''}
                </div>
                
                <!-- Progress -->
                <div>
                  <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height: 6px; width: 60px;">
                      <div class="progress-bar ${currentProgress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${currentProgress}%"></div>
                    </div>
                    <span class="small fw-semibold" style="color: ${statusColor}">${currentProgress}%</span>
                  </div>
                </div>
                
                <!-- Budget -->
                <div>
                  ${p.estimatedBudget > 0 ? `
                    <span class="small fw-semibold">${formatWithPrivacy(p.estimatedBudget)}</span>
                    ${p.actualBudget > 0 ? `
                      <div class="small ${budgetUsed > 100 ? 'text-danger' : 'text-success'}">
                        terpakai: ${formatWithPrivacy(p.actualBudget)}
                      </div>
                    ` : ''}
                  ` : '<span class="text-muted small">-</span>'}
                </div>
                
                <!-- Deadline -->
                <div class="small">
                  ${p.targetDate ? `
                    <span class="${daysLeft !== null ? (daysLeft < 0 ? 'text-danger' : daysLeft < 7 ? 'text-warning' : 'text-muted') : ''}">
                      <i class="bi bi-calendar"></i> ${formatDateShort(p.targetDate)}
                    </span>
                    ${daysLeft !== null ? `<div class="small ${daysLeft < 0 ? 'text-danger' : 'text-muted'}">${daysLeft >= 0 ? `${daysLeft} hari lagi` : `terlambat ${Math.abs(daysLeft)} hari`}</div>` : ''}
                  ` : '<span class="text-muted">-</span>'}
                </div>
                
                <!-- Actions -->
                <div class="d-flex gap-2" onclick="event.stopPropagation()">
                  <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="window.togglePlan('${id}', ${isDone})" title="${isDone ? 'Batalkan selesai' : 'Tandai selesai'}">
                    <i class="bi ${isDone ? 'bi-arrow-counterclockwise' : 'bi-check-circle'}"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="window.deletePlanItemById('${id}')" title="Hapus">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// Helper for date formatting
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
  }
  return dateStr;
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
window.getPlanCategories = getPlanCategories;
window.updatePlanProgressFromSavings = updatePlanProgressFromSavings;
window.getFinancialCategoryFromPlan = getFinancialCategoryFromPlan;
window.hasActivePlanInCategory = hasActivePlanInCategory;
window.hasAnyActivePlan = hasAnyActivePlan;
window.updateWeddingTargetFromPlans = updateWeddingTargetFromPlans;
