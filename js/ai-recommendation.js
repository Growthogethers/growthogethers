// js/ai-recommendation.js - AI Planning Generator (Pindah dari Dashboard ke Planning)
import { db, ref, push } from './firebase-config.js';
import { showNotif, formatNumberRp } from './utils.js';

// Location multipliers
const locationMultipliers = {
  jakarta: 1.5,
  surabaya: 1.2,
  bandung: 1.15,
  yogya: 1.0,
  semarang: 0.95,
  medan: 1.1,
  other: 0.85
};

// Budget per category (base)
const categoryBudgets = {
  'Cincin': { base: 3000000, category: '💍 Cincin & Perhiasan', icon: '💍' },
  'MUA': { base: 3500000, category: '💄 MUA & Makeup', icon: '💄' },
  'Fotografi': { base: 8000000, category: '📸 Photography & Videography', icon: '📸' },
  'Venue': { base: 15000000, category: '🏨 Venue / Gedung', icon: '🏨' },
  'Dekorasi': { base: 5000000, category: '💐 Dekorasi', icon: '💐' },
  'Katering': { base: 20000000, category: '🍽️ Catering', icon: '🍽️' },
  'Busana': { base: 5000000, category: '👗 Busana Pengantin', icon: '👗' },
  'Entertainment': { base: 3000000, category: '🎤 Entertainment & MC', icon: '🎤' },
  'Dokumen': { base: 500000, category: '📋 Administrasi', icon: '📋' },
  'Transport': { base: 2000000, category: '🚗 Transportasi', icon: '🚗' }
};

let currentAIRecommendations = [];

// Generate AI recommendations
export async function generateAIRecommendation() {
  const location = document.getElementById('aiLocation')?.value || 'other';
  const guestCount = parseInt(document.getElementById('aiGuestCount')?.value || '100');
  const style = document.getElementById('aiStyle')?.value || 'modern';
  
  const multiplier = locationMultipliers[location] || 1;
  const styleMultiplier = style === 'luxury' ? 1.5 : style === 'simple' ? 0.6 : 1;
  const finalMultiplier = multiplier * styleMultiplier;
  
  // Generate recommendations
  const recommendations = [];
  for (const [key, config] of Object.entries(categoryBudgets)) {
    let adjustedBudget = config.base * finalMultiplier;
    
    // Special adjustments
    if (key === 'Katering') {
      adjustedBudget = (guestCount * 120000) * finalMultiplier;
    } else if (key === 'Venue') {
      adjustedBudget = (guestCount * 50000) * finalMultiplier;
    }
    
    recommendations.push({
      name: key,
      displayName: key,
      category: config.category,
      icon: config.icon,
      estimatedBudget: Math.round(adjustedBudget),
      isRecommended: true
    });
  }
  
  // Sort by budget
  recommendations.sort((a, b) => b.estimatedBudget - a.estimatedBudget);
  currentAIRecommendations = recommendations;
  
  displayAIRecommendations(recommendations);
}

function displayAIRecommendations(recommendations) {
  const container = document.getElementById('aiRecommendationsList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="mb-3">
      <div class="alert alert-info">
        <i class="bi bi-robot me-2"></i>
        <strong>Rekomendasi AI:</strong> Berikut estimasi budget untuk setiap kategori.
      </div>
    </div>
    <div class="list-group mb-3" id="aiRecommendationsChecklist">
      ${recommendations.map(rec => `
        <div class="list-group-item">
          <div class="form-check">
            <input class="form-check-input ai-rec-checkbox" type="checkbox" 
                   value="${rec.name}" data-budget="${rec.estimatedBudget}" 
                   data-category="${rec.category}" data-icon="${rec.icon}"
                   id="rec_${rec.name}" checked>
            <label class="form-check-label fw-semibold" for="rec_${rec.name}">
              ${rec.icon} ${rec.name}
            </label>
            <div class="mt-1 ms-4">
              <span class="badge bg-primary">${rec.category}</span>
              <span class="badge bg-success ms-2">${formatNumberRp(rec.estimatedBudget)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="d-flex gap-2">
      <button class="btn btn-primary flex-grow-1" onclick="window.createPlansFromAIRecommendations()">
        <i class="bi bi-magic me-2"></i>Buat Rencana dari Rekomendasi
      </button>
      <button class="btn btn-outline-secondary" onclick="window.toggleAllAIRecommendations(true)">
        <i class="bi bi-check-all"></i> Semua
      </button>
      <button class="btn btn-outline-secondary" onclick="window.toggleAllAIRecommendations(false)">
        <i class="bi bi-x"></i> Hapus
      </button>
    </div>
  `;
}

export async function createPlansFromAIRecommendations() {
  const checkboxes = document.querySelectorAll('.ai-rec-checkbox:checked');
  if (checkboxes.length === 0) {
    showNotif('❌ Pilih minimal satu kategori', true);
    return;
  }
  
  showNotif(`📋 Membuat ${checkboxes.length} rencana...`);
  
  for (const checkbox of checkboxes) {
    const name = checkbox.value;
    const budget = parseInt(checkbox.dataset.budget);
    const category = checkbox.dataset.category;
    const icon = checkbox.dataset.icon;
    
    const planData = {
      text: `${icon} Persiapan ${name} Pernikahan`,
      cat: "💍 Menikah",
      targetDate: "",
      progress: 0,
      done: false,
      sub: {},
      description: `Persiapan untuk ${name}. Estimasi budget: ${formatNumberRp(budget)}`,
      estimatedBudget: budget,
      actualBudget: 0,
      planCategory: name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFromAI: true
    };
    
    await push(ref(db, 'data/plans'), planData);
  }
  
  showNotif(`✅ ${checkboxes.length} rencana berhasil dibuat!`);
  
  // Tutup modal dan refresh
  const modal = bootstrap.Modal.getInstance(document.getElementById('aiRecommendModal'));
  if (modal) modal.hide();
  
  if (window.renderAll) window.renderAll();
  if (window.renderFinances) window.renderFinances();
}

export function toggleAllAIRecommendations(checked) {
  const checkboxes = document.querySelectorAll('.ai-rec-checkbox');
  checkboxes.forEach(cb => cb.checked = checked);
}

export function openAIRecommendModal() {
  const locationSelect = document.getElementById('aiLocation');
  const guestSelect = document.getElementById('aiGuestCount');
  
  if (locationSelect) locationSelect.value = 'jakarta';
  if (guestSelect) guestSelect.value = '250';
  
  document.querySelectorAll('.style-option').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.style === 'modern') btn.classList.add('active');
  });
  
  const aiStyle = document.getElementById('aiStyle');
  if (aiStyle) aiStyle.value = 'modern';
  
  const container = document.getElementById('aiRecommendationsList');
  if (container) {
    container.innerHTML = '<div class="text-center text-muted py-4">Klik "Generate Rekomendasi" untuk mulai</div>';
  }
  
  const modal = new bootstrap.Modal(document.getElementById('aiRecommendModal'));
  modal.show();
}

export function initAIStyleButtons() {
  const buttons = document.querySelectorAll('.style-option');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const aiStyle = document.getElementById('aiStyle');
      if (aiStyle) aiStyle.value = btn.dataset.style;
    });
  });
}

// Export ke window
window.generateAIRecommendation = generateAIRecommendation;
window.createPlansFromAIRecommendations = createPlansFromAIRecommendations;
window.toggleAllAIRecommendations = toggleAllAIRecommendations;
window.openAIRecommendModal = openAIRecommendModal;
window.initAIStyleButtons = initAIStyleButtons;
