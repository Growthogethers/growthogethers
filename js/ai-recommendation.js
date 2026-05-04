// js/ai-recommendation.js - Fixed to prevent double generation
import { db, ref, push, update, get } from './firebase-config.js';
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
  'Cincin': { base: 3000000, category: 'Cincin', icon: '💍' },
  'MUA': { base: 3500000, category: 'MUA', icon: '💄' },
  'Fotografi': { base: 8000000, category: 'Fotografi', icon: '📸' },
  'Venue': { base: 15000000, category: 'Venue', icon: '🏨' },
  'Dekorasi': { base: 5000000, category: 'Dekorasi', icon: '💐' },
  'Katering': { base: 20000000, category: 'Katering', icon: '🍽️' },
  'Busana': { base: 5000000, category: 'Busana', icon: '👗' },
  'Entertainment': { base: 3000000, category: 'Entertainment', icon: '🎤' },
  'Dokumen': { base: 500000, category: 'Dokumen', icon: '📋' },
  'Transport': { base: 2000000, category: 'Transport', icon: '🚗' }
};

let isGenerating = false;
let currentAIRecommendations = [];

// Generate AI recommendations
export async function generateAIRecommendation() {
  if (isGenerating) {
    showNotif("⏳ Sedang memproses, tunggu sebentar...", false);
    return;
  }
  
  isGenerating = true;
  const generateBtn = document.getElementById('aiGenerateBtn');
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Memproses...';
  }
  
  try {
    const location = document.getElementById('aiLocation')?.value || 'other';
    const guestCount = parseInt(document.getElementById('aiGuestCount')?.value || '100');
    const style = document.getElementById('aiStyle')?.value || 'modern';
    
    const multiplier = locationMultipliers[location] || 1;
    const styleMultiplier = style === 'luxury' ? 1.5 : style === 'simple' ? 0.6 : 1;
    const finalMultiplier = multiplier * styleMultiplier;
    
    // Generate recommendations
    const recommendations = [];
    let totalBudget = 0;
    
    for (const [key, config] of Object.entries(categoryBudgets)) {
      let adjustedBudget = config.base * finalMultiplier;
      
      if (key === 'Katering') {
        adjustedBudget = (guestCount * 120000) * finalMultiplier;
      } else if (key === 'Venue') {
        adjustedBudget = (guestCount * 50000) * finalMultiplier;
      }
      
      adjustedBudget = Math.round(adjustedBudget);
      totalBudget += adjustedBudget;
      
      recommendations.push({
        name: key,
        displayName: key,
        category: config.category,
        icon: config.icon,
        estimatedBudget: adjustedBudget,
        isRecommended: true
      });
    }
    
    recommendations.sort((a, b) => b.estimatedBudget - a.estimatedBudget);
    currentAIRecommendations = recommendations;
    
    displayAIRecommendations(recommendations, totalBudget);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    showNotif('❌ Gagal generate rekomendasi', true);
  } finally {
    isGenerating = false;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Rekomendasi';
    }
  }
}

function displayAIRecommendations(recommendations, totalBudget) {
  const container = document.getElementById('aiRecommendationsList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="mb-3">
      <div class="alert alert-info">
        <i class="bi bi-robot me-2"></i>
        <strong>Rekomendasi AI:</strong> Berikut estimasi budget untuk setiap kategori.
        <div class="mt-2 fw-bold text-primary">Total Budget: ${formatNumberRp(totalBudget)}</div>
      </div>
    </div>
    <div class="list-group mb-3" id="aiRecommendationsChecklist" style="max-height: 400px; overflow-y: auto;">
      ${recommendations.map(rec => `
        <div class="list-group-item">
          <div class="form-check">
            <input class="form-check-input ai-rec-checkbox" type="checkbox" 
                   value="${rec.name}" data-budget="${rec.estimatedBudget}" 
                   data-category="${rec.category}" data-icon="${rec.icon}"
                   id="rec_${rec.name.replace(/\s/g, '_')}" checked>
            <label class="form-check-label fw-semibold" for="rec_${rec.name.replace(/\s/g, '_')}">
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

let isCreating = false;

export async function createPlansFromAIRecommendations() {
  if (isCreating) {
    showNotif("⏳ Sedang membuat rencana, tunggu sebentar...", false);
    return;
  }
  
  const checkboxes = document.querySelectorAll('.ai-rec-checkbox:checked');
  if (checkboxes.length === 0) {
    showNotif('❌ Pilih minimal satu kategori', true);
    return;
  }
  
  isCreating = true;
  showNotif(`📋 Membuat ${checkboxes.length} rencana...`);
  
  try {
    // Collect all selected recommendations
    const selectedPlans = [];
    let totalBudget = 0;
    
    for (const checkbox of checkboxes) {
      const name = checkbox.value;
      const budget = parseInt(checkbox.dataset.budget);
      const category = checkbox.dataset.category;
      const icon = checkbox.dataset.icon;
      
      totalBudget += budget;
      selectedPlans.push({
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
      });
    }
    
    // Save all plans
    for (const planData of selectedPlans) {
      await push(ref(db, 'data/plans'), planData);
    }
    
    // Create saving target based on total budget (only if not exists with same amount and date range)
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 1);
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    // Get existing settings
    const settingsRef = ref(db, 'data/settings');
    const snapshot = await get(settingsRef);
    const currentSettings = snapshot.val() || {};
    const currentTargets = currentSettings.savingTargets || {};
    
    // Check if target already exists to prevent double creation
    let targetExists = false;
    const targetKey = `ai_target_${totalBudget}_${startDate}_${endDateStr}`;
    
    for (const [id, target] of Object.entries(currentTargets)) {
      if (target.fromAI && 
          Math.abs(target.amount - totalBudget) < 1000000 && // within 1 million
          target.startDate === startDate && 
          target.endDate === endDateStr) {
        targetExists = true;
        break;
      }
    }
    
    if (!targetExists) {
      const targetId = `ai_target_${Date.now()}`;
      currentTargets[targetId] = {
        startDate: startDate,
        endDate: endDateStr,
        amount: totalBudget,
        createdAt: Date.now(),
        fromAI: true,
        description: 'Target dari AI Recommendation'
      };
      
      await update(ref(db, 'data/settings'), { savingTargets: currentTargets });
      showNotif(`✅ Target tabungan Rp ${totalBudget.toLocaleString()} untuk 6 bulan telah ditambahkan.`);
    } else {
      showNotif(`✅ Target tabungan sudah ada, tidak perlu menambah duplikat.`);
    }
    
    showNotif(`✅ ${selectedPlans.length} rencana berhasil dibuat!`);
    
    // Tutup modal dan refresh
    const modal = bootstrap.Modal.getInstance(document.getElementById('aiRecommendModal'));
    if (modal) modal.hide();
    
    // Refresh all data
    if (window.renderAll) window.renderAll();
    if (window.loadSavingTargets) window.loadSavingTargets();
    if (window.renderFinances) window.renderFinances();
    if (window.renderDashboard) window.renderDashboard();
    
  } catch (error) {
    console.error('Error creating plans:', error);
    showNotif('❌ Gagal membuat rencana: ' + error.message, true);
  } finally {
    isCreating = false;
  }
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
