// js/utils.js - Full Optimized Version with Centralized Functions

export let currentUser = null;
export let masterData = null;
export let privacyHidden = false;

// Toast queue untuk menghindari spam
let toastQueue = [];
let isToastShowing = false;

export function showNotif(msg, isErr = false) { 
  const t = document.getElementById("customToast"); 
  if (!t) return;
  
  if (isToastShowing) {
    toastQueue.push({ msg, isErr });
    return;
  }
  
  isToastShowing = true;
  const toastBody = t.querySelector(".toast-body");
  if (toastBody) toastBody.innerText = msg;
  t.style.display = "block"; 
  const toastDiv = t.querySelector(".toast");
  if (toastDiv) {
    toastDiv.className = `toast align-items-center border-0 ${isErr ? "text-bg-danger" : "text-bg-success"}`;
  }
  
  setTimeout(() => {
    t.style.display = "none";
    isToastShowing = false;
    
    if (toastQueue.length > 0) {
      const next = toastQueue.shift();
      showNotif(next.msg, next.isErr);
    }
  }, 2700); 
}

export function hideToast() { 
  const toast = document.getElementById("customToast");
  if (toast) toast.style.display = "none"; 
  isToastShowing = false;
}

// Format number dengan caching
let numberFormatCache = new Map();

export function formatNumberRp(val) { 
  if (privacyHidden) return "●●● ●●●";
  if (val === undefined || val === null) return "Rp 0";
  
  if (numberFormatCache.has(val)) {
    return numberFormatCache.get(val);
  }
  
  const result = `Rp ${val.toLocaleString('id-ID')}`;
  numberFormatCache.set(val, result);
  
  if (numberFormatCache.size > 100) {
    const firstKey = numberFormatCache.keys().next().value;
    numberFormatCache.delete(firstKey);
  }
  
  return result;
}

export function escapeHtml(str) { 
  if (!str) return ""; 
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function togglePrivacy() { 
  privacyHidden = !privacyHidden; 
  showNotif(privacyHidden ? "🔒 Angka disembunyikan" : "👁️ Angka ditampilkan"); 
  if (window.renderDashboard) window.renderDashboard();
  if (window.renderFinances) window.renderFinances();
  if (window.loadSavingTargets) window.loadSavingTargets();
}

export function setCurrentUser(user) { 
  currentUser = user; 
}

export function setMasterData(data) { 
  masterData = data; 
  window.masterData = data;
}

// Time ago dengan caching
let timeAgoCache = new Map();

export function getTimeAgo(timestamp) {
  if (!timestamp) return "Baru saja";
  
  const now = Date.now();
  const cacheKey = `${timestamp}_${Math.floor(now / 60000)}`;
  
  if (timeAgoCache.has(cacheKey)) {
    return timeAgoCache.get(cacheKey);
  }
  
  const seconds = Math.floor((now - timestamp) / 1000);
  let result;
  
  if (seconds < 60) result = `${seconds} detik lalu`;
  else if (seconds < 3600) result = `${Math.floor(seconds / 60)} menit lalu`;
  else if (seconds < 86400) result = `${Math.floor(seconds / 3600)} jam lalu`;
  else if (seconds < 604800) result = `${Math.floor(seconds / 86400)} hari lalu`;
  else result = new Date(timestamp).toLocaleDateString('id-ID');
  
  timeAgoCache.set(cacheKey, result);
  
  if (timeAgoCache.size > 200) {
    const firstKey = timeAgoCache.keys().next().value;
    timeAgoCache.delete(firstKey);
  }
  
  return result;
}

// ============ CENTRALIZED DATE FORMATTERS ============

export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthName = monthNames[parseInt(parts[1]) - 1];
    return `${parts[2]} ${monthName} ${parts[0]}`;
  }
  return dateStr;
}

export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[parseInt(parts[1]) - 1];
    return `${parts[2]} ${monthName} ${parts[0]}`;
  }
  return dateStr;
}

// ============ CENTRALIZED LOADING OVERLAY ============

let loadingOverlay = null;

export function showLoadingOverlay(message = "Memproses...") {
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
  
  loadingOverlay = document.createElement('div');
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  `;
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;
  
  const text = document.createElement('p');
  text.textContent = message;
  text.style.color = 'white';
  text.style.marginTop = '16px';
  text.style.fontSize = '14px';
  
  loadingOverlay.appendChild(spinner);
  loadingOverlay.appendChild(text);
  document.body.appendChild(loadingOverlay);
}

export function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}

// ============ CENTRALIZED CONFIRM DIALOG ============

export function showCustomConfirm(message, onConfirm, title = "Konfirmasi") {
  const modal = document.getElementById('customConfirmModal');
  const messageEl = document.getElementById('customConfirmMessage');
  const okBtn = document.getElementById('customConfirmOkBtn');
  const titleEl = document.getElementById('customConfirmTitle');
  
  if (!modal || !messageEl || !okBtn) {
    if (confirm(message)) onConfirm();
    return;
  }
  
  if (titleEl) titleEl.innerText = title;
  messageEl.innerText = message;
  modal.style.display = 'flex';
  
  const handleConfirm = () => {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', handleConfirm);
    onConfirm();
  };
  
  okBtn.addEventListener('click', handleConfirm, { once: true });
}

export function hideCustomConfirm() {
  const modal = document.getElementById('customConfirmModal');
  if (modal) modal.style.display = 'none';
}

// ============ UTILITY FUNCTIONS ============

export function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function parseNumberInput(value) {
  if (!value) return 0;
  const cleanValue = value.toString().replace(/\./g, '').replace(/,/g, '');
  return parseInt(cleanValue) || 0;
}

export function formatNumberInput(value) {
  if (!value || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotif("📋 Berhasil disalin ke clipboard");
    return true;
  } catch (err) {
    showNotif("❌ Gagal menyalin", true);
    return false;
  }
}

// Export ke window
if (typeof window !== 'undefined') {
  window.showNotif = showNotif;
  window.hideToast = hideToast;
  window.formatNumberRp = formatNumberRp;
  window.escapeHtml = escapeHtml;
  window.togglePrivacy = togglePrivacy;
  window.setCurrentUser = setCurrentUser;
  window.setMasterData = setMasterData;
  window.showLoadingOverlay = showLoadingOverlay;
  window.hideLoadingOverlay = hideLoadingOverlay;
  window.showCustomConfirm = showCustomConfirm;
  window.hideCustomConfirm = hideCustomConfirm;
  window.formatDateShort = formatDateShort;
  window.formatDateLong = formatDateLong;
  window.truncateText = truncateText;
  window.copyToClipboard = copyToClipboard;
}
