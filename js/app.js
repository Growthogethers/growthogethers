// js/app.js - Complete fixed version
import { db, ref, onValue, set, update, push, remove, get } from './firebase-config.js';
import { masterData, setMasterData, showNotif, togglePrivacy, setCurrentUser, privacyHidden } from './utils.js';
import { handleLogin, updateCloudPassword, resetPassword, confirmLogout, handleLogout, checkSessionOnLoad, startSessionMonitoring, resetSessionTimeout, stopSessionMonitoring } from './auth.js';
import { renderDashboard, updateCharts } from './dashboard.js';
import { savePlan, renderBoardPlans, updatePlan, deletePlanItem, addSubPlan, togglePlan, openEditPlan, deletePlanItemById, deleteSubPlan, initPlanFilter, confirmAddTemplate, addTemplateToCategory } from './planning.js';
import { saveFinance, editFinance, renderFinances, initFinancialPage, addSavingTarget, editSavingTarget, deleteSavingTarget, loadSavingTargets, renderFinancialCategoryDropdown, getPlanCategories } from './financial.js';
import { saveDream, openDreamModal, viewDreamDetail, editDreamFromDetail, deleteDreamFromDetail, deleteDreamFromCard, openFundingModal, confirmUpdateFunding, updateDreamSavedAmount, initDreamBoard, renderDreamBoard, previewDreamImage } from './vision.js';
import { initMomentPage, renderCalendar, renderMomentsList, saveMoment, viewMomentDetail, deleteMomentFromDetail, changeMonth, selectMomentDate, openMomentModal, handleMultiplePhotos, removePhotoAtIndex } from './moment.js';
import { generateAIRecommendation, createPlansFromAIRecommendations, toggleAllAIRecommendations, openAIRecommendModal, initAIStyleButtons } from './ai-recommendation.js';
import { saveVendor, renderVendors, openVendorModal, viewVendorDetail, editVendorFromDetail, deleteVendorFromDetail, copyVendorContact, initVendorPage, filterVendors } from './vendor.js';
import { setupGlobalErrorHandler, safeFetchData, initPerformanceMonitoring } from './error-handler.js';
import { startNotificationListener, stopNotificationListener, requestNotificationPermission, checkAndShowPermissionModal, showRealtimeToast, hideRealtimeToast } from './notifications.js';
import { startCountdown, renderCountdownWidget, showEditWeddingDateModal } from './countdown.js';
import { initIntegrations } from './integration-planning-vendor.js';

let weddingChart = null;
let plansChart = null;
let firebaseListener = null;

// Load components
async function loadComponents() {
  try {
    // Load all components
    const sidebarHtml = await fetch('components/sidebar.html').then(r => r.text());
    const bottomNavHtml = await fetch('components/navbar.html').then(r => r.text());
    const modalsHtml = await fetch('components/modals.html').then(r => r.text());
    const contentHtml = await fetch('components/content.html').then(r => r.text());
    const loginHtml = await fetch('components/login.html').then(r => r.text());
    const aiModalHtml = await fetch('components/ai-recommendation.html').then(r => r.text());
    const vendorPageHtml = await fetch('components/vendor-page.html').then(r => r.text());
    const notificationModalsHtml = await fetch('components/notification-modals.html').then(r => r.text());
    
    document.getElementById('sidebar-container').innerHTML = sidebarHtml;
    document.getElementById('bottom-nav-container').innerHTML = bottomNavHtml;
    document.getElementById('modals-container').innerHTML = modalsHtml;
    document.getElementById('app-content').innerHTML = contentHtml;
    document.getElementById('login-screen').innerHTML = loginHtml;
    document.getElementById('modals-container').insertAdjacentHTML('beforeend', aiModalHtml);
    document.getElementById('modals-container').insertAdjacentHTML('beforeend', notificationModalsHtml);
    
    // Insert vendor page into app-content
    const appContent = document.getElementById('app-content');
    if (appContent && !document.getElementById('vendor-page')) {
      appContent.insertAdjacentHTML('beforeend', vendorPageHtml);
    }
    
    attachEventListeners();
    
    setTimeout(() => {
      if (window.initDreamBoard) window.initDreamBoard();
      if (window.initPlanFilter) window.initPlanFilter();
      if (window.initMomentPage) window.initMomentPage();
      if (window.initAIStyleButtons) window.initAIStyleButtons();
      if (window.renderFinancialCategoryDropdown) window.renderFinancialCategoryDropdown();
      if (window.renderCountdownWidget) window.renderCountdownWidget();
      if (window.initVendorPage) window.initVendorPage();
    }, 100);
    
  } catch (error) {
    console.error('Error loading components:', error);
    showNotif("❌ Gagal memuat aplikasi", true);
  }
}

function attachEventListeners() {
  // Dark mode
  const darkFab = document.getElementById("darkModeFab");
  if (darkFab) {
    const saved = localStorage.getItem("darkMode");
    if (saved === "enabled") document.body.classList.add("dark");
    darkFab.onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "enabled" : "disabled");
      darkFab.innerHTML = document.body.classList.contains("dark") ? '<i class="bi bi-brightness-high-fill fs-5"></i>' : '<i class="bi bi-moon-stars fs-5"></i>';
    };
  }
  
  // Menu toggle
  const menuToggle = document.getElementById("menuToggleHp");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      document.getElementById("app-sidebar")?.classList.toggle("open");
    });
  }
  
  // Privacy toggles
  document.querySelectorAll("#privacyToggleDash, #privacyToggleFinance").forEach(btn => {
    if (btn) btn.addEventListener("click", () => {
      togglePrivacy();
      if (window.renderDashboard) window.renderDashboard();
      if (window.renderFinances) window.renderFinances();
      if (window.loadSavingTargets) window.loadSavingTargets();
      if (window.renderDreamBoard) window.renderDreamBoard();
    });
  });
  
  // Navigation
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => {
    el.addEventListener("click", () => {
      const page = el.getAttribute("data-page");
      if (page) showPage(page);
    });
  });
  
  // Confirm delete
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
      if (window.pendingDelete && window.pendingDelete.path && window.pendingDelete.id) {
        const { path, id } = window.pendingDelete;
        try {
          await remove(ref(db, `data/${path}/${id}`));
          showNotif("🗑️ Data berhasil dihapus");
          if (window.renderAll) window.renderAll();
          if (window.loadSavingTargets) window.loadSavingTargets();
        } catch (err) {
          showNotif("❌ Gagal hapus data", true);
        }
      }
      const modal = bootstrap.Modal.getInstance(document.getElementById("confirmDeleteModal"));
      if (modal) modal.hide();
      window.pendingDelete = null;
    };
  }
  
  // Confirm logout
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
  if (confirmLogoutBtn) confirmLogoutBtn.onclick = () => handleLogout();
}

function showPage(pageId) {
  document.querySelectorAll("section").forEach(s => s.style.display = "none");
  const pageElement = document.getElementById(`${pageId}-page`);
  if (pageElement) pageElement.style.display = "block";
  
  document.querySelectorAll(".nav-link, .bottom-nav-item").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add("active"));
  
  if (window.innerWidth <= 768) {
    document.getElementById("app-sidebar")?.classList.remove("open");
  }
  
  if (pageId === "financial") {
    setTimeout(() => {
      if (window.initFinancialPage) window.initFinancialPage();
      if (window.renderFinancialCategoryDropdown) window.renderFinancialCategoryDropdown();
      if (window.renderFinances) window.renderFinances();
    }, 100);
  }
  
  if (pageId === "vision") {
    setTimeout(() => { if (window.initDreamBoard) window.initDreamBoard(); }, 100);
  }
  
  if (pageId === "moment" && window.initMomentPage) {
    setTimeout(() => window.initMomentPage(), 100);
  }
  
  if (pageId === "vendor" && window.initVendorPage) {
    setTimeout(() => window.initVendorPage(), 100);
  }
}

function renderAll() {
  if (!masterData) return;
  
  if (window.renderDashboard) window.renderDashboard();
  if (window.renderDreamBoard) window.renderDreamBoard();
  if (window.renderFinances) window.renderFinances();
  if (window.loadSavingTargets) window.loadSavingTargets();
  if (window.renderVendors) window.renderVendors();
  
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  if (window.renderBoardPlans) window.renderBoardPlans(plansArray);
  
  // Update planning summary
  const totalPlans = plansArray.length;
  const completedPlans = plansArray.filter(p => p[1].progress >= 100).length;
  const avgProgress = totalPlans > 0 ? Math.round(plansArray.reduce((sum, p) => sum + (p[1].progress || 0), 0) / totalPlans) : 0;
  
  const totalPlansEl = document.getElementById("totalPlansCount");
  const completedPlansEl = document.getElementById("completedPlansCount");
  const avgProgressEl = document.getElementById("avgProgressCount");
  if (totalPlansEl) totalPlansEl.innerHTML = totalPlans;
  if (completedPlansEl) completedPlansEl.innerHTML = completedPlans;
  if (avgProgressEl) avgProgressEl.innerHTML = `${avgProgress}%`;
  
  const momentPage = document.getElementById('moment-page');
  if (momentPage && momentPage.style.display !== 'none') {
    if (window.renderCalendar) window.renderCalendar();
    if (window.renderMomentsList) window.renderMomentsList();
  }
  
  // Update charts
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
  
  const charts = updateCharts({ labels, values }, completedPlans, totalPlans, weddingChart, plansChart);
  weddingChart = charts.weddingChart;
  plansChart = charts.plansChart;
}

function setupAppSession(u) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-sidebar").style.display = "flex";
  document.getElementById("app-content").style.display = "block";
  
  const badge = document.getElementById("activeUserBadge");
  if (badge) {
    badge.innerText = u;
    badge.className = `badge rounded-pill mb-1 ${u === "FACHMI" ? "badge-fachmi" : "badge-azizah"}`;
  }
  
  document.getElementById("userGreet").innerText = u;
  
  startSessionMonitoring();
  resetSessionTimeout();
  
  // Start notification listener
  startNotificationListener();
  
  // Start countdown
  startCountdown();
  
  // Initialize integrations
  if (window.initIntegrations) window.initIntegrations();
  
  renderAll();
  showPage('dashboard');
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  // Setup error handling and performance monitoring
  setupGlobalErrorHandler();
  initPerformanceMonitoring();
  
  loadComponents().then(() => {
    if (checkSessionOnLoad()) {
      const savedUser = sessionStorage.getItem("progrowth_user");
      if (savedUser) {
        setCurrentUser(savedUser);
        setupAppSession(savedUser);
      }
    }
    
    // Check for notification permission
    setTimeout(() => {
      checkAndShowPermissionModal();
    }, 2000);
  });
});

// Single Firebase listener - prevent duplicates
if (!firebaseListener) {
  firebaseListener = onValue(ref(db, "data/"), (snapshot) => {
    const data = snapshot.val() || { dreams: {}, plans: {}, finances: {}, settings: {}, comments: {}, likes: {}, moments: {}, vendors: {} };
    setMasterData(data);
    
    if (!data.auth) set(ref(db, "data/auth"), { FACHMI: "gokil223", AZIZAH: "1234" });
    if (!data.settings?.weddingTarget) set(ref(db, "data/settings"), { weddingTarget: 50000000 });
    
    if (sessionStorage.getItem("progrowth_user")) {
      renderAll();
    }
  });
}

// Exports
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
window.confirmAddTemplate = confirmAddTemplate;
window.addTemplateToCategory = addTemplateToCategory;
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
window.initFinancialPage = initFinancialPage;
window.addSavingTarget = addSavingTarget;
window.editSavingTarget = editSavingTarget;
window.deleteSavingTarget = deleteSavingTarget;
window.loadSavingTargets = loadSavingTargets;
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
window.generateAIRecommendation = generateAIRecommendation;
window.createPlansFromAIRecommendations = createPlansFromAIRecommendations;
window.toggleAllAIRecommendations = toggleAllAIRecommendations;
window.openAIRecommendModal = openAIRecommendModal;
window.initAIStyleButtons = initAIStyleButtons;
window.renderFinancialCategoryDropdown = renderFinancialCategoryDropdown;
window.getPlanCategories = getPlanCategories;
window.saveVendor = saveVendor;
window.renderVendors = renderVendors;
window.openVendorModal = openVendorModal;
window.viewVendorDetail = viewVendorDetail;
window.editVendorFromDetail = editVendorFromDetail;
window.deleteVendorFromDetail = deleteVendorFromDetail;
window.copyVendorContact = copyVendorContact;
window.initVendorPage = initVendorPage;
window.filterVendors = filterVendors;
window.requestNotificationPermission = requestNotificationPermission;
window.showRealtimeToast = showRealtimeToast;
window.hideRealtimeToast = hideRealtimeToast;
window.startCountdown = startCountdown;
window.renderCountdownWidget = renderCountdownWidget;
window.showEditWeddingDateModal = showEditWeddingDateModal;
window.initIntegrations = initIntegrations;
window.previewDreamImage = previewDreamImage;

window.deleteItem = (path, id) => {
  window.pendingDelete = { path, id };
  new bootstrap.Modal(document.getElementById("confirmDeleteModal")).show();
};

window.hideToast = () => {
  const toast = document.getElementById("customToast");
  if (toast) toast.style.display = "none";
};
