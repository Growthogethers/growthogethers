// js/financial.js - Fokus Tabungan Pernikahan dengan Target Bulanan
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml } from './utils.js';

// State untuk target per bulan
let monthlyTargets = {};

// Load monthly targets
function loadMonthlyTargets() {
  const settings = masterData?.settings || {};
  monthlyTargets = settings.monthlyTargets || {};
  renderMonthlyTargets();
}

// Format month display
function formatMonthDisplay(month) {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const [year, monthNum] = month.split('-');
  return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
}

// Render target bulanan dengan progress bar
function renderMonthlyTargets() {
  const container = document.getElementById('monthlyTargetsList');
  if (!container) return;
  
  const targets = Object.entries(monthlyTargets).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (targets.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-muted"><i class="bi bi-inbox fs-1"></i><p class="mt-2 mb-0">✨ Belum ada target bulanan</p><small>Tambah target di bawah</small></div>';
    return;
  }
  
  // Hitung pencapaian per bulan dari data tabungan
  const finances = masterData?.finances || {};
  const weddingSavings = {};
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date) {
      const month = f.date.substring(0, 7);
      weddingSavings[month] = (weddingSavings[month] || 0) + f.amt;
    }
  });
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  container.innerHTML = targets.map(([month, target]) => {
    const saved = weddingSavings[month] || 0;
    const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const isAchieved = saved >= target;
    
    const [year, monthNum] = month.split('-');
    const monthName = monthNames[parseInt(monthNum) - 1];
    
    return `
      <div class="target-item mb-3 p-3 bg-light rounded-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-calendar-month fs-5 ${isAchieved ? 'text-success' : 'text-primary'}"></i>
            <span class="fw-bold">${monthName} ${year}</span>
            <span class="badge ${isAchieved ? 'bg-success' : 'bg-warning'}">
              ${isAchieved ? '✓ Tercapai' : `${Math.round(percent)}%`}
            </span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="window.editMonthlyTarget('${month}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteMonthlyTarget('${month}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="progress mb-2" style="height: 10px; border-radius: 10px;">
          <div class="progress-bar ${isAchieved ? 'bg-success' : 'bg-primary'}" style="width: ${percent}%; border-radius: 10px;"></div>
        </div>
        <div class="d-flex justify-content-between small">
          <span>Target: ${formatNumberRp(target)}</span>
          <span>Terkumpul: ${formatNumberRp(saved)}</span>
          <span class="${isAchieved ? 'text-success fw-bold' : 'text-muted'}">
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
    showNotif('Pilih bulan target terlebih dahulu', true);
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showNotif('Target nominal harus diisi dan lebih dari 0', true);
    return;
  }
  
  const currentTargets = masterData?.settings?.monthlyTargets || {};
  
  // Cek apakah target untuk bulan ini sudah ada
  if (currentTargets[month]) {
    if (confirm(`Target untuk bulan ${formatMonthDisplay(month)} sudah ada. Apakah Anda ingin menggantinya?`)) {
      currentTargets[month] = amount;
    } else {
      return;
    }
  } else {
    currentTargets[month] = amount;
  }
  
  await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
  showNotif(`✅ Target ${formatNumberRp(amount)} untuk bulan ${formatMonthDisplay(month)} ditambahkan!`);
  
  // Reset form
  document.getElementById('targetMonth').value = '';
  document.getElementById('targetAmount').value = '';
  
  // Refresh semua tampilan
  if (window.renderAll) window.renderAll();
  loadMonthlyTargets();
}

// Edit monthly target
export async function editMonthlyTarget(month) {
  const currentAmount = monthlyTargets[month];
  const newAmount = prompt(`Edit target untuk bulan ${formatMonthDisplay(month)}:`, currentAmount);
  
  if (newAmount && !isNaN(parseInt(newAmount)) && parseInt(newAmount) > 0) {
    const currentTargets = masterData?.settings?.monthlyTargets || {};
    currentTargets[month] = parseInt(newAmount);
    await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
    showNotif('✅ Target berhasil diupdate!');
    if (window.renderAll) window.renderAll();
    loadMonthlyTargets();
  }
}

// Delete monthly target
export async function deleteMonthlyTarget(month) {
  if (confirm(`Hapus target untuk bulan ${formatMonthDisplay(month)}?`)) {
    const currentTargets = masterData?.settings?.monthlyTargets || {};
    delete currentTargets[month];
    await update(ref(db, 'data/settings'), { monthlyTargets: currentTargets });
    showNotif('🗑️ Target berhasil dihapus');
    if (window.renderAll) window.renderAll();
    loadMonthlyTargets();
  }
}

// Update ringkasan tabungan
function updateSavingsSummary() {
  const finances = masterData?.finances || {};
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

// Format tanggal display
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

// Set default date to today
function setDefaultDate() {
  const dateInput = document.getElementById("fDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// Save tabungan (otomatis masuk ke bulan yang dipilih)
export async function saveFinance() {
  const desc = document.getElementById("fDesc")?.value.trim();
  const amt = parseInt(document.getElementById("fAmt")?.value);
  const date = document.getElementById("fDate")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!desc) { showNotif("Keterangan harus diisi", true); return; }
  if (isNaN(amt) || amt <= 0) { showNotif("Nominal harus lebih dari 0", true); return; }
  if (!date) { showNotif("Tanggal harus dipilih", true); return; }
  
  // Ambil bulan dari tanggal yang dipilih
  const selectedMonth = date.substring(0, 7);
  const targetForMonth = monthlyTargets[selectedMonth];
  
  if (window.editFinanceId) {
    await update(ref(db, `data/finances/${window.editFinanceId}`), { date, desc, amt, type: 'wedding' });
    showNotif("✅ Tabungan berhasil diupdate");
    window.editFinanceId = null;
    const btnSaveFinance = document.getElementById("btnSaveFinance");
    if (btnSaveFinance) btnSaveFinance.innerHTML = "<i class='bi bi-save me-1'></i> Catat";
  } else {
    await push(ref(db, "data/finances"), { user: currentUser, date, desc, amt, type: 'wedding' });
    
    // Cek target bulanan setelah menyimpan
    if (targetForMonth) {
      // Hitung total tabungan di bulan ini setelah ditambah
      const finances = masterData?.finances || {};
      let totalThisMonth = amt;
      Object.values(finances).forEach(f => {
        if (f.type === 'wedding' && f.date?.substring(0, 7) === selectedMonth) {
          totalThisMonth += f.amt;
        }
      });
      
      const remaining = targetForMonth - totalThisMonth;
      
      if (totalThisMonth >= targetForMonth) {
        showNotif(`🎉 Selamat! Target bulan ${formatMonthDisplay(selectedMonth)} telah tercapai! 🎉`);
      } else {
        showNotif(`💰 Tabungan Rp ${amt.toLocaleString()} berhasil dicatat! Sisa target ${formatMonthDisplay(selectedMonth)}: ${formatNumberRp(remaining)}`);
      }
    } else {
      showNotif(`💰 Tabungan Rp ${amt.toLocaleString()} berhasil dicatat!`);
      
      // Informasi jika belum ada target untuk bulan ini
      if (Object.keys(monthlyTargets).length > 0) {
        showNotif(`⚠️ Belum ada target untuk bulan ${formatMonthDisplay(selectedMonth)}. Buat target agar progress terpantau!`);
      }
    }
  }
  
  // Reset form
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  if (fDescEl) fDescEl.value = "";
  if (fAmtEl) fAmtEl.value = "";
  
  // Refresh semua tampilan
  if (window.renderAll) window.renderAll();
  loadMonthlyTargets();
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
  
  // Highlight form
  const formCard = document.querySelector('#financial-page .card:nth-child(3)');
  if (formCard) {
    formCard.style.border = '2px solid #6366f1';
    setTimeout(() => {
      formCard.style.border = 'none';
    }, 2000);
  }
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
  
  // Filter berdasarkan pilihan
  let filteredFinances = finances.filter(([id, f]) => f.type === 'wedding');
  
  if (filterVal === 'thisMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === currentMonth);
  } else if (filterVal === 'lastMonth') {
    filteredFinances = filteredFinances.filter(([id, f]) => f.date?.substring(0, 7) === lastMonthStr);
  } else if (filterVal === 'target') {
    // Filter yang mencapai target bulanan
    const achievedMonths = {};
    Object.entries(monthlyTargets).forEach(([month, target]) => {
      const monthSaved = finances.filter(([id, f]) => f.date?.substring(0, 7) === month).reduce((sum, [id, f]) => sum + f.amt, 0);
      if (monthSaved >= target) achievedMonths[month] = true;
    });
    filteredFinances = filteredFinances.filter(([id, f]) => achievedMonths[f.date?.substring(0, 7)]);
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
    fTableEl.innerHTML = filteredFinances
      .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
      .map(([id, f]) => {
        // Tentukan bulan dari tanggal
        const monthKey = f.date?.substring(0, 7);
        const targetForThisMonth = monthlyTargets[monthKey];
        const isTargetAchieved = targetForThisMonth ? (() => {
          let monthTotal = 0;
          finances.forEach(([tid, tf]) => {
            if (tf.type === 'wedding' && tf.date?.substring(0, 7) === monthKey) {
              monthTotal += tf.amt;
            }
          });
          return monthTotal >= targetForThisMonth;
        })() : false;
        
        return `
        <tr>
          <td><span class="badge ${f.user === "FACHMI" ? "badge-fachmi" : "badge-azizah"}">${escapeHtml(f.user)}</span>${targetForThisMonth && isTargetAchieved ? ' <i class="bi bi-trophy-fill text-warning" title="Membantu mencapai target bulan ini"></i>' : ''}</td>
          <td class="text-nowrap">${formatDateDisplay(f.date)}</td>
          <td>${escapeHtml(f.desc)}</td>
          <td class="fw-semibold text-success text-nowrap">${formatNumberRp(f.amt)}</td>
          <td class="text-nowrap">
            <i class="bi bi-pencil-square text-primary me-2" onclick="window.editFinance('${id}')" style="cursor: pointer; font-size: 1.1rem;"></i>
            <i class="bi bi-trash3 text-danger" onclick="window.deleteItem('finances','${id}')" style="cursor: pointer; font-size: 1.1rem;"></i>
          </td>
        </tr>
      `}).join("");
  }
  
  // Tampilkan informasi filter
  const filterInfoEl = document.getElementById("filterInfo");
  if (filterInfoEl) {
    let filterText = "";
    switch(filterVal) {
      case "all":
        filterText = "Menampilkan semua riwayat tabungan";
        break;
      case "thisMonth":
        filterText = `Menampilkan tabungan bulan ${formatDateDisplay(currentMonth + "-01")}`;
        break;
      case "lastMonth":
        filterText = `Menampilkan tabungan bulan ${formatDateDisplay(lastMonthStr + "-01")}`;
        break;
      case "target":
        filterText = "Menampilkan tabungan yang membantu mencapai target bulanan";
        break;
      default:
        filterText = "Semua riwayat tabungan";
    }
    filterInfoEl.innerHTML = `<i class="bi bi-info-circle"></i> ${filterText}`;
  }
  
  // Update total tabungan di card info
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

// Export ke window
window.renderFinances = renderFinances;
window.editFinance = editFinance;
window.addMonthlyTarget = addMonthlyTarget;
window.editMonthlyTarget = editMonthlyTarget;
window.deleteMonthlyTarget = deleteMonthlyTarget;
window.saveWeddingTarget = saveWeddingTarget;

// Inisialisasi halaman keuangan
export function initFinancialPage() {
  loadMonthlyTargets();
  setDefaultDate();
  updateSavingsSummary();
}

// Inisialisasi
if (typeof window !== 'undefined') {
  window.initFinancialPage = initFinancialPage;
}
