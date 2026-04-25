// js/utils.js - Full Optimized Version
export let currentUser = null;
export let masterData = null;
export let privacyHidden = false;

// Toast queue untuk menghindari spam
let toastQueue = [];
let isToastShowing = false;

export function showNotif(msg, isErr = false) { 
  const t = document.getElementById("customToast"); 
  if (!t) return;
  
  // Queue toast jika sedang menampilkan
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
    
    // Tampilkan toast berikutnya dalam antrian
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

// Format number dengan caching untuk hasil yang sama
let numberFormatCache = new Map();

export function formatNumberRp(val) { 
  if (privacyHidden) return "●●● ●●●";
  if (val === undefined || val === null) return "Rp 0";
  
  // Cek cache
  const cacheKey = val;
  if (numberFormatCache.has(cacheKey)) {
    return numberFormatCache.get(cacheKey);
  }
  
  const result = `Rp ${val.toLocaleString('id-ID')}`;
  numberFormatCache.set(cacheKey, result);
  
  // Batasi ukuran cache
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

// Optimized getTimeAgo dengan caching
let timeAgoCache = new Map();

export function getTimeAgo(timestamp) {
  if (!timestamp) return "Baru saja";
  
  const now = Date.now();
  const cacheKey = `${timestamp}_${Math.floor(now / 60000)}`; // Cache per menit
  
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
  
  // Batasi ukuran cache
  if (timeAgoCache.size > 200) {
    const firstKey = timeAgoCache.keys().next().value;
    timeAgoCache.delete(firstKey);
  }
  
  return result;
}

// Format tanggal
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Format tanggal lengkap
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2])} ${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  return dateStr;
}

// Debounce utility
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Throttle utility
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

// Format persentase
export function formatPercent(value) {
  if (isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
}

// Truncate text
export function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Copy to clipboard
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

// Download file
export function downloadFile(content, filename, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse number from string
export function parseNumber(value) {
  const num = parseInt(value);
  return isNaN(num) ? 0 : num;
}

// Group array by key
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {});
}
