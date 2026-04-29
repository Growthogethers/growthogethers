// js/accessibility.js - Clean JavaScript File

let keyboardFocusVisible = false;

// Initialize accessibility features
export function initAccessibility() {
  addLiveRegion();
  addSkipLink();
  addFocusTrapForModals();
  ensureTouchTargets();
  detectHighContrastPreference();
  detectReducedMotionPreference();
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
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = '';
      }
    }, 5000);
  }
}

// Add skip to content link
function addSkipLink() {
  let skipLink = document.querySelector('.skip-link');
  if (!skipLink) {
    skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Langsung ke konten utama';
    skipLink.setAttribute('aria-label', 'Lewati navigasi dan langsung ke konten utama');
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
  
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }
}

// Add focus trap for modals
function addFocusTrapForModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('shown.bs.modal', () => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (firstFocusable) firstFocusable.focus();
      
      const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
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
    });
  });
}

// Ensure touch targets are large enough
function ensureTouchTargets() {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      button, .bottom-nav-item, .nav-link, [role="button"], .clickable {
        min-height: 44px;
        min-width: 44px;
      }
      .btn-sm { min-height: 36px; min-width: 36px; }
      .dropdown-item { padding: 12px 20px; }
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
      announceToScreenReader('Mode kontras tinggi terdeteksi');
    } else {
      document.body.classList.remove('high-contrast');
    }
  };
  highContrastQuery.addEventListener('change', handleHighContrast);
  handleHighContrast(highContrastQuery);
}

// Detect reduced motion preference
function detectReducedMotionPreference() {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleReducedMotion = (e) => {
    if (e.matches) {
      document.body.classList.add('reduced-motion');
      announceToScreenReader('Mode gerakan berkurang aktif');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  };
  reducedMotionQuery.addEventListener('change', handleReducedMotion);
  handleReducedMotion(reducedMotionQuery);
}

// Keyboard shortcuts
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      window.showPage('dashboard');
      announceToScreenReader('Membuka halaman Dashboard');
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.showPage('planning');
      announceToScreenReader('Membuka halaman Rencana');
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      window.showPage('financial');
      announceToScreenReader('Membuka halaman Keuangan');
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      window.showPage('moment');
      announceToScreenReader('Membuka halaman Momen');
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      window.showPage('vision');
      announceToScreenReader('Membuka halaman Mimpi');
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      window.confirmLogout();
    }
    else if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        const modal = bootstrap.Modal.getInstance(openModal);
        if (modal) modal.hide();
        announceToScreenReader('Modal ditutup');
      }
    }
    else if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault();
      const pages = ['dashboard', 'vision', 'planning', 'financial', 'moment'];
      const page = pages[parseInt(e.key) - 1];
      if (page) {
        window.showPage(page);
        announceToScreenReader(`Membuka halaman ${page}`);
      }
    }
  });
}

// Export to window
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
