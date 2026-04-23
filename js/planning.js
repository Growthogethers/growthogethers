// js/planning.js
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, escapeHtml } from './utils.js';

// Template items untuk setiap kategori
const categoryTemplates = {
  "💍 Lamaran": [
    { text: "💍 Cincin lamaran", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "📅 Tentukan tanggal lamaran", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "🏨 Booking venue/restoran untuk lamaran", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "📸 Sewa fotografer/videografer", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "💐 Dekorasi dan bunga", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🍽️ Katering atau menu makanan", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "👗 Busana lamaran (pria & wanita)", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🎁 Seserahan (mahar, perhiasan, pakaian, dll)", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "📜 Surat lamaran dan dokumen", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "👨‍👩‍👧‍👦 Undangan keluarga", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🎤 MC atau pembawa acara", defaultProgress: 0, isUrgent: false, priority: "low" },
    { text: "🎵 Musik atau hiburan", defaultProgress: 0, isUrgent: false, priority: "low" }
  ],
  "💍 Menikah": [
    { text: "📅 Tentukan tanggal pernikahan", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "📝 Urus dokumen KUA/Catatan Sipil", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "🏨 Booking gedung pernikahan", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "💄 MUA (Makeup Artist)", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "👗 Busana pengantin (pria & wanita)", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "📸 Dokumentasi (prewedding, wedding)", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "💐 Dekorasi pelaminan", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🍽️ Katering dan menu resepsi", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "🎤 MC dan Entertainment", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "📨 Undangan pernikahan", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "💍 Cincin kawin", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "✈️ Persiapan honeymoon", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🏠 Persiapan rumah tangga", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "📋 Check list dana pernikahan", defaultProgress: 0, isUrgent: false, priority: "high" }
  ],
  "✈️ Liburan": [
    { text: "📍 Tentukan destinasi liburan", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "📅 Tentukan tanggal liburan", defaultProgress: 0, isUrgent: true, priority: "high" },
    { text: "✈️ Cari dan booking tiket pesawat", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "🏨 Booking hotel/penginapan", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "🗺️ Buat itinerary perjalanan", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "💰 Siapkan budget liburan", defaultProgress: 0, isUrgent: false, priority: "high" },
    { text: "🧳 Siapkan barang bawaan", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "🛂 Urus paspor/visa (jika luar negeri)", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "📱 Beli paket data/internet", defaultProgress: 0, isUrgent: false, priority: "low" },
    { text: "💉 Cek kesehatan dan vaksin", defaultProgress: 0, isUrgent: false, priority: "low" },
    { text: "📸 Riset spot foto instagramable", defaultProgress: 0, isUrgent: false, priority: "low" },
    { text: "🍴 Riset kuliner khas", defaultProgress: 0, isUrgent: false, priority: "low" },
    { text: "🎫 Booking tiket wisata", defaultProgress: 0, isUrgent: false, priority: "medium" },
    { text: "📝 Buat daftar yang harus dilakukan", defaultProgress: 0, isUrgent: false, priority: "medium" }
  ]
};

// Fungsi untuk menambahkan template ke kategori tertentu
export async function addTemplateToCategory(category) {
  const templates = categoryTemplates[category];
  if (!templates) {
    showNotif(`❌ Template untuk ${category} tidak ditemukan`, true);
    return;
  }
  
  showNotif(`📋 Menambahkan template ${category}...`, false);
  
  for (const item of templates) {
    await push(ref(db, "data/plans"), {
      text: item.text,
      cat: category,
      targetDate: "",
      progress: item.defaultProgress,
      done: item.defaultProgress >= 100,
      sub: {},
      description: "",
      budget: 0,
      priority: item.priority,
      isUrgent: item.isUrgent,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  showNotif(`✅ Template ${category} berhasil ditambahkan (${templates.length} item)!`);
  if (window.renderAll) window.renderAll();
}

// Fungsi untuk menambahkan template via modal konfirmasi
export function confirmAddTemplate(category) {
  const categoryDisplay = {
    "💍 Lamaran": "Lamaran",
    "💍 Menikah": "Pernikahan",
    "✈️ Liburan": "Liburan"
  }[category] || category;
  
  if (confirm(`Tambahkan template checklist untuk ${categoryDisplay}?\n\nTemplate akan menambahkan ${categoryTemplates[category]?.length || 0} item rencana yang bisa kamu centang satu per satu.`)) {
    addTemplateToCategory(category);
  }
}

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
    progress: prog, done: prog >= 100, sub: {},
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
  
  // Reset form fields
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
    "💍 Menikah": { id: "menikahPlans", icon: "bi-heart-fill", color: "primary", templateBtn: true },
    "💍 Lamaran": { id: "lamaranPlans", icon: "bi-gem-fill", color: "info", templateBtn: true },
    "✈️ Liburan": { id: "liburanPlans", icon: "bi-airplane-fill", color: "warning", templateBtn: true }
  };
  
  for (const [cat, config] of Object.entries(categories)) {
    const container = document.getElementById(config.id);
    if (!container) continue;
    
    const catPlans = plansMap.filter(p => p[1].cat === cat);
    
    if (catPlans.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-2 mb-0">Belum ada rencana</p>
          <small class="text-muted">Klik tombol + untuk menambah</small>
          ${config.templateBtn ? `
            <div class="mt-3">
              <button class="btn btn-sm btn-outline-secondary" onclick="window.confirmAddTemplate('${cat}')">
                <i class="bi bi-list-check me-1"></i> Gunakan Template ${cat}
              </button>
            </div>
          ` : ''}
        </div>
      `;
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
      
      // Hitung progress dari sub tasks jika ada
      let subProgress = 0;
      let subTotal = 0;
      if (p.sub && Object.keys(p.sub).length > 0) {
        subTotal = Object.keys(p.sub).length;
        const subDone = Object.values(p.sub).filter(s => s.done).length;
        subProgress = Math.round((subDone / subTotal) * 100);
      }
      
      return `
        <div class="card mb-3 border-0 shadow-sm ${p.isUrgent ? 'border-start border-danger border-4' : ''} ${isDone ? 'bg-success bg-opacity-10' : ''}">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <h6 class="fw-bold mb-0 ${isDone ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(p.text)}</h6>
                  ${p.isUrgent ? '<span class="badge bg-danger">Urgent</span>' : ''}
                </div>
                ${isDone ? '<small class="text-success"><i class="bi bi-check-circle-fill"></i> Selesai</small>' : ''}
              </div>
              <div class="dropdown">
                <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" onclick="window.togglePlanProgress('${id}', ${p.progress || 0})">
                    <i class="bi bi-percent me-2"></i>Update Progress
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
            
            <!-- Progress Bar Utama -->
            <div class="d-flex justify-content-between align-items-center mb-1">
              <small class="fw-semibold">Progress</small>
              <small class="fw-semibold ${p.progress >= 100 ? 'text-success' : 'text-primary'}">${p.progress || 0}%</small>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar ${p.progress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${p.progress || 0}%"></div>
            </div>
            
            <!-- Quick Action Buttons -->
            <div class="d-flex gap-2 mb-2">
              <button class="btn btn-sm btn-outline-success flex-grow-1" onclick="window.quickProgress('${id}', 25)">
                <i class="bi bi-plus-circle"></i> +25%
              </button>
              <button class="btn btn-sm btn-outline-warning flex-grow-1" onclick="window.quickProgress('${id}', 50)">
                <i class="bi bi-arrow-repeat"></i> 50%
              </button>
              <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="window.quickProgress('${id}', 100)">
                <i class="bi bi-check-circle"></i> Selesai
              </button>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
              ${p.targetDate ? `<small class="text-muted"><i class="bi bi-calendar"></i> ${daysLeftText}</small>` : '<small></small>'}
              ${formatBudget(p.budget)}
            </div>
            
            <!-- Checklist Sub Plans dengan Photo Upload -->
            ${p.sub && Object.keys(p.sub).length > 0 ? `
              <div class="mt-3 pt-2 border-top">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <small class="fw-semibold"><i class="bi bi-list-check"></i> Checklist (${Object.values(p.sub).filter(s => s.done).length}/${Object.keys(p.sub).length})</small>
                  <small class="text-muted">${subProgress}%</small>
                </div>
                <div class="progress mb-2" style="height: 4px;">
                  <div class="progress-bar bg-info" style="width: ${subProgress}%"></div>
                </div>
                <div class="small">
                  ${Object.entries(p.sub).map(([sid, s]) => `
                    <div class="d-flex align-items-start gap-2 mb-2 p-2 bg-light rounded-3">
                      <input class="form-check-input mt-1" type="checkbox" ${s.done ? 'checked' : ''} 
                             onchange="window.toggleSubPlan('${id}', '${sid}', ${s.done})">
                      <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                          <label class="form-check-label ${s.done ? 'text-decoration-line-through text-muted' : ''}">
                            ${escapeHtml(s.text)}
                          </label>
                          <div class="d-flex gap-2">
                            ${s.photo ? `
                              <button class="btn btn-sm btn-link p-0 text-info" onclick="window.viewSubPlanPhoto('${s.photo}')">
                                <i class="bi bi-image"></i>
                              </button>
                            ` : ''}
                            <button class="btn btn-sm btn-link p-0 text-primary" onclick="window.uploadSubPlanPhoto('${id}', '${sid}')">
                              <i class="bi bi-camera"></i>
                            </button>
                            <button class="btn btn-sm btn-link p-0 text-danger" onclick="window.deleteSubPlan('${id}', '${sid}')">
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                        ${s.note ? `<small class="text-muted d-block">📝 ${escapeHtml(s.note.substring(0, 50))}${s.note.length > 50 ? '...' : ''}</small>` : ''}
                        ${s.photo ? `<img src="${s.photo}" class="img-fluid mt-1 rounded" style="max-height: 60px; width: auto; cursor: pointer;" onclick="window.viewSubPlanPhoto('${s.photo}')">` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
                <button class="btn btn-sm btn-outline-secondary w-100 mt-2" onclick="window.addSubPlanWithPhoto('${id}')">
                  <i class="bi bi-plus-circle me-1"></i> Tambah Checklist + Foto
                </button>
              </div>
            ` : `
              <div class="mt-3 pt-2 border-top">
                <button class="btn btn-sm btn-outline-secondary w-100" onclick="window.addSubPlanWithPhoto('${id}')">
                  <i class="bi bi-plus-circle me-1"></i> Tambah Checklist + Foto
                </button>
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Quick progress update
export async function quickProgress(id, targetProgress) {
  const data = window.masterData || masterData;
  const plan = data?.plans?.[id];
  if (!plan) return;
  
  let newProgress = targetProgress;
  if (targetProgress === 100) {
    newProgress = 100;
  } else {
    newProgress = Math.min(100, (plan.progress || 0) + targetProgress);
  }
  
  await update(ref(db, `data/plans/${id}`), { 
    progress: newProgress,
    done: newProgress >= 100,
    updatedAt: Date.now()
  });
  
  showNotif(`✅ Progress diupdate ke ${newProgress}%`);
  if (window.renderAll) window.renderAll();
}

// Toggle plan progress via modal
export function togglePlanProgress(id, currentProgress) {
  const newProgress = prompt(`Update progress (0-100%):\nProgress saat ini: ${currentProgress}%`, currentProgress);
  if (newProgress !== null) {
    const progress = Math.min(100, Math.max(0, parseInt(newProgress) || 0));
    update(ref(db, `data/plans/${id}`), { 
      progress: progress,
      done: progress >= 100,
      updatedAt: Date.now()
    }).then(() => {
      showNotif(`✅ Progress diupdate ke ${progress}%`);
      if (window.renderAll) window.renderAll();
    });
  }
}

// Add sub plan with photo option
export async function addSubPlanWithPhoto(pid) {
  const text = prompt("Masukkan nama checklist item:", "");
  if (!text || !text.trim()) { showNotif("❌ Nama checklist harus diisi", true); return; }
  
  const note = prompt("Tambahkan catatan (opsional):", "");
  const hasPhoto = confirm("Apakah ingin menambahkan foto untuk item ini?");
  
  let photo = null;
  if (hasPhoto) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/jpg';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const compressed = await compressImage(file);
        photo = compressed;
        await saveSubPlanWithData(pid, text.trim(), note || "", photo);
      } else {
        await saveSubPlanWithData(pid, text.trim(), note || "", null);
      }
    };
    fileInput.click();
  } else {
    await saveSubPlanWithData(pid, text.trim(), note || "", null);
  }
}

async function compressImage(file) {
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
        
        const maxDimension = 800;
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
        
        while (result.length > 1 * 1024 * 1024 && quality > 0.3) {
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

async function saveSubPlanWithData(pid, text, note, photo) {
  await push(ref(db, `data/plans/${pid}/sub`), { 
    text, 
    note: note || "",
    photo: photo,
    done: false,
    createdAt: Date.now()
  });
  showNotif("✅ Checklist berhasil ditambahkan!");
  if (window.renderAll) window.renderAll();
}

// Upload photo untuk sub plan yang sudah ada
export async function uploadSubPlanPhoto(pid, sid) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/jpg';
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      await update(ref(db, `data/plans/${pid}/sub/${sid}`), { photo: compressed });
      showNotif("✅ Foto berhasil ditambahkan!");
      if (window.renderAll) window.renderAll();
    }
  };
  fileInput.click();
}

// View photo preview
export function viewSubPlanPhoto(photoUrl) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
  modal.style.zIndex = '10000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.cursor = 'pointer';
  modal.onclick = () => modal.remove();
  
  const img = document.createElement('img');
  img.src = photoUrl;
  img.style.maxWidth = '90%';
  img.style.maxHeight = '90%';
  img.style.borderRadius = '8px';
  
  modal.appendChild(img);
  document.body.appendChild(modal);
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
  
  await push(ref(db, `data/plans/${pid}/sub`), { text, done: false });
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

// Toggle sub plan dengan checkbox
export async function toggleSubPlan(pid, sid, currentStatus) {
  await update(ref(db, `data/plans/${pid}/sub/${sid}`), { done: !currentStatus });
  
  // Update progress parent berdasarkan sub plans yang selesai
  const data = window.masterData || masterData;
  const plan = data?.plans?.[pid];
  if (plan && plan.sub) {
    const subs = Object.values(plan.sub);
    const totalSubs = subs.length;
    const doneSubs = subs.filter(s => s.done).length;
    const newProgress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : plan.progress;
    
    await update(ref(db, `data/plans/${pid}`), { 
      progress: newProgress,
      done: newProgress >= 100,
      updatedAt: Date.now()
    });
  }
  
  showNotif(!currentStatus ? "✅ Checklist selesai!" : "⏸️ Checklist dibatalkan");
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

// Export ke window
window.renderBoardPlans = renderBoardPlans;
window.deleteSubPlan = deleteSubPlan;
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.toggleSubPlan = toggleSubPlan;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.addTemplateToCategory = addTemplateToCategory;
window.confirmAddTemplate = confirmAddTemplate;
window.quickProgress = quickProgress;
window.togglePlanProgress = togglePlanProgress;
window.addSubPlanWithPhoto = addSubPlanWithPhoto;
window.uploadSubPlanPhoto = uploadSubPlanPhoto;
window.viewSubPlanPhoto = viewSubPlanPhoto;
