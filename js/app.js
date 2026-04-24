// js/app.js
import { db, ref, onValue, set, update, push, remove } from './firebase-config.js';
import { masterData, setMasterData, showNotif, togglePrivacy, setCurrentUser, privacyHidden } from './utils.js';
import { handleLogin, updateCloudPassword, resetPassword, confirmLogout, handleLogout, checkSessionOnLoad, startSessionMonitoring, resetSessionTimeout, stopSessionMonitoring } from './auth.js';
import { renderDashboard, updateCharts } from './dashboard.js';
import { savePlan, renderBoardPlans, updatePlan, deletePlanItem, addSubPlan, togglePlan, openEditPlan, deletePlanItemById, deleteSubPlan, initPlanFilter } from './planning.js';
import { saveFinance, editFinance, renderFinances, initFinancialPage, addSavingTarget, editSavingTarget, deleteSavingTarget, loadSavingTargets } from './financial.js';
import { saveVision, renderVisions, toggleLike, addComment, openCommentModal, renderComments, initMoodSelector, setupFilterListeners, toggleBookmark, addReaction, shareToSocial, searchByTag, deleteVision } from './vision.js';
import { initMomentPage, renderCalendar, renderMomentsList, saveMoment, viewMomentDetail, deleteMomentFromDetail, changeMonth, selectMomentDate, openMomentModal, handleMultiplePhotos, removePhotoAtIndex } from './moment.js';

// Global variables
let weddingChart = null;
let plansChart = null;
window.currentDeletePlanId = null;
window.currentCommentVid = null;
window.editFinanceId = null;
window.pendingDelete = { path: null, id: null };

// Load components
async function loadComponents() {
  try {
    const sidebarResp = await fetch('components/sidebar.html');
    const sidebarHtml = await sidebarResp.text();
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;
    
    const bottomNavResp = await fetch('components/navbar.html');
    const bottomNavHtml = await bottomNavResp.text();
    const bottomNavContainer = document.getElementById('bottom-nav-container');
    if (bottomNavContainer) bottomNavContainer.innerHTML = bottomNavHtml;
    
    const modalsResp = await fetch('components/modals.html');
    const modalsHtml = await modalsResp.text();
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) modalsContainer.innerHTML = modalsHtml;
    
    const loginResp = await fetch('components/login.html');
    const loginHtml = await loginResp.text();
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.innerHTML = loginHtml;
    
    const contentResp = await fetch('components/content.html');
    const contentHtml = await contentResp.text();
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.innerHTML = contentHtml;
    
    attachEventListeners();
    
    // Inisialisasi semua fitur tambahan
    if (window.initMoodSelector) window.initMoodSelector();
    if (window.setupFilterListeners) window.setupFilterListeners();
    if (window.initMomentPage) window.initMomentPage();
    if (window.initPlanFilter) window.initPlanFilter();
    initCoupleChat();
    initBackupRestore();
    checkAchievements();
    initOfflineMode();
    
  } catch (error) {
    console.error('Error loading components:', error);
  }
}

// Fungsi validasi global
function validateRequiredFields(fields) {
  for (const [fieldId, fieldName] of Object.entries(fields)) {
    const element = document.getElementById(fieldId);
    if (!element || !element.value || (element.value.trim && element.value.trim() === "")) {
      showNotif(`❌ ${fieldName} harus diisi!`, true);
      return false;
    }
  }
  return true;
}

// Fungsi untuk couple chat
function initCoupleChat() {
  console.log("Couple chat initialized");
  const chatFab = document.getElementById("chatFab");
  if (chatFab) {
    chatFab.style.display = "flex";
    chatFab.onclick = () => {
      showNotif("💬 Fitur chat akan segera hadir!");
    };
  }
}

// Fungsi untuk backup & restore
function initBackupRestore() {
  console.log("Backup & restore feature initialized");
  window.backupData = async () => {
    try {
      const snapshot = await get(ref(db, "data/"));
      const data = snapshot.val();
      localStorage.setItem("growthogether_backup", JSON.stringify(data));
      showNotif("✅ Data berhasil di-backup ke browser");
    } catch (err) {
      showNotif("❌ Gagal backup: " + err.message, true);
    }
  };
  
  window.restoreData = async () => {
    const backup = localStorage.getItem("growthogether_backup");
    if (!backup) {
      showNotif("❌ Tidak ada backup ditemukan", true);
      return;
    }
    try {
      const data = JSON.parse(backup);
      await set(ref(db, "data/"), data);
      showNotif("✅ Data berhasil direstore");
      location.reload();
    } catch (err) {
      showNotif("❌ Gagal restore: " + err.message, true);
    }
  };
}

// Fungsi untuk cek pencapaian
function checkAchievements() {
  console.log("Achievements checker initialized");
  window.achievements = {
    firstPlan: false,
    firstFinance: false,
    firstVision: false,
    completePlan: false,
    savingMilestone: false
  };
  
  const checkInterval = setInterval(() => {
    if (!masterData) return;
    
    const plans = masterData.plans ? Object.keys(masterData.plans).length : 0;
    const finances = masterData.finances ? Object.keys(masterData.finances).length : 0;
    const visions = masterData.visions ? Object.keys(masterData.visions).length : 0;
    const completedPlans = masterData.plans ? Object.values(masterData.plans).filter(p => p.progress >= 100).length : 0;
    
    let totalWedding = 0;
    if (masterData.finances) {
      Object.values(masterData.finances).forEach(f => {
        if (f.type === "wedding") totalWedding += f.amt;
      });
    }
    
    if (plans >= 1 && !window.achievements.firstPlan) {
      window.achievements.firstPlan = true;
      showNotif("🏆 Pencapaian: Rencana Pertama!");
    }
    if (finances >= 1 && !window.achievements.firstFinance) {
      window.achievements.firstFinance = true;
      showNotif("🏆 Pencapaian: Transaksi Pertama!");
    }
    if (visions >= 1 && !window.achievements.firstVision) {
      window.achievements.firstVision = true;
      showNotif("🏆 Pencapaian: Sharing Pertama!");
    }
    if (completedPlans >= 1 && !window.achievements.completePlan) {
      window.achievements.completePlan = true;
      showNotif("🏆 Pencapaian: Rencana Selesai! 🎉");
    }
    if (totalWedding >= 10000000 && !window.achievements.savingMilestone) {
      window.achievements.savingMilestone = true;
      showNotif("🏆 Pencapaian: Tabungan 10 Juta! 🚀");
    }
  }, 5000);
}

// Fungsi untuk offline mode
function initOfflineMode() {
  console.log("Offline mode initialized");
  
  if (masterData) {
    localStorage.setItem("growthogether_cache", JSON.stringify(masterData));
  }
  
  window.addEventListener('online', () => {
    showNotif("📡 Kembali online, menyinkronkan data...");
    if (window.renderAll) window.renderAll();
  });
  
  window.addEventListener('offline', () => {
    showNotif("⚠️ Mode offline, data akan tersimpan lokal", true);
  });
}

// Fungsi untuk menunjukkan progress bar global
function showGlobalProgress() {
  const progressBar = document.getElementById("globalProgressBar");
  if (progressBar) {
    progressBar.style.display = "block";
    const innerBar = progressBar.querySelector("div");
    if (innerBar) {
      innerBar.style.width = "0%";
      let width = 0;
      const interval = setInterval(() => {
        if (width >= 90) clearInterval(interval);
        width += 10;
        innerBar.style.width = width + "%";
      }, 100);
    }
  }
}

function hideGlobalProgress() {
  const progressBar = document.getElementById("globalProgressBar");
  if (progressBar) {
    const innerBar = progressBar.querySelector("div");
    if (innerBar) innerBar.style.width = "0%";
    setTimeout(() => {
      progressBar.style.display = "none";
    }, 300);
  }
}

function attachEventListeners() {
  const darkFab = document.getElementById("darkModeFab");
  if (darkFab) {
    initDarkMode(darkFab);
    darkFab.onclick = () => toggleDarkMode(darkFab);
  }
  
  const menuToggle = document.getElementById("menuToggleHp");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) sidebar.classList.toggle("open");
    });
  }
  
  const fType = document.getElementById("fType");
  if (fType) {
    fType.addEventListener("change", (e) => {
      const div = document.getElementById("targetWeddingField");
      if (div) div.style.display = e.target.value === "wedding" ? "block" : "none";
    });
  }
  
  const financeFilter = document.getElementById("financeFilter");
  if (financeFilter) {
    financeFilter.addEventListener("change", () => {
      if (window.renderFinances) window.renderFinances();
    });
  }
  
  const privacyToggleDash = document.getElementById("privacyToggleDash");
  const privacyToggleFinance = document.getElementById("privacyToggleFinance");
  
  if (privacyToggleDash) {
    privacyToggleDash.addEventListener("click", () => {
      togglePrivacy();
      if (window.loadSavingTargets) window.loadSavingTargets();
      if (window.renderFinances) window.renderFinances();
    });
  }
  if (privacyToggleFinance) {
    privacyToggleFinance.addEventListener("click", () => {
      togglePrivacy();
      if (window.loadSavingTargets) window.loadSavingTargets();
      if (window.renderFinances) window.renderFinances();
    });
  }
  
  const forgotPassLink = document.getElementById("forgotPassLink");
  if (forgotPassLink) {
    forgotPassLink.addEventListener("click", (e) => {
      e.preventDefault();
      const modalEl = document.getElementById("forgotPassModal");
      if (modalEl) new bootstrap.Modal(modalEl).show();
    });
  }
  
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => {
    el.addEventListener("click", () => {
      const page = el.getAttribute("data-page");
      if (page) showPage(page);
    });
  });
  
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
      if (window.pendingDelete && window.pendingDelete.path && window.pendingDelete.id) {
        const { path, id } = window.pendingDelete;
        try {
          if (path === "settings/savingTargets") {
            const settingsRef = ref(db, 'data/settings');
            const snapshot = await get(settingsRef);
            const settings = snapshot.val() || {};
            const targets = settings.savingTargets || {};
            delete targets[id];
            await update(ref(db, 'data/settings'), { savingTargets: targets });
          } else {
            const dbRef = ref(db, `data/${path}/${id}`);
            await remove(dbRef);
          }
          showNotif("🗑️ Data berhasil dihapus");
          if (window.renderAll) window.renderAll();
          if (window.loadSavingTargets) window.loadSavingTargets();
        } catch (err) {
          console.error(err);
          showNotif("❌ Gagal hapus data: " + err.message, true);
        }
      }
      const modal = bootstrap.Modal.getInstance(document.getElementById("confirmDeleteModal"));
      if (modal) modal.hide();
      window.pendingDelete = { path: null, id: null };
    };
  }
  
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
  if (confirmLogoutBtn) {
    confirmLogoutBtn.onclick = () => {
      handleLogout();
    };
  }
}

function initDarkMode(btn) {
  const saved = localStorage.getItem("darkMode");
  if (saved === "enabled") {
    document.body.classList.add("dark");
    btn.innerHTML = '<i class="bi bi-brightness-high-fill fs-5"></i>';
  } else {
    document.body.classList.remove("dark");
    btn.innerHTML = '<i class="bi bi-moon-stars fs-5"></i>';
  }
}

function toggleDarkMode(btn) {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
  btn.innerHTML = isDark ? '<i class="bi bi-brightness-high-fill fs-5"></i>' : '<i class="bi bi-moon-stars fs-5"></i>';
}

function showPage(pageId) {
  document.querySelectorAll("section").forEach(s => s.style.display = "none");
  const pageElement = document.getElementById(`${pageId}-page`);
  if (pageElement) pageElement.style.display = "block";
  
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add("active"));
  
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
  
  if (pageId === "financial") {
    const typeSelect = document.getElementById("fType");
    const targetField = document.getElementById("targetWeddingField");
    if (typeSelect && targetField) {
      targetField.style.display = typeSelect.value === "wedding" ? "block" : "none";
    }
    setTimeout(() => {
      if (window.initFinancialPage) {
        window.initFinancialPage();
      }
    }, 100);
  }
  
  if (pageId === "moment" && window.initMomentPage) {
    setTimeout(() => {
      window.initMomentPage();
    }, 100);
  }
}

export function setupAppSession(u) {
  const loginScreen = document.getElementById("login-screen");
  const sidebar = document.getElementById("app-sidebar");
  const appContent = document.getElementById("app-content");
  
  if (loginScreen) loginScreen.style.display = "none";
  if (sidebar) sidebar.style.display = "flex";
  if (appContent) appContent.style.display = "block";
  
  const badge = document.getElementById("activeUserBadge");
  if (badge) {
    badge.innerText = u;
    badge.className = `badge rounded-pill mb-1 ${u === "FACHMI" ? "badge-fachmi" : "badge-azizah"}`;
  }
  
  const userGreet = document.getElementById("userGreet");
  if (userGreet) userGreet.innerText = u;
  
  if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove("open");

  initCoupleChat();
  checkAchievements();
  
  // Start session monitoring setelah login
  startSessionMonitoring();
  resetSessionTimeout();
  
  renderAll();
  showPage('dashboard');
}

function renderAll() {
  if (!masterData) return;
  
  if (window.renderDashboard) window.renderDashboard();
  if (window.renderVisions) window.renderVisions();
  if (window.renderFinances) window.renderFinances();
  
  if (window.loadSavingTargets) {
    window.loadSavingTargets();
  }
  
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  if (window.renderBoardPlans) window.renderBoardPlans(plansArray);
  
  const momentPage = document.getElementById('moment-page');
  if (momentPage && momentPage.style.display !== 'none') {
    if (window.renderCalendar) window.renderCalendar();
    if (window.renderMomentsList) window.renderMomentsList();
  }
  
  const finances = masterData.finances ? Object.entries(masterData.finances) : [];
  let weddingHistoryMap = new Map();
  finances.forEach(([id, f]) => {
    if (f.type === "wedding" && f.date) {
      let month = f.date.substring(0, 7);
      weddingHistoryMap.set(month, (weddingHistoryMap.get(month) || 0) + f.amt);
    }
  });
  
  const sortedMonths = Array.from(weddingHistoryMap.keys()).sort();
  let cumulative = 0;
  const labels = [], values = [];
  sortedMonths.forEach(month => {
    cumulative += weddingHistoryMap.get(month);
    labels.push(month);
    values.push(cumulative / 1e6);
  });
  
  const totalPlans = plansArray.length;
  const totalPlansDone = plansArray.filter(p => p[1].progress >= 100).length;
  const charts = updateCharts({ labels, values }, totalPlansDone, totalPlans, weddingChart, plansChart);
  weddingChart = charts.weddingChart;
  plansChart = charts.plansChart;
  
  checkPlanReminders();
}

function checkPlanReminders() {
  if (!masterData) return;
  const plans = masterData.plans || {};
  const today = new Date();
  Object.entries(plans).forEach(([id, p]) => {
    if (p.targetDate && p.progress < 100) {
      const target = new Date(p.targetDate);
      const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      if (diffDays === 3 || diffDays === 1) {
        if (Notification.permission === "granted") {
          new Notification("📅 Pengingat Rencana", { body: `"${p.text}" tinggal ${diffDays} hari lagi!` });
        }
      }
    }
  });
}

// Firebase realtime listener
onValue(ref(db, "data/"), (snapshot) => {
  const data = snapshot.val() || { visions: {}, plans: {}, finances: {}, settings: {}, comments: {}, likes: {}, moments: {} };
  setMasterData(data);
  
  if (!data.auth) {
    set(ref(db, "data/auth"), { FACHMI: "gokil223", AZIZAH: "1234" });
  }
  if (!data.settings?.weddingTarget) {
    set(ref(db, "data/settings"), { weddingTarget: 50000000 });
  }
  
  if (sessionStorage.getItem("progrowth_user")) {
    renderAll();
  }
});

// Global functions exposure
window.setupAppSession = setupAppSession;
window.handleLogin = handleLogin;
window.saveVision = saveVision;
window.savePlan = savePlan;
window.saveFinance = saveFinance;
window.updateCloudPassword = updateCloudPassword;
window.resetPassword = resetPassword;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;
window.updatePlan = updatePlan;
window.deletePlanItem = deletePlanItem;
window.addSubPlan = addSubPlan;
window.togglePlan = togglePlan;
window.openEditPlan = openEditPlan;
window.deletePlanItemById = deletePlanItemById;
window.deleteSubPlan = deleteSubPlan;
window.editFinance = editFinance;
window.openCommentModal = openCommentModal;
window.addComment = addComment;
window.toggleLike = toggleLike;
window.toggleBookmark = toggleBookmark;
window.addReaction = addReaction;
window.shareToSocial = shareToSocial;
window.searchByTag = searchByTag;
window.deleteVision = deleteVision;
window.showPage = showPage;
window.renderAll = renderAll;
window.renderDashboard = renderDashboard;
window.renderFinances = renderFinances;
window.renderVisions = renderVisions;
window.renderBoardPlans = renderBoardPlans;
window.togglePrivacy = togglePrivacy;
window.showGlobalProgress = showGlobalProgress;
window.hideGlobalProgress = hideGlobalProgress;

// Financial functions exports
window.initFinancialPage = initFinancialPage;
window.addSavingTarget = addSavingTarget;
window.editSavingTarget = editSavingTarget;
window.deleteSavingTarget = deleteSavingTarget;
window.loadSavingTargets = loadSavingTargets;

// Moment functions exports
window.initMomentPage = initMomentPage;
window.renderCalendar = renderCalendar;
window.renderMomentsList = renderMomentsList;
window.saveMoment = saveMoment;
window.viewMomentDetail = viewMomentDetail;
window.deleteMomentFromDetail = deleteMomentFromDetail;
window.changeMonth = changeMonth;
window.selectMomentDate = selectMomentDate;
window.openMomentModal = openMomentModal;
window.handleMultiplePhotos = handleMultiplePhotos;
window.removePhotoAtIndex = removePhotoAtIndex;

window.confirmDelete = (path, id) => {
  window.pendingDelete = { path, id };
  const modalEl = document.getElementById("confirmDeleteModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.deleteItem = (path, id) => {
  if (path === "settings/savingTargets") {
    window.pendingDelete = { path: "settings/savingTargets", id: id };
  } else {
    window.pendingDelete = { path: path, id: id };
  }
  const modalEl = document.getElementById("confirmDeleteModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.applyWeddingReco = async () => {
  showGlobalProgress();
  const items = ["💍 Persiapan Lamaran", "🏨 Booking Venue", "💄 MUA & Busana", "📸 Dokumentasi", "🎤 MC & Entertainment"];
  for (let t of items) {
    await push(ref(db, "data/plans"), { text: t, cat: "💍 Menikah", targetDate: "", progress: 0, done: false, sub: {} });
  }
  hideGlobalProgress();
  showNotif("✅ Rekomendasi wedding ditambahkan!");
  if (window.renderAll) window.renderAll();
};

window.applyTravelReco = async () => {
  showGlobalProgress();
  const items = ["✈️ Cari Tiket", "🏨 Booking Hotel", "🗺️ Itinerary", "📱 Travel Insurance", "🍴 Cari Kuliner"];
  for (let t of items) {
    await push(ref(db, "data/plans"), { text: t, cat: "✈️ Liburan", targetDate: "", progress: 0, done: false, sub: {} });
  }
  hideGlobalProgress();
  showNotif("✅ Rekomendasi liburan ditambahkan!");
  if (window.renderAll) window.renderAll();
};

window.hideToast = () => {
  const toast = document.getElementById("customToast");
  if (toast) toast.style.display = "none";
};

window.validateRequiredFields = validateRequiredFields;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadComponents().then(() => {
    // Cek session terlebih dahulu sebelum restore
    if (checkSessionOnLoad()) {
      const savedUser = sessionStorage.getItem("progrowth_user");
      if (savedUser) {
        setCurrentUser(savedUser);
        setupAppSession(savedUser);
      }
    }
  });
});
