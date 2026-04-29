// FILE BARU: js/error-handler.js - Enhanced Error Handling & Performance
import { showNotif, masterData } from './utils.js';
import { db, ref, get, set, invalidateCache } from './firebase-config.js';

// Error tracking
let errorLog = [];
let isOffline = false;

// Global error handler
export function setupGlobalErrorHandler() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logError('Uncaught Error', event.error?.message || event.message, event.filename, event.lineno);
    
    // Show user-friendly message
    if (!event.message?.includes('ResizeObserver')) {
      showUserFriendlyError('Terjadi kesalahan tak terduga. Silakan refresh halaman.');
    }
  });
  
  // Handle promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled Promise Rejection', event.reason?.message || String(event.reason));
    showUserFriendlyError('Terjadi kesalahan. Silakan coba lagi.');
  });
  
  // Monitor online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial check
  if (!navigator.onLine) {
    handleOffline();
  }
}

// Log error to console and storage
function logError(type, message, filename, lineNo) {
  const errorEntry = {
    id: Date.now(),
    type,
    message,
    filename: filename || 'unknown',
    lineNo: lineNo || 0,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: sessionStorage.getItem('progrowth_user') || 'unknown'
  };
  
  console.error(`[${type}]`, message, filename, lineNo);
  errorLog.push(errorEntry);
  
  // Keep only last 50 errors
  if (errorLog.length > 50) {
    errorLog = errorLog.slice(-50);
  }
  
  // Save to localStorage for debugging
  localStorage.setItem('error_log', JSON.stringify(errorLog));
}

// Show user-friendly error message
function showUserFriendlyError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-boundary';
  errorDiv.innerHTML = `
    <div class="d-flex gap-3 align-items-start">
      <i class="bi bi-exclamation-triangle-fill fs-3"></i>
      <div class="flex-grow-1">
        <strong>⚠️ Oops!</strong>
        <p class="mb-0 small">${message}</p>
        <details class="mt-2">
          <summary class="small text-muted">Detail Teknis</summary>
          <code class="small">${new Date().toLocaleTimeString()}</code>
        </details>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="btn-close"></button>
    </div>
  `;
  
  const container = document.querySelector('.main-content');
  if (container && container.firstChild) {
    container.insertBefore(errorDiv, container.firstChild);
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 8000);
  } else {
    showNotif(message, true);
  }
}

// Handle online status
function handleOnline() {
  isOffline = false;
  const banner = document.querySelector('.offline-banner');
  if (banner) banner.remove();
  
  showNotif('📡 Kembali online! Menyinkronkan data...');
  
  // Invalidate cache and refresh
  invalidateCache();
  setTimeout(() => {
    if (window.renderAll) window.renderAll();
  }, 1000);
}

// Handle offline status
function handleOffline() {
  if (isOffline) return;
  isOffline = true;
  
  const banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.innerHTML = `
    <i class="bi bi-wifi-off me-2"></i>
    Mode Offline - Data akan tersimpan lokal saat online kembali
    <button onclick="this.parentElement.remove()" class="btn-close btn-close-white ms-2"></button>
  `;
  document.body.appendChild(banner);
  
  showNotif('⚠️ Anda offline. Beberapa fitur mungkin tidak tersedia.', true);
}

// Safe data fetch with retry
export async function safeFetchData(retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const snapshot = await get(ref(db, 'data/'));
      const data = snapshot.val() || {};
      
      if (window.setMasterData) {
        window.setMasterData(data);
      }
      window.masterData = data;
      
      return data;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        // Last attempt failed, try to load from localStorage cache
        const cached = localStorage.getItem('growthogether_cache');
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (window.setMasterData) {
            window.setMasterData(cachedData);
          }
          window.masterData = cachedData;
          showNotif('⚠️ Menggunakan data cache. Koneksi bermasalah.', true);
          return cachedData;
        }
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  return null;
}

// Debounced save to prevent excessive writes
export function createDebouncedSave(writeFunction, delay = 2000) {
  let timeoutId;
  let pendingData = null;
  
  return (data) => {
    pendingData = data;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      if (pendingData) {
        try {
          await writeFunction(pendingData);
          pendingData = null;
        } catch (error) {
          console.error('Debounced save failed:', error);
        }
      }
    }, delay);
  };
}

// Skeleton loader for better UX
export function showSkeletonLoader(containerId, type = 'card') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const skeletons = {
    card: `
      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="skeleton" style="height: 160px;"></div>
          <div class="card-body">
            <div class="skeleton" style="height: 20px; width: 70%;"></div>
            <div class="skeleton mt-2" style="height: 15px; width: 90%;"></div>
            <div class="skeleton mt-2" style="height: 15px; width: 60%;"></div>
          </div>
        </div>
      </div>
    `,
    list: `
      <div class="skeleton" style="height: 60px; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 60px; margin-bottom: 12px;"></div>
      <div class="skeleton" style="height: 60px; margin-bottom: 12px;"></div>
    `,
    chart: `
      <div class="skeleton" style="height: 280px;"></div>
    `
  };
  
  const template = skeletons[type] || skeletons.card;
  container.innerHTML = template.repeat(3);
}

// Hide skeleton loader
export function hideSkeletonLoader(containerId) {
  const container = document.getElementById(containerId);
  if (container && container.innerHTML.includes('skeleton')) {
    container.innerHTML = '';
  }
}

// Performance monitoring
export function initPerformanceMonitoring() {
  if ('performance' in window && 'PerformanceObserver' in window) {
    // Monitor LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('[Performance] LCP:', lastEntry.startTime.toFixed(2), 'ms');
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // Monitor FID
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        console.log('[Performance] FID:', entry.processingStart - entry.startTime, 'ms');
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  }
  
  // Log page load time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    console.log('[Performance] Page Load:', loadTime, 'ms');
  });
}

// Virtual scroll for long lists (optimization)
export function createVirtualScroll(containerId, items, renderItem, itemHeight = 100) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let scrollTop = 0;
  const viewportHeight = container.clientHeight;
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(viewportHeight / itemHeight) + 5, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  
  container.style.position = 'relative';
  container.style.height = `${totalHeight}px`;
  
  const content = document.createElement('div');
  content.style.position = 'absolute';
  content.style.top = `${offsetY}px`;
  content.style.left = '0';
  content.style.right = '0';
  content.innerHTML = visibleItems.map(renderItem).join('');
  
  container.innerHTML = '';
  container.appendChild(content);
  
  const onScroll = () => {
    scrollTop = container.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    if (newStartIndex !== startIndex) {
      const newVisibleItems = items.slice(newStartIndex, newStartIndex + Math.ceil(viewportHeight / itemHeight) + 5);
      const newOffsetY = newStartIndex * itemHeight;
      content.style.top = `${newOffsetY}px`;
      content.innerHTML = newVisibleItems.map(renderItem).join('');
    }
  };
  
  container.addEventListener('scroll', onScroll);
  return () => container.removeEventListener('scroll', onScroll);
}

// Export to window
window.setupGlobalErrorHandler = setupGlobalErrorHandler;
window.safeFetchData = safeFetchData;
window.showSkeletonLoader = showSkeletonLoader;
window.hideSkeletonLoader = hideSkeletonLoader;
window.initPerformanceMonitoring = initPerformanceMonitoring;
