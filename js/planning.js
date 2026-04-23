// js/planning.js
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, escapeHtml } from './utils.js';

export async function savePlan() {
  const text = document.getElementById("planText")?.value.trim();
  if (!text) { showNotif("❌ Nama rencana harus diisi!", true); return; }
  
  const cat = document.getElementById("planCat")?.value;
  if (!cat) { showNotif("❌ Kategori harus dipilih!", true); return; }
  
  const targetDate = document.getElementById("planTargetDate")?.value;
  
  let prog = parseInt(document.getElementById("planProgress")?.value);
  if (isNaN(prog)) prog = 0;
  prog = Math.min(100, Math.max(0, prog));
  
  const description = document.getElementById("planDesc")?.value || "";
  const budget = parseInt(document.getElementById("planBudget")?.value) || 0;
  const priority = document.getElementById("planPriority")?.value || "medium";
  const isUrgent = document.getElementById("planIsUrgent")?.checked || false;
  
  await push(ref(db, "data/plans"), {
    text, cat, targetDate: targetDate || null,
    progress: prog, done: false, sub: {},
    description: description,
    budget: budget,
    priority: priority,
    isUrgent: isUrgent,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  showNotif("✅ Rencana berhasil ditambahkan!");
  
  const modal = bootstrap.Modal.getInstance(document.getElementById("addPlanModal"));
  if (modal) modal.hide();
  
  const planTextEl = document.getElementById("planText");
  const planTargetDateEl = document.getElementById("planTargetDate");
  const planProgressEl = document.getElementById("planProgress");
  const planDescEl = document.getElementById("planDesc");
  const planBudgetEl = document.getElementById("planBudget");
  const planPriorityEl = document.getElementById("planPriority");
  const planIsUrgentEl = document.getElementById("planIsUrgent");
  
  if (planTextEl) planTextEl.value = "";
  if (planTargetDateEl) planTargetDateEl.value = "";
  if (planProgressEl) planProgressEl.value = "";
  if (planDescEl) planDescEl.value = "";
  if (planBudgetEl) planBudgetEl.value = "";
  if (planPriorityEl) planPriorityEl.value = "medium";
  if (planIsUrgentEl) planIsUrgentEl.checked = false;
  
  if (window.renderAll) window.renderAll();
}

export function renderBoardPlans(plansMap) {
  const categories = {
    "💍 Menikah": { id: "menikahPlans", icon: "bi-heart-fill", color: "primary" },
    "💍 Lamaran": { id: "lamaranPlans", icon: "bi-gem-fill", color: "info" },
    "✈️ Liburan": { id: "liburanPlans", icon: "bi-airplane-fill", color: "warning" }
  };
  
  for (const [cat, config] of Object.entries(categories)) {
    const container = document.getElementById(config.id);
    if (!container) continue;
    
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    
    if (catPlans.length === 0) {
      container.innerHTML = `<div class="text-center text-muted py-4">
        <i class="bi bi-inbox fs-1"></i>
        <p class="mt-2 mb-0">Belum ada rencana</p>
        <small class="text-muted">Klik tombol + untuk menambah</small>
      </div>`;
      continue;
    }
    
    catPlans.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityA = priorityOrder[a[1].priority || "medium"];
      const priorityB = priorityOrder[b[1].priority || "medium"];
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a[1].isUrgent && !b[1].isUrgent) return -1;
      if (!a[1].isUrgent && b[1].isUrgent) return 1;
      return (b[1].progress || 0) - (a[1].progress || 0);
    });
    
    container.innerHTML = catPlans.map(([id, p]) => {
      const priorityBadge = {
        high: '<span class="badge bg-danger me-1">Tinggi</span>',
        medium: '<span class="badge bg-warning text-dark me-1">Sedang</span>',
        low: '<span class="badge bg-success me-1">Rendah</span>'
      }[p.priority || "medium"];
      
      const urgentBadge = p.isUrgent ? '<span class="badge bg-danger-subtle text-danger border border-danger">⚠️ Urgent</span>' : '';
      
      const daysLeft = p.targetDate ? Math.ceil((new Date(p.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      const daysLeftText = daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} hari lagi` : `${Math.abs(daysLeft)} hari terlambat`) : '';
      
      const formatBudget = (budget) => {
        if (!budget || budget === 0) return '';
        return `<div class="text-muted small mt-1"><i class="bi bi-cash-stack"></i> Rp ${budget.toLocaleString()}</div>`;
      };
      
      const isDone = p.progress >= 100;
      
      return `
        <div class="card mb-3 border-0 shadow-sm ${p.isUrgent ? 'border-start border-danger border-4' : ''} ${isDone ? 'bg-success bg-opacity-10' : ''}">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-0 ${isDone ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(p.text)}</h6>
                ${isDone ? '<small class="text-success"><i class="bi bi-check-circle-fill"></i> Selesai</small>' : ''}
              </div>
              <div class="dropdown">
                <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" onclick="window.togglePlan('${id}', ${p.done || isDone})">
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
            
            <div class="d-flex gap-1 mb-2 flex-wrap">
              ${priorityBadge}
              ${urgentBadge}
            </div>
            
            ${p.description ? `<p class="small text-muted mb-2">${escapeHtml(p.description.substring(0, 100))}${p.description.length > 100 ? '...' : ''}</p>` : ''}
            
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar ${p.progress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${p.progress || 0}%"></div>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
              <small class="fw-semibold">Progress ${p.progress || 0}%</small>
              ${p.targetDate ? `<small class="text-muted"><i class="bi bi-calendar"></i> ${daysLeftText}</small>` : ''}
            </div>
            
            ${formatBudget(p.budget)}
            
            ${p.sub && Object.keys(p.sub).length > 0 ? `
              <div class="mt-2 pt-2 border-top">
                <small class="text-muted"><i class="bi bi-list-check"></i> Checklist:</small>
                <div class="small mt-1">
                  ${Object.entries(p.sub).map(([sid, s]) => `
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" ${s.done ? 'checked' : ''} 
                             onclick="window.togglePlan('${sid}', ${s.done}, '${id}')">
                      <label class="form-check-label ${s.done ? 'text-decoration-line-through text-muted' : ''}">
                        ${escapeHtml(s.text)}
                      </label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

export async function updatePlan() {
  const id = document.getElementById("editPlanId")?.value;
  const pid = document.getElementById("editPlanParentId")?.value;
  const text = document.getElementById("editPlanText")?.value.trim();
  if (!text) { showNotif("❌ Nama rencana harus diisi!", true); return; }
  
  const cat = document.getElementById("editPlanCat")?.value;
  const targetDate = document.getElementById("editPlanTargetDate")?.value;
  let prog = parseInt(document.getElementById("editPlanProgress")?.value);
  const description = document.getElementById("editPlanDesc")?.value;
  const budget = parseInt(document.getElementById("editPlanBudget")?.value);
  const priority = document.getElementById("editPlanPriority")?.value;
  const isUrgent = document.getElementById("editPlanIsUrgent")?.checked || false;
  
  if (isNaN(prog)) prog = 0;
  prog = Math.min(100, prog);
  
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await update(ref(db, path), { 
    text, cat, targetDate, progress: prog, 
    description: description || "",
    budget: budget || 0,
    priority: priority || "medium",
    isUrgent: isUrgent,
    updatedAt: Date.now(),
    done: prog >= 100
  });
  showNotif("✅ Rencana berhasil diupdate");
  const modal = bootstrap.Modal.getInstance(document.getElementById("planModal"));
  if (modal) modal.hide();
  
  if (window.renderAll) window.renderAll();
}

export async function deletePlanItem() {
  const { id, pid } = window.currentDeletePlanId || {};
  if (!id) return;
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await remove(ref(db, path));
  showNotif("🗑️ Rencana berhasil dihapus");
  const modal = bootstrap.Modal.getInstance(document.getElementById("planModal"));
  if (modal) modal.hide();
  
  if (window.renderAll) window.renderAll();
}

export async function addSubPlan() {
  const pid = document.getElementById("editPlanId")?.value;
  const text = document.getElementById("newSubText")?.value.trim();
  if (!text) { showNotif("❌ Isi sub rencana terlebih dahulu", true); return; }
  
  await push(ref(db, `data/plans/${pid}/sub`), { text, done: false, progress: 0, targetDate: null });
  const newSubTextEl = document.getElementById("newSubText");
  if (newSubTextEl) newSubTextEl.value = "";
  showNotif("✅ Checklist berhasil ditambahkan");
  
  if (pid) {
    const data = window.masterData || masterData;
    const plan = data?.plans?.[pid];
    if (plan && plan.sub) {
      renderSubPlansList(pid, plan.sub);
    }
  }
  
  if (window.renderAll) window.renderAll();
}

function renderSubPlansList(pid, subs) {
  const container = document.getElementById("subPlansList");
  if (!container) return;
  container.innerHTML = Object.entries(subs).map(([sid, s]) => `
    <div class="d-flex justify-content-between align-items-center mb-1 p-1 bg-white rounded">
      <div class="form-check">
        <input class="form-check-input" type="checkbox" ${s.done ? 'checked' : ''} 
               onchange="window.togglePlan('${sid}', ${s.done}, '${pid}')">
        <label class="form-check-label ${s.done ? 'text-decoration-line-through text-muted' : ''}">
          ${escapeHtml(s.text)}
        </label>
      </div>
      <i class="bi bi-trash text-danger small" style="cursor: pointer;" 
         onclick="window.deleteSubPlan('${pid}', '${sid}')"></i>
    </div>
  `).join('');
}

export async function togglePlan(id, status, pid = null) {
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await update(ref(db, path), { done: !status });
  showNotif(!status ? "✅ Checklist selesai!" : "⏸️ Checklist dibatalkan");
  
  if (window.renderAll) window.renderAll();
}

export function openEditPlan(id, pid = null) {
  const data = window.masterData || masterData;
  const plan = pid ? data?.plans?.[pid]?.sub?.[id] : data?.plans?.[id];
  if (!plan) return;
  
  const editPlanIdEl = document.getElementById("editPlanId");
  const editPlanParentIdEl = document.getElementById("editPlanParentId");
  const editPlanTextEl = document.getElementById("editPlanText");
  const editPlanCatEl = document.getElementById("editPlanCat");
  const editPlanTargetDateEl = document.getElementById("editPlanTargetDate");
  const editPlanProgressEl = document.getElementById("editPlanProgress");
  const editPlanDescEl = document.getElementById("editPlanDesc");
  const editPlanBudgetEl = document.getElementById("editPlanBudget");
  const editPlanPriorityEl = document.getElementById("editPlanPriority");
  const editPlanIsUrgentEl = document.getElementById("editPlanIsUrgent");
  
  if (editPlanIdEl) editPlanIdEl.value = id;
  if (editPlanParentIdEl) editPlanParentIdEl.value = pid || "";
  if (editPlanTextEl) editPlanTextEl.value = plan.text;
  if (editPlanCatEl) editPlanCatEl.value = plan.cat || "💍 Menikah";
  if (editPlanTargetDateEl) editPlanTargetDateEl.value = plan.targetDate || "";
  if (editPlanProgressEl) editPlanProgressEl.value = plan.progress || 0;
  if (editPlanDescEl) editPlanDescEl.value = plan.description || "";
  if (editPlanBudgetEl) editPlanBudgetEl.value = plan.budget || "";
  if (editPlanPriorityEl) editPlanPriorityEl.value = plan.priority || "medium";
  if (editPlanIsUrgentEl) editPlanIsUrgentEl.checked = plan.isUrgent || false;
  
  window.currentDeletePlanId = { id, pid };
  
  if (!pid && plan.sub) {
    renderSubPlansList(id, plan.sub);
  } else {
    const subPlansList = document.getElementById("subPlansList");
    if (subPlansList) subPlansList.innerHTML = "";
  }
  
  const modalEl = document.getElementById("planModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

export function deletePlanItemById(id) {
  window.confirmDelete("plans", id);
}

export async function deleteSubPlan(pid, sid) {
  await remove(ref(db, `data/plans/${pid}/sub/${sid}`));
  showNotif("🗑️ Checklist berhasil dihapus");
  if (window.renderAll) window.renderAll();
}

window.renderBoardPlans = renderBoardPlans;
window.deleteSubPlan = deleteSubPlan;
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
