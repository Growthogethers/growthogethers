// js/app.js - Full Optimized Version (Dengan Semua Fitur Baru)

import { db, ref, onValue, set, update, push, remove, get } from './firebase-config.js';
import { masterData, setMasterData, showNotif, togglePrivacy, setCurrentUser, privacyHidden, debounce, throttle } from './utils.js';
import { handleLogin, updateCloudPassword, resetPassword, confirmLogout, handleLogout, checkSessionOnLoad, startSessionMonitoring, resetSessionTimeout, stopSessionMonitoring } from './auth.js';
import { renderDashboard, updateCharts } from './dashboard.js';
import { savePlan, renderBoardPlans, updatePlan, deletePlanItem, addSubPlan, togglePlan, openEditPlan, deletePlanItemById, deleteSubPlan, initPlanFilter, confirmAddTemplate } from './planning.js';
import { saveFinance, editFinance, renderFinances, initFinancialPage, addSavingTarget, editSavingTarget, deleteSavingTarget, loadSavingTargets } from './financial.js';
import { 
  saveDream, openDreamModal, viewDreamDetail, editDreamFromDetail, deleteDreamFromDetail, deleteDreamFromCard,
  openFundingModal, confirmUpdateFunding, updateDreamSavedAmount,
  initDreamBoard, renderDreamBoard
} from './vision.js';
import { initMomentPage, renderCalendar, renderMomentsList, saveMoment, viewMomentDetail, deleteMomentFromDetail, changeMonth, selectMomentDate, openMomentModal, handleMultiplePhotos, removePhotoAtIndex } from './moment.js';

// ============ MODUL BARU ============
import { 
  startNotificationListener, 
  stopNotificationListener, 
  requestNotificationPermission, 
  checkAndShowPermissionModal,
  showRealtimeToast,
  hideRealtimeToast
} from './notifications.js';

import { 
  saveVendor, 
  renderVendors, 
  openVendorModal, 
  viewVendorDetail, 
  editVendorFromDetail, 
  deleteVendorFromDetail, 
  copyVendorContact, 
  initVendorPage 
} from './vendor.js';

import { 
  renderCountdownWidget, 
  startCountdown, 
  showEditWeddingDateModal, 
  loadWeddingDate, 
  saveWeddingDate 
} from './countdown.js';

import { 
  generateAIRecommendation, 
  applyAIRecommendation, 
  openAIRecommendModal, 
  initAIStyleButtons 
} from './ai-recommendation.js';

import { 
  setupGlobalErrorHandler, 
  safeFetchData, 
  showSkeletonLoader, 
  hideSkeletonLoader, 
  initPerformanceMonitoring,
  createDebouncedSave,
  createVirtualScroll
} from './error-handler.js';

import { 
  initAccessibility, 
  announceToScreenReader, 
  initKeyboardShortcuts 
} from './accessibility.js';

import { 
  initIntegrations,
  selectVendorForPlan,
  showVendorRelatedPlans,
  calculateTotalWeddingBudget,
  syncCountdownWithPlans,
  addVendorAssignmentToPlans,
  addDeadlineWarningsToPlans
} from './integration-planning-vendor.js';

// Global variables
let weddingChart = null;
let plansChart = null;
window.currentDeletePlanId = null;
window.currentCommentVid = null;
window.editFinanceId = null;
window.pendingDelete = { path: null, id: null };

// ============ UI/UX IMPROVEMENTS ============

let loadingOverlay = null;

function showLoadingOverlay(message = "Memproses...") {
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
  spinner.style.width = '48px';
  spinner.style.height = '48px';
  spinner.style.border = '4px solid rgba(255,255,255,0.3)';
  spinner.style.borderTop = '4px solid #6366f1';
  
  const text = document.createElement('p');
  text.textContent = message;
  text.style.color = 'white';
  text.style.marginTop = '16px';
  text.style.fontSize = '14px';
  
  loadingOverlay.appendChild(spinner);
  loadingOverlay.appendChild(text);
  document.body.appendChild(loadingOverlay);
}

function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}

let offlineIndicator = null;

function showOfflineIndicator() {
  if (offlineIndicator) return;
  
  offlineIndicator = document.createElement('div');
  offlineIndicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ef4444;
    color: white;
    text-align: center;
    padding: 8px;
    font-size: 12px;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
  offlineIndicator.innerHTML = `
    <i class="bi bi-wifi-off"></i>
    <span>Mode Offline - Beberapa fitur mungkin tidak tersedia</span>
  `;
  document.body.appendChild(offlineIndicator);
  
  setTimeout(() => {
    if (offlineIndicator) {
      offlineIndicator.style.transition = 'transform 0.3s ease-out';
      offlineIndicator.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        if (offlineIndicator) offlineIndicator.remove();
        offlineIndicator = null;
      }, 300);
    }
  }, 5000);
}

function hideOfflineIndicator() {
  if (offlineIndicator) {
    offlineIndicator.remove();
    offlineIndicator = null;
  }
}

let touchStartX = 0;
let touchEndX = 0;

function initSwipeGesture() {
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
}

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  const sidebar = document.getElementById('app-sidebar');
  
  if (!sidebar) return;
  
  if (swipeDistance > 50 && touchStartX < 50) {
    sidebar.classList.add('open');
  } else if (swipeDistance < -50 && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
}

let lastTap = 0;

function initDoubleTapBackToTop() {
  document.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showNotif("⬆️ Kembali ke atas", false);
    }
    
    lastTap = currentTime;
  });
}

let pullStartY = 0;
let pullEndY = 0;
let isPulling = false;

function initPullToRefresh() {
  const container = document.querySelector('.main-content');
  if (!container) return;
  
  let refreshIndicator = null;
  
  container.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      pullStartY = e.touches[0].clientY;
      isPulling = true;
    }
  });
  
  container.addEventListener('touchmove', (e) => {
    if (isPulling && window.scrollY === 0) {
      pullEndY = e.touches[0].clientY;
      const pullDistance = pullEndY - pullStartY;
      
      if (pullDistance > 60 && !refreshIndicator) {
        refreshIndicator = document.createElement('div');
        refreshIndicator.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #6366f1;
          color: white;
          text-align: center;
          padding: 12px;
          font-size: 12px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        `;
        refreshIndicator.innerHTML = `
          <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
          <span>Menyegarkan...</span>
        `;
        document.body.appendChild(refreshIndicator);
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  });
  
  container.addEventListener('touchend', () => {
    isPulling = false;
    pullStartY = 0;
    pullEndY = 0;
  });
}

function initUIUXImprovements() {
  initSwipeGesture();
  initDoubleTapBackToTop();
  initPullToRefresh();
  
  window.addEventListener('online', () => {
    hideOfflineIndicator();
    showNotif("📡 Kembali online", false);
  });
  
  window.addEventListener('offline', () => {
    showOfflineIndicator();
  });
  
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('app-sidebar');
    const menuToggle = document.getElementById('menuToggleHp');
    
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
  
  document.querySelectorAll('button, .nav-link, .bottom-nav-item, .calendar-day, .plan-card').forEach(el => {
    el.style.touchAction = 'manipulation';
  });
}

// ============ END UI/UX IMPROVEMENTS ============

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
    
    // ============ LOAD KOMPONEN BARU ============
    
    // Load vendor page
    const vendorPageResp = await fetch('components/vendor-page.html');
    if (vendorPageResp.ok) {
      const vendorPageHtml = await vendorPageResp.text();
      if (appContent) appContent.insertAdjacentHTML('beforeend', vendorPageHtml);
    }
    
    // Load vendor modals
    const vendorModalsResp = await fetch('components/vendor.html');
    if (vendorModalsResp.ok) {
      const vendorModalsHtml = await vendorModalsResp.text();
      if (modalsContainer) modalsContainer.insertAdjacentHTML('beforeend', vendorModalsHtml);
    }
    
    // Load AI recommendation modal
    const aiModalResp = await fetch('components/ai-recommendation.html');
    if (aiModalResp.ok) {
      const aiModalHtml = await aiModalResp.text();
      if (modalsContainer) modalsContainer.insertAdjacentHTML('beforeend', aiModalHtml);
    }
    
    // Load notification modals
    const notifModalsResp = await fetch('components/notification-modals.html');
    if (notifModalsResp.ok) {
      const notifModalsHtml = await notifModalsResp.text();
      if (modalsContainer) modalsContainer.insertAdjacentHTML('beforeend', notifModalsHtml);
    }
    
    attachEventListeners();
    
    setTimeout(() => {
      if (window.initDreamBoard) window.initDreamBoard();
      if (window.setupFilterListeners) window.setupFilterListeners();
      if (window.initMomentPage) window.initMomentPage();
      if (window.initPlanFilter) window.initPlanFilter();
      if (window.initUIUXImprovements) window.initUIUXImprovements();
      
      // ============ INIT MODUL BARU ============
      if (window.initAccessibility) window.initAccessibility();
      if (window.initKeyboardShortcuts) window.initKeyboardShortcuts();
      if (window.initAIStyleButtons) window.initAIStyleButtons();
      if (window.setupGlobalErrorHandler) window.setupGlobalErrorHandler();
      if (window.initPerformanceMonitoring) window.initPerformanceMonitoring();
      if (window.checkAndShowPermissionModal) window.checkAndShowPermissionModal();
      if (window.startNotificationListener) window.startNotificationListener();
      if (window.renderCountdownWidget) window.renderCountdownWidget();
      if (window.initIntegrations) window.initIntegrations();
      if (window.initVendorPage) window.initVendorPage();
    }, 100);
    
    initCoupleChat();
    initBackupRestore();
    checkAchievements();
    initOfflineMode();
    
  } catch (error) {
    console.error('Error loading components:', error);
    showNotif("❌ Gagal memuat aplikasi", true);
  }
}

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

function initBackupRestore() {
  console.log("Backup & restore feature initialized");
  window.backupData = async () => {
    showLoadingOverlay("Menyimpan backup...");
    try {
      const snapshot = await get(ref(db, "data/"));
      const data = snapshot.val();
      localStorage.setItem("growthogether_backup", JSON.stringify(data));
      showNotif("✅ Data berhasil di-backup ke browser");
    } catch (err) {
      showNotif("❌ Gagal backup: " + err.message, true);
    } finally {
      hideLoadingOverlay();
    }
  };
  
  window.restoreData = async () => {
    const backup = localStorage.getItem("growthogether_backup");
    if (!backup) {
      showNotif("❌ Tidak ada backup ditemukan", true);
      return;
    }
    showLoadingOverlay("Merestore data...");
    try {
      const data = JSON.parse(backup);
      await set(ref(db, "data/"), data);
      showNotif("✅ Data berhasil direstore");
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      showNotif("❌ Gagal restore: " + err.message, true);
    } finally {
      hideLoadingOverlay();
    }
  };
}

function checkAchievements() {
  console.log("Achievements checker initialized");
  window.achievements = {
    firstPlan: false,
    firstFinance: false,
    firstDream: false,
    completePlan: false,
    savingMilestone: false
  };
  
  const checkInterval = setInterval(() => {
    if (!masterData) return;
    
    const plans = masterData.plans ? Object.keys(masterData.plans).length : 0;
    const finances = masterData.finances ? Object.keys(masterData.finances).length : 0;
    const dreams = masterData.dreams ? Object.keys(masterData.dreams).length : 0;
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
    if (dreams >= 1 && !window.achievements.firstDream) {
      window.achievements.firstDream = true;
      showNotif("🏆 Pencapaian: Mimpi Pertama! ✨");
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
      if (window.renderDreamBoard) window.renderDreamBoard();
      if (window.renderVendors) window.renderVendors();
    });
  }
  if (privacyToggleFinance) {
    privacyToggleFinance.addEventListener("click", () => {
      togglePrivacy();
      if (window.loadSavingTargets) window.loadSavingTargets();
      if (window.renderFinances) window.renderFinances();
      if (window.renderDreamBoard) window.renderDreamBoard();
      if (window.renderVendors) window.renderVendors();
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
          } else if (path === "dreams") {
            await remove(ref(db, `data/dreams/${id}`));
          } else if (path === "vendors") {
            await remove(ref(db, `data/vendors/${id}`));
          } else {
            const dbRef = ref(db, `data/${path}/${id}`);
            await remove(dbRef);
          }
          showNotif("🗑️ Data berhasil dihapus");
          if (window.renderAll) window.renderAll();
          if (window.loadSavingTargets) window.loadSavingTargets();
          if (window.renderVendors) window.renderVendors();
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
  
  if (pageId === "vision") {
    setTimeout(() => {
      if (window.initDreamBoard) {
        window.initDreamBoard();
      }
    }, 100);
  }
  
  if (pageId === "moment" && window.initMomentPage) {
    setTimeout(() => {
      window.initMomentPage();
    }, 100);
  }
  
  if (pageId === "vendor" && window.initVendorPage) {
    setTimeout(() => {
      window.initVendorPage();
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
  
  startSessionMonitoring();
  resetSessionTimeout();
  
  renderAll();
  showPage('dashboard');
}

function renderAll() {
  if (!masterData) return;
  
  if (window.renderDashboard) window.renderDashboard();
  if (window.renderDreamBoard) window.renderDreamBoard();
  if (window.renderFinances) window.renderFinances();
  if (window.renderVendors) window.renderVendors();
  
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
  
  // Integrasi tambahan
  setTimeout(() => {
    if (window.addVendorAssignmentToPlans) window.addVendorAssignmentToPlans();
    if (window.addDeadlineWarningsToPlans) window.addDeadlineWarningsToPlans();
    if (window.syncCountdownWithPlans) window.syncCountdownWithPlans();
  }, 200);
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

onValue(ref(db, "data/"), (snapshot) => {
  const data = snapshot.val() || { 
    dreams: {}, 
    plans: {}, 
    finances: {}, 
    settings: {}, 
    comments: {}, 
    likes: {}, 
    moments: {},
    vendors: {},
    planVendors: {}
  };
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

// ============ EXPORT SEMUA FUNGSI KE WINDOW ============

// Existing
window.setupAppSession = setupAppSession;
window.handleLogin = handleLogin;
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
window.showPage = showPage;
window.renderAll = renderAll;
window.renderDashboard = renderDashboard;
window.renderFinances = renderFinances;
window.renderBoardPlans = renderBoardPlans;
window.togglePrivacy = togglePrivacy;
window.showGlobalProgress = showGlobalProgress;
window.hideGlobalProgress = hideGlobalProgress;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.initUIUXImprovements = initUIUXImprovements;
window.confirmAddTemplate = confirmAddTemplate;

// Dream/Vision
window.saveDream = saveDream;
window.openDreamModal = openDreamModal;
window.viewDreamDetail = viewDreamDetail;
window.editDreamFromDetail = editDreamFromDetail;
window.deleteDreamFromDetail = deleteDreamFromDetail;
window.deleteDreamFromCard = deleteDreamFromCard;
window.renderDreamBoard = renderDreamBoard;
window.openFundingModal = openFundingModal;
window.confirmUpdateFunding = confirmUpdateFunding;
window.updateDreamSavedAmount = updateDreamSavedAmount;
window.initDreamBoard = initDreamBoard;

// Financial
window.initFinancialPage = initFinancialPage;
window.addSavingTarget = addSavingTarget;
window.editSavingTarget = editSavingTarget;
window.deleteSavingTarget = deleteSavingTarget;
window.loadSavingTargets = loadSavingTargets;

// Moment
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

// Confirm Delete
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

// Rekomendasi Template
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

// ============ EXPORT FUNGSI MODUL BARU ============

// Notifications
window.startNotificationListener = startNotificationListener;
window.stopNotificationListener = stopNotificationListener;
window.requestNotificationPermission = requestNotificationPermission;
window.checkAndShowPermissionModal = checkAndShowPermissionModal;
window.showRealtimeToast = showRealtimeToast;
window.hideRealtimeToast = hideRealtimeToast;

// Vendor
window.saveVendor = saveVendor;
window.renderVendors = renderVendors;
window.openVendorModal = openVendorModal;
window.viewVendorDetail = viewVendorDetail;
window.editVendorFromDetail = editVendorFromDetail;
window.deleteVendorFromDetail = deleteVendorFromDetail;
window.copyVendorContact = copyVendorContact;
window.initVendorPage = initVendorPage;

// Countdown
window.renderCountdownWidget = renderCountdownWidget;
window.startCountdown = startCountdown;
window.showEditWeddingDateModal = showEditWeddingDateModal;
window.loadWeddingDate = loadWeddingDate;
window.saveWeddingDate = saveWeddingDate;

// AI Recommendation
window.generateAIRecommendation = generateAIRecommendation;
window.applyAIRecommendation = applyAIRecommendation;
window.openAIRecommendModal = openAIRecommendModal;
window.initAIStyleButtons = initAIStyleButtons;

// Error Handler
window.setupGlobalErrorHandler = setupGlobalErrorHandler;
window.safeFetchData = safeFetchData;
window.showSkeletonLoader = showSkeletonLoader;
window.hideSkeletonLoader = hideSkeletonLoader;
window.initPerformanceMonitoring = initPerformanceMonitoring;

// Accessibility
window.initAccessibility = initAccessibility;
window.announceToScreenReader = announceToScreenReader;
window.initKeyboardShortcuts = initKeyboardShortcuts;

// Integration
window.initIntegrations = initIntegrations;
window.selectVendorForPlan = selectVendorForPlan;
window.showVendorRelatedPlans = showVendorRelatedPlans;
window.calculateTotalWeddingBudget = calculateTotalWeddingBudget;
window.syncCountdownWithPlans = syncCountdownWithPlans;
window.addVendorAssignmentToPlans = addVendorAssignmentToPlans;
window.addDeadlineWarningsToPlans = addDeadlineWarningsToPlans;

// ============ INITIALIZATION ============
document.addEventListener("DOMContentLoaded", () => {
  loadComponents().then(() => {
    if (checkSessionOnLoad()) {
      const savedUser = sessionStorage.getItem("progrowth_user");
      if (savedUser) {
        setCurrentUser(savedUser);
        setupAppSession(savedUser);
      }
    }
  });
});
