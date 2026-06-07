// ── SUPABASE CONFIG ──
const SUPABASE_URL = 'https://skopoptnpkomijbogueh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrb3BvcHRudHBrb21pamJvZ3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTU3MTIsImV4cCI6MjA5NjMzMTcxMn0.cQ35xNItDjdbtH_Ssi7h1RexeJXIP3itASJlYm8caxQ';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── GLOBAL STATE ──
let currentUser = null;
let currentProfile = null;

// ── TOAST ──
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── ALERT HELPERS ──
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) { el.className = 'alert'; el.textContent = ''; }
}

// ── AUTH FUNCTIONS ──
async function register(e) {
  e.preventDefault();
  hideAlert('registerAlert');
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const country = document.getElementById('regCountry').value;
  const degree = document.getElementById('regDegree').value;

  try {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: name, country, intended_degree: degree } }
    });

    if (error) throw error;

    if (data.user) {
      // Insert profile
      await sb.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        email,
        country,
        intended_degree: degree,
        plan: 'free'
      });

      showAlert('registerAlert', '✅ Account created! Please check your email to confirm, or log in directly.', 'success');
    }
  } catch (err) {
    showAlert('registerAlert', err.message || 'Registration failed');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function login(e) {
  e.preventDefault();
  hideAlert('loginAlert');
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    await loadProfile();
    showApp();
  } catch (err) {
    showAlert('loginAlert', err.message || 'Login failed');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showAuth('login');
}

async function resetPassword(e) {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim();
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) showAlert('resetAlert', error.message);
  else showAlert('resetAlert', '✅ Reset email sent! Check your inbox.', 'success');
}

// ── PROFILE ──
async function loadProfile() {
  if (!currentUser) return;
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data) {
    currentProfile = data;
  } else {
    // Create default profile if not exists
    const meta = currentUser.user_metadata || {};
    const newProfile = {
      id: currentUser.id,
      full_name: meta.full_name || currentUser.email.split('@')[0],
      email: currentUser.email,
      country: meta.country || '',
      intended_degree: meta.intended_degree || '',
      plan: 'free'
    };
    await sb.from('profiles').insert(newProfile);
    currentProfile = newProfile;
  }
  updateUIWithProfile();
}

function updateUIWithProfile() {
  if (!currentProfile) return;
  const initials = (currentProfile.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  document.querySelectorAll('.user-avatar-initials').forEach(el => el.textContent = initials);
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = currentProfile.full_name || 'User');
  document.querySelectorAll('.user-display-email').forEach(el => el.textContent = currentProfile.email || '');
  document.querySelectorAll('.user-plan-badge').forEach(el => el.textContent = (currentProfile.plan || 'free').toUpperCase());

  // Profile form
  const fields = {
    'profileName': currentProfile.full_name,
    'profileEmail': currentProfile.email,
    'profileCountry': currentProfile.country,
    'profileDegree': currentProfile.intended_degree,
    'profilePreferredCountries': currentProfile.preferred_countries
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
}

async function updateProfile(e) {
  e.preventDefault();
  const updates = {
    full_name: document.getElementById('profileName').value,
    country: document.getElementById('profileCountry').value,
    intended_degree: document.getElementById('profileDegree').value,
    preferred_countries: document.getElementById('profilePreferredCountries').value,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('profiles').update(updates).eq('id', currentUser.id);
  if (error) showToast('Failed to update profile', 'error');
  else {
    Object.assign(currentProfile, updates);
    updateUIWithProfile();
    showToast('Profile updated successfully!', 'success');
  }
}

// ── NAVIGATION ──
function showAuth(page = 'login') {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('appSection').style.display = 'none';

  document.querySelectorAll('.auth-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById(`panel-${page}`);
  if (target) target.style.display = 'block';
}

function showApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('appSection').style.display = 'grid';
  navigateTo('dashboard');
  loadDashboard();
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) { targetPage.classList.add('active'); targetPage.classList.add('fade-in'); }

  const targetNav = document.querySelector(`[data-nav="${page}"]`);
  if (targetNav) targetNav.classList.add('active');

  document.getElementById('headerTitle').textContent = {
    dashboard: 'Dashboard',
    universities: 'University Explorer',
    scholarships: 'Scholarship Explorer',
    tracker: 'Application Tracker',
    documents: 'Documents',
    ai: 'AI Tools',
    profile: 'My Profile'
  }[page] || 'AdmissionIQ';

  // Load page data
  if (page === 'universities') loadUniversities();
  if (page === 'scholarships') loadScholarships();
  if (page === 'tracker') loadTracker();
  if (page === 'documents') loadDocuments();
  if (page === 'profile') updateUIWithProfile();
}

// ── APP INIT ──
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await loadProfile();
    showApp();
  } else {
    showAuth('login');
  }

  // Auth state listener
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfile();
    }
  });
});

// ── THEME TOGGLE ──
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  localStorage.setItem('theme', document.documentElement.getAttribute('data-theme'));
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
