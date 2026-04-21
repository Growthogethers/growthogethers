// js/auth.js
import { db, ref, get, update } from './firebase-config.js';
import { showNotif, setCurrentUser } from './utils.js';

export async function handleLogin() {
  const u = document.getElementById("loginUser")?.value;
  const p = document.getElementById("loginPass")?.value;
  const errorDiv = document.getElementById("loginErrorMsg");
  const errorSpan = document.getElementById("errorText");
  
  if (!p || !p.trim()) { 
    if (errorSpan) errorSpan.innerText = "❌ Password tidak boleh kosong!"; 
    if (errorDiv) errorDiv.style.display = "flex"; 
    showNotif("Password harus diisi", true); 
    return; 
  }
  
  const loader = document.getElementById("loginLoader");
  if (loader) loader.style.display = "block";
  if (errorDiv) errorDiv.style.display = "none";
  
  try {
    const snap = await get(ref(db, `data/auth/${u}`));
    if (snap.val() === p) {
      setCurrentUser(u);
      sessionStorage.setItem("progrowth_user", u);
      if (window.setupAppSession) {
        window.setupAppSession(u);
      }
      showNotif(`Selamat datang, ${u}`);
      if ("Notification" in window) Notification.requestPermission();
    } else {
      if (errorSpan) errorSpan.innerText = "⚠️ Password salah!";
      if (errorDiv) errorDiv.style.display = "flex";
      showNotif("Password salah!", true);
    }
  } catch (e) {
    if (errorSpan) errorSpan.innerText = "⚠️ Gagal koneksi.";
    if (errorDiv) errorDiv.style.display = "flex";
    showNotif("Koneksi gagal", true);
  } finally {
    if (loader) loader.style.display = "none";
  }
}

export async function updateCloudPassword() {
  const p1 = document.getElementById("newPass")?.value;
  const p2 = document.getElementById("confirmPass")?.value;
  const currentUser = sessionStorage.getItem("progrowth_user");
  
  if (!p1 || p1.length < 4 || p1 !== p2) {
    showNotif("Minimal 4 karakter & sama", true);
    return;
  }
  
  await update(ref(db), { [`data/auth/${currentUser}`]: p1 });
  showNotif("Password berhasil diubah!");
  const modal = bootstrap.Modal.getInstance(document.getElementById("passModal"));
  if (modal) modal.hide();
  
  // Reset form
  const newPass = document.getElementById("newPass");
  const confirmPass = document.getElementById("confirmPass");
  if (newPass) newPass.value = "";
  if (confirmPass) confirmPass.value = "";
}

export function resetPassword() {
  const user = document.getElementById("resetUserSelect")?.value;
  const defaultPass = user === "FACHMI" ? "gokil223" : "1234";
  update(ref(db), { [`data/auth/${user}`]: defaultPass })
    .then(() => {
      showNotif(`Password ${user} direset ke default`);
      const modal = bootstrap.Modal.getInstance(document.getElementById("forgotPassModal"));
      if (modal) modal.hide();
    })
    .catch(() => showNotif("Gagal reset", true));
}

export function confirmLogout() {
  const modalEl = document.getElementById("confirmLogoutModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

export function handleLogout() {
  // Clear session
  sessionStorage.removeItem("progrowth_user");
  sessionStorage.clear();
  
  // Reset current user
  setCurrentUser(null);
  
  // Reset window variables
  if (window.masterData) window.masterData = null;
  
  // Show login screen, hide app
  const loginScreen = document.getElementById("login-screen");
  const sidebar = document.getElementById("app-sidebar");
  const appContent = document.getElementById("app-content");
  
  if (loginScreen) loginScreen.style.display = "flex";
  if (sidebar) sidebar.style.display = "none";
  if (appContent) appContent.style.display = "none";
  
  // Reset login form
  const loginPass = document.getElementById("loginPass");
  const loginErrorMsg = document.getElementById("loginErrorMsg");
  if (loginPass) loginPass.value = "";
  if (loginErrorMsg) loginErrorMsg.style.display = "none";
  
  showNotif("Anda telah keluar");
  
  // Close modal if open
  const modal = bootstrap.Modal.getInstance(document.getElementById("confirmLogoutModal"));
  if (modal) modal.hide();
}

// Export ke window
window.handleLogin = handleLogin;
window.updateCloudPassword = updateCloudPassword;
window.resetPassword = resetPassword;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;