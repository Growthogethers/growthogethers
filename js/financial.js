// js/financial.js - Fokus Tabungan Nikah
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml } from './utils.js';

// State untuk target bulanan
let monthlyTargets = {};

// Load monthly targets
function loadMonthlyTargets() {
  const settings = masterData?.settings || {};
  monthlyTargets = settings.monthlyTargets || {};
  renderMonthlyTargets();
}

// Render target bulanan
function renderMonthlyTargets() {
  const container = document.getElementById('monthlyTargetsList');
  if (!container) return;
  
  const targets = Object.entries(monthlyTargets).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (targets.length === 0) {
    container.innerHTML = '<div class="text-muted text-center py-3">✨ Belum ada target bulanan. Tambah target di atas!</div>';
    return;
  }
  
  // Hitung pencapaian per bulan
  const finances = masterData?.finances || {};
  const weddingSavings = {};
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date) {
      const month = f.date.substring(0, 7);
      weddingSavings[month] = (weddingSavings[month] || 0) + f.amt;
    }
  });
  
  container.innerHTML = targets.map(([month, target]) => {
    const saved = weddingSavings[month] || 0;
    const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const isAchieved = saved >= target;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const [year, monthNum] = month.split('-');
    const monthName = monthNames[parseInt(monthNum) - 1];
    
    return `
      <div class="mb-3 p-3 bg-light rounded-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div>
            <span class="fw-bold">${monthName} ${year}</span>
            <span class="badge ${isAchieved ? 'bg-success' : 'bg-warning'} ms-2">
              ${isAchieved ? '✓ Tercapai' : `${Math.round(percent)}%`}
            </span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="editMonthlyTarget('${month}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMonthlyTarget('${month}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="progress mb-2" style="height: 8px;">
          <div class="progress-bar ${isAchieved ? 'bg-success' : 'bg-primary'}" style="width: ${percent}%"></div>
        </div>
        <div class="d-flex justify-content-between small">
          <span>Target: ${formatNumberRp(target)}</span>
          <span>Terkumpul: ${formatNumberRp(saved)}</span>
          <span class="${isAchieved ? 'text-success' : 'text-muted'}">
            ${isAchieved ? '🎉 Target tercapai!' : `Kurang ${formatNumberRp(target - saved)}`}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Add monthly target
export async function addMonthlyTarget() {
  const month = document.getElementById('targetMonth')?.value;
  const amount = parseInt(document.getElementById('targetAmount')?.value);
  
  if (!month) {
    showNotif('Pilih bulan terlebih dahulu', true);
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showNotif('Target harus angka > 0', true);
    return;
  }
  
  const currentTargets = masterData?.settings?.monthlyTargets || {};
  currentTargets[month] = amount;
  
  await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
  showNotif(`Target ${formatNumberRp(amount)} untuk bulan ${month} ditambahkan!`);
  
  // Reset form
  document.getElementById('targetMonth').value = '';
  document.getElementById('targetAmount').value = '';
  
  // Refresh
  if (window.renderAll) window.renderAll();
  loadMonthlyTargets();
}

// Edit monthly target
export async function editMonthlyTarget(month) {
  const currentAmount = monthlyTargets[month];
  const newAmount = prompt(`Edit target untuk bulan ${month}:`, currentAmount);
  
  if (newAmount && !isNaN(parseInt(newAmount)) && parseInt(newAmount) > 0) {
    const currentTargets = masterData?.settings?.monthlyTargets || {};
    currentTargets[month] = parseInt(newAmount);
    await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
    showNotif('Target berhasil diupdate!');
    if (window.renderAll) window.renderAll();
    loadMonthlyTargets();
  }
}

// Delete monthly target
export async function deleteMonthlyTarget(month) {
  if (confirm(`Hapus target untuk bulan ${month}?`)) {
    const currentTargets = masterData?.settings?.monthlyTargets || {};
    delete currentTargets[month];
    await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
    showNotif('Target dihapus');
    if (window.renderAll) window.renderAll();
    loadMonthlyTargets();
  }
}

// Show target summary
export function showTargetSummary() {
  const targets = monthlyTargets;
  const finances = masterData?.finances || {};
  const weddingSavings = {};
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date) {
      const month = f.date.substring(0, 7);
      weddingSavings[month] = (weddingSavings[month] || 0) + f.amt;
    }
  });
  
  let totalTarget = 0;
  let totalSaved = 0;
  let achievedCount = 0;
  let totalMonths = Object.keys(targets).length;
  
  Object.entries(targets).forEach(([month, target]) => {
    const saved = weddingSavings[month] || 0;
    totalTarget += target;
    totalSaved += Math.min(saved, target);
    if (saved >= target) achievedCount++;
  });
  
  const overallPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  
  alert(`📊 RINGKASAN TARGET BULANAN\n\n` +
    `Total target: ${formatNumberRp(totalTarget)}\n` +
    `Total tercapai: ${formatNumberRp(totalSaved)}\n` +
    `Persentase overall: ${Math.round(overallPercent)}%\n` +
    `Target tercapai: ${achievedCount} dari ${totalMonths} bulan\n\n` +
    `${overallPercent >= 80 ? '🎉 Selamat! Progress sangat baik!' : '💪 Semangat terus menabung!'}`);
}

export async function saveFinance() {
  const desc = document.getElementById("fDesc")?.value.trim();
  const amt = parseInt(document.getElementById("fAmt")?.value);
  const date = document.getElementById("fDate")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!desc) { showNotif("Keterangan harus diisi", true); return; }
  if (isNaN(amt) || amt <= 0) { showNotif("Nominal harus >0", true); return; }
  
  if (window.editFinanceId) {
    await update(ref(db, `data/finances/${window.editFinanceId}`), { date, desc, amt, type: 'wedding' });
    showNotif("Tabungan diupdate");
    window.editFinanceId = null;
    const btnSaveFinance = document.getElementById("btnSaveFinance");
    if (btnSaveFinance) btnSaveFinance.innerText = "Catat";
  } else {
    await push(ref(db, "data/finances"), { user: currentUser, date, desc, amt, type: 'wedding' });
    showNotif("Tabungan dicatat! 💰");
  }
  
  // Reset form
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  if (fDescEl) fDescEl.value = "";
  if (fAmtEl) fAmtEl.value = "";
  if (!document.getElementById("fDate").value) {
    document.getElementById("fDate").value = new Date().toISOString().split('T')[0];
  }
  
  // Refresh semua tampilan
  if (window.renderAll) window.renderAll();
  loadMonthlyTargets();
}

export async function saveWeddingTarget() {
  const val = parseInt(document.getElementById("weddingTargetInput")?.value);
  if (isNaN(val) || val <= 0) { showNotif("Target harus angka >0", true); return; }
  await update(ref(db, "data/settings"), { weddingTarget: val });
  showNotif("Target total pernikahan diperbarui!");
  if (window.renderAll) window.renderAll();
}

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
  if (btnSaveFinance) btnSaveFinance.innerText = "Update";
}

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
  
  // Hitung target per bulan untuk filter
  const monthlyTargetsData = data.settings?.monthlyTargets || {};
  
  let filteredFinances = finances.filter(([id, f]) => f.type === 'wedding');
  
  if (filterVal === 'thisMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === currentMonth);
  } else if (filterVal === 'lastMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === lastMonthStr);
  } else if (filterVal === 'target') {
    // Filter yang mencapai target bulanan
    const achievedMonths = {};
    Object.entries(monthlyTargetsData).forEach(([month, target]) => {
      const monthSaved = finances.filter(([id, f]) => f.date?.substring(0, 7) === month).reduce((sum, [id, f]) => sum + f.amt, 0);
      if (monthSaved >= target) achievedMonths[month] = true;
    });
    filteredFinances = filteredFinances.filter(([id, f]) => achievedMonths[f.date?.substring(0, 7)]);
  }
  
  fTableEl.innerHTML = filteredFinances
    .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
    .map(([id, f]) => `
      <tr>
        <td><span class="badge ${f.user === "FACHMI" ? "badge-fachmi" : "badge-azizah"}">${escapeHtml(f.user)}</span></td>
        <td>${escapeHtml(f.date)}</td>
        <td>${escapeHtml(f.desc)}</td>
        <td>${formatNumberRp(f.amt)}</td>
        <td>
          <i class="bi bi-pencil text-primary me-2" onclick="window.editFinance('${id}')"></i>
          <i class="bi bi-trash text-danger" onclick="window.deleteItem('finances','${id}')"></i>
         </td>
        </tr>
    `).join("");
  
  const filterInfoEl = document.getElementById("filterInfo");
  if (filterInfoEl) {
    const filterText = filterVal === "all" ? "Menampilkan semua tabungan" : 
                       (filterVal === "thisMonth" ? "Menampilkan tabungan bulan ini" : 
                       (filterVal === "lastMonth" ? "Menampilkan tabungan bulan lalu" : "Menampilkan bulan yang mencapai target"));
    filterInfoEl.innerText = filterText;
  }
}

// Export ke window
window.renderFinances = renderFinances;
window.editFinance = editFinance;
window.addMonthlyTarget = addMonthlyTarget;
window.editMonthlyTarget = editMonthlyTarget;
window.deleteMonthlyTarget = deleteMonthlyTarget;
window.showTargetSummary = showTargetSummary;

// Load targets on init
export function initFinancialPage() {
  loadMonthlyTargets();
}

// Inisialisasi
if (typeof window !== 'undefined') {
  window.initFinancialPage = initFinancialPage;
}
