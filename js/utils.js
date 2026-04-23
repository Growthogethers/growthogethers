// js/utils.js
export let currentUser = null;
export let masterData = null;
export let privacyHidden = false;

export function showNotif(msg, isErr = false) { 
  const t = document.getElementById("customToast"); 
  if (!t) return;
  const toastBody = t.querySelector(".toast-body");
  if (toastBody) toastBody.innerText = msg;
  t.style.display = "block"; 
  const toastDiv = t.querySelector(".toast");
  if (toastDiv) {
    toastDiv.className = `toast align-items-center border-0 ${isErr ? "text-bg-danger" : "text-bg-success"}`;
  }
  setTimeout(() => t.style.display = "none", 2700); 
}

export function hideToast() { 
  const toast = document.getElementById("customToast");
  if (toast) toast.style.display = "none"; 
}

export function formatNumberRp(val) { 
  if (privacyHidden) return "●●● ●●●"; 
  return `Rp ${val.toLocaleString()}`; 
}

export function escapeHtml(str) { 
  if (!str) return ""; 
  return str.replace(/[&<>]/g, m => m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"); 
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

export function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(timestamp).toLocaleDateString();
}
