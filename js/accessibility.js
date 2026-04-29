// js/accessibility.js - Accessibility Enhancements
import { showNotif } from './utils.js';

let keyboardFocusVisible = false;
let announcementQueue = [];

// Initialize accessibility features
export function initAccessibility() {
  console.log('♿ Initializing accessibility features...');
  
  // Keyboard focus styling
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      keyboardFocusVisible = true;
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  document.addEventListener('mousedown', () => {
    if (keyboardFocusVisible) {
      keyboardFocusVisible = false;
      document.body.classList.remove('keyboard-navigation');
    }
  });
  
  // Add ARIA live region for announcements
  addLiveRegion();
  
  // Add skip link functionality
  addSkipLink();
  
  // Add focus trap for modals (with Bootstrap check)
  addFocusTrapForModals();
  
  // Add screen reader announcements for dynamic content
  observeDOMChanges();
  
  // Ensure touch targets are at least 44px
  ensureTouchTargets();
  
  // Add high contrast mode detection
  detectHighContrastPreference();
  
  // Add reduced motion detection
  detectReducedMotionPreference();
  
  console.log('✅ Accessibility features initialized');
}

// Add ARIA live region
function addLiveRegion() {
  let liveRegion = document.getElementById('a11y-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
}

// Announce message to screen readers
export function announceToScreenReader(message, priority = 'polite') {
  const liveRegion = document.getElementById('a11y-live-region');
  if (liveRegion) {
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;
    
    // Also log to console for debugging
    console.log(`[Screen Reader]: ${message}`);
    
    // Clear after delay
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = '';
      }
    }, 5000);
  }
}

// Add skip to content link
function addSkipLink() {
  // Check if skip link already exists
  let skipLink = document.querySelector('.skip-link');
  if (!skipLink) {
    skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Langsung ke konten utama';
    skipLink.setAttribute('aria-label', 'Lewati navigasi dan langsung ke konten utama');
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  // Ensure main content has an ID
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }
}

// Add focus trap for modals
function addFocusTrapForModals() {
  // Gunakan event delegation karena modal bisa ditambahkan dinamis
  document.body.addEventListener('shown.bs.modal', function(event) {
    const modal = event.target;
    if (!modal) return;
    
    setTimeout(() => {
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      // Focus first element
      firstFocusable.focus();
      
      const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      };
      
      modal.addEventListener('keydown', handleTab);
      
      modal.addEventListener('hidden.bs.modal', () => {
        modal.removeEventListener('keydown', handleTab);
      });
    }, 100);
  });
}

// Observe DOM changes for accessibility
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Add ARIA labels to interactive elements without them
            addMissingARIALabels(node);
            // Ensure images have alt text
            ensureImageAltText(node);
          }
        });
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Add missing ARIA labels
function addMissingARIALabels(element) {
  const interactiveElements = element.querySelectorAll('button, [role="button"], a, .clickable, .bottom-nav-item, .nav-link');
  
  interactiveElements.forEach(el => {
    // Skip if already has aria-label or aria-labelledby
    if (el.hasAttribute('aria-label') || el.getAttribute('aria-labelledby')) {
      return;
    }
    
    const text = el.textContent?.trim();
    if (text && text.length < 50 && text.length > 0) {
      el.setAttribute('aria-label', text);
    } else if (el.classList.contains('bottom-nav-item')) {
      const page = el.getAttribute('data-page');
      if (page) el.setAttribute('aria-label', `Menu ${page}`);
    } else if (el.classList.contains('nav-link')) {
      const page = el.getAttribute('data-page');
      if (page) el.setAttribute('aria-label', `Navigasi ke ${page}`);
    } else if (el.querySelector('i')) {
      // For icon-only buttons
      const icon = el.querySelector('i');
      const iconClass = icon?.className || '';
      if (iconClass.includes('trash')) el.setAttribute('aria-label', 'Hapus');
      else if (iconClass.includes('pencil')) el.setAttribute('aria-label', 'Edit');
      else if (iconClass.includes('plus')) el.setAttribute('aria-label', 'Tambah');
      else if (iconClass.includes('close')) el.setAttribute('aria-label', 'Tutup');
      else if (iconClass.includes('search')) el.setAttribute('aria-label', 'Cari');
      else if (iconClass.includes('save')) el.setAttribute('aria-label', 'Simpan');
      else if (iconClass.includes('heart')) el.setAttribute('aria-label', 'Suka');
      else if (iconClass.includes('star')) el.setAttribute('aria-label', 'Bintang');
      else if (iconClass.includes('bell')) el.setAttribute('aria-label', 'Notifikasi');
      else if (iconClass.includes('user')) el.setAttribute('aria-label', 'Profil');
      else if (iconClass.includes('home')) el.setAttribute('aria-label', 'Beranda');
      else if (iconClass.includes('settings')) el.setAttribute('aria-label', 'Pengaturan');
      else {
        el.setAttribute('aria-label', 'Tombol interaksi');
      }
    }
  });
}

// Ensure images have alt text
function ensureImageAltText(element) {
  const images = element.querySelectorAll('img:not([alt]), img[alt=""]');
  images.forEach(img => {
    const parentText = img.closest('.card, .moment-card, .dream-card, .vendor-card')?.textContent?.trim();
    if (parentText && parentText.length > 0) {
      img.alt = parentText.substring(0, 100);
    } else {
      const fileName = img.src?.split('/').pop()?.split('.')[0] || 'gambar';
      img.alt = `Gambar ${fileName} dalam aplikasi Growthogether`;
    }
    console.log(`Added alt text to image: ${img.alt.substring(0, 50)}...`);
  });
}

// Ensure touch targets are large enough
function ensureTouchTargets() {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      button, 
      .bottom-nav-item,
      .nav-link,
      [role="button"],
      .clickable,
      .btn,
      .dropdown-item {
        min-height: 44px;
        min-width: 44px;
      }
      
      .btn-sm {
        min-height: 36px;
        min-width: 36px;
      }
      
      .dropdown-item {
        padding: 12px 20px;
      }
      
      /* Increase spacing between interactive elements */
      .bottom-nav {
        gap: 4px;
      }
      
      .bottom-nav-item {
        padding: 8px 12px;
      }
    }
    
    /* Keyboard navigation focus styles */
    .keyboard-navigation :focus-visible {
      outline: 3px solid #6366f1;
      outline-offset: 2px;
      border-radius: 4px;
    }
    
    /* High contrast mode */
    .high-contrast {
      --bg-body: #000000;
      --card-bg: #1a1a1a;
      --text-primary: #ffffff;
      --text-muted: #cccccc;
      --border-light: #ffffff;
    }
    
    .high-contrast .card,
    .high-contrast .btn-outline-secondary {
      border: 2px solid white;
    }
    
    .high-contrast .btn-primary {
      background: #0000ff;
      border: 2px solid white;
    }
    
    /* Reduced motion */
    .reduced-motion *,
    .reduced-motion *::before,
    .reduced-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(style);
}

// Detect high contrast preference
function detectHighContrastPreference() {
  const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
  
  const handleHighContrast = (e) => {
    if (e.matches) {
      document.body.classList.add('high-contrast');
      announceToScreenReader('Mode kontras tinggi terdeteksi. Tampilan telah disesuaikan untuk keterbacaan maksimal.');
    } else {
      document.body.classList.remove('high-contrast');
    }
  };
  
  if (highContrastQuery.addEventListener) {
    highContrastQuery.addEventListener('change', handleHighContrast);
  }
  handleHighContrast(highContrastQuery);
}

// Detect reduced motion preference
function detectReducedMotionPreference() {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  const handleReducedMotion = (e) => {
    if (e.matches) {
      document.body.classList.add('reduced-motion');
      announceToScreenReader('Mode gerakan berkurang aktif. Animasi akan diminimalkan.');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  };
  
  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener('change', handleReducedMotion);
  }
  handleReducedMotion(reducedMotionQuery);
}

// Keyboard shortcuts
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                          document.activeElement?.tagName === 'TEXTAREA' ||
                          document.activeElement?.isContentEditable;
    
    if (isInputFocused) return;
    
    // Ctrl/Cmd + D -> Dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('dashboard');
        announceToScreenReader('Membuka halaman Dashboard');
      }
    }
    // Ctrl/Cmd + P -> Planning
    else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('planning');
        announceToScreenReader('Membuka halaman Rencana');
      }
    }
    // Ctrl/Cmd + F -> Financial
    else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('financial');
        announceToScreenReader('Membuka halaman Keuangan');
      }
    }
    // Ctrl/Cmd + M -> Moment
    else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('moment');
        announceToScreenReader('Membuka halaman Momen');
      }
    }
    // Ctrl/Cmd + V -> Vision/Dream
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('vision');
        announceToScreenReader('Membuka halaman Mimpi');
      }
    }
    // Ctrl/Cmd + B -> Vendor
    else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      if (window.showPage) {
        window.showPage('vendor');
        announceToScreenReader('Membuka halaman Vendor');
      }
    }
    // Ctrl/Cmd + L -> Logout
    else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      if (window.confirmLogout) {
        window.confirmLogout();
      }
    }
    // Escape -> Close modals
    else if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        // Try Bootstrap first
        if (typeof bootstrap !== 'undefined') {
          const modal = bootstrap.Modal.getInstance(openModal);
          if (modal) modal.hide();
        }
        // Fallback: hide manually
        openModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
        announceToScreenReader('Modal ditutup');
      }
    }
    // Alt + 1-6 -> Page navigation
    else if (e.altKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      e.preventDefault();
      const pages = ['dashboard', 'vision', 'planning', 'financial', 'moment', 'vendor'];
      const page = pages[parseInt(e.key) - 1];
      if (page && window.showPage) {
        window.showPage(page);
        announceToScreenReader(`Membuka halaman ${page}`);
      }
    }
    // Help shortcut: Ctrl/Cmd + /
    else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      showKeyboardShortcutsHelp();
    }
  });
  
  console.log('⌨️ Keyboard shortcuts initialized');
}

// Show keyboard shortcuts help modal
function showKeyboardShortcutsHelp() {
  const shortcutsHtml = `
    <div class="modal fade" id="keyboardHelpModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header border-0 bg-gradient bg-primary text-white">
            <h5 class="fw-bold mb-0"><i class="bi bi-keyboard me-2"></i>Keyboard Shortcuts</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="list-group">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
                <span>Dashboard</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>P</kbd></span>
                <span>Rencana</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>F</kbd></span>
                <span>Keuangan</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>M</kbd></span>
                <span>Momen</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
                <span>Mimpi</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>B</kbd></span>
                <span>Vendor</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>L</kbd></span>
                <span>Logout</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Alt</kbd> + <kbd>1</kbd>-<kbd>6</kbd></span>
                <span>Navigasi Halaman</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Esc</kbd></span>
                <span>Tutup Modal</span>
              </div>
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><kbd>Ctrl</kbd> + <kbd>/</kbd></span>
                <span>Bantuan ini</span>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0">
            <button class="btn btn-primary rounded-pill" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existing = document.getElementById('keyboardHelpModal');
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', shortcutsHtml);
  const modal = new bootstrap.Modal(document.getElementById('keyboardHelpModal'));
  modal.show();
}

// Export ke window
if (typeof window !== 'undefined') {
  window.initAccessibility = initAccessibility;
  window.announceToScreenReader = announceToScreenReader;
  window.initKeyboardShortcuts = initKeyboardShortcuts;
}

export default {
  initAccessibility,
  announceToScreenReader,
  initKeyboardShortcuts
};
