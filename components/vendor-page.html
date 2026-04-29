// FILE BARU: js/accessibility.js - Accessibility Enhancements
import { showNotif } from './utils.js';

let keyboardFocusVisible = false;
let announcementQueue = [];

// Initialize accessibility features
export function initAccessibility() {
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
  
  // Add screen reader announcements for dynamic content
  observeDOMChanges();
  
  // Ensure touch targets are at least 44px
  ensureTouchTargets();
  
  // Add high contrast mode detection
  detectHighContrastPreference();
  
  // Add reduced motion detection
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
  const interactiveElements = element.querySelectorAll('button, [role="button"], a, .clickable');
  
  interactiveElements.forEach(el => {
    if (!el.hasAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      const text = el.textContent?.trim();
      if (text && text.length < 30) {
        el.setAttribute('aria-label', text);
      } else if (el.classList.contains('bottom-nav-item')) {
        const page = el.getAttribute('data-page');
        if (page) el.setAttribute('aria-label', `Menu ${page}`);
      } else if (el.querySelector('i')) {
        // For icon-only buttons
        const icon = el.querySelector('i');
        const iconClass = icon?.className;
        if (iconClass?.includes('trash')) el.setAttribute('aria-label', 'Hapus');
        else if (iconClass?.includes('pencil')) el.setAttribute('aria-label', 'Edit');
        else if (iconClass?.includes('plus')) el.setAttribute('aria-label', 'Tambah');
        else if (iconClass?.includes('close')) el.setAttribute('aria-label', 'Tutup');
      }
    }
  });
}

// Ensure images have alt text
function ensureImageAltText(element) {
  const images = element.querySelectorAll('img:not([alt])');
  images.forEach(img => {
    const parentText = img.closest('.card, .moment-card, .dream-card')?.textContent?.trim();
    if (parentText) {
      img.alt = parentText.substring(0, 100);
    } else {
      img.alt = 'Gambar dalam aplikasi Growthogether';
    }
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
      .clickable {
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
    // Ctrl/Cmd + D -> Dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      window.showPage('dashboard');
      announceToScreenReader('Membuka halaman Dashboard');
    }
    // Ctrl/Cmd + P -> Planning
    else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.showPage('planning');
      announceToScreenReader('Membuka halaman Rencana');
    }
    // Ctrl/Cmd + F -> Financial
    else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      window.showPage('financial');
      announceToScreenReader('Membuka halaman Keuangan');
    }
    // Ctrl/Cmd + M -> Moment
    else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      window.showPage('moment');
      announceToScreenReader('Membuka halaman Momen');
    }
    // Ctrl/Cmd + V -> Vision/Dream
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      window.showPage('vision');
      announceToScreenReader('Membuka halaman Mimpi');
    }
    // Ctrl/Cmd + L -> Logout
    else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      window.confirmLogout();
    }
    // Escape -> Close modals
    else if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        const modal = bootstrap.Modal.getInstance(openModal);
        if (modal) modal.hide();
        announceToScreenReader('Modal ditutup');
      }
    }
    // Alt + 1-5 -> Page navigation
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
window.initAccessibility = initAccessibility;
window.announceToScreenReader = announceToScreenReader;
window.initKeyboardShortcuts = initKeyboardShortcuts;
