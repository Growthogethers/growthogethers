// js/financial.js
import { db, ref, push, update, remove } from './firebase-config.js';
import { showNotif, masterData, formatNumberRp, escapeHtml } from './utils.js';

export async function saveFinance() {
  const desc = document.getElementById("fDesc")?.value.trim();
  const amt = parseInt(document.getElementById("fAmt")?.value);
  const date = document.getElementById("fDate")?.value;
  const type = document.getElementById("fType")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!desc) { showNotif("Keterangan harus diisi", true); return; }
  if (isNaN(amt) || amt <= 0) { showNotif("Nominal harus >0", true); return; }
  
  if (window.editFinanceId) {
    await update(ref(db, `data/finances/${window.editFinanceId}`), { date, desc, amt, type });
    showNotif("Update transaksi");
    window.editFinanceId = null;
    const btnSaveFinance = document.getElementById("btnSaveFinance");
    if (btnSaveFinance) btnSaveFinance.innerText = "Catat";
  } else {
    await push(ref(db, "data/finances"), { user: currentUser, date, desc, amt, type });
    showNotif("Transaksi dicatat");
  }
  
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  const targetWeddingFieldEl = document.getElementById("targetWeddingField");
  if (fDescEl) fDescEl.value = "";
  if (fAmtEl) fAmtEl.value = "";
  if (targetWeddingFieldEl) targetWeddingFieldEl.style.display = "none";
  
  // Refresh tampilan
  if (window.renderAll) window.renderAll();
}

export async function saveWeddingTarget() {
  const val = parseInt(document.getElementById("weddingTargetInput")?.value);
  if (isNaN(val) || val <= 0) { showNotif("Target harus angka >0", true); return; }
  await update(ref(db, "data/settings"), { weddingTarget: val });
  showNotif("Target tabungan diperbarui!");
  if (window.renderAll) window.renderAll();
}

export function editFinance(id) {
  const data = window.masterData || masterData;
  const f = data?.finances?.[id];
  if (!f) return;
  
  const fDateEl = document.getElementById("fDate");
  const fDescEl = document.getElementById("fDesc");
  const fAmtEl = document.getElementById("fAmt");
  const fTypeEl = document.getElementById("fType");
  const btnSaveFinance = document.getElementById("btnSaveFinance");
  const targetWeddingFieldEl = document.getElementById("targetWeddingField");
  
  if (fDateEl) fDateEl.value = f.date;
  if (fDescEl) fDescEl.value = f.desc;
  if (fAmtEl) fAmtEl.value = f.amt;
  if (fTypeEl) fTypeEl.value = f.type;
  window.editFinanceId = id;
  if (btnSaveFinance) btnSaveFinance.innerText = "Update";
  if (targetWeddingFieldEl) {
    targetWeddingFieldEl.style.display = f.type === "wedding" ? "block" : "none";
  }
}

export function renderFinances() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const fTableEl = document.getElementById("fTable");
  if (!fTableEl) {
    console.log("Finance table element not ready");
    return;
  }
  
  const filterVal = document.getElementById("financeFilter")?.value || "all";
  const finances = data.finances ? Object.entries(data.finances) : [];
  const filteredFinances = finances.filter(([id, f]) => filterVal === "all" ? true : f.type === filterVal);
  
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
    const filterText = filterVal === "all" ? "Menampilkan semua" : 
                       (filterVal === "in" ? "Menampilkan pemasukan" : 
                       (filterVal === "out" ? "Menampilkan pengeluaran" : "Menampilkan tabungan nikah"));
    filterInfoEl.innerText = filterText;
  }
}

// Export ke window
window.renderFinances = renderFinances;
window.editFinance = editFinance;
