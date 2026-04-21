// js/vision.js
import { db, ref, push, update, remove, get, set } from './firebase-config.js';
import { showNotif, masterData, escapeHtml } from './utils.js';

// State untuk filter & sort
let currentFilter = 'all';
let currentSort = 'newest';
let currentSearch = '';
let bookmarks = {};

// Inisialisasi mood selector
export function initMoodSelector() {
  const moodOptions = document.querySelectorAll('.mood-option');
  moodOptions.forEach(option => {
    option.addEventListener('click', () => {
      moodOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      document.getElementById('visionMood').value = option.getAttribute('data-mood');
    });
  });
  
  // Set default active
  const defaultMood = document.querySelector('.mood-option[data-mood="✨"]');
  if (defaultMood) defaultMood.classList.add('active');
}

// Save Vision dengan semua fitur
export async function saveVision() {
  const t = document.getElementById("vTitle")?.value.trim();
  if (!t) { showNotif("Judul wajib diisi", true); return; }
  
  const mood = document.getElementById("visionMood")?.value || "✨";
  const note = document.getElementById("vNote")?.value;
  const vis = document.getElementById("vShare")?.value;
  const tags = document.getElementById("visionTags")?.value;
  const isImportant = document.getElementById("visionImportant")?.checked || false;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  await push(ref(db, "data/visions"), {
    author: currentUser,
    title: t,
    note: note || "",
    mood: mood,
    visibility: vis,
    tags: tags || "",
    isImportant: isImportant,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    likes: 0,
    commentsCount: 0
  });
  
  showNotif("Wawasan berhasil dibagikan! 🎉");
  
  // Reset form
  document.getElementById("vTitle").value = "";
  document.getElementById("vNote").value = "";
  document.getElementById("visionTags").value = "";
  document.getElementById("visionImportant").checked = false;
  
  if (window.renderAll) window.renderAll();
}

// Render Visions dengan filter, sort, search
export function renderVisions() {
  const data = window.masterData || masterData;
  if (!data) return;
  
  const visionListEl = document.getElementById("visionList");
  if (!visionListEl) return;
  
  const loadingEl = document.getElementById("visionLoading");
  if (loadingEl) loadingEl.style.display = "block";
  
  setTimeout(() => {
    let visions = data.visions ? Object.entries(data.visions) : [];
    const likesData = data.likes || {};
    const commentsData = data.comments || {};
    const reactionsData = data.reactions || {};
    const currentUser = sessionStorage.getItem("progrowth_user");
    
    // Load bookmarks
    loadBookmarks();
    
    // Filter berdasarkan visibility dan user
    visions = visions.filter(([id, v]) => {
      if (currentFilter === 'my') return v.author === currentUser;
      if (currentFilter === 'shared') return v.visibility === "Shared";
      if (currentFilter === 'bookmarked') return bookmarks[id];
      if (currentFilter === 'important') return v.isImportant === true;
      return v.author === currentUser || v.visibility === "Shared";
    });
    
    // Search filter
    if (currentSearch) {
      const searchLower = currentSearch.toLowerCase();
      visions = visions.filter(([id, v]) => 
        v.title.toLowerCase().includes(searchLower) ||
        (v.note && v.note.toLowerCase().includes(searchLower)) ||
        (v.tags && v.tags.toLowerCase().includes(searchLower))
      );
    }
    
    // Sorting
    visions.sort((a, b) => {
      const [idA, vA] = a;
      const [idB, vB] = b;
      
      switch(currentSort) {
        case 'oldest':
          return (vA.createdAt || 0) - (vB.createdAt || 0);
        case 'mostLiked':
          const likesA = Object.keys(likesData[idA] || {}).length;
          const likesB = Object.keys(likesData[idB] || {}).length;
          return likesB - likesA;
        case 'mostCommented':
          const commentsA = Object.keys(commentsData[idA] || {}).length;
          const commentsB = Object.keys(commentsData[idB] || {}).length;
          return commentsB - commentsA;
        default: // newest
          return (vB.createdAt || 0) - (vA.createdAt || 0);
      }
    });
    
    if (visions.length === 0) {
      visionListEl.innerHTML = `
        <div class="col-12">
          <div class="empty-state-sharing">
            <i class="bi bi-chat-dots"></i>
            <h5>Belum ada postingan</h5>
            <p class="text-muted">Jadilah yang pertama berbagi wawasan dan mimpi!</p>
          </div>
        </div>
      `;
      if (loadingEl) loadingEl.style.display = "none";
      return;
    }
    
    visionListEl.innerHTML = visions.map(([id, v]) => {
      const likeCount = Object.keys(likesData[id] || {}).length;
      const userLiked = likesData[id]?.[currentUser];
      const commentCount = Object.keys(commentsData[id] || {}).length;
      const reactions = reactionsData[id] || {};
      const isBookmarked = bookmarks[id];
      const highlightClass = v.isImportant ? 'highlight' : '';
      
      // Hitung reaksi untuk post ini
      const reactionCounts = {
        '❤️': Object.keys(reactions['❤️'] || {}).length,
        '👍': Object.keys(reactions['👍'] || {}).length,
        '🎉': Object.keys(reactions['🎉'] || {}).length,
        '💡': Object.keys(reactions['💡'] || {}).length,
        '🙏': Object.keys(reactions['🙏'] || {}).length
      };
      
      const userReactions = {};
      for (const [reaction, users] of Object.entries(reactions)) {
        if (users[currentUser]) userReactions[reaction] = true;
      }
      
      // Parse tags
      const tags = v.tags ? v.tags.split(',').map(tag => 
        `<span class="vision-tag" onclick="window.searchByTag('${tag.trim()}')">#${tag.trim()}</span>`
      ).join('') : '';
      
      // Format date
      const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 'Baru saja';
      
      const timeAgo = v.createdAt ? getTimeAgo(v.createdAt) : '';
      
      return `
        <div class="col-md-6 col-lg-4">
          <div class="card vision-card ${highlightClass} p-3 h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <span class="vision-mood">${escapeHtml(v.mood || '✨')}</span>
                <div>
                  <span class="badge ${v.author === "FACHMI" ? "badge-fachmi" : "badge-azizah"}">
                    ${escapeHtml(v.author)}
                  </span>
                  ${v.isImportant ? '<span class="badge bg-warning text-dark ms-1">⭐ Penting</span>' : ''}
                </div>
              </div>
              <div class="d-flex gap-2">
                <span class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="window.toggleBookmark('${id}')">
                  <i class="bi ${isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
                </span>
                <div class="dropdown">
                  <i class="bi bi-three-dots-vertical text-muted" data-bs-toggle="dropdown" style="cursor: pointer;"></i>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" onclick="window.shareToSocial('${id}', '${escapeHtml(v.title)}', '${escapeHtml(v.note || '')}')">
                      <i class="bi bi-share me-2"></i>Bagikan
                    </a></li>
                    ${v.author === currentUser ? `
                      <li><a class="dropdown-item text-danger" onclick="window.deleteVision('${id}')">
                        <i class="bi bi-trash me-2"></i>Hapus
                      </a></li>
                    ` : ''}
                  </ul>
                </div>
              </div>
            </div>
            
            <h6 class="fw-bold mt-1">${escapeHtml(v.title)}</h6>
            
            ${v.note ? `<p class="small text-muted mb-2">${escapeHtml(v.note.substring(0, 150))}${v.note.length > 150 ? '...' : ''}</p>` : ''}
            
            ${tags ? `<div class="vision-tags">${tags}</div>` : ''}
            
            <div class="reaction-group">
              ${Object.entries(reactionCounts).map(([reaction, count]) => `
                <span class="reaction-btn ${userReactions[reaction] ? 'active' : ''}" 
                      onclick="window.addReaction('${id}', '${reaction}')">
                  ${reaction} <span class="reaction-count">${count}</span>
                </span>
              `).join('')}
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
              <div class="d-flex gap-3">
                <span class="like-btn ${userLiked ? 'text-danger' : 'text-muted'}" onclick="window.toggleLike('${id}')">
                  <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> ${likeCount}
                </span>
                <span class="text-muted" style="cursor: pointer;" onclick="window.openCommentModal('${id}')">
                  <i class="bi bi-chat"></i> ${commentCount}
                </span>
              </div>
              <small class="text-muted" title="${date}">${timeAgo}</small>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    if (loadingEl) loadingEl.style.display = "none";
  }, 100);
}

// Helper: Time ago
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(timestamp).toLocaleDateString();
}

// Load bookmarks dari Firebase
async function loadBookmarks() {
  const currentUser = sessionStorage.getItem("progrowth_user");
  if (!currentUser) return;
  
  const bookmarksRef = ref(db, `data/bookmarks/${currentUser}`);
  const snapshot = await get(bookmarksRef);
  bookmarks = snapshot.val() || {};
}

// Toggle bookmark
export async function toggleBookmark(vid) {
  const currentUser = sessionStorage.getItem("progrowth_user");
  const bookmarkRef = ref(db, `data/bookmarks/${currentUser}/${vid}`);
  const snapshot = await get(bookmarkRef);
  
  if (snapshot.exists()) {
    await remove(bookmarkRef);
    showNotif("Dihapus dari bookmark");
  } else {
    await set(bookmarkRef, true);
    showNotif("Disimpan ke bookmark");
  }
  
  await loadBookmarks();
  renderVisions();
}

// Add reaction
export async function addReaction(vid, reaction) {
  const currentUser = sessionStorage.getItem("progrowth_user");
  const reactionRef = ref(db, `data/reactions/${vid}/${reaction}/${currentUser}`);
  const snapshot = await get(reactionRef);
  
  if (snapshot.exists()) {
    await remove(reactionRef);
  } else {
    await set(reactionRef, true);
  }
  
  renderVisions();
}

// Share to social media
export function shareToSocial(vid, title, note) {
  const url = `${window.location.origin}/vision/${vid}`;
  const text = `${title}\n\n${note.substring(0, 100)}...\n\nShared via Growthogether`;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: url
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`);
    showNotif("Link berhasil disalin! 📋");
  }
}

// Search by tag
export function searchByTag(tag) {
  currentSearch = tag;
  document.getElementById("visionSearch").value = tag;
  renderVisions();
  showNotif(`Menampilkan postingan dengan tag #${tag}`);
}

// Delete vision
export async function deleteVision(vid) {
  if (confirm("Yakin ingin menghapus postingan ini?")) {
    await remove(ref(db, `data/visions/${vid}`));
    await remove(ref(db, `data/comments/${vid}`));
    await remove(ref(db, `data/likes/${vid}`));
    await remove(ref(db, `data/reactions/${vid}`));
    showNotif("Postingan dihapus");
    renderVisions();
  }
}

// Toggle like
export async function toggleLike(vid) {
  const data = window.masterData || masterData;
  const likes = data?.likes?.[vid] || {};
  const currentUser = sessionStorage.getItem("progrowth_user");
  const userLiked = likes[currentUser];
  const newLikes = { ...likes };
  
  if (userLiked) delete newLikes[currentUser];
  else newLikes[currentUser] = true;
  
  await update(ref(db, `data/likes/${vid}`), newLikes);
  renderVisions();
}

// Add comment
export async function addComment(parentId = null) {
  const text = document.getElementById("newCommentText")?.value.trim();
  if (!text) { showNotif("Komentar tidak boleh kosong", true); return; }
  
  const vid = window.currentCommentVid;
  const commentData = {
    user: sessionStorage.getItem("progrowth_user"),
    text: text,
    time: Date.now()
  };
  
  if (parentId) {
    commentData.parentId = parentId;
  }
  
  await push(ref(db, `data/comments/${vid}`), commentData);
  
  document.getElementById("newCommentText").value = "";
  renderComments(vid);
  showNotif("Komentar terkirim!");
  
  // Update comments count
  const comments = await get(ref(db, `data/comments/${vid}`));
  const commentCount = Object.keys(comments.val() || {}).length;
  await update(ref(db, `data/visions/${vid}`), { commentsCount: commentCount });
}

// Add reply
export async function addReply(vid, parentId) {
  const text = document.getElementById(`replyText-${parentId}`)?.value.trim();
  if (!text) { showNotif("Balasan tidak boleh kosong", true); return; }
  
  await push(ref(db, `data/comments/${vid}`), {
    user: sessionStorage.getItem("progrowth_user"),
    text: text,
    time: Date.now(),
    parentId: parentId
  });
  
  document.getElementById(`replyText-${parentId}`).value = "";
  document.getElementById(`replyForm-${parentId}`).style.display = "none";
  renderComments(vid);
  showNotif("Balasan terkirim!");
}

// Show reply form
export function showReplyForm(parentId) {
  const form = document.getElementById(`replyForm-${parentId}`);
  if (form) {
    form.style.display = form.style.display === "none" ? "block" : "none";
  }
}

// Render comments dengan thread
export function renderComments(vid) {
  const data = window.masterData || masterData;
  const comments = data?.comments?.[vid] || {};
  const commentListEl = document.getElementById("commentList");
  if (!commentListEl) return;
  
  // Group comments by parent
  const topComments = Object.entries(comments).filter(([id, cm]) => !cm.parentId);
  const replies = Object.entries(comments).filter(([id, cm]) => cm.parentId);
  
  const renderCommentItem = (cid, cm, depth = 0) => {
    const repliesToThis = replies.filter(([rid, r]) => r.parentId === cid);
    
    return `
      <div class="comment-item" style="margin-left: ${depth * 20}px">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <small><strong>${escapeHtml(cm.user)}</strong></small>
            <small class="text-muted ms-2">${new Date(cm.time).toLocaleString()}</small>
          </div>
          <button class="btn btn-sm btn-link text-primary p-0" onclick="window.showReplyForm('${cid}')">
            <i class="bi bi-reply"></i> Balas
          </button>
        </div>
        <p class="mb-0 small mt-1">${escapeHtml(cm.text)}</p>
        <div id="replyForm-${cid}" class="reply-form">
          <textarea id="replyText-${cid}" class="form-control form-control-sm" rows="2" placeholder="Tulis balasan..."></textarea>
          <button class="btn btn-sm btn-primary mt-1" onclick="window.addReply('${vid}', '${cid}')">Kirim Balasan</button>
        </div>
        <div id="replies-${cid}">
          ${repliesToThis.map(([rid, r]) => renderCommentItem(rid, r, depth + 1)).join('')}
        </div>
      </div>
    `;
  };
  
  const list = topComments.map(([cid, cm]) => renderCommentItem(cid, cm)).join('');
  
  commentListEl.innerHTML = list || "<p class='text-muted text-center py-3'>Belum ada komentar. Jadilah yang pertama!</p>";
}

// Open comment modal
export function openCommentModal(vid) {
  window.currentCommentVid = vid;
  const commentVisionIdEl = document.getElementById("commentVisionId");
  if (commentVisionIdEl) commentVisionIdEl.value = vid;
  renderComments(vid);
  const modalEl = document.getElementById("commentModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

// Setup filter listeners
export function setupFilterListeners() {
  const filterSelect = document.getElementById("visionFilter");
  const sortSelect = document.getElementById("visionSort");
  const searchInput = document.getElementById("visionSearch");
  
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderVisions();
    });
  }
  
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderVisions();
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderVisions();
    });
  }
}

// Export ke window
window.saveVision = saveVision;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.addReply = addReply;
window.showReplyForm = showReplyForm;
window.openCommentModal = openCommentModal;
window.renderComments = renderComments;
window.toggleBookmark = toggleBookmark;
window.addReaction = addReaction;
window.shareToSocial = shareToSocial;
window.searchByTag = searchByTag;
window.deleteVision = deleteVision;
window.renderVisions = renderVisions;
window.initMoodSelector = initMoodSelector;
window.setupFilterListeners = setupFilterListeners;
