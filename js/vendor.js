// js/vendor.js - Complete Vendor Management System with Filter Functions
import { db, ref, push, update, remove, get } from './firebase-config.js';
import { showNotif, formatNumberRp, escapeHtml, masterData, privacyHidden } from './utils.js';

let currentVendorId = null;

// Helper to format number input
function formatNumberInput(value) {
  if (!value || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumberInput(value) {
  if (!value) return 0;
  const cleanValue = value.toString().replace(/\./g, '').replace(/,/g, '');
  return parseInt(cleanValue) || 0;
}

// Save vendor
export async function saveVendor() {
  const editId = document.getElementById('vendorEditId')?.value;
  const name = document.getElementById('vendorName')?.value?.trim();
  const category = document.getElementById('vendorCategory')?.value;
  const contact = document.getElementById('vendorContact')?.value;
  const address = document.getElementById('vendorAddress')?.value;
  const estimatedPriceRaw = document.getElementById('vendorEstimatedPrice')?.value;
  const dealPriceRaw = document.getElementById('vendorDealPrice')?.value;
  const rating = parseInt(document.getElementById('vendorRating')?.value);
  const notes = document.getElementById('vendorNotes')?.value;
  const isBooked = document.getElementById('vendorIsBooked')?.checked;
  const currentUser = sessionStorage.getItem('progrowth_user');
  
  if (!name) {
    showNotif('❌ Nama vendor harus diisi!', true);
    return;
  }
  
  const vendorData = {
    name: name,
    category: category,
    contact: contact || '',
    address: address || '',
    estimatedPrice: parseNumberInput(estimatedPriceRaw),
    dealPrice: parseNumberInput(dealPriceRaw),
    rating: rating || 5,
    notes: notes || '',
    isBooked: isBooked || false,
    author: currentUser,
    updatedAt: Date.now()
  };
  
  try {
    if (editId) {
      const data = window.masterData || masterData;
      vendorData.createdAt = data?.vendors?.[editId]?.createdAt || Date.now();
      await update(ref(db, `data/vendors/${editId}`), vendorData);
      showNotif('✅ Vendor berhasil diupdate!');
    } else {
      vendorData.createdAt = Date.now();
      await push(ref(db, 'data/vendors'), vendorData);
      showNotif('✅ Vendor baru ditambahkan!');
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('vendorModal'));
    if (modal) modal.hide();
    
    // Reset form
    document.getElementById('vendorEditId').value = '';
    document.getElementById('vendorName').value = '';
    document.getElementById('vendorContact').value = '';
    document.getElementById('vendorAddress').value = '';
    document.getElementById('vendorEstimatedPrice').value = '';
    document.getElementById('vendorDealPrice').value = '';
    document.getElementById('vendorNotes').value = '';
    document.getElementById('vendorIsBooked').checked = false;
    
    renderVendors();
  } catch (err) {
    console.error('Error saving vendor:', err);
    showNotif('❌ Gagal menyimpan vendor: ' + err.message, true);
  }
}

// Render filtered vendors
function renderFilteredVendors(vendorsArray) {
  const container = document.getElementById('vendorsList');
  if (!container) return;
  
  const formatPrice = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  
  const categories = {
    'MUA': { icon: '💄', name: 'MUA & Makeup' },
    'Photography': { icon: '📸', name: 'Photography & Videography' },
    'Catering': { icon: '🍽️', name: 'Catering' },
    'Venue': { icon: '🏨', name: 'Venue / Gedung' },
    'Decoration': { icon: '💐', name: 'Dekorasi' },
    'Entertainment': { icon: '🎤', name: 'Entertainment & MC' },
    'Busana': { icon: '👗', name: 'Busana Pengantin' },
    'Cincin': { icon: '💍', name: 'Cincin & Perhiasan' },
    'Transport': { icon: '🚗', name: 'Transportasi' },
    'Other': { icon: '📦', name: 'Lainnya' }
  };
  
  if (vendorsArray.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-card text-center py-5">
          <i class="bi bi-shop fs-1 text-muted"></i>
          <h6 class="mt-2">Tidak ada vendor</h6>
          <p class="text-muted small">Coba ubah filter atau tambahkan vendor baru</p>
        </div>
      </div>
    `;
    return;
  }
  
  // Group by category
  const grouped = {};
  vendorsArray.forEach(([id, v]) => {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category].push({ id, ...v });
  });
  
  let html = '';
  for (const [cat, catVendors] of Object.entries(grouped)) {
    const catInfo = categories[cat] || { icon: '📦', name: cat };
    html += `
      <div class="col-12 mb-4">
        <div class="d-flex align-items-center gap-2 mb-3">
          <div class="bg-primary bg-opacity-10 rounded-circle p-2">
            <i class="fs-5">${catInfo.icon}</i>
          </div>
          <h5 class="fw-bold mb-0">${catInfo.name}</h5>
          <span class="badge bg-secondary rounded-pill">${catVendors.length}</span>
        </div>
        <div class="row g-3">
    `;
    
    catVendors.forEach(vendor => {
      const stars = '★'.repeat(vendor.rating) + '☆'.repeat(5 - vendor.rating);
      const savings = vendor.estimatedPrice > 0 && vendor.dealPrice > 0 
        ? vendor.estimatedPrice - vendor.dealPrice 
        : 0;
      
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="vendor-card card border-0 shadow-sm h-100 ${vendor.isBooked ? 'booked' : ''}" 
               onclick="window.viewVendorDetail('${vendor.id}')">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="fw-bold mb-0">${escapeHtml(vendor.name)}</h6>
                <div class="rating-stars small">${stars}</div>
              </div>
              
              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="vendor-category-badge bg-light">${catInfo.icon} ${catInfo.name}</span>
                ${vendor.isBooked ? '<span class="badge bg-success">✓ Booking</span>' : ''}
              </div>
              
              ${vendor.contact ? `
                <div class="small text-muted mb-1">
                  <i class="bi bi-telephone me-1"></i> ${escapeHtml(vendor.contact)}
                </div>
              ` : ''}
              
              <div class="row g-2 mt-2">
                ${vendor.estimatedPrice > 0 ? `
                  <div class="col-6">
                    <small class="text-muted">Estimasi</small>
                    <div class="fw-semibold small">${formatPrice(vendor.estimatedPrice)}</div>
                  </div>
                ` : ''}
                ${vendor.dealPrice > 0 ? `
                  <div class="col-6">
                    <small class="text-muted">Harga Deal</small>
                    <div class="fw-semibold text-success small">${formatPrice(vendor.dealPrice)}</div>
                  </div>
                ` : ''}
              </div>
              
              ${savings > 0 ? `
                <div class="mt-2">
                  <span class="badge bg-success bg-opacity-10 text-success">
                    <i class="bi bi-gift me-1"></i> Hemat ${formatPrice(savings)}
                  </span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    html += `</div></div>`;
  }
  
  container.innerHTML = html;
}

// Filter vendors based on search, category, and status
export function filterVendors() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const vendors = data.vendors ? Object.entries(data.vendors) : [];
  const searchTerm = document.getElementById('vendorSearchInput')?.value?.toLowerCase() || '';
  const categoryFilter = document.getElementById('vendorCategoryFilter')?.value || 'all';
  const statusFilter = document.getElementById('vendorStatusFilter')?.value || 'all';
  
  const filtered = vendors.filter(([id, v]) => {
    // Search filter
    if (searchTerm && !v.name.toLowerCase().includes(searchTerm)) {
      return false;
    }
    // Category filter
    if (categoryFilter !== 'all' && v.category !== categoryFilter) {
      return false;
    }
    // Status filter
    if (statusFilter === 'booked' && !v.isBooked) {
      return false;
    }
    if (statusFilter === 'not_booked' && v.isBooked) {
      return false;
    }
    return true;
  });
  
  // Update counts
  const totalVendors = vendors.length;
  const bookedCount = vendors.filter(([id, v]) => v.isBooked).length;
  const vendorCountEl = document.getElementById('vendorCount');
  const bookedCountEl = document.getElementById('bookedCount');
  if (vendorCountEl) vendorCountEl.innerText = totalVendors;
  if (bookedCountEl) bookedCountEl.innerText = bookedCount;
  
  // Render filtered vendors
  renderFilteredVendors(filtered);
}

// Render vendors list (calls filter for consistency)
export function renderVendors() {
  filterVendors(); // Reuse filter function
}

// Open vendor modal
export function openVendorModal(editId = null) {
  if (editId) {
    const data = window.masterData || masterData;
    const vendor = data?.vendors?.[editId];
    if (vendor) {
      document.getElementById('vendorModalTitle').innerText = 'Edit Vendor';
      document.getElementById('vendorEditId').value = editId;
      document.getElementById('vendorName').value = vendor.name;
      document.getElementById('vendorCategory').value = vendor.category || 'Other';
      document.getElementById('vendorContact').value = vendor.contact || '';
      document.getElementById('vendorAddress').value = vendor.address || '';
      document.getElementById('vendorEstimatedPrice').value = formatNumberInput(vendor.estimatedPrice);
      document.getElementById('vendorDealPrice').value = formatNumberInput(vendor.dealPrice);
      document.getElementById('vendorRating').value = vendor.rating || 5;
      document.getElementById('vendorNotes').value = vendor.notes || '';
      document.getElementById('vendorIsBooked').checked = vendor.isBooked || false;
    }
  } else {
    document.getElementById('vendorModalTitle').innerText = 'Tambah Vendor';
    document.getElementById('vendorEditId').value = '';
    document.getElementById('vendorName').value = '';
    document.getElementById('vendorCategory').value = 'Other';
    document.getElementById('vendorContact').value = '';
    document.getElementById('vendorAddress').value = '';
    document.getElementById('vendorEstimatedPrice').value = '';
    document.getElementById('vendorDealPrice').value = '';
    document.getElementById('vendorRating').value = '5';
    document.getElementById('vendorNotes').value = '';
    document.getElementById('vendorIsBooked').checked = false;
  }
  
  const modal = new bootstrap.Modal(document.getElementById('vendorModal'));
  modal.show();
}

// View vendor detail
export function viewVendorDetail(vendorId) {
  currentVendorId = vendorId;
  const data = window.masterData || masterData;
  const vendor = data?.vendors?.[vendorId];
  if (!vendor) return;
  
  const formatPrice = (val) => {
    if (privacyHidden) return '●●● ●●●';
    return formatNumberRp(val);
  };
  
  const categories = {
    'MUA': '💄 MUA & Makeup',
    'Photography': '📸 Photography & Videography',
    'Catering': '🍽️ Catering',
    'Venue': '🏨 Venue / Gedung',
    'Decoration': '💐 Dekorasi',
    'Entertainment': '🎤 Entertainment & MC',
    'Busana': '👗 Busana Pengantin',
    'Cincin': '💍 Cincin & Perhiasan',
    'Transport': '🚗 Transportasi',
    'Other': '📦 Lainnya'
  };
  
  document.getElementById('vendorDetailName').innerText = escapeHtml(vendor.name);
  document.getElementById('vendorDetailCategory').innerHTML = `${categories[vendor.category] || vendor.category}`;
  document.getElementById('vendorDetailContact').innerHTML = vendor.contact || '<span class="text-muted">-</span>';
  document.getElementById('vendorDetailAddress').innerHTML = vendor.address || '<span class="text-muted">-</span>';
  document.getElementById('vendorDetailEstimated').innerHTML = vendor.estimatedPrice > 0 ? formatPrice(vendor.estimatedPrice) : '-';
  document.getElementById('vendorDetailDeal').innerHTML = vendor.dealPrice > 0 ? formatPrice(vendor.dealPrice) : '-';
  
  const stars = '★'.repeat(vendor.rating) + '☆'.repeat(5 - vendor.rating);
  document.getElementById('vendorDetailRating').innerHTML = `${stars} (${vendor.rating}/5)`;
  
  const statusBadge = document.getElementById('vendorDetailStatus');
  if (vendor.isBooked) {
    statusBadge.className = 'badge bg-success';
    statusBadge.innerHTML = '<i class="bi bi-check-circle me-1"></i>Sudah Booking / DP';
  } else {
    statusBadge.className = 'badge bg-secondary';
    statusBadge.innerHTML = '<i class="bi bi-clock me-1"></i>Belum Booking';
  }
  
  document.getElementById('vendorDetailNotes').innerHTML = escapeHtml(vendor.notes) || '<span class="text-muted">Tidak ada catatan</span>';
  
  const modal = new bootstrap.Modal(document.getElementById('vendorDetailModal'));
  modal.show();
}

// Edit vendor from detail
export function editVendorFromDetail() {
  if (currentVendorId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('vendorDetailModal'));
    if (modal) modal.hide();
    openVendorModal(currentVendorId);
  }
}

// Delete vendor
export async function deleteVendorFromDetail() {
  if (currentVendorId) {
    const confirmed = await new Promise((resolve) => {
      if (window.showCustomConfirm) {
        window.showCustomConfirm('Yakin ingin menghapus vendor ini?', () => resolve(true), 'Konfirmasi Hapus');
      } else {
        resolve(confirm('Yakin ingin menghapus vendor ini?'));
      }
    });
    
    if (confirmed) {
      try {
        await remove(ref(db, `data/vendors/${currentVendorId}`));
        showNotif('🗑️ Vendor berhasil dihapus');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('vendorDetailModal'));
        if (modal) modal.hide();
        
        renderVendors();
      } catch (err) {
        showNotif('❌ Gagal menghapus vendor', true);
      }
    }
  }
}

// Copy vendor contact
export function copyVendorContact() {
  const data = window.masterData || masterData;
  const vendor = data?.vendors?.[currentVendorId];
  if (vendor && vendor.contact) {
    navigator.clipboard.writeText(vendor.contact);
    showNotif('📋 Kontak berhasil disalin!');
  } else {
    showNotif('❌ Tidak ada kontak untuk disalin', true);
  }
}

// Initialize vendor page
export function initVendorPage() {
  renderVendors();
  
  // Set up filter event listeners if not already set
  const searchInput = document.getElementById('vendorSearchInput');
  const categoryFilter = document.getElementById('vendorCategoryFilter');
  const statusFilter = document.getElementById('vendorStatusFilter');
  
  if (searchInput && !searchInput.hasAttribute('data-listener')) {
    searchInput.setAttribute('data-listener', 'true');
    searchInput.addEventListener('keyup', () => filterVendors());
  }
  
  if (categoryFilter && !categoryFilter.hasAttribute('data-listener')) {
    categoryFilter.setAttribute('data-listener', 'true');
    categoryFilter.addEventListener('change', () => filterVendors());
  }
  
  if (statusFilter && !statusFilter.hasAttribute('data-listener')) {
    statusFilter.setAttribute('data-listener', 'true');
    statusFilter.addEventListener('change', () => filterVendors());
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.saveVendor = saveVendor;
  window.renderVendors = renderVendors;
  window.openVendorModal = openVendorModal;
  window.viewVendorDetail = viewVendorDetail;
  window.editVendorFromDetail = editVendorFromDetail;
  window.deleteVendorFromDetail = deleteVendorFromDetail;
  window.copyVendorContact = copyVendorContact;
  window.initVendorPage = initVendorPage;
  window.filterVendors = filterVendors;
}

// Exports for module
export default {
  saveVendor,
  renderVendors,
  openVendorModal,
  viewVendorDetail,
  editVendorFromDetail,
  deleteVendorFromDetail,
  copyVendorContact,
  initVendorPage,
  filterVendors
};
