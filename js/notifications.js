// FILE BARU: js/notifications.js - Real-time Push Notifications
import { db, ref, onValue, get } from './firebase-config.js';
import { showNotif, masterData } from './utils.js';

let notificationListener = null;
let lastNotificationTime = 0;
let notificationSound = null;
let notificationPermissionRequested = false;

// Initialize notification sound
function initNotificationSound() {
  if (!notificationSound) {
    notificationSound = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    notificationSound.volume = 0.5;
  }
}

// Play notification sound
function playNotificationSound() {
  try {
    initNotificationSound();
    notificationSound.play().catch(e => console.log('Sound play failed:', e));
  } catch(e) { console.log('Sound error:', e); }
}

// Show real-time toast notification
export function showRealtimeToast(title, message, type = 'info') {
  const toast = document.getElementById('realtimeToast');
  const toastTitle = document.getElementById('realtimeToastTitle');
  const toastMessage = document.getElementById('realtimeToastMessage');
  const toastTime = document.getElementById('realtimeToastTime');
  
  if (!toast || !toastTitle) return;
  
  toastTitle.innerText = title;
  toastMessage.innerText = message;
  toastTime.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  // Change color based on type
  const card = toast.querySelector('.card');
  if (card) {
    if (type === 'success') {
      card.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'warning') {
      card.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else if (type === 'danger') {
      card.style.background = 'linear-gradient(135deg, #ef4444, #dc2626';
    } else {
      card.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }
  }
  
  toast.style.display = 'block';
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    if (toast.style.display === 'block') {
      toast.style.display = 'none';
    }
  }, 5000);
}

export function hideRealtimeToast() {
  const toast = document.getElementById('realtimeToast');
  if (toast) toast.style.display = 'none';
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showNotif('❌ Browser tidak mendukung notifikasi', true);
    return false;
  }
  
  if (Notification.permission === 'granted') {
    showNotif('✅ Notifikasi sudah diizinkan');
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showNotif('✅ Notifikasi diaktifkan! Anda akan mendapat pengingat penting');
      localStorage.setItem('notifications_enabled', 'true');
      
      // Send test notification
      new Notification('🎉 Notifikasi Aktif!', {
        body: 'Anda akan mendapat pengingat rencana dan update dari pasangan',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200]
      });
      
      return true;
    } else {
      showNotif('⚠️ Notifikasi tidak diizinkan', true);
      return false;
    }
  }
  
  return false;
}

// Check and show permission modal
export function checkAndShowPermissionModal() {
  const hasAsked = localStorage.getItem('notifications_asked');
  const isEnabled = localStorage.getItem('notifications_enabled') === 'true';
  
  if (!hasAsked && !isEnabled && 'Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
      const modal = document.getElementById('notificationPermissionModal');
      if (modal) {
        new bootstrap.Modal(modal).show();
        localStorage.setItem('notifications_asked', 'true');
      }
    }, 3000);
  }
}

export function dismissNotificationModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('notificationPermissionModal'));
  if (modal) modal.hide();
}

// Send push notification
function sendPushNotification(title, body, type = 'info') {
  // Show toast
  showRealtimeToast(title, body, type);
  playNotificationSound();
  
  // Send browser notification if permitted
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      silent: false,
      tag: 'growthogether',
      renotify: true
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 8000);
  }
  
  // Announce for screen readers
  const statusDiv = document.getElementById('a11y-status');
  if (statusDiv) {
    statusDiv.textContent = `${title}: ${body}`;
    setTimeout(() => { statusDiv.textContent = ''; }, 5000);
  }
}

// Check for new plans
async function checkNewPlans(previousPlans) {
  const currentUser = sessionStorage.getItem('progrowth_user');
  const data = window.masterData || masterData;
  const currentPlans = data?.plans || {};
  
  const previousPlansCount = Object.keys(previousPlans || {}).length;
  const currentPlansCount = Object.keys(currentPlans).length;
  
  if (currentPlansCount > previousPlansCount) {
    const newPlans = Object.entries(currentPlans).filter(([id]) => !previousPlans?.[id]);
    for (const [id, plan] of newPlans) {
      if (plan.author && plan.author !== currentUser) {
        sendPushNotification(
          '📋 Rencana Baru',
          `${plan.author} menambahkan rencana: "${plan.text}"`,
          'info'
        );
      }
    }
  }
}

// Check for new dreams
async function checkNewDreams(previousDreams) {
  const currentUser = sessionStorage.getItem('progrowth_user');
  const data = window.masterData || masterData;
  const currentDreams = data?.dreams || {};
  
  const previousDreamsCount = Object.keys(previousDreams || {}).length;
  const currentDreamsCount = Object.keys(currentDreams).length;
  
  if (currentDreamsCount > previousDreamsCount) {
    const newDreams = Object.entries(currentDreams).filter(([id]) => !previousDreams?.[id]);
    for (const [id, dream] of newDreams) {
      if (dream.author && dream.author !== currentUser) {
        sendPushNotification(
          '✨ Mimpi Baru',
          `${dream.author} menambahkan mimpi: "${dream.title}"`,
          'success'
        );
      }
    }
  }
}

// Check for plan deadlines approaching
function checkPlanDeadlines() {
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const notifiedDeadlines = JSON.parse(localStorage.getItem('notified_deadlines') || '{}');
  const now = Date.now();
  
  Object.entries(plans).forEach(([id, plan]) => {
    if (plan.targetDate && plan.progress < 100) {
      const targetDate = new Date(plan.targetDate);
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      
      const notifiedKey = `${id}_${diffDays}`;
      const lastNotified = notifiedDeadlines[notifiedKey];
      
      if (diffDays === 3 && (!lastNotified || (now - lastNotified) > 86400000)) {
        sendPushNotification(
          '📅 Pengingat Rencana',
          `"${plan.text}" tinggal 3 hari lagi! Jangan lupa dipersiapkan.`,
          'warning'
        );
        notifiedDeadlines[notifiedKey] = now;
      } else if (diffDays === 1 && (!lastNotified || (now - lastNotified) > 86400000)) {
        sendPushNotification(
          '🚨 Pengingat Penting!',
          `"${plan.text}" BESOK! Sudah siap?`,
          'danger'
        );
        notifiedDeadlines[notifiedKey] = now;
      } else if (diffDays === 0 && (!lastNotified || (now - lastNotified) > 86400000)) {
        if (plan.progress < 100) {
          sendPushNotification(
            '⚠️ Deadline Hari Ini!',
            `"${plan.text}" targetnya hari ini! Segera selesaikan.`,
            'danger'
          );
          notifiedDeadlines[notifiedKey] = now;
        }
      } else if (diffDays === 7 && (!lastNotified || (now - lastNotified) > 86400000)) {
        sendPushNotification(
          '📅 Pengingat',
          `"${plan.text}" tinggal 1 minggu lagi.`,
          'info'
        );
        notifiedDeadlines[notifiedKey] = now;
      }
    }
  });
  
  localStorage.setItem('notified_deadlines', JSON.stringify(notifiedDeadlines));
}

// Check saving milestones
function checkSavingMilestones() {
  const data = window.masterData || masterData;
  const finances = data?.finances || {};
  const settings = data?.settings || {};
  const weddingTarget = settings.weddingTarget || 50000000;
  
  let totalWedding = 0;
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding') totalWedding += f.amt;
  });
  
  const milestones = [10, 25, 50, 75, 90, 100];
  const reachedMilestones = JSON.parse(localStorage.getItem('reached_milestones') || '{}');
  const percent = (totalWedding / weddingTarget) * 100;
  
  for (const milestone of milestones) {
    if (percent >= milestone && !reachedMilestones[milestone]) {
      sendPushNotification(
        '🎉 Pencapaian Tabungan!',
        `Selamat! ${milestone}% dari target tabungan telah tercapai. Terus semangat! 🚀`,
        'success'
      );
      reachedMilestones[milestone] = Date.now();
    }
  }
  
  localStorage.setItem('reached_milestones', JSON.stringify(reachedMilestones));
}

// Start real-time notification listener
export function startNotificationListener() {
  if (notificationListener) return;
  
  let previousPlans = {};
  let previousDreams = {};
  
  notificationListener = onValue(ref(db, 'data/'), (snapshot) => {
    const now = Date.now();
    
    // Throttle notifications (max 1 per 2 seconds)
    if (now - lastNotificationTime < 2000) return;
    lastNotificationTime = now;
    
    const data = snapshot.val() || {};
    
    // Check for changes
    checkNewPlans(previousPlans);
    checkNewDreams(previousDreams);
    checkPlanDeadlines();
    checkSavingMilestones();
    
    // Update previous state
    previousPlans = data.plans || {};
    previousDreams = data.dreams || {};
    
    if (window.setMasterData) {
      window.setMasterData(data);
    }
    window.masterData = data;
  });
  
  // Check deadlines every hour
  setInterval(() => {
    checkPlanDeadlines();
    checkSavingMilestones();
  }, 60 * 60 * 1000);
}

// Stop notification listener
export function stopNotificationListener() {
  if (notificationListener) {
    notificationListener();
    notificationListener = null;
  }
}

// Export to window
window.showRealtimeToast = showRealtimeToast;
window.hideRealtimeToast = hideRealtimeToast;
window.requestNotificationPermission = requestNotificationPermission;
window.checkAndShowPermissionModal = checkAndShowPermissionModal;
window.dismissNotificationModal = dismissNotificationModal;
