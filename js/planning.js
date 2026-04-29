// js/planning.js - Full Optimized Version
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, escapeHtml, formatNumberRp, privacyHidden, debounce, truncateText } from './utils.js';

// Template items untuk setiap kategori
const categoryTemplates = {
  "💍 Lamaran": [
    { text: "💍 Cincin lamaran", estimatedBudget: 5000000 },
    { text: "📅 Tentukan tanggal lamaran", estimatedBudget: 0 },
    { text: "🏨 Booking venue/restoran", estimatedBudget: 3000000 },
    { text: "📸 Sewa fotografer/videografer", estimatedBudget: 2500000 },
    { text: "💐 Dekorasi dan bunga", estimatedBudget: 1500000 },
    { text: "🍽️ Katering snack", estimatedBudget: 1000000 },
    { text: "👗 Busana lamaran", estimatedBudget: 2000000 },
    { text: "🎁 Seserahan", estimatedBudget: 3000000 }
  ],
  "💍 Menikah": [
    { text: "📅 Tentukan tanggal pernikahan", estimatedBudget: 0 },
    { text: "📝 Urus dokumen KUA", estimatedBudget: 500000 },
    { text: "🏨 Booking gedung pernikahan", estimatedBudget: 15000000 },
    { text: "💄 MUA (Makeup Artist)", estimatedBudget: 3500000 },
    { text: "👗 Busana pengantin", estimatedBudget: 5000000 },
    { text: "📸 Dokumentasi & prewedding", estimatedBudget: 8000000 },
    { text: "💐 Dekorasi pelaminan", estimatedBudget: 5000000 },
    { text: "🍽️ Katering resepsi", estimatedBudget: 20000000 },
    { text: "🎤 MC & Entertainment", estimatedBudget: 3000000 },
    { text: "📨 Undangan pernikahan", estimatedBudget: 2000000 },
    { text: "💍 Cincin kawin", estimatedBudget: 5000000 },
    { text: "✈️ Honeymoon", estimatedBudget: 10000000 }
  ],
  "✈️ Liburan": [
    { text: "📍 Tentukan destinasi", estimatedBudget: 0 },
    { text: "📅 Tentukan tanggal", estimatedBudget: 0 },
    { text: "✈️ Booking tiket pesawat", estimatedBudget: 3000000 },
    { text: "🏨 Booking hotel", estimatedBudget: 4000000 },
    { text: "🗺️ Buat itinerary", estimatedBudget: 0 },
    { text: "💰 Siapkan budget", estimatedBudget: 5000000 },
    { text: "🧳 Siapkan barang", estimatedBudget: 1000000 },
    { text: "🛂 Urus paspor/visa", estimatedBudget: 1000000 }
  ]
};

// Cache untuk DOM elements
let domCache = new Map();

function getEl(id) {
  if (domCache.has(id)) return domCache.get(id);
  const el = document.getElementById(id);
  domCache.set(id, el);
  return el;
}

// ============ TEMPLATE FUNCTIONS ============
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
      description: "",
      estimatedBudget: item.estimatedBudget,
      actualBudget: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  showNotif(`✅ Template berhasil ditambahkan!`);
  if (window.renderAll) window.renderAll();
}

export function confirmAddTemplate(category) {
  showCustomConfirm(
    `Tambahkan template ${category}?\n\nAkan menambahkan ${categoryTemplates[category]?.length || 0} item rencana.`,
    () => addTemplateToCategory(category)
  );
}

function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById('customConfirmModal');
  const messageEl = document.getElementById('customConfirmMessage');
  const okBtn = document.getElementById('customConfirmOkBtn');
  const titleEl = document.getElementById('customConfirmTitle');
  
  if (!modal || !messageEl || !okBtn) {
    if (confirm(message)) onConfirm();
    return;
  }
  
  if (titleEl) titleEl.innerText = 'Konfirmasi';
  messageEl.innerText = message;
  modal.style.display = 'flex';
  
  const handleConfirm = () => {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', handleConfirm);
    onConfirm();
  };
  
  okBtn.addEventListener('click', handleConfirm, { once: true });
}

// ============ CRUD FUNCTIONS ============
export async function savePlan() {
  const text = getEl("planText")?.value.trim();
  if (!text) { showNotif("❌ Nama rencana harus diisi!", true); return; }
  
  const cat = getEl("planCat")?.value;
  const targetDate = getEl("planTargetDate")?.value;
  const description = getEl("planDesc")?.value || "";
  const estimatedBudget = parseInt(getEl("planBudget")?.value) || 0;
  
  await push(ref(db, "data/plans"), {
    text, cat, targetDate: targetDate || null,
    progress: 0, done: false, sub: {},
    description: description,
    estimatedBudget: estimatedBudget,
    actualBudget: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  showNotif("✅ Rencana berhasil ditambahkan!");
  
  const modal = bootstrap.Modal.getInstance(getEl("addPlanModal"));
  if (modal) modal.hide();
  
  // Reset form
  if (getEl("planText")) getEl("planText").value = "";
  if (getEl("planTargetDate")) getEl("planTargetDate").value = "";
  if (getEl("planDesc")) getEl("planDesc").value = "";
  if (getEl("planBudget")) getEl("planBudget").value = "";
  
  if (window.renderAll) window.renderAll();
}

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

// ============ RENDER FUNCTIONS ============
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
    const countEl = getEl(config.id.replace("Plans", "Count"));
    if (countEl) countEl.innerText = catPlans.length;
  }
  
  for (const [cat, config] of Object.entries(categories)) {
    const container = getEl(config.id);
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
     data-plan-id="${id}" 
     data-target-date="${p.targetDate || ''}">
            <div class="card-body p-3">
              <!-- Header -->
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
                    <li><a class="dropdown-item" onclick="window.togglePlan('${id}', ${isDone})">
                      <i class="bi bi-check-circle me-2"></i>${isDone ? 'Batal Selesai' : 'Tandai Selesai'}
                    </a></li>
                    <li><a class="dropdown-item" onclick="window.openEditPlan('${id}')">
                      <i class="bi bi-pencil me-2"></i>Edit
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" onclick="window.deletePlanItemById('${id}')">
                      <i class="bi bi-trash me-2"></i>Hapus
                    </a></li>
                  </ul>
                </div>
              </div>
              
              <!-- Progress Bar -->
              <div class="mt-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-muted">Progress</span>
                  <span class="fw-semibold ${currentProgress >= 100 ? 'text-success' : 'text-primary'}">${currentProgress}%</span>
                </div>
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar ${currentProgress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${currentProgress}%"></div>
                </div>
              </div>
              
              <!-- Budget Info -->
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
                    <div class="progress mt-1" style="height: 3px;">
                      <div class="progress-bar ${budgetUsed > 100 ? 'bg-danger' : 'bg-info'}" style="width: ${Math.min(100, budgetUsed)}%"></div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              <!-- Target Date -->
              ${p.targetDate ? `
                <div class="mt-2 small text-muted">
                  <i class="bi bi-calendar"></i> 
                  ${daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} hari lagi` : `${Math.abs(daysLeft)} hari terlambat`) : ''}
                </div>
              ` : ''}
              
              <!-- Checklist Summary -->
              ${p.sub && Object.keys(p.sub).length > 0 ? `
                <div class="mt-2">
                  <div class="d-flex justify-content-between small text-muted">
                    <span><i class="bi bi-list-check"></i> Checklist</span>
                    <span>${Object.values(p.sub).filter(s => s.done).length}/${Object.keys(p.sub).length}</span>
                  </div>
                </div>
              ` : ''}
              
              <!-- Action Buttons -->
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary flex-grow-1 rounded-pill" onclick="window.addSubPlanWithDetails('${id}')">
                  <i class="bi bi-plus-circle"></i> Checklist
                </button>
                <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="window.addBudgetToPlan('${id}', ${p.estimatedBudget || 0}, ${p.actualBudget || 0})">
                  <i class="bi bi-cash-stack"></i> Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ============ SUB PLAN FUNCTIONS ============
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

export async function addSubPlan() {
  const pid = getEl("editPlanId")?.value;
  const text = getEl("newSubText")?.value.trim();
  if (!text) { showNotif("❌ Isi checklist", true); return; }
  
  await push(ref(db, `data/plans/${pid}/sub`), { 
    text, 
    done: false, 
    estimatedCost: 0, 
    actualCost: 0,
    createdAt: Date.now()
  });
  if (getEl("newSubText")) getEl("newSubText").value = "";
  showNotif("✅ Checklist ditambahkan");
  if (pid) await updateParentProgress(pid);
  if (window.renderAll) window.renderAll();
}

// ============ EDIT & DELETE FUNCTIONS ============
export async function updatePlan() {
  const id = getEl("editPlanId")?.value;
  const text = getEl("editPlanText")?.value.trim();
  
  if (!text) { 
    showNotif("❌ Nama rencana harus diisi!", true); 
    return; 
  }
  
  const cat = getEl("editPlanCat")?.value;
  const targetDate = getEl("editPlanTargetDate")?.value;
  const description = getEl("editPlanDesc")?.value;
  const budget = parseInt(getEl("editPlanBudget")?.value) || 0;
  const priority = getEl("editPlanPriority")?.value;
  const isUrgent = getEl("editPlanIsUrgent")?.checked || false;
  
  await update(ref(db, `data/plans/${id}`), { 
    text, 
    cat, 
    targetDate: targetDate || null, 
    description: description || "",
    estimatedBudget: budget,
    priority: priority || "medium",
    isUrgent: isUrgent,
    updatedAt: Date.now()
  });
  
  showNotif("✅ Rencana berhasil diupdate");
  
  const modal = bootstrap.Modal.getInstance(getEl("planModal"));
  if (modal) modal.hide();
  
  if (window.renderAll) window.renderAll();
}

export async function deletePlanItem() {
  const { id, pid } = window.currentDeletePlanId || {};
  if (!id) return;
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await remove(ref(db, path));
  showNotif("🗑️ Rencana dihapus");
  
  const modal = bootstrap.Modal.getInstance(getEl("planModal"));
  if (modal) modal.hide();
  if (window.renderAll) window.renderAll();
}

function renderSubPlansList(pid, subs) {
  const container = getEl("subPlansList");
  if (!container) return;
  
  if (!subs || Object.keys(subs).length === 0) {
    container.innerHTML = '<p class="text-muted small mb-0">Belum ada subtugas</p>';
    return;
  }
  
  container.innerHTML = Object.entries(subs).map(([sid, s]) => `
    <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-3">
      <div class="form-check flex-grow-1">
        <input class="form-check-input" type="checkbox" ${s.done ? 'checked' : ''} 
               onchange="window.toggleSubPlanCheckbox('${pid}', '${sid}', ${s.done})">
        <label class="form-check-label ${s.done ? 'text-decoration-line-through text-muted' : ''}">
          ${escapeHtml(truncateText(s.text, 40))}
        </label>
        ${s.estimatedCost > 0 ? `<span class="badge bg-secondary bg-opacity-10 ms-2">Rp ${s.estimatedCost.toLocaleString()}</span>` : ''}
      </div>
      <i class="bi bi-trash text-danger small" style="cursor: pointer;" 
         onclick="window.deleteSubPlan('${pid}', '${sid}')"></i>
    </div>
  `).join('');
}

export function openEditPlan(id, pid = null) {
  const data = window.masterData || masterData;
  const plan = pid ? data?.plans?.[pid]?.sub?.[id] : data?.plans?.[id];
  if (!plan) return;
  
  if (getEl("editPlanId")) getEl("editPlanId").value = id;
  if (getEl("editPlanParentId")) getEl("editPlanParentId").value = pid || "";
  if (getEl("editPlanText")) getEl("editPlanText").value = plan.text;
  if (getEl("editPlanCat")) getEl("editPlanCat").value = plan.cat || "💍 Menikah";
  if (getEl("editPlanTargetDate")) getEl("editPlanTargetDate").value = plan.targetDate || "";
  if (getEl("editPlanDesc")) getEl("editPlanDesc").value = plan.description || "";
  if (getEl("editPlanBudget")) getEl("editPlanBudget").value = plan.estimatedBudget || 0;
  if (getEl("editPlanPriority")) getEl("editPlanPriority").value = plan.priority || "medium";
  if (getEl("editPlanIsUrgent")) getEl("editPlanIsUrgent").checked = plan.isUrgent || false;
  
  window.currentDeletePlanId = { id, pid };
  
  if (!pid && plan.sub && Object.keys(plan.sub).length > 0) {
    renderSubPlansList(id, plan.sub);
  } else {
    const subPlansList = getEl("subPlansList");
    if (subPlansList) subPlansList.innerHTML = "";
  }
  
  const modalEl = getEl("planModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

export function deletePlanItemById(id) {
  window.confirmDelete("plans", id);
}

export async function deleteSubPlan(pid, sid) {
  await remove(ref(db, `data/plans/${pid}/sub/${sid}`));
  await updateParentProgress(pid);
  showNotif("🗑️ Item dihapus");
  if (window.renderAll) window.renderAll();
}

// ============ FILTER FUNCTIONS ============
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

// ============ EXPORTS ============
window.renderBoardPlans = renderBoardPlans;
window.deleteSubPlan = deleteSubPlan;
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.toggleSubPlanCheckbox = toggleSubPlanCheckbox;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.addTemplateToCategory = addTemplateToCategory;
window.confirmAddTemplate = confirmAddTemplate;
window.addSubPlanWithDetails = addSubPlanWithDetails;
window.addBudgetToPlan = addBudgetToPlan;
window.initPlanFilter = initPlanFilter;
