// FILE BARU: js/ai-recommendation.js - AI Budget Recommendation
import { showNotif, formatNumberRp } from './utils.js';
import { addSavingTarget } from './financial.js';

// Budget multipliers based on location
const locationMultipliers = {
  jakarta: 1.5,
  surabaya: 1.2,
  bandung: 1.15,
  yogya: 1.0,
  semarang: 0.95,
  medan: 1.1,
  other: 0.85
};

// Base budget per guest
const baseBudgetPerGuest = {
  modern: 250000,
  traditional: 300000,
  outdoor: 275000,
  luxury: 500000,
  simple: 150000
};

// Budget breakdown percentages
const breakdownPercentages = {
  modern: {
    venue: 30,
    catering: 25,
    decoration: 15,
    photoVideo: 12,
    mua: 5,
    attire: 8,
    entertainment: 5
  },
  traditional: {
    venue: 25,
    catering: 30,
    decoration: 20,
    photoVideo: 10,
    mua: 5,
    attire: 5,
    entertainment: 5
  },
  outdoor: {
    venue: 35,
    catering: 25,
    decoration: 18,
    photoVideo: 10,
    mua: 4,
    attire: 4,
    entertainment: 4
  },
  luxury: {
    venue: 35,
    catering: 25,
    decoration: 15,
    photoVideo: 10,
    mua: 5,
    attire: 5,
    entertainment: 5
  },
  simple: {
    venue: 30,
    catering: 30,
    decoration: 10,
    photoVideo: 10,
    mua: 5,
    attire: 10,
    entertainment: 5
  }
};

// Saving tips
const savingTips = [
  "💡 Booking venue di weekdays bisa hemat 30-50%",
  "💡 Gunakan dekorasi dari bunga musiman lebih murah",
  "💡 Cari paket wedding bundling (MUA + busana + dekorasi)",
  "💡 Kurangi jumlah tamu undangan bisa hemat signifikan",
  "💡 Gunakan undangan digital untuk hemat cetak",
  "💡 Sewa outfit daripada beli untuk pengantin pria",
  "💡 Pilih catering dengan sistem prasmanan lebih hemat",
  "💡 Cari vendor pemula dengan portofolio bagus harga terjangkau",
  "💡 Booking H-1 tahun untuk dapat early bird discount",
  "💡 Gunakan jasa wedding organizer untuk negosiasi harga lebih baik"
];

// Generate AI recommendation
export function generateAIRecommendation() {
  const location = document.getElementById('aiLocation')?.value || 'other';
  const guestCount = parseInt(document.getElementById('aiGuestCount')?.value || '100');
  const style = document.getElementById('aiStyle')?.value || 'modern';
  
  // Calculate base total
  const multiplier = locationMultipliers[location] || 1;
  const perGuest = baseBudgetPerGuest[style] || 250000;
  let baseTotal = guestCount * perGuest * multiplier;
  
  // Add fixed costs
  const fixedCosts = {
    modern: 5000000,
    traditional: 8000000,
    outdoor: 6000000,
    luxury: 15000000,
    simple: 3000000
  };
  
  const totalBudget = baseTotal + (fixedCosts[style] || 5000000);
  
  // Display result
  const resultDiv = document.getElementById('aiResult');
  const totalBudgetEl = document.getElementById('aiTotalBudget');
  const breakdownEl = document.getElementById('aiBreakdown');
  const tipsEl = document.getElementById('aiTips');
  
  if (!resultDiv) return;
  
  totalBudgetEl.innerHTML = formatNumberRp(totalBudget);
  
  // Build breakdown
  const breakdown = breakdownPercentages[style];
  let breakdownHtml = '<div class="list-group">';
  for (const [item, percent] of Object.entries(breakdown)) {
    const amount = (totalBudget * percent) / 100;
    const itemNames = {
      venue: '🏨 Venue / Gedung',
      catering: '🍽️ Catering',
      decoration: '💐 Dekorasi',
      photoVideo: '📸 Foto & Video',
      mua: '💄 MUA & Makeup',
      attire: '👗 Busana Pengantin',
      entertainment: '🎤 Entertainment & MC'
    };
    breakdownHtml += `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <span>${itemNames[item] || item}</span>
        <span class="fw-semibold">${formatNumberRp(amount)} <small class="text-muted">(${percent}%)</small></span>
      </div>
    `;
  }
  breakdownHtml += '</div>';
  breakdownEl.innerHTML = breakdownHtml;
  
  // Show random tips
  const shuffledTips = [...savingTips].sort(() => 0.5 - Math.random());
  const selectedTips = shuffledTips.slice(0, 4);
  tipsEl.innerHTML = selectedTips.map(tip => `<li>${tip}</li>`).join('');
  
  resultDiv.style.display = 'block';
  
  // Animation
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Apply AI recommendation to saving targets
export async function applyAIRecommendation() {
  const location = document.getElementById('aiLocation')?.value || 'other';
  const guestCount = parseInt(document.getElementById('aiGuestCount')?.value || '100');
  const style = document.getElementById('aiStyle')?.value || 'modern';
  
  const multiplier = locationMultipliers[location] || 1;
  const perGuest = baseBudgetPerGuest[style] || 250000;
  let baseTotal = guestCount * perGuest * multiplier;
  
  const fixedCosts = {
    modern: 5000000,
    traditional: 8000000,
    outdoor: 6000000,
    luxury: 15000000,
    simple: 3000000
  };
  
  const totalBudget = baseTotal + (fixedCosts[style] || 5000000);
  
  // Ask if user wants to set as wedding target
  if (confirm(`Apakah Anda ingin menjadikan ${formatNumberRp(totalBudget)} sebagai target tabungan utama pernikahan?\n\nBudget akan ditambahkan ke setting target utama.`)) {
    // Update wedding target in settings
    const { update, ref, db } = await import('./firebase-config.js');
    try {
      await update(ref(db, 'data/settings'), { weddingTarget: totalBudget });
      showNotif(`✅ Target pernikahan diupdate menjadi ${formatNumberRp(totalBudget)}`);
      
      // Close modal if open
      const modal = bootstrap.Modal.getInstance(document.getElementById('aiRecommendModal'));
      if (modal) modal.hide();
      
      // Refresh dashboard
      if (window.renderAll) window.renderAll();
    } catch (err) {
      showNotif('❌ Gagal menyimpan target', true);
    }
  }
}

// Initialize AI recommendation modal
export function openAIRecommendModal() {
  // Reset form
  document.getElementById('aiLocation').value = 'jakarta';
  document.getElementById('aiGuestCount').value = '250';
  document.getElementById('aiStyle').value = 'modern';
  document.getElementById('aiResult').style.display = 'none';
  
  // Reset style buttons
  document.querySelectorAll('.style-option').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.style === 'modern') btn.classList.add('active');
  });
  
  const modal = new bootstrap.Modal(document.getElementById('aiRecommendModal'));
  modal.show();
}

// Initialize style button listeners
export function initAIStyleButtons() {
  const buttons = document.querySelectorAll('.style-option');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('aiStyle').value = btn.dataset.style;
    });
  });
}

// Export to window
window.generateAIRecommendation = generateAIRecommendation;
window.applyAIRecommendation = applyAIRecommendation;
window.openAIRecommendModal = openAIRecommendModal;
window.initAIStyleButtons = initAIStyleButtons;
