// js/accessibility.js - Accessibility Enhancements
import { showNotif } from './utils.js';

let keyboardFocusVisible = false;

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
  
  // Add focus trap for modals
  addFocusTrapForModals();
  
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
      
      firstFocusable.focus();
      
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
    }, 100);
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
    }
    
    .keyboard-navigation :focus-visible {
      outline: 3px solid #6366f1;
      outline-offset: 2px;
      border-radius: 4px;
    }
    
    .high-contrast {
      --bg-body: #000000;
      --card-bg: #1a1a1a;
      --text-primary: #ffffff;
      --text-muted: #cccccc;
    }
    
    .reduced-motion *,
    .reduced-motion *::before,
    .reduced-motion *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
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
      announceToScreenReader('Mode gerakan berkurang aktif');
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
    const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                          document.activeElement?.tagName === 'TEXTAREA' ||
                          document.activeElement?.isContentEditable;
    
    if (isInputFocused) return;
    
    // Ctrl/Cmd + D -> Dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (window.showPage) window.showPage('dashboard');
      announceToScreenReader('Membuka halaman Dashboard');
    }
    // Ctrl/Cmd + P -> Planning
    else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (window.showPage) window.showPage('planning');
      announceToScreenReader('Membuka halaman Rencana');
    }
    // Ctrl/Cmd + F -> Financial
    else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (window.showPage) window.showPage('financial');
      announceToScreenReader('Membuka halaman Keuangan');
    }
    // Ctrl/Cmd + M -> Moment
    else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      if (window.showPage) window.showPage('moment');
      announceToScreenReader('Membuka halaman Momen');
    }
    // Ctrl/Cmd + V -> Vision
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      if (window.showPage) window.showPage('vision');
      announceToScreenReader('Membuka halaman Mimpi');
    }
    // Ctrl/Cmd + B -> Vendor
    else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      if (window.showPage) window.showPage('vendor');
      announceToScreenReader('Membuka halaman Vendor');
    }
    // Escape -> Close modals
    else if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(openModal);
        if (modal) modal.hide();
      }
    }
  });
  
  console.log('⌨️ Keyboard shortcuts initialized');
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
