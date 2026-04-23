// js/dashboard.js
import { masterData, formatNumberRp, privacyHidden } from './utils.js';

// Helper function untuk format month display
function formatMonthDisplayDashboard(month) {
  if (!month) return '';
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const [year, monthNum] = month.split('-');
  return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
}

// Helper untuk mendapatkan semua bulan dari range target
function getAllMonthsFromTargets(savingTargets) {
  if (!savingTargets || Object.keys(savingTargets).length === 0) {
    return [];
  }
  
  let earliestStart = null;
  let latestEnd = null;
  
  Object.values(savingTargets).forEach(target => {
    if (target.startDate && target.endDate) {
      if (!earliestStart || target.startDate < earliestStart) {
        earliestStart = target.startDate;
      }
      if (!latestEnd || target.endDate > latestEnd) {
        latestEnd = target.endDate;
      }
    }
  });
  
  if (!earliestStart || !latestEnd) {
    return [];
  }
  
  const startDate = new Date(earliestStart + '-01');
  const endDate = new Date(latestEnd + '-01');
  const months = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

// Helper untuk mendapatkan target per bulan dari savingTargets (akumulasi)
function getMonthlyTargetsFromTargets(savingTargets, monthRange) {
  const monthlyTargets = {};
  
  monthRange.forEach(month => {
    monthlyTargets[month] = 0;
  });
  
  Object.values(savingTargets).forEach(target => {
    const startDate = new Date(target.startDate);
    const endDate = new Date(target.endDate);
    const targetAmount = target.amount;
    
    let currentDate = new Date(startDate);
    let monthCount = 0;
    
    while (currentDate <= endDate) {
      monthCount++;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    if (monthCount === 0) return;
    
    const monthlyAmount = targetAmount / monthCount;
    
    currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      
      if (monthlyTargets[monthKey] !== undefined) {
        monthlyTargets[monthKey] += monthlyAmount;
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  });
  
  return monthlyTargets;
}

// Helper untuk menghitung total dalam periode
function calculateTotalInPeriod(startDate, endDate, finances) {
  let total = 0;
  if (!finances) return total;
  
  Object.values(finances).forEach(f => {
    if (f.type === 'wedding' && f.date) {
      if (f.date >= startDate && f.date <= endDate) {
        total += f.amt;
      }
    }
  });
  return total;
}

// Helper format month year
function formatMonthYearDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[parseInt(parts[1]) - 1];
    return `${monthName} ${parts[0]}`;
  }
  return dateStr;
}

export function renderDashboard() {
  if (!masterData) {
    console.log("masterData not available yet");
    return;
  }
  
  const totalWeddingEl = document.getElementById("totalWedding");
  if (!totalWeddingEl) return;
  
  const settings = masterData.settings || { weddingTarget: 50000000 };
  const targetWed = settings.weddingTarget;
  const savingTargets = settings.savingTargets || {};
  
  let wA = 0, wB = 0;
  const finances = masterData.finances ? Object.entries(masterData.finances) : [];
  
  finances.forEach(([id, f]) => {
    if (f.type === "wedding") {
      if (f.user === "FACHMI") wA += f.amt;
      else wB += f.amt;
    }
  });
  
  const totalWed = wA + wB;
  const percent = targetWed > 0 ? Math.min(100, (totalWed / targetWed) * 100) : 0;
  
  // ============ PERHITUNGAN TARGET BULAN INI DARI SAVING TARGETS ============
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonth = `${currentYear}-${currentMonthNum}`;
  const currentMonthDisplay = formatMonthDisplayDashboard(currentMonth);
  
  // Dapatkan semua bulan dari range target
  const monthRange = getAllMonthsFromTargets(savingTargets);
  const monthlyTargets = getMonthlyTargetsFromTargets(savingTargets, monthRange);
  
  let currentMonthTarget = 0;
  let currentMonthSaved = 0;
  
  // Hitung target bulan ini dari savingTargets
  if (monthlyTargets[currentMonth]) {
    currentMonthTarget = monthlyTargets[currentMonth];
  }
  
  // Hitung tabungan bulan ini dari finances
  const financesObj = masterData.finances || {};
  Object.values(financesObj).forEach(f => {
    if (f.type === "wedding" && f.date) {
      const fMonth = f.date.substring(0, 7);
      if (fMonth === currentMonth) {
        currentMonthSaved += f.amt;
      }
    }
  });
  
  const monthPercent = currentMonthTarget > 0 ? Math.min(100, (currentMonthSaved / currentMonthTarget) * 100) : 0;
  
  // Format dengan privacy
  const formatWithPrivacy = (value) => {
    if (privacyHidden) return "●●● ●●●";
    return formatNumberRp(value);
  };
  
  // Update Dashboard elements
  const totalWeddingElement = document.getElementById("totalWedding");
  if (totalWeddingElement) totalWeddingElement.innerHTML = formatWithPrivacy(totalWed);
  
  const targetWeddingAmountEl = document.getElementById("targetWeddingAmount");
  if (targetWeddingAmountEl) targetWeddingAmountEl.innerHTML = formatWithPrivacy(targetWed);
  
  const weddingProgressFillEl = document.getElementById("weddingProgressFill");
  if (weddingProgressFillEl) weddingProgressFillEl.style.width = `${percent}%`;
  
  const weddingPercentTextEl = document.getElementById("weddingPercentText");
  if (weddingPercentTextEl) weddingPercentTextEl.innerHTML = `${Math.round(percent)}%`;
  
  const savingsAEl = document.getElementById("savingsA");
  if (savingsAEl) savingsAEl.innerHTML = formatWithPrivacy(wA);
  
  const savingsBEl = document.getElementById("savingsB");
  if (savingsBEl) savingsBEl.innerHTML = formatWithPrivacy(wB);
  
  // Update statistik cards
  const visions = masterData.visions ? Object.entries(masterData.visions) : [];
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  const totalP = plansArray.length;
  const doneP = plansArray.filter(p => p[1].progress >= 100).length;
  const percentDone = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;
  
  const totalSharedEl = document.getElementById("totalShared");
  if (totalSharedEl) totalSharedEl.innerHTML = visions.length;
  
  const totalPlansEl = document.getElementById("totalPlans");
  if (totalPlansEl) totalPlansEl.innerHTML = totalP;
  
  const totalDoneEl = document.getElementById("totalDone");
  if (totalDoneEl) {
    totalDoneEl.innerHTML = `${percentDone}%`;
    if (percentDone === 100 && totalP > 0) {
      totalDoneEl.classList.add("text-success");
      totalDoneEl.classList.remove("text-warning", "text-danger");
    } else if (percentDone >= 50) {
      totalDoneEl.classList.add("text-warning");
      totalDoneEl.classList.remove("text-success", "text-danger");
    } else if (percentDone > 0) {
      totalDoneEl.classList.add("text-danger");
      totalDoneEl.classList.remove("text-success", "text-warning");
    }
  }
  
  // Update ring chart progress
  const progressRingCircle = document.getElementById("progressRingCircle");
  const ringPercentEl = document.getElementById("ringPercent");
  
  if (progressRingCircle && ringPercentEl) {
    const circumference = 2 * Math.PI * 26;
    const offset = circumference - (percentDone / 100) * circumference;
    progressRingCircle.style.strokeDasharray = `${circumference}`;
    progressRingCircle.style.strokeDashoffset = offset;
    ringPercentEl.innerText = `${percentDone}%`;
    
    if (percentDone >= 75) {
      progressRingCircle.style.stroke = "#10b981";
    } else if (percentDone >= 50) {
      progressRingCircle.style.stroke = "#f59e0b";
    } else if (percentDone > 0) {
      progressRingCircle.style.stroke = "#ef4444";
    } else {
      progressRingCircle.style.stroke = "#e2e8f0";
    }
  }
  
  // Update completed this month
  const completedThisMonthEl = document.getElementById("completedThisMonth");
  if (completedThisMonthEl) {
    const completedThisMonth = plansArray.filter(([id, p]) => {
      if (p.progress >= 100 && p.updatedAt) {
        const completedDate = new Date(p.updatedAt);
        return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
      }
      return false;
    }).length;
    completedThisMonthEl.innerHTML = completedThisMonth;
  }
  
  // Update overdue count
  const overdueCountEl = document.getElementById("overdueCount");
  if (overdueCountEl) {
    const overdue = plansArray.filter(([id, p]) => {
      return p.targetDate && p.progress < 100 && new Date(p.targetDate) < now;
    }).length;
    overdueCountEl.innerHTML = overdue;
  }
  
  // Update achievement rate
  const achievementRateEl = document.getElementById("achievementRate");
  if (achievementRateEl) {
    let totalProgress = 0;
    plansArray.forEach(([id, p]) => {
      totalProgress += p.progress || 0;
    });
    const avgProgress = totalP > 0 ? Math.round(totalProgress / totalP) : 0;
    achievementRateEl.innerHTML = `${avgProgress}%`;
    
    if (avgProgress >= 75) {
      achievementRateEl.classList.add("text-success");
      achievementRateEl.classList.remove("text-warning", "text-danger");
    } else if (avgProgress >= 50) {
      achievementRateEl.classList.add("text-warning");
      achievementRateEl.classList.remove("text-success", "text-danger");
    } else if (avgProgress > 0) {
      achievementRateEl.classList.add("text-danger");
      achievementRateEl.classList.remove("text-success", "text-warning");
    }
  }
  
  // ============ UPDATE TARGET INFO DI DASHBOARD (3 KOLOM) ============
  const targetInfoContainer = document.getElementById("targetInfo");
  if (targetInfoContainer) {
    let activeTargets = [];
    let totalTargetAmount = 0;
    let totalSavedAmount = 0;
    let completedTargets = 0;
    
    Object.entries(savingTargets).forEach(([id, target]) => {
      const saved = calculateTotalInPeriod(target.startDate, target.endDate, masterData.finances || {});
      totalTargetAmount += target.amount;
      totalSavedAmount += saved;
      
      if (saved >= target.amount) {
        completedTargets++;
      } else {
        activeTargets.push({ id, ...target, saved });
      }
    });
    
    activeTargets.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    
    const nextTarget = activeTargets.length > 0 ? activeTargets[0] : null;
    
    // HTML untuk kolom 1 - Target Bulan Ini
    let targetMonthHtml = '';
    if (currentMonthTarget > 0) {
      targetMonthHtml = `
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          <div class="rounded-circle bg-primary bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
            <i class="bi bi-calendar-month fs-3 text-primary"></i>
          </div>
          <h6 class="mt-1 mb-1 fw-semibold">Target Bulan Ini</h6>
          <h4 class="fw-bold mb-0 text-primary">${formatWithPrivacy(currentMonthSaved)}</h4>
          <small class="text-muted">Target: ${formatWithPrivacy(currentMonthTarget)}</small>
          <div class="progress mt-2" style="height: 6px; border-radius: 10px;">
            <div class="progress-bar bg-primary" style="width: ${monthPercent}%; border-radius: 10px;"></div>
          </div>
          <small class="mt-2 ${currentMonthSaved >= currentMonthTarget ? 'text-success fw-semibold' : 'text-warning'}">
            ${currentMonthSaved >= currentMonthTarget ? '✓ Target Bulanan Tercapai!' : `${Math.round(monthPercent)}% tercapai`}
          </small>
        </div>
      `;
    } else {
      targetMonthHtml = `
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          <div class="rounded-circle bg-secondary bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
            <i class="bi bi-calendar-month fs-3 text-secondary"></i>
          </div>
          <h6 class="mt-1 mb-1 fw-semibold">Target Bulan Ini</h6>
          <h4 class="fw-bold mb-0 text-secondary">${formatWithPrivacy(currentMonthSaved)}</h4>
          <small class="text-muted">Target: ${formatWithPrivacy(currentMonthTarget)}</small>
          <small class="text-muted mt-2">Belum ada target untuk bulan ${currentMonthDisplay}</small>
          <div class="mt-2">
            <span class="badge bg-secondary bg-opacity-10 text-secondary">📝 Buat target di menu Keuangan</span>
          </div>
        </div>
      `;
    }
    
    targetInfoContainer.innerHTML = `
      <div class="col-md-4">
        ${targetMonthHtml}
      </div>
      
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          <div class="rounded-circle bg-success bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
            <i class="bi bi-piggy-bank fs-3 text-success"></i>
          </div>
          <h6 class="mt-1 mb-1 fw-semibold">Total Tabungan</h6>
          <h4 class="fw-bold mb-0 text-success">${formatWithPrivacy(totalWed)}</h4>
          <small class="text-muted">Target Keseluruhan: ${formatWithPrivacy(targetWed)}</small>
          <div class="progress mt-2" style="height: 6px; border-radius: 10px;">
            <div class="progress-bar bg-success" style="width: ${percent}%; border-radius: 10px;"></div>
          </div>
          <small class="mt-2 fw-semibold">${Math.round(percent)}% dari target utama</small>
        </div>
      </div>
      
      <div class="col-md-4">
        ${nextTarget ? `
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="rounded-circle bg-warning bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-flag-checkered fs-3 text-warning"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Target Aktif Terdekat</h6>
            <h4 class="fw-bold mb-0 text-warning">${formatWithPrivacy(nextTarget.amount)}</h4>
            <small class="text-muted">${formatMonthYearDisplay(nextTarget.startDate)} - ${formatMonthYearDisplay(nextTarget.endDate)}</small>
            <div class="progress mt-2" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-warning" style="width: ${(nextTarget.saved / nextTarget.amount) * 100}%; border-radius: 10px;"></div>
            </div>
            <small class="mt-2 text-muted">Terkumpul: ${formatWithPrivacy(nextTarget.saved)}</small>
            <div class="mt-2">
              <span class="badge bg-warning bg-opacity-10 text-warning">🎯 ${Math.ceil((nextTarget.saved / nextTarget.amount) * 100)}% tercapai</span>
            </div>
          </div>
        ` : Object.keys(savingTargets).length > 0 ? `
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="rounded-circle bg-success bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-trophy fs-3 text-success"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Semua Target</h6>
            <h4 class="fw-bold mb-0 text-success">✨ Tercapai!</h4>
            <small class="text-muted">Selamat! ${completedTargets} target tabungan telah tercapai 🎉</small>
            <div class="mt-2">
              <span class="badge bg-success bg-opacity-10 text-success">🏆 Luar biasa!</span>
            </div>
          </div>
        ` : `
          <div class="card border-0 shadow-sm text-center p-3 h-100">
            <div class="rounded-circle bg-secondary bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-plus-circle fs-3 text-secondary"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Target Tabungan</h6>
            <h4 class="fw-bold mb-0 text-secondary">Belum Ada</h4>
            <small class="text-muted">Buat target di menu Keuangan</small>
            <div class="mt-2">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">📝 Mulai buat target</span>
            </div>
          </div>
        `}
      </div>
    `;
  }
  
  console.log("Dashboard updated:", { 
    totalWed: formatNumberRp(totalWed), 
    percent: Math.round(percent),
    currentMonth,
    currentMonthDisplay,
    currentMonthTarget,
    currentMonthSaved
  });
}

// ============ UPDATE CHARTS ============
export function updateCharts(weddingHistory, totalPlansDone, totalPlansAll, weddingChart, plansChart) {
  const weddingChartEl = document.getElementById('weddingTrendChart');
  const plansChartEl = document.getElementById('plansProgressChart');
  
  if (!weddingChartEl || !plansChartEl) {
    console.log("Chart elements not ready yet");
    return { weddingChart, plansChart };
  }
  
  const settings = window.masterData?.settings || { weddingTarget: 50000000 };
  const weddingTarget = settings.weddingTarget;
  const savingTargets = settings.savingTargets || {};
  
  const finances = window.masterData?.finances || {};
  const weddingSavings = {};
  
  // Kumpulkan tabungan per bulan
  Object.values(finances).forEach(f => {
    if (f.type === "wedding" && f.date) {
      const month = f.date.substring(0, 7);
      weddingSavings[month] = (weddingSavings[month] || 0) + f.amt;
    }
  });
  
  // ============ GENERATE BULAN DARI RANGE TARGET ============
  let monthRange = [];
  let monthlyTargets = {};
  
  if (savingTargets && Object.keys(savingTargets).length > 0) {
    let earliestStart = null;
    let latestEnd = null;
    
    Object.values(savingTargets).forEach(target => {
      if (target.startDate && target.endDate) {
        if (!earliestStart || target.startDate < earliestStart) {
          earliestStart = target.startDate;
        }
        if (!latestEnd || target.endDate > latestEnd) {
          latestEnd = target.endDate;
        }
      }
    });
    
    if (earliestStart && latestEnd) {
      const startDate = new Date(earliestStart + '-01');
      const endDate = new Date(latestEnd + '-01');
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        monthRange.push(`${year}-${month}`);
        current.setMonth(current.getMonth() + 1);
      }
      
      // Hitung target per bulan (akumulasi dari semua target)
      Object.values(savingTargets).forEach(target => {
        const targetStart = new Date(target.startDate);
        const targetEnd = new Date(target.endDate);
        const targetAmount = target.amount;
        
        let currentDate = new Date(targetStart);
        let monthCount = 0;
        
        while (currentDate <= targetEnd) {
          monthCount++;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        if (monthCount === 0) return;
        
        const monthlyAmount = targetAmount / monthCount;
        
        currentDate = new Date(targetStart);
        while (currentDate <= targetEnd) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const monthKey = `${year}-${month}`;
          
          if (monthRange.includes(monthKey)) {
            monthlyTargets[monthKey] = (monthlyTargets[monthKey] || 0) + monthlyAmount;
          }
          
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      });
    }
  }
  
  // Jika tidak ada target, gunakan bulan dari data tabungan yang ada
  if (monthRange.length === 0) {
    const allMonthsWithData = Object.keys(weddingSavings).sort();
    if (allMonthsWithData.length > 0) {
      monthRange = allMonthsWithData;
    } else {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      monthRange = [currentMonth];
    }
  }
  
  // Nama bulan dalam Bahasa Indonesia untuk label
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  
  // Format label untuk sumbu X
  const labels = monthRange.map(month => {
    const [year, monthNum] = month.split('-');
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  });
  
  // ============ HITUNG CUMULATIVE SAVINGS DAN PERSENTASE ============
  let cumulative = 0;
  const cumulativeValues = [];
  const percentages = [];
  const targetValues = [];
  const cumulativeTargetValues = [];
  let cumulativeTarget = 0;
  
  monthRange.forEach(month => {
    cumulative += weddingSavings[month] || 0;
    cumulativeValues.push(cumulative);
    const percentage = weddingTarget > 0 ? Math.min(100, (cumulative / weddingTarget) * 100) : 0;
    percentages.push(Math.round(percentage * 10) / 10);
    
    // Target per bulan (dari savingTargets)
    const monthlyTarget = monthlyTargets[month] || 0;
    targetValues.push(monthlyTarget / 1000000);
    
    // Cumulative target untuk menunjukkan progress yang diharapkan
    cumulativeTarget += monthlyTarget;
    cumulativeTargetValues.push(cumulativeTarget / 1000000);
  });
  
  // ============ CHART 1: Progres tabungan ============
  if (weddingChart) {
    try {
      weddingChart.destroy();
    } catch(e) {
      console.log("Error destroying wedding chart:", e);
    }
  }
  
  const ctx = weddingChartEl.getContext('2d');
  if (!ctx) return { weddingChart, plansChart };
  
  const newWeddingChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Belum ada data'],
      datasets: [
        {
          label: 'Pencapaian Target Tabungan (%)',
          data: percentages.length > 0 ? percentages : [0],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: (context) => {
            const value = percentages[context.dataIndex];
            if (value >= 100) return '#10b981';
            if (value >= 75) return '#f59e0b';
            if (value >= 50) return '#6366f1';
            return '#ef4444';
          },
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y',
        },
        {
          label: 'Target Tabungan Kumulatif (Rp Juta)',
          data: cumulativeTargetValues,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2,
          borderDash: [8, 4],
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          type: 'line',
          yAxisID: 'y1',
        },
        {
          label: 'Realisasi Tabungan (Rp Juta)',
          data: cumulativeValues.map(v => v / 1000000),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: false,
          pointRadius: 4,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          type: 'line',
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            font: { size: 11 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label;
              const value = context.raw;
              
              if (datasetLabel.includes('Pencapaian')) {
                const monthIndex = context.dataIndex;
                const amountInJuta = cumulativeValues[monthIndex] / 1000000;
                const targetInJuta = cumulativeTargetValues[monthIndex];
                const gap = targetInJuta - amountInJuta;
                return [
                  `${datasetLabel}: ${value}%`,
                  `Realisasi: Rp ${amountInJuta.toLocaleString()} Juta`,
                  `Target: Rp ${targetInJuta.toLocaleString()} Juta`,
                  gap > 0 ? `Kekurangan: Rp ${gap.toLocaleString()} Juta` : `✅ Melebihi target: Rp ${Math.abs(gap).toLocaleString()} Juta`
                ];
              } else if (datasetLabel.includes('Target Tabungan Kumulatif')) {
                return `${datasetLabel}: Rp ${value.toLocaleString()} Juta`;
              } else if (datasetLabel.includes('Realisasi Tabungan')) {
                return `${datasetLabel}: Rp ${value.toLocaleString()} Juta`;
              }
              return `${datasetLabel}: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          position: 'left',
          title: {
            display: true,
            text: 'Pencapaian Target (%)',
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            stepSize: 20
          },
          grid: {
            drawBorder: true,
            color: (context) => {
              if (context.tick.value === 100) return '#10b981';
              if (context.tick.value === 75) return '#f59e0b';
              if (context.tick.value === 50) return '#6366f1';
              return '#e2e8f0';
            }
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: {
            display: true,
            text: 'Nominal (Rp Juta)',
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            callback: function(value) {
              return 'Rp ' + value.toLocaleString() + ' Jt';
            }
          },
          grid: {
            drawOnChartArea: false,
          }
        },
        x: {
          title: {
            display: true,
            text: 'Bulan',
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 12,
            font: { size: 10 }
          }
        }
      }
    }
  });
  
  // Add custom target line plugin untuk garis 100%
  const targetLinePlugin = {
    id: 'targetLine',
    beforeDraw(chart) {
      const { ctx, chartArea: { left, right }, scales } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, scales.y.getPixelForValue(100));
      ctx.lineTo(right, scales.y.getPixelForValue(100));
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      
      ctx.font = 'bold 10px Inter';
      ctx.fillStyle = '#10b981';
      ctx.fillText('🎯 Target 100%', right - 85, scales.y.getPixelForValue(100) - 5);
      
      ctx.restore();
    }
  };
  
  Chart.register(targetLinePlugin);
  
  // ============ CHART 2: Progress rencana ============
  if (plansChart) {
    try {
      plansChart.destroy();
    } catch(e) {
      console.log("Error destroying plans chart:", e);
    }
  }
  
  const ctx2 = plansChartEl.getContext('2d');
  if (!ctx2) return { weddingChart: newWeddingChart, plansChart };
  
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const plansArray = Object.entries(plans);
  
  const plansWithDate = plansArray.filter(p => p[1].targetDate && p[1].targetDate !== "");
  plansWithDate.sort((a, b) => new Date(a[1].targetDate) - new Date(b[1].targetDate));
  
  let cumulativeProgress = 0;
  const planLabels = [];
  const planProgressData = [];
  
  plansWithDate.forEach(([id, plan]) => {
    let label = plan.text;
    if (label.length > 20) {
      label = label.substring(0, 18) + '...';
    }
    planLabels.push(label);
    cumulativeProgress += plan.progress || 0;
    planProgressData.push(cumulativeProgress);
  });
  
  let finalLabels = planLabels;
  let finalData = planProgressData;
  
  if (plansWithDate.length === 0 && plansArray.length > 0) {
    plansArray.forEach(([id, plan]) => {
      let label = plan.text;
      if (label.length > 20) {
        label = label.substring(0, 18) + '...';
      }
      finalLabels.push(label);
      finalData.push(plan.progress || 0);
    });
  }
  
  if (finalLabels.length === 0) {
    finalLabels = ['Belum ada rencana'];
    finalData = [0];
  }
  
  const maxProgress = Math.max(100, Math.max(...finalData) + 10);
  
  const newPlansChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: finalLabels,
      datasets: [{
        label: 'Progress Rencana (%)',
        data: finalData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: (context) => {
          const value = finalData[context.dataIndex];
          if (value >= 80) return '#10b981';
          if (value >= 50) return '#f59e0b';
          return '#ef4444';
        },
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const progress = context.raw;
              const planName = finalLabels[context.dataIndex];
              return [
                `${planName}: ${progress}%`,
                progress >= 100 ? '✓ Selesai' : `${100 - progress}% lagi menuju selesai`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: maxProgress,
          title: {
            display: true,
            text: 'Progress (%)',
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            font: { size: 10 }
          }
        },
        x: {
          title: {
            display: true,
            text: plansWithDate.length > 0 ? 'Rencana (berdasarkan target tanggal)' : 'Rencana',
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 8,
            font: { size: 10 }
          }
        }
      }
    }
  });
  
  console.log("Charts updated with target-based months:", {
    months: labels,
    percentages: percentages,
    targetValues: targetValues,
    cumulativeTargetValues: cumulativeTargetValues,
    plansDataPoints: finalLabels.length
  });
  
  return { weddingChart: newWeddingChart, plansChart: newPlansChart };
}

// Export ke window
window.renderDashboard = renderDashboard;
window.updateCharts = updateCharts;
