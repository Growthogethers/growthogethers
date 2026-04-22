// js/dashboard.js
import { masterData, formatNumberRp, privacyHidden } from './utils.js';

// Helper function untuk format month display
function formatMonthDisplayDashboard(month) {
  if (!month) return '';
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const [year, monthNum] = month.split('-');
  return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
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
  const monthlyTargets = settings.monthlyTargets || {};
  
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
  
  // Hitung target bulanan untuk bulan berjalan
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTarget = monthlyTargets[currentMonth] || 0;
  
  let currentMonthSaved = 0;
  finances.forEach(([id, f]) => {
    if (f.type === "wedding" && f.date?.substring(0, 7) === currentMonth) {
      currentMonthSaved += f.amt;
    }
  });
  
  const monthPercent = currentMonthTarget > 0 ? Math.min(100, (currentMonthSaved / currentMonthTarget) * 100) : 0;
  
  // Update Dashboard elements
  const totalWeddingElement = document.getElementById("totalWedding");
  if (totalWeddingElement) totalWeddingElement.innerHTML = formatNumberRp(totalWed);
  
  const targetWeddingAmountEl = document.getElementById("targetWeddingAmount");
  if (targetWeddingAmountEl) targetWeddingAmountEl.innerHTML = formatNumberRp(targetWed);
  
  const weddingProgressFillEl = document.getElementById("weddingProgressFill");
  if (weddingProgressFillEl) weddingProgressFillEl.style.width = `${percent}%`;
  
  const weddingPercentTextEl = document.getElementById("weddingPercentText");
  if (weddingPercentTextEl) weddingPercentTextEl.innerHTML = `${Math.round(percent)}%`;
  
  const savingsAEl = document.getElementById("savingsA");
  if (savingsAEl) savingsAEl.innerHTML = formatNumberRp(wA);
  
  const savingsBEl = document.getElementById("savingsB");
  if (savingsBEl) savingsBEl.innerHTML = formatNumberRp(wB);
  
  // Update statistik cards
  const visions = masterData.visions ? Object.entries(masterData.visions) : [];
  const plansArray = masterData.plans ? Object.entries(masterData.plans) : [];
  const totalP = plansArray.length;
  const doneP = plansArray.filter(p => p[1].progress >= 100).length;
  const targetPlanCount = plansArray.filter(p => p[1].targetDate && p[1].targetDate !== "").length;
  const percentDone = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;
  
  // Update total shared card
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
  
  // Update target bulanan info di dashboard
  const monthlyTargetInfo = document.getElementById("monthlyTargetInfo");
  if (monthlyTargetInfo) {
    // Cari target untuk bulan-bulan ke depan
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const sortedTargets = Object.entries(monthlyTargets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([month, target]) => month >= currentMonthKey);
    
    let nextTarget = null;
    let nextTargetMonth = null;
    
    for (const [month, target] of sortedTargets) {
      let monthSaved = 0;
      finances.forEach(([id, f]) => {
        if (f.type === "wedding" && f.date?.substring(0, 7) === month) {
          monthSaved += f.amt;
        }
      });
      if (monthSaved < target) {
        nextTarget = target;
        nextTargetMonth = month;
        break;
      }
    }
    
    monthlyTargetInfo.innerHTML = `
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          <div class="rounded-circle bg-primary bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
            <i class="bi bi-calendar-month fs-3 text-primary"></i>
          </div>
          <h6 class="mt-1 mb-1 fw-semibold">Bulan Ini</h6>
          <h4 class="fw-bold mb-0 text-primary">${formatNumberRp(currentMonthSaved)}</h4>
          <small class="text-muted">Target: ${formatNumberRp(currentMonthTarget)}</small>
          ${currentMonthTarget > 0 ? `
            <div class="progress mt-2" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-primary" style="width: ${monthPercent}%; border-radius: 10px;"></div>
            </div>
            <small class="mt-2 ${currentMonthSaved >= currentMonthTarget ? 'text-success fw-semibold' : 'text-warning'}">
              ${currentMonthSaved >= currentMonthTarget ? '✓ Target Tercapai!' : `${Math.round(monthPercent)}% tercapai`}
            </small>
          ` : '<small class="text-muted mt-2">Belum ada target bulan ini</small>'}
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          <div class="rounded-circle bg-success bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
            <i class="bi bi-piggy-bank fs-3 text-success"></i>
          </div>
          <h6 class="mt-1 mb-1 fw-semibold">Total Tabungan</h6>
          <h4 class="fw-bold mb-0 text-success">${formatNumberRp(totalWed)}</h4>
          <small class="text-muted">Target: ${formatNumberRp(targetWed)}</small>
          <div class="progress mt-2" style="height: 6px; border-radius: 10px;">
            <div class="progress-bar bg-success" style="width: ${percent}%; border-radius: 10px;"></div>
          </div>
          <small class="mt-2 fw-semibold">${Math.round(percent)}% tercapai</small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-center p-3 h-100">
          ${nextTarget ? `
            <div class="rounded-circle bg-warning bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-flag-checkered fs-3 text-warning"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Target Selanjutnya</h6>
            <h4 class="fw-bold mb-0 text-warning">${formatNumberRp(nextTarget)}</h4>
            <small class="text-muted">${nextTargetMonth ? formatMonthDisplayDashboard(nextTargetMonth) : ''}</small>
            <div class="mt-2">
              <span class="badge bg-warning bg-opacity-10 text-warning">🎯 Belum tercapai</span>
            </div>
          ` : Object.keys(monthlyTargets).length > 0 ? `
            <div class="rounded-circle bg-success bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-trophy fs-3 text-success"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Semua Target</h6>
            <h4 class="fw-bold mb-0 text-success">✨ Tercapai!</h4>
            <small class="text-muted">Selamat! Semua target tercapai 🎉</small>
            <div class="mt-2">
              <span class="badge bg-success bg-opacity-10 text-success">🏆 Luar biasa!</span>
            </div>
          ` : `
            <div class="rounded-circle bg-secondary bg-opacity-10 d-inline-flex p-3 mb-2 mx-auto">
              <i class="bi bi-plus-circle fs-3 text-secondary"></i>
            </div>
            <h6 class="mt-1 mb-1 fw-semibold">Target Bulanan</h6>
            <h4 class="fw-bold mb-0 text-secondary">Belum Ada</h4>
            <small class="text-muted">Buat target di menu Keuangan</small>
            <div class="mt-2">
              <span class="badge bg-secondary bg-opacity-10 text-secondary">📝 Mulai buat target</span>
            </div>
          `}
        </div>
      </div>
    `;
  }
  
  console.log("Dashboard updated:", { totalWed: formatNumberRp(totalWed), percent: Math.round(percent) });
}

export function updateCharts(weddingHistory, totalPlansDone, totalPlansAll, weddingChart, plansChart) {
  const weddingChartEl = document.getElementById('weddingTrendChart');
  const plansChartEl = document.getElementById('plansProgressChart');
  
  if (!weddingChartEl || !plansChartEl) {
    console.log("Chart elements not ready yet");
    return { weddingChart, plansChart };
  }
  
  // Get wedding target for percentage calculation
  const settings = window.masterData?.settings || { weddingTarget: 50000000 };
  const weddingTarget = settings.weddingTarget;
  const monthlyTargets = settings.monthlyTargets || {};
  
  // Ambil data tabungan dari masterData
  const finances = window.masterData?.finances || {};
  const weddingSavings = {};
  
  // Kumpulkan tabungan per bulan
  Object.values(finances).forEach(f => {
    if (f.type === "wedding" && f.date) {
      const month = f.date.substring(0, 7);
      weddingSavings[month] = (weddingSavings[month] || 0) + f.amt;
    }
  });
  
  // Tentukan range bulan dari awal menabung sampai bulan target terakhir
  const allMonthsWithData = Object.keys(weddingSavings).sort();
  const targetMonths = Object.keys(monthlyTargets).sort();
  
  // Gabungkan semua bulan yang ada (dari data tabungan dan target)
  const allMonths = [...new Set([...allMonthsWithData, ...targetMonths])].sort();
  
  // Jika tidak ada data sama sekali, gunakan bulan saat ini
  let startMonth, endMonth;
  
  if (allMonths.length > 0) {
    startMonth = allMonths[0];
    endMonth = allMonths[allMonths.length - 1];
  } else {
    const now = new Date();
    startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    endMonth = startMonth;
  }
  
  // Generate semua bulan dari startMonth sampai endMonth
  const generateMonthRange = (start, end) => {
    const startDate = new Date(start + '-01');
    const endDate = new Date(end + '-01');
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };
  
  const monthRange = generateMonthRange(startMonth, endMonth);
  
  // Nama bulan dalam Bahasa Indonesia
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  
  // Format label untuk sumbu X
  const labels = monthRange.map(month => {
    const [year, monthNum] = month.split('-');
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  });
  
  // Hitung cumulative savings dan persentase
  let cumulative = 0;
  const cumulativeValues = [];
  const percentages = [];
  
  monthRange.forEach(month => {
    cumulative += weddingSavings[month] || 0;
    cumulativeValues.push(cumulative);
    const percentage = weddingTarget > 0 ? Math.min(100, (cumulative / weddingTarget) * 100) : 0;
    percentages.push(Math.round(percentage * 10) / 10);
  });
  
  // Data untuk chart
  const weddingPercentages = percentages;
  const weddingCumulative = cumulativeValues;
  
  // Chart 1: Progres tabungan (dalam Persen terhadap target)
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
          data: weddingPercentages.length > 0 ? weddingPercentages : [0],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: (context) => {
            const value = weddingPercentages[context.dataIndex];
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
          label: 'Target Bulanan (Rp Juta)',
          data: monthRange.map(month => {
            const target = monthlyTargets[month] || 0;
            return target / 1000000;
          }),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
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
                const amountInJuta = weddingCumulative[monthIndex] / 1000000;
                return [
                  `${datasetLabel}: ${value}%`,
                  `(Total: Rp ${amountInJuta.toLocaleString()} Juta dari Rp ${(weddingTarget / 1000000).toLocaleString()} Juta)`
                ];
              } else if (datasetLabel.includes('Target Bulanan')) {
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
            text: 'Target Bulanan (Rp Juta)',
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
  
  // Register plugin
  Chart.register(targetLinePlugin);
  
  // Chart 2: Progress rencana
  if (plansChart) {
    try {
      plansChart.destroy();
    } catch(e) {
      console.log("Error destroying plans chart:", e);
    }
  }
  
  const ctx2 = plansChartEl.getContext('2d');
  if (!ctx2) return { weddingChart: newWeddingChart, plansChart };
  
  // Ambil data plans dari window.masterData
  const data = window.masterData || masterData;
  const plans = data?.plans || {};
  const plansArray = Object.entries(plans);
  
  // Hitung progress kumulatif berdasarkan tanggal target
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
          max: Math.max(100, Math.max(...finalData) + 10),
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
  
  console.log("Charts updated:", {
    months: labels,
    percentages: weddingPercentages,
    cumulative: weddingCumulative.map(v => v / 1000000),
    plansDataPoints: finalLabels.length
  });
  
  return { weddingChart: newWeddingChart, plansChart: newPlansChart };
}

// Export ke window untuk akses global
window.renderDashboard = renderDashboard;
window.updateCharts = updateCharts;
