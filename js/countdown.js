// FILE BARU: js/countdown.js - Wedding Countdown Widget
import { db, ref, get, update } from './firebase-config.js';
import { showNotif } from './utils.js';

let countdownInterval = null;
let weddingDate = null;

// Load wedding date from settings
export async function loadWeddingDate() {
  try {
    const snapshot = await get(ref(db, 'data/settings/weddingDate'));
    weddingDate = snapshot.val();
    if (!weddingDate) {
      // Set default: 6 months from now
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 6);
      weddingDate = defaultDate.toISOString().split('T')[0];
      await update(ref(db, 'data/settings'), { weddingDate: weddingDate });
    }
    return weddingDate;
  } catch (err) {
    console.error('Error loading wedding date:', err);
    return null;
  }
}

// Save wedding date
export async function saveWeddingDate(date) {
  try {
    await update(ref(db, 'data/settings'), { weddingDate: date });
    weddingDate = date;
    showNotif('✅ Tanggal pernikahan diperbarui!');
    startCountdown();
    return true;
  } catch (err) {
    showNotif('❌ Gagal menyimpan tanggal', true);
    return false;
  }
}

// Update countdown display
function updateCountdownDisplay() {
  if (!weddingDate) return;
  
  const targetDate = new Date(weddingDate);
  const now = new Date();
  const diff = targetDate - now;
  
  const daysEl = document.getElementById('countdownDays');
  const hoursEl = document.getElementById('countdownHours');
  const minutesEl = document.getElementById('countdownMinutes');
  const secondsEl = document.getElementById('countdownSeconds');
  const messageEl = document.getElementById('countdownMessage');
  
  if (!daysEl) return;
  
  if (diff <= 0) {
    // Wedding day has passed or is today
    if (diff >= -86400000) { // Within 1 day after
      if (messageEl) {
        messageEl.innerHTML = '<i class="bi bi-heart-fill me-2"></i>Hari ini adalah hari bahagia! Selamat!<i class="bi bi-heart-fill ms-2"></i>';
        messageEl.style.display = 'block';
      }
      daysEl.innerText = '0';
      if (hoursEl) hoursEl.innerText = '0';
      if (minutesEl) minutesEl.innerText = '0';
      if (secondsEl) secondsEl.innerText = '0';
    } else {
      if (messageEl) {
        messageEl.innerHTML = '<i class="bi bi-emoji-smile me-2"></i>Pernikahan telah berlangsung. Semoga selalu bahagia!<i class="bi bi-emoji-smile ms-2"></i>';
        messageEl.style.display = 'block';
      }
    }
    return;
  }
  
  if (messageEl) messageEl.style.display = 'none';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
  const seconds = Math.floor((diff % (60000)) / 1000);
  
  daysEl.innerText = days;
  if (hoursEl) hoursEl.innerText = hours;
  if (minutesEl) minutesEl.innerText = minutes;
  if (secondsEl) secondsEl.innerText = seconds;
  
  // Add celebration effect for milestone days
  const countdownWidget = document.getElementById('countdownWidget');
  if (countdownWidget) {
    if (days === 100) {
      countdownWidget.style.animation = 'pulse 0.5s ease-in-out 3';
      setTimeout(() => { countdownWidget.style.animation = ''; }, 1500);
      if (!localStorage.getItem('milestone_100_notified')) {
        showNotif('🎉 100 hari menuju hari bahagia! Semangat!');
        localStorage.setItem('milestone_100_notified', 'true');
      }
    } else if (days === 30) {
      if (!localStorage.getItem('milestone_30_notified')) {
        showNotif('🎉 30 hari lagi! Persiapan semakin matang!');
        localStorage.setItem('milestone_30_notified', 'true');
      }
    } else if (days === 7) {
      if (!localStorage.getItem('milestone_7_notified')) {
        showNotif('🎉 1 minggu lagi! Jangan lupa cek persiapan!');
        localStorage.setItem('milestone_7_notified', 'true');
      }
    }
  }
}

// Show edit wedding date modal
export function showEditWeddingDateModal() {
  const date = prompt('Masukkan tanggal pernikahan (YYYY-MM-DD):', weddingDate);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    saveWeddingDate(date);
  } else if (date) {
    showNotif('❌ Format tanggal salah. Gunakan YYYY-MM-DD', true);
  }
}

// Start countdown timer
export function startCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  loadWeddingDate().then(() => {
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
  });
}

// Stop countdown timer
export function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// Render countdown widget HTML
export function renderCountdownWidget() {
  const container = document.getElementById('countdownWidgetContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div class="countdown-widget" id="countdownWidget">
      <div class="text-center">
        <i class="bi bi-calendar-heart-fill fs-3"></i>
        <h6 class="fw-bold mb-1 mt-2">Menuju Hari Bahagia</h6>
        <div class="countdown-digits">
          <div class="countdown-digit">
            <div class="countdown-number" id="countdownDays">0</div>
            <span class="countdown-label">Hari</span>
          </div>
          <div class="countdown-digit">
            <div class="countdown-number" id="countdownHours">0</div>
            <span class="countdown-label">Jam</span>
          </div>
          <div class="countdown-digit">
            <div class="countdown-number" id="countdownMinutes">0</div>
            <span class="countdown-label">Menit</span>
          </div>
          <div class="countdown-digit">
            <div class="countdown-number" id="countdownSeconds">0</div>
            <span class="countdown-label">Detik</span>
          </div>
        </div>
        <div id="countdownMessage" style="display: none;" class="mt-2 small fw-semibold"></div>
        <button class="btn btn-sm btn-light mt-3 rounded-pill" onclick="window.showEditWeddingDateModal()">
          <i class="bi bi-pencil me-1"></i>Ubah Tanggal
        </button>
      </div>
    </div>
  `;
  
  startCountdown();
}

// Add pulse animation CSS dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); background: linear-gradient(135deg, #8b5cf6, #6366f1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

// Export to window
window.renderCountdownWidget = renderCountdownWidget;
window.startCountdown = startCountdown;
window.showEditWeddingDateModal = showEditWeddingDateModal;
