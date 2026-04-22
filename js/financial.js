// js/financial.js - Fokus Tabungan Pernikahan dengan Target Periode
import { db, ref, push, update, remove, get, set, onValue } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml, setMasterData } from './utils.js';

// State untuk listener
let financialDataListener = null;

// Load saving targets from Firebase
export function loadSavingTargets() {
  console.log("=== loadSavingTargets called ===");
  
  // Ambil data dari window.masterData
  const data = window.masterData || masterData;
  console.log("Data in loadSavingTargets:", data);
  
  if (!data) {
    console.log("Data masih kosong, coba ambil dari window");
    if (window.masterData) {
      console.log("Menggunakan window.masterData");
      const settings = window.masterData.settings || {};
      const savingTargets = settings.savingTargets || {};
      console.log("Saving targets from window.masterData:", savingTargets);
      renderSavingTargets(savingTargets);
    } else {
      console.log("Belum ada data, akan dirender kosong");
      renderSavingTargets({});
    }
    return;
  }
  
  const settings = data.settings || {};
  const savingTargets = settings.savingTargets || {};
  console.log("Saving targets loaded:", savingTargets);
  console.log("Number of targets:", Object.keys(savingTargets).length);
  
  renderSavingTargets(savingTargets);
}

// Hitung total tabungan dalam periode tertentu
function calculateTotalInPeriod(startDate, endDate) {
  const data = window.masterData || masterData;
  const finances = data?.finances || {};
  let total = 0;
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date) {
      if (f.date >= startDate && f.date <= endDate) {
        total += f.amt;
      }
    }
  });
  
  return total;
}

// Format date display
function formatDateDisplay(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthName = monthNames[parseInt(parts[1]) - 1];
    return `${parts[2]} ${monthName} ${parts[0]}`;
  }
  return dateStr;
}

// Format month year display
function formatMonthYearDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[parseInt(parts[1]) - 1];
    return `${monthName} ${parts[0]}`;
  }
  return dateStr;
}

// Render target periode dengan progress bar
function renderSavingTargets(savingTargets) {
  const container = document.getElementById('savingTargetsList');
  if (!container) {
    console.log("Container savingTargetsList not found");
    return;
  }
  
  const targets = Object.entries(savingTargets).sort((a, b) => a[0].localeCompare(b[0]));
  console.log("Rendering targets:", targets.length);
  
  if (targets.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-muted"><i class="bi bi-inbox fs-1 d-block mb-2"></i><p class="mb-0">✨ Belum ada target tabungan</p><small>Buat target di bawah</small></div>';
    return;
  }
  
  container.innerHTML = targets.map(([id, target]) => {
    const totalSaved = calculateTotalInPeriod(target.startDate, target.endDate);
    const percent = target.amount > 0 ? Math.min(100, (totalSaved / target.amount) * 100) : 0;
    const isAchieved = totalSaved >= target.amount;
    const remaining = Math.max(0, target.amount - totalSaved);
    
    // Hitung progress waktu
    const start = new Date(target.startDate);
    const end = new Date(target.endDate);
    const today = new Date();
    let timeProgress = 0;
    let daysLeft = 0;
    let statusText = '';
    
    if (today < start) {
      timeProgress = 0;
      daysLeft = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      statusText = '⏳ Belum dimulai';
    } else if (today > end) {
      timeProgress = 100;
      daysLeft = 0;
      statusText = isAchieved ? '✅ Selesai tepat waktu' : '⚠️ Melebihi target waktu';
    } else {
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
      timeProgress = Math.min(100, (elapsedDays / totalDays) * 100);
      daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      statusText = `📅 ${daysLeft} hari lagi`;
    }
    
    return `
      <div class="target-period-card mb-4 p-4 bg-light rounded-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h5 class="fw-bold mb-1">
              <i class="bi bi-trophy-fill ${isAchieved ? 'text-success' : 'text-warning'} me-2"></i>
              Target Tabungan
            </h5>
            <div class="d-flex gap-3 flex-wrap">
              <span class="badge bg-primary"><i class="bi bi-calendar-check"></i> ${formatMonthYearDisplay(target.startDate)}</span>
              <span><i class="bi bi-arrow-right"></i></span>
              <span class="badge bg-primary"><i class="bi bi-calendar-check"></i> ${formatMonthYearDisplay(target.endDate)}</span>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="window.editSavingTarget('${id}')">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteSavingTarget('${id}')">
              <i class="bi bi-trash"></i> Hapus
            </button>
          </div>
        </div>
        
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <div class="text-center p-2 bg-white rounded-3">
              <small class="text-muted">🎯 Target Nominal</small>
              <h4 class="fw-bold text-primary mb-0">${formatNumberRp(target.amount)}</h4>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center p-2 bg-white rounded-3">
              <small class="text-muted">💰 Terkumpul</small>
              <h4 class="fw-bold ${isAchieved ? 'text-success' : 'text-warning'} mb-0">${formatNumberRp(totalSaved)}</h4>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center p-2 bg-white rounded-3">
              <small class="text-muted">📊 Sisa Target</small>
              <h4 class="fw-bold ${remaining === 0 ? 'text-success' : 'text-danger'} mb-0">${formatNumberRp(remaining)}</h4>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            <small class="fw-semibold">Progress Tabungan</small>
            <small class="fw-semibold ${isAchieved ? 'text-success' : 'text-primary'}">${Math.round(percent)}%</small>
          </div>
          <div class="progress" style="height: 10px; border-radius: 10px;">
            <div class="progress-bar ${isAchieved ? 'bg-success' : 'bg-primary'}" style="width: ${percent}%; border-radius: 10px;"></div>
          </div>
        </div>
        
        <div class="mb-2">
          <div class="d-flex justify-content-between mb-1">
            <small class="fw-semibold">Progress Waktu</small>
            <small class="fw-semibold">${Math.round(timeProgress)}%</small>
          </div>
          <div class="progress" style="height: 8px; border-radius: 10px;">
            <div class="progress-bar bg-info" style="width: ${timeProgress}%; border-radius: 10px;"></div>
          </div>
          <div class="d-flex justify-content-between mt-1">
            <small class="text-muted"><i class="bi bi-calendar"></i> Mulai: ${formatDateDisplay(target.startDate)}</small>
            <small class="${today > end && !isAchieved ? 'text-danger fw-bold' : 'text-muted'}">
              ${statusText}
            </small>
            <small class="text-muted"><i class="bi bi-calendar"></i> Target: ${formatDateDisplay(target.endDate)}</small>
          </div>
        </div>
        
        ${!isAchieved && remaining > 0 && today <= end ? `
          <div class="alert alert-info mt-3 mb-0 py-2">
            <i class="bi bi-info-circle"></i>
            <small>Butuh menabung sekitar ${formatNumberRp(Math.ceil(remaining / daysLeft))} per hari untuk mencapai target tepat waktu</small>
          </div>
        ` : ''}
        
        ${isAchieved ? `
          <div class="alert alert-success mt-3 mb-0 py-2">
            <i class="bi bi-trophy-fill"></i>
            <small>🎉 Selamat! Target tabungan telah tercapai!</small>
          </div>
        ` : ''}
        
        ${today > end && !isAchieved ? `
          <div class="alert alert-warning mt-3 mb-0 py-2">
            <i class="bi bi-exclamation-triangle"></i>
            <small>⚠️ Waktu target telah berakhir namun target belum tercapai. Perpanjang periode atau tingkatkan tabungan!</small>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Add saving target to Firebase
export async function addSavingTarget() {
  console.log("=== addSavingTarget called ===");
  
  const startDate = document.getElementById('targetStartDate')?.value;
  const endDate = document.getElementById('targetEndDate')?.value;
  const amount = parseInt(document.getElementById('targetAmount')?.value);
  
  console.log("Form values:", { startDate, endDate, amount });
  
  if (!startDate) {
    showNotif('Pilih tanggal mulai menabung', true);
    return;
  }
  if (!endDate) {
    showNotif('Pilih tanggal target selesai', true);
    return;
  }
  if (new Date(endDate) <= new Date(startDate)) {
    showNotif('Tanggal target selesai harus setelah tanggal mulai', true);
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showNotif('Target nominal harus diisi dan lebih dari 0', true);
    return;
  }
  
  // Generate unique ID
  const targetId = `target_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log("Generated targetId:", targetId);
  
  // Get existing settings from Firebase
  const settingsRef = ref(db, 'data/settings');
  console.log("Fetching existing settings...");
  
  const snapshot = await get(settingsRef);
  const currentSettings = snapshot.val() || {};
  console.log("Current settings:", currentSettings);
  
  let currentTargets = currentSettings.savingTargets || {};
  console.log("Current targets:", currentTargets);
  
  // Add new target
  currentTargets[targetId] = {
    startDate: startDate,
    endDate: endDate,
    amount: amount,
    createdAt: Date.now()
  };
  
  console.log("New targets object:", currentTargets);
  
  // Save to Firebase
  try {
    await update(ref(db, 'data/settings'), { savingTargets: currentTargets });
    console.log("Successfully saved to Firebase!");
    showNotif(`✅ Target ${formatNumberRp(amount)} dari ${formatMonthYearDisplay(startDate)} sampai ${formatMonthYearDisplay(endDate)} ditambahkan!`);
    
    // Reset form
    const startDateInput = document.getElementById('targetStartDate');
    const endDateInput = document.getElementById('targetEndDate');
    const amountInput = document.getElementById('targetAmount');
    
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (amountInput) amountInput.value = '';
    
    // Refresh data dari Firebase
    await refreshDataFromFirebase();
    
    // Refresh semua tampilan
    if (window.renderAll) window.renderAll();
    loadSavingTargets();
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    showNotif('Gagal menyimpan target: ' + error.message, true);
  }
}

// Refresh data dari Firebase
async function refreshDataFromFirebase() {
  console.log("Refreshing data from Firebase...");
  try {
    const snapshot = await get(ref(db, 'data/'));
    const freshData = snapshot.val() || { 
      visions: {}, 
      plans: {}, 
      finances: {}, 
      settings: {}, 
      comments: {}, 
      likes: {}, 
      moments: {} 
    };
    
    console.log("Fresh data from Firebase:", freshData);
    console.log("Settings:", freshData.settings);
    console.log("Saving targets:", freshData.settings?.savingTargets);
    
    // Update masterData di kedua tempat
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

// Edit saving target
export async function editSavingTarget(id) {
  console.log("=== editSavingTarget called for id:", id);
  
  // Get existing settings from Firebase
  const settingsRef = ref(db, 'data/settings');
  const snapshot = await get(settingsRef);
  const currentSettings = snapshot.val() || {};
  const currentTargets = currentSettings.savingTargets || {};
  const target = currentTargets[id];
  
  if (!target) {
    showNotif('Target tidak ditemukan', true);
    return;
  }
  
  const newAmount = prompt(`Edit target nominal (Rp):`, target.amount);
  if (newAmount && !isNaN(parseInt(newAmount)) && parseInt(newAmount) > 0) {
    currentTargets[id].amount = parseInt(newAmount);
    currentTargets[id].updatedAt = Date.now();
    
    try {
      await update(ref(db, 'data/settings'), { savingTargets: currentTargets });
      showNotif('✅ Target berhasil diupdate!');
      
      // Refresh data dari Firebase
      await refreshDataFromFirebase();
      
      if (window.renderAll) window.renderAll();
      loadSavingTargets();
    } catch (error) {
      console.error("Error updating target:", error);
      showNotif('Gagal mengupdate target: ' + error.message, true);
    }
  }
}

// Delete saving target
export async function deleteSavingTarget(id) {
  console.log("=== deleteSavingTarget called for id:", id);
  
  if (confirm(`Hapus target tabungan ini?`)) {
    // Get existing settings from Firebase
    const settingsRef = ref(db, 'data/settings');
    const snapshot = await get(settingsRef);
    const currentSettings = snapshot.val() || {};
    const currentTargets = currentSettings.savingTargets || {};
    
    delete currentTargets[id];
    
    try {
      await update(ref(db, 'data/settings'), { savingTargets: currentTargets });
      showNotif('🗑️ Target berhasil dihapus');
      
      // Refresh data dari Firebase
      await refreshDataFromFirebase();
      
      if (window.renderAll) window.renderAll();
      loadSavingTargets();
    } catch (error) {
      console.error("Error deleting target:", error);
      showNotif('Gagal menghapus target: ' + error.message, true);
    }
  }
}

// Update ringkasan tabungan
function updateSavingsSummary() {
  const data = window.masterData || masterData;
  const finances = data?.finances || {};
  let totalWedding = 0;
  let fachmiTotal = 0;
  let azizahTotal = 0;
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding') {
      totalWedding += f.amt;
      if (f.user === 'FACHMI') fachmiTotal += f.amt;
      else if (f.user === 'AZIZAH') azizahTotal += f.amt;
    }
  });
  
  const totalWeddingEl = document.getElementById('totalWeddingSummary');
  const fachmiTotalEl = document.getElementById('fachmiTotal');
  const azizahTotalEl = document.getElementById('azizahTotal');
  
  if (totalWeddingEl) totalWeddingEl.innerHTML = formatNumberRp(totalWedding);
  if (fachmiTotalEl) fachmiTotalEl.innerHTML = formatNumberRp(fachmiTotal);
  if (azizahTotalEl) azizahTotalEl.innerHTML = formatNumberRp(azizahTotal);
}

// Set default date to today
function setDefaultDate() {
  const dateInput = document.getElementById("fDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// Save tabungan (otomatis masuk ke target periode yang aktif)
export async function saveFinance() {
  const desc = document.getElementById("fDesc")?.value.trim();
  const amt = parseInt(document.getElementById("fAmt")?.value);
  const date = document.getElementById("fDate")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!desc) { showNotif("Keterangan harus diisi", true); return; }
  if (isNaN(amt) || amt <= 0) { showNotif("Nominal harus lebih dari 0", true); return; }
  if (!date) { showNotif("Tanggal harus dipilih", true); return; }
  
  // Get saving targets dari data terbaru
  const data = window.masterData || masterData;
  const savingTargets = data?.settings?.savingTargets || {};
  
  // Cari target periode yang mencakup tanggal ini
  let activeTarget = null;
  let activeTargetId = null;
  
  for (const [id, target] of Object.entries(savingTargets)) {
    if (date >= target.startDate && date <= target.endDate) {
      activeTarget = target;
      activeTargetId = id;
      break;
    }
  }
  
  if (window.editFinanceId) {
    await update(ref(db, `data/finances/${window.editFinanceId}`), { date, desc, amt, type: 'wedding' });
    showNotif("✅ Tabungan berhasil diupdate");
    window.editFinanceId = null;
    const btnSaveFinance = document.getElementById("btnSaveFinance");
    if (btnSaveFinance) btnSaveFinance.innerHTML = "<i class='bi bi-save me-1'></i> Catat";
  } else {
    await push(ref(db, "data/finances"), { user: currentUser, date, desc, amt, type: 'wedding' });
    
    if (activeTarget) {
      // Hitung ulang total setelah save
      await refreshDataFromFirebase();
      const totalSaved = calculateTotalInPeriod(activeTarget.startDate, activeTarget.endDate);
      const remaining = activeTarget.amount - totalSaved;
      
      if (totalSaved >= activeTarget.amount) {
        showNotif(`🎉 Selamat! Target tabungan dari ${formatMonthYearDisplay(activeTarget.startDate)} sampai ${formatMonthYearDisplay(activeTarget.endDate)} telah tercapai! 🎉`);
      } else {
        showNotif(`💰 Tabungan Rp ${amt.toLocaleString()} berhasil dicatat! Sisa target: ${formatNumberRp(remaining)}`);
      }
    } else {
      showNotif(`💰 Tabungan Rp ${amt.toLocaleString()} berhasil dicatat!`);
      
      if (Object.keys(savingTargets).length > 0) {
        showNotif(`⚠️ Tabungan ini tidak termasuk dalam periode target manapun. Periksa tanggal target Anda.`);
      } else {
        showNotif(`💡 Tips: Buat target tabungan dengan periode tertentu untuk memantau progress!`);
      }
    }
  }
  
  // Reset form
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  if (fDescEl) fDescEl.value = "";
  if (fAmtEl) fAmtEl.value = "";
  
  // Refresh semua tampilan
  await refreshDataFromFirebase();
  if (window.renderAll) window.renderAll();
  loadSavingTargets();
  updateSavingsSummary();
}

// Edit tabungan
export function editFinance(id) {
  const data = window.masterData || masterData;
  const f = data?.finances?.[id];
  if (!f) return;
  
  const fDateEl = document.getElementById("fDate");
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  const btnSaveFinance = document.getElementById("btnSaveFinance");
  
  if (fDateEl) fDateEl.value = f.date;
  if (fDescEl) fDescEl.value = f.desc;
  if (fAmtEl) fAmtEl.value = f.amt;
  window.editFinanceId = id;
  if (btnSaveFinance) btnSaveFinance.innerHTML = "<i class='bi bi-pencil me-1'></i> Update";
  
  // Scroll ke form
  document.getElementById('financial-page')?.scrollIntoView({ behavior: 'smooth' });
}

// Render riwayat tabungan
export function renderFinances() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const fTableEl = document.getElementById("fTable");
  if (!fTableEl) return;
  
  const filterVal = document.getElementById("financeFilter")?.value || "all";
  const finances = data.finances ? Object.entries(data.finances) : [];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  let filteredFinances = finances.filter(([id, f]) => f.type === 'wedding');
  
  if (filterVal === 'thisMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === currentMonth);
  } else if (filterVal === 'lastMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === lastMonthStr);
  }
  
  if (filteredFinances.length === 0) {
    fTableEl.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          Belum ada data tabungan
        </td>
      </tr>
    `;
  } else {
    // Get saving targets
    const savingTargets = data.settings?.savingTargets || {};
    
    fTableEl.innerHTML = filteredFinances
      .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
      .map(([id, f]) => {
        // Cek apakah tabungan termasuk dalam target periode
        let inTarget = false;
        for (const target of Object.values(savingTargets)) {
          if (f.date >= target.startDate && f.date <= target.endDate) {
            inTarget = true;
            break;
          }
        }
        
        return `
        <tr>
          <td><span class="badge ${f.user === "FACHMI" ? "badge-fachmi" : "badge-azizah"}">${escapeHtml(f.user)}</span>${inTarget ? ' <i class="bi bi-check-circle-fill text-success" title="Termasuk dalam target periode"></i>' : ''}</td>
          <td class="text-nowrap">${formatDateDisplay(f.date)}</td>
          <td class="text-wrap">${escapeHtml(f.desc)}</td>
          <td class="fw-semibold text-success text-nowrap">${formatNumberRp(f.amt)}</td>
          <td class="text-nowrap">
            <i class="bi bi-pencil-square text-primary me-2" onclick="window.editFinance('${id}')" style="cursor: pointer; font-size: 1.1rem;"></i>
            <i class="bi bi-trash3 text-danger" onclick="window.deleteItem('finances','${id}')" style="cursor: pointer; font-size: 1.1rem;"></i>
           </td>
        </tr>
      `}).join("");
  }
  
  const filterInfoEl = document.getElementById("filterInfo");
  if (filterInfoEl) {
    let filterText = filterVal === "all" ? "Menampilkan semua riwayat tabungan" : 
                     filterVal === "thisMonth" ? `Menampilkan tabungan bulan ini` : 
                     "Menampilkan tabungan bulan lalu";
    filterInfoEl.innerHTML = `<i class="bi bi-info-circle"></i> ${filterText}`;
  }
  
  updateSavingsSummary();
}

// Save target total pernikahan (untuk kompatibilitas dengan dashboard)
export async function saveWeddingTarget() {
  const val = parseInt(document.getElementById("weddingTargetInput")?.value);
  if (isNaN(val) || val <= 0) { 
    showNotif("Target harus angka >0", true); 
    return; 
  }
  await update(ref(db, "data/settings"), { weddingTarget: val });
  showNotif("✅ Target total pernikahan diperbarui!");
  if (window.renderAll) window.renderAll();
}

// Start realtime data listener
export function startFinancialDataListener() {
  if (financialDataListener) return;
  
  console.log("Starting financial data listener...");
  const dataRef = ref(db, 'data/');
  financialDataListener = onValue(dataRef, (snapshot) => {
    const data = snapshot.val() || { 
      visions: {}, 
      plans: {}, 
      finances: {}, 
      settings: {}, 
      comments: {}, 
      likes: {}, 
      moments: {} 
    };
    
    if (window.setMasterData) {
      window.setMasterData(data);
    }
    window.masterData = data;
    
    // Hanya refresh jika halaman financial sedang aktif
    const financialPage = document.getElementById('financial-page');
    if (financialPage && financialPage.style.display !== 'none') {
      console.log("Data changed, refreshing financial page...");
      loadSavingTargets();
      updateSavingsSummary();
      if (window.renderFinances) window.renderFinances();
    }
  });
}

// Inisialisasi halaman keuangan
export async function initFinancialPage() {
  console.log("=== initFinancialPage called ===");
  
  // Pastikan kita punya data terbaru dari Firebase
  const snapshot = await get(ref(db, 'data/'));
  const freshData = snapshot.val() || { 
    visions: {}, 
    plans: {}, 
    finances: {}, 
    settings: {}, 
    comments: {}, 
    likes: {}, 
    moments: {} 
  };
  
  // Update masterData
  if (window.setMasterData) {
    window.setMasterData(freshData);
  }
  window.masterData = freshData;
  
  console.log("Fresh data settings:", freshData.settings);
  console.log("Saving targets:", freshData.settings?.savingTargets);
  
  // Load saving targets
  loadSavingTargets();
  
  // Set default date
  setDefaultDate();
  
  // Update summary
  updateSavingsSummary();
  
  // Render finances table
  if (window.renderFinances) {
    window.renderFinances();
  }
}

// Export semua fungsi ke window
export function setupFinancialExports() {
  window.renderFinances = renderFinances;
  window.editFinance = editFinance;
  window.addSavingTarget = addSavingTarget;
  window.editSavingTarget = editSavingTarget;
  window.deleteSavingTarget = deleteSavingTarget;
  window.saveWeddingTarget = saveWeddingTarget;
  window.initFinancialPage = initFinancialPage;
  window.loadSavingTargets = loadSavingTargets;
  window.saveFinance = saveFinance;
}

// Start listener saat file dimuat
if (typeof window !== 'undefined') {
  setupFinancialExports();
  startFinancialDataListener();
}

// Inisialisasi saat DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah halaman financial aktif saat load
    const financialPage = document.getElementById('financial-page');
    if (financialPage && financialPage.style.display !== 'none') {
      initFinancialPage();
    }
  });
} else {
  const financialPage = document.getElementById('financial-page');
  if (financialPage && financialPage.style.display !== 'none') {
    initFinancialPage();
  }
}
