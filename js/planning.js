// js/planning.js
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, escapeHtml, formatNumberRp, privacyHidden } from './utils.js';

// Template items untuk setiap kategori
const categoryTemplates = {
  "💍 Lamaran": [
    { text: "💍 Cincin lamaran", estimatedBudget: 5000000, note: "Cari toko emas terpercaya" },
    { text: "📅 Tentukan tanggal lamaran", estimatedBudget: 0, note: "Koordinasi dengan kedua keluarga" },
    { text: "🏨 Booking venue/restoran", estimatedBudget: 3000000, note: "Cari tempat yang instagramable" },
    { text: "📸 Sewa fotografer/videografer", estimatedBudget: 2500000, note: "Cek portfolio terlebih dahulu" },
    { text: "💐 Dekorasi dan bunga", estimatedBudget: 1500000, note: "Pilih tema yang sesuai" },
    { text: "🍽️ Katering snack", estimatedBudget: 1000000, note: "Hitung jumlah tamu" },
    { text: "👗 Busana lamaran", estimatedBudget: 2000000, note: "Sewa atau beli?" },
    { text: "🎁 Seserahan", estimatedBudget: 3000000, note: "Sesuaikan dengan adat" }
  ],
  "💍 Menikah": [
    { text: "📅 Tentukan tanggal pernikahan", estimatedBudget: 0, note: "Cek hari baik" },
    { text: "📝 Urus dokumen KUA", estimatedBudget: 500000, note: "Siapkan KTP, KK, akta lahir" },
    { text: "🏨 Booking gedung pernikahan", estimatedBudget: 15000000, note: "Termasuk dekorasi" },
    { text: "💄 MUA (Makeup Artist)", estimatedBudget: 3500000, note: "Coba trial makeup" },
    { text: "👗 Busana pengantin", estimatedBudget: 5000000, note: "Bisa sewa atau beli" },
    { text: "📸 Dokumentasi & prewedding", estimatedBudget: 8000000, note: "Cek portfolio" },
    { text: "💐 Dekorasi pelaminan", estimatedBudget: 5000000, note: "Pilih tema" },
    { text: "🍽️ Katering resepsi", estimatedBudget: 20000000, note: "Hitung per porsi" },
    { text: "🎤 MC & Entertainment", estimatedBudget: 3000000, note: "Cek referensi" },
    { text: "📨 Undangan pernikahan", estimatedBudget: 2000000, note: "Digital atau cetak?" },
    { text: "💍 Cincin kawin", estimatedBudget: 5000000, note: "Pasangan" },
    { text: "✈️ Honeymoon", estimatedBudget: 10000000, note: "Tentukan destinasi" }
  ],
  "✈️ Liburan": [
    { text: "📍 Tentukan destinasi", estimatedBudget: 0, note: "Riset tempat wisata" },
    { text: "📅 Tentukan tanggal", estimatedBudget: 0, note: "Sesuaikan cuti bersama" },
    { text: "✈️ Booking tiket pesawat", estimatedBudget: 3000000, note: "Cari promo" },
    { text: "🏨 Booking hotel", estimatedBudget: 4000000, note: "Baca review" },
    { text: "🗺️ Buat itinerary", estimatedBudget: 0, note: "Rencanakan per hari" },
    { text: "💰 Siapkan budget", estimatedBudget: 5000000, note: "Termasuk oleh-oleh" },
    { text: "🧳 Siapkan barang", estimatedBudget: 1000000, note: "Beli perlengkapan" },
    { text: "🛂 Urus paspor/visa", estimatedBudget: 1000000, note: "Jika luar negeri" }
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
      progress: 0,
      done: false,
      sub: {},
      description: item.note || "",
      estimatedBudget: item.estimatedBudget,
      actualBudget: 0,
      isPaid: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  
  showNotif(`✅ Template ${category} berhasil ditambahkan (${templates.length} item)!`);
  if (window.renderAll) window.renderAll();
}

// Fungsi untuk menambahkan template via custom confirm
export function confirmAddTemplate(category) {
  const categoryDisplay = {
    "💍 Lamaran": "Lamaran",
    "💍 Menikah": "Pernikahan",
    "✈️ Liburan": "Liburan"
  }[category] || category;
  
  showCustomConfirm(
    `Tambahkan template checklist untuk ${categoryDisplay}?\n\nTemplate akan menambahkan ${categoryTemplates[category]?.length || 0} item rencana dengan estimasi budget.`,
    () => addTemplateToCategory(category)
  );
}

// Custom confirm dialog
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

export async function savePlan() {
  const text = document.getElementById("planText")?.value.trim();
  if (!text) { showNotif("❌ Nama rencana harus diisi!", true); return; }
  
  const cat = document.getElementById("planCat")?.value;
  if (!cat) { showNotif("❌ Kategori harus dipilih!", true); return; }
  
  const targetDate = document.getElementById("planTargetDate")?.value;
  const description = document.getElementById("planDesc")?.value || "";
  const estimatedBudget = parseInt(document.getElementById("planBudget")?.value) || 0;
  
  await push(ref(db, "data/plans"), {
    text, cat, targetDate: targetDate || null,
    progress: 0,
    done: false,
    sub: {},
    description: description,
    estimatedBudget: estimatedBudget,
    actualBudget: 0,
    isPaid: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  showNotif("✅ Rencana berhasil ditambahkan!");
  
  const modal = bootstrap.Modal.getInstance(document.getElementById("addPlanModal"));
  if (modal) modal.hide();
  
  const planTextEl = document.getElementById("planText");
  const planTargetDateEl = document.getElementById("planTargetDate");
  const planDescEl = document.getElementById("planDesc");
  const planBudgetEl = document.getElementById("planBudget");
  
  if (planTextEl) planTextEl.value = "";
  if (planTargetDateEl) planTargetDateEl.value = "";
  if (planDescEl) planDescEl.value = "";
  if (planBudgetEl) planBudgetEl.value = "";
  
  if (window.renderAll) window.renderAll();
}

// Hitung progress dari checklist yang tercentang
function calculateProgressFromSubs(subs) {
  if (!subs || Object.keys(subs).length === 0) return 0;
  const total = Object.keys(subs).length;
  const completed = Object.values(subs).filter(s => s.done).length;
  return Math.round((completed / total) * 100);
}

// Update progress parent berdasarkan sub plans
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

// Toggle plan (untuk main plan) - DIPERLUKAN UNTUK KOMPATIBILITAS
export async function togglePlan(id, status, pid = null) {
  const path = pid ? `data/plans/${pid}/sub/${id}` : `data/plans/${id}`;
  await update(ref(db, path), { done: !status });
  
  if (!pid) {
    // Jika toggle main plan, update progress ke 100 atau 0
    const newProgress = !status ? 100 : 0;
    await update(ref(db, `data/plans/${id}`), { 
      progress: newProgress,
      updatedAt: Date.now()
    });
  } else {
    // Jika toggle sub plan, update parent progress
    await updateParentProgress(pid);
  }
  
  showNotif(!status ? "✅ Selesai!" : "⏸️ Dibatalkan");
  if (window.renderAll) window.renderAll();
}

// Toggle sub plan dengan update budget otomatis
export async function toggleSubPlanWithBudget(pid, sid, currentStatus) {
  const data = window.masterData || masterData;
  const subPlan = data?.plans?.[pid]?.sub?.[sid];
  
  if (!subPlan) return;
  
  await update(ref(db, `data/plans/${pid}/sub/${sid}`), { done: !currentStatus });
  
  const newProgress = await updateParentProgress(pid);
  
  showNotif(!currentStatus ? `✅ "${subPlan.text}" selesai! Progress: ${newProgress}%` : `⏸️ "${subPlan.text}" dibatalkan`);
  if (window.renderAll) window.renderAll();
}

export function renderBoardPlans(plansMap) {
  const categories = {
    "💍 Menikah": { id: "menikahPlans", icon: "bi-heart-fill", color: "primary", templateBtn: true },
    "💍 Lamaran": { id: "lamaranPlans", icon: "bi-gem-fill", color: "info", templateBtn: true },
    "✈️ Liburan": { id: "liburanPlans", icon: "bi-airplane-fill", color: "warning", templateBtn: true }
  };
  
  const formatWithPrivacy = (value) => {
    if (privacyHidden) return "●●● ●●●";
    return formatNumberRp(value);
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
    
    container.innerHTML = catPlans.map(([id, p]) => {
      const currentProgress = p.sub && Object.keys(p.sub).length > 0 
        ? calculateProgressFromSubs(p.sub)
        : (p.progress || 0);
      
      const isDone = currentProgress >= 100;
      const remainingBudget = (p.estimatedBudget || 0) - (p.actualBudget || 0);
      const isFullyPaid = (p.actualBudget || 0) >= (p.estimatedBudget || 0) && p.estimatedBudget > 0;
      const budgetProgress = p.estimatedBudget > 0 
        ? Math.min(100, ((p.actualBudget || 0) / p.estimatedBudget) * 100)
        : 0;
      
      return `
        <div class="card mb-3 border-0 shadow-sm ${isDone ? 'bg-success bg-opacity-10' : ''}">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <h6 class="fw-bold mb-0 ${isDone ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(p.text)}</h6>
                </div>
                ${isDone ? '<small class="text-success"><i class="bi bi-check-circle-fill"></i> Selesai</small>' : ''}
                ${p.description ? `<p class="small text-muted mt-1 mb-0">📝 ${escapeHtml(p.description.substring(0, 80))}</p>` : ''}
              </div>
              <div class="dropdown">
                <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" onclick="window.togglePlan('${id}', ${isDone})">
                    <i class="bi bi-check-circle me-2"></i>${isDone ? 'Batal Selesai' : 'Tandai Selesai'}
                  </a></li>
                  <li><a class="dropdown-item" onclick="window.openEditPlan('${id}')">
                    <i class="bi bi-pencil me-2"></i>Edit
                  </a></li>
                  <li><a class="dropdown-item" onclick="window.addBudgetToPlan('${id}', ${p.estimatedBudget || 0}, ${p.actualBudget || 0})">
                    <i class="bi bi-cash-stack me-2"></i>Catat Keuangan
                  </a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" onclick="window.deletePlanItemById('${id}')">
                    <i class="bi bi-trash me-2"></i>Hapus
                  </a></li>
                </ul>
              </div>
            </div>
            
            <!-- Budget Section -->
            <div class="bg-light rounded-3 p-2 mb-2">
              <div class="d-flex justify-content-between align-items-center small">
                <span><i class="bi bi-cash-stack text-success"></i> Anggaran:</span>
                <span class="fw-semibold">${formatWithPrivacy(p.estimatedBudget || 0)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center small">
                <span><i class="bi bi-wallet2 text-primary"></i> Terpakai:</span>
                <span class="fw-semibold ${isFullyPaid ? 'text-success' : 'text-warning'}">${formatWithPrivacy(p.actualBudget || 0)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center small">
                <span><i class="bi bi-piggy-bank text-info"></i> Sisa:</span>
                <span class="fw-semibold ${remainingBudget >= 0 ? 'text-info' : 'text-danger'}">${formatWithPrivacy(Math.abs(remainingBudget))}</span>
              </div>
              ${p.estimatedBudget > 0 ? `
                <div class="progress mt-1" style="height: 4px;">
                  <div class="progress-bar ${isFullyPaid ? 'bg-success' : 'bg-primary'}" style="width: ${budgetProgress}%"></div>
                </div>
              ` : ''}
            </div>
            
            <!-- Progress Bar -->
            <div class="d-flex justify-content-between align-items-center mb-1">
              <small class="fw-semibold"><i class="bi bi-check-circle"></i> Progress Checklist</small>
              <small class="fw-semibold ${currentProgress >= 100 ? 'text-success' : 'text-primary'}">${currentProgress}%</small>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar ${currentProgress >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${currentProgress}%"></div>
            </div>
            
            ${p.targetDate ? `
              <div class="small text-muted mb-2">
                <i class="bi bi-calendar"></i> Target: ${new Date(p.targetDate).toLocaleDateString('id-ID')}
              </div>
            ` : ''}
            
            <!-- Checklist Sub Plans -->
            <div class="mt-2">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="fw-semibold"><i class="bi bi-list-check"></i> Daftar Persiapan</small>
                <button class="btn btn-sm btn-link p-0 text-primary" onclick="window.addSubPlanWithDetails('${id}')">
                  <i class="bi bi-plus-circle"></i> Tambah
                </button>
              </div>
              
              ${p.sub && Object.keys(p.sub).length > 0 ? `
                <div class="small">
                  ${Object.entries(p.sub).map(([sid, s]) => `
                    <div class="d-flex align-items-start gap-2 mb-2 p-2 bg-light rounded-3">
                      <input class="form-check-input mt-1" type="checkbox" ${s.done ? 'checked' : ''} 
                             onchange="window.toggleSubPlanWithBudget('${id}', '${sid}', ${s.done})">
                      <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                          <label class="form-check-label ${s.done ? 'text-decoration-line-through text-muted' : ''}">
                            ${escapeHtml(s.text)}
                          </label>
                          <div class="d-flex gap-2 align-items-center">
                            ${s.actualCost > 0 ? `
                              <span class="badge bg-success bg-opacity-10 text-success">
                                <i class="bi bi-cash-stack"></i> ${formatWithPrivacy(s.actualCost)}
                              </span>
                            ` : s.estimatedCost > 0 ? `
                              <span class="badge bg-secondary bg-opacity-10 text-secondary">
                                <i class="bi bi-cash-stack"></i> ${formatWithPrivacy(s.estimatedCost)}
                              </span>
                            ` : ''}
                            ${s.photo ? `
                              <button class="btn btn-sm btn-link p-0 text-info" onclick="window.viewSubPlanPhoto('${s.photo}')">
                                <i class="bi bi-image"></i>
                              </button>
                            ` : ''}
                            <button class="btn btn-sm btn-link p-0 text-primary" onclick="window.addCostToSubPlan('${id}', '${sid}', ${s.estimatedCost || 0}, ${s.actualCost || 0})">
                              <i class="bi bi-cash-stack"></i>
                            </button>
                            <button class="btn btn-sm btn-link p-0 text-danger" onclick="window.deleteSubPlan('${id}', '${sid}')">
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                        ${s.note ? `<small class="text-muted d-block">📝 ${escapeHtml(s.note.substring(0, 50))}</small>` : ''}
                        ${s.photo ? `<img src="${s.photo}" class="img-fluid mt-1 rounded" style="max-height: 50px; width: auto; cursor: pointer;" onclick="window.viewSubPlanPhoto('${s.photo}')">` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-center text-muted py-2 border rounded-3">
                  <i class="bi bi-inbox"></i>
                  <small class="d-block">Belum ada checklist</small>
                  <button class="btn btn-sm btn-outline-secondary mt-1" onclick="window.addSubPlanWithDetails('${id}')">
                    <i class="bi bi-plus-circle"></i> Tambah Checklist
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Tambah sub plan dengan detail lengkap
export async function addSubPlanWithDetails(pid) {
  const text = prompt("Masukkan nama persiapan:", "");
  if (!text || !text.trim()) { showNotif("❌ Nama persiapan harus diisi", true); return; }
  
  const estimatedCost = parseInt(prompt("Estimasi biaya (opsional):\nKosongkan jika tidak ada", "0")) || 0;
  const note = prompt("Catatan tambahan (opsional):", "");
  const hasPhoto = confirm("Ingin menambahkan foto bukti?");
  
  let photo = null;
  if (hasPhoto) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/jpg';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const compressed = await compressImage(file);
        await saveSubPlanWithData(pid, text.trim(), note || "", estimatedCost, 0, compressed);
      } else {
        await saveSubPlanWithData(pid, text.trim(), note || "", estimatedCost, 0, null);
      }
    };
    fileInput.click();
  } else {
    await saveSubPlanWithData(pid, text.trim(), note || "", estimatedCost, 0, null);
  }
}

// Tambah biaya ke sub plan
export async function addCostToSubPlan(pid, sid, currentEstimated, currentActual) {
  const newActual = parseInt(prompt(`Catat biaya riil untuk item ini:\nEstimasi: ${formatNumberRp(currentEstimated)}\nTerpakai saat ini: ${formatNumberRp(currentActual)}\n\nMasukkan total biaya riil:`, currentActual)) || 0;
  
  if (newActual >= 0) {
    await update(ref(db, `data/plans/${pid}/sub/${sid}`), { 
      actualCost: newActual,
      estimatedCost: currentEstimated
    });
    
    const data = window.masterData || masterData;
    const plan = data?.plans?.[pid];
    if (plan && plan.sub) {
      let totalActual = 0;
      let totalEstimated = 0;
      Object.values(plan.sub).forEach(sub => {
        totalActual += sub.actualCost || 0;
        totalEstimated += sub.estimatedCost || 0;
      });
      
      await update(ref(db, `data/plans/${pid}`), { 
        actualBudget: totalActual,
        estimatedBudget: totalEstimated
      });
    }
    
    showNotif(`✅ Biaya diupdate ke ${formatNumberRp(newActual)}`);
    if (window.renderAll) window.renderAll();
  }
}

// Tambah budget ke plan utama
export async function addBudgetToPlan(pid, currentEstimated, currentActual) {
  const newActual = parseInt(prompt(`Catat total biaya untuk rencana ini:\nEstimasi: ${formatNumberRp(currentEstimated)}\nTerpakai saat ini: ${formatNumberRp(currentActual)}\n\nMasukkan total biaya riil:`, currentActual)) || 0;
  
  if (newActual >= 0) {
    await update(ref(db, `data/plans/${pid}`), { actualBudget: newActual });
    showNotif(`✅ Biaya rencana diupdate ke ${formatNumberRp(newActual)}`);
    if (window.renderAll) window.renderAll();
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
        
        const maxDimension = 600;
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
        
        while (result.length > 500 * 1024 && quality > 0.3) {
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

async function saveSubPlanWithData(pid, text, note, estimatedCost, actualCost, photo) {
  await push(ref(db, `data/plans/${pid}/sub`), { 
    text, 
    note: note || "",
    photo: photo,
    estimatedCost: estimatedCost || 0,
    actualCost: actualCost || 0,
    done: false,
    createdAt: Date.now()
  });
  
  await updateParentProgress(pid);
  
  const data = window.masterData || masterData;
  const plan = data?.plans?.[pid];
  if (plan && plan.sub) {
    let totalEstimated = 0;
    let totalActual = 0;
    Object.values(plan.sub).forEach(sub => {
      totalEstimated += sub.estimatedCost || 0;
      totalActual += sub.actualCost || 0;
    });
    await update(ref(db, `data/plans/${pid}`), { 
      estimatedBudget: totalEstimated,
      actualBudget: totalActual
    });
  }
  
  showNotif("✅ Persiapan berhasil ditambahkan!");
  if (window.renderAll) window.renderAll();
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
  const text = document.getElementById("editPlanText")?.value.trim();
  if (!text) { showNotif("❌ Nama rencana harus diisi!", true); return; }
  
  const cat = document.getElementById("editPlanCat")?.value;
  const targetDate = document.getElementById("editPlanTargetDate")?.value;
  const description = document.getElementById("editPlanDesc")?.value;
  
  await update(ref(db, `data/plans/${id}`), { 
    text, cat, targetDate, 
    description: description || "",
    updatedAt: Date.now()
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
  
  await push(ref(db, `data/plans/${pid}/sub`), { text, done: false, estimatedCost: 0, actualCost: 0 });
  const newSubTextEl = document.getElementById("newSubText");
  if (newSubTextEl) newSubTextEl.value = "";
  showNotif("✅ Checklist berhasil ditambahkan");
  
  if (pid) {
    await updateParentProgress(pid);
  }
  
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
  const editPlanDescEl = document.getElementById("editPlanDesc");
  
  if (editPlanIdEl) editPlanIdEl.value = id;
  if (editPlanParentIdEl) editPlanParentIdEl.value = pid || "";
  if (editPlanTextEl) editPlanTextEl.value = plan.text;
  if (editPlanCatEl) editPlanCatEl.value = plan.cat || "💍 Menikah";
  if (editPlanTargetDateEl) editPlanTargetDateEl.value = plan.targetDate || "";
  if (editPlanDescEl) editPlanDescEl.value = plan.description || "";
  
  window.currentDeletePlanId = { id, pid };
  
  const modalEl = document.getElementById("planModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

export function deletePlanItemById(id) {
  window.confirmDelete("plans", id);
}

export async function deleteSubPlan(pid, sid) {
  await remove(ref(db, `data/plans/${pid}/sub/${sid}`));
  await updateParentProgress(pid);
  showNotif("🗑️ Item berhasil dihapus");
  if (window.renderAll) window.renderAll();
}

// Export semua fungsi ke window
window.renderBoardPlans = renderBoardPlans;
window.deleteSubPlan = deleteSubPlan;
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.addTemplateToCategory = addTemplateToCategory;
window.confirmAddTemplate = confirmAddTemplate;
window.addSubPlanWithDetails = addSubPlanWithDetails;
window.toggleSubPlanWithBudget = toggleSubPlanWithBudget;
window.addCostToSubPlan = addCostToSubPlan;
window.addBudgetToPlan = addBudgetToPlan;
window.viewSubPlanPhoto = viewSubPlanPhoto;
