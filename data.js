// ── DASHBOARD ──
async function loadDashboard() {
  if (!currentUser) return;

  // Load counts
  const [appsRes, savedUniRes, savedSchRes] = await Promise.all([
    sb.from('applications').select('id', { count: 'exact' }).eq('user_id', currentUser.id),
    sb.from('saved_universities').select('id', { count: 'exact' }).eq('user_id', currentUser.id),
    sb.from('saved_scholarships').select('id', { count: 'exact' }).eq('user_id', currentUser.id),
  ]);

  document.getElementById('statApps').textContent = appsRes.count || 0;
  document.getElementById('statSavedUnis').textContent = savedUniRes.count || 0;
  document.getElementById('statSavedSchols').textContent = savedSchRes.count || 0;

  // Welcome
  const name = (currentProfile?.full_name || 'Student').split(' ')[0];
  document.getElementById('welcomeName').textContent = name;

  // Load recent activity
  const { data: logs } = await sb.from('activity_logs')
    .select('*').eq('user_id', currentUser.id)
    .order('created_at', { ascending: false }).limit(5);

  const activityList = document.getElementById('activityList');
  if (logs && logs.length > 0) {
    activityList.innerHTML = logs.map(log => `
      <div class="timeline-item">
        <div class="timeline-date">${formatDate(log.created_at)}</div>
        <div class="timeline-text">${log.action}</div>
      </div>
    `).join('');
  } else {
    activityList.innerHTML = '<div class="timeline-text" style="color:var(--text-muted)">No activity yet. Start exploring universities!</div>';
  }

  // Load upcoming deadlines from applications
  const { data: apps } = await sb.from('applications')
    .select('*, universities(name)').eq('user_id', currentUser.id)
    .not('deadline', 'is', null)
    .order('deadline', { ascending: true }).limit(5);

  const deadlineList = document.getElementById('deadlineList');
  if (apps && apps.length > 0) {
    deadlineList.innerHTML = apps.map(app => {
      const days = Math.ceil((new Date(app.deadline) - new Date()) / 86400000);
      const color = days < 7 ? 'var(--danger)' : days < 30 ? 'var(--warning)' : 'var(--success)';
      return `
        <div class="deadline-item">
          <div class="deadline-dot" style="background:${color}"></div>
          <div class="deadline-info">
            <div class="deadline-name">${app.program || 'Application'}</div>
            <div class="deadline-date">${app.universities?.name || 'University'}</div>
          </div>
          <div class="deadline-days" style="color:${color}">${days > 0 ? days + 'd' : 'Due!'}</div>
        </div>
      `;
    }).join('');
  } else {
    deadlineList.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:10px 0">No upcoming deadlines</div>';
  }
}

// ── UNIVERSITIES DATA ──
const UNIVERSITIES_DATA = [
  { id: 1, name: 'University of Cape Town', country: 'South Africa', flag: '🇿🇦', ranking: 226, tuition: '$3,500', tuition_usd: 3500, degrees: ['BSc', 'BA', 'MBA', 'PhD'], deadline: '2025-09-30', website: 'https://www.uct.ac.za', requirements: 'Matric certificate, English proficiency, IELTS 6.5+', type: 'Public' },
  { id: 2, name: 'University of Witwatersrand', country: 'South Africa', flag: '🇿🇦', ranking: 411, tuition: '$4,200', tuition_usd: 4200, degrees: ['Engineering', 'Commerce', 'Medicine'], deadline: '2025-10-15', website: 'https://www.wits.ac.za', requirements: 'Matric, APS score 40+', type: 'Public' },
  { id: 3, name: 'University of Nairobi', country: 'Kenya', flag: '🇰🇪', ranking: 801, tuition: '$2,100', tuition_usd: 2100, degrees: ['BSc', 'BA', 'LLB', 'MBA'], deadline: '2025-08-31', website: 'https://www.uonbi.ac.ke', requirements: 'KCSE C+ and above', type: 'Public' },
  { id: 4, name: 'Makerere University', country: 'Uganda', flag: '🇺🇬', ranking: 901, tuition: '$1,800', tuition_usd: 1800, degrees: ['BSc', 'BA', 'MBA', 'MD'], deadline: '2025-08-15', website: 'https://www.mak.ac.ug', requirements: 'UCE/UACE results, 2 principal passes', type: 'Public' },
  { id: 5, name: 'University of Ghana', country: 'Ghana', flag: '🇬🇭', ranking: 801, tuition: '$2,400', tuition_usd: 2400, degrees: ['BSc', 'BA', 'LLB', 'PhD'], deadline: '2025-07-31', website: 'https://www.ug.edu.gh', requirements: 'WASSCE results, aggregate 6-36', type: 'Public' },
  { id: 6, name: 'University of Lagos', country: 'Nigeria', flag: '🇳🇬', ranking: 1001, tuition: '$1,200', tuition_usd: 1200, degrees: ['Engineering', 'Medicine', 'Law', 'Business'], deadline: '2025-06-30', website: 'https://unilag.edu.ng', requirements: 'JAMB 200+, O-level results', type: 'Public' },
  { id: 7, name: 'University of Edinburgh', country: 'United Kingdom', flag: '🇬🇧', ranking: 15, tuition: '$25,000', tuition_usd: 25000, degrees: ['BSc', 'MA', 'PhD', 'LLB'], deadline: '2026-01-15', website: 'https://www.ed.ac.uk', requirements: 'A-levels AAA, IELTS 6.5', type: 'Public' },
  { id: 8, name: 'Stellenbosch University', country: 'South Africa', flag: '🇿🇦', ranking: 401, tuition: '$3,800', tuition_usd: 3800, degrees: ['Agriculture', 'Law', 'Engineering', 'MBA'], deadline: '2025-09-30', website: 'https://www.sun.ac.za', requirements: 'Matric APS 38+', type: 'Public' },
  { id: 9, name: 'American University in Cairo', country: 'Egypt', flag: '🇪🇬', ranking: 501, tuition: '$18,000', tuition_usd: 18000, degrees: ['BA', 'BSc', 'MBA', 'MA'], deadline: '2025-12-01', website: 'https://www.aucegypt.edu', requirements: 'SAT/ACT, IELTS 6.0', type: 'Private' },
  { id: 10, name: 'University of Rwanda', country: 'Rwanda', flag: '🇷🇼', ranking: 1500, tuition: '$1,500', tuition_usd: 1500, degrees: ['BSc', 'BEd', 'MBA', 'LLB'], deadline: '2025-08-01', website: 'https://www.ur.ac.rw', requirements: 'Rwanda National Examination Board results', type: 'Public' },
  { id: 11, name: 'TU Delft', country: 'Netherlands', flag: '🇳🇱', ranking: 57, tuition: '$12,000', tuition_usd: 12000, degrees: ['BSc Engineering', 'MSc', 'PhD'], deadline: '2026-01-15', website: 'https://www.tudelft.nl', requirements: 'Math & Sciences, IELTS 6.5', type: 'Public' },
  { id: 12, name: 'University of Toronto', country: 'Canada', flag: '🇨🇦', ranking: 21, tuition: '$32,000', tuition_usd: 32000, degrees: ['BSc', 'BA', 'JD', 'MBA', 'PhD'], deadline: '2026-01-15', website: 'https://www.utoronto.ca', requirements: 'High school diploma, SAT/ACT preferred', type: 'Public' },
];

let filteredUniversities = [...UNIVERSITIES_DATA];
let savedUniIds = new Set();

async function loadUniversities() {
  // Load saved unis for current user
  if (currentUser) {
    const { data } = await sb.from('saved_universities').select('university_id').eq('user_id', currentUser.id);
    savedUniIds = new Set((data || []).map(r => r.university_id));
  }
  renderUniversities(UNIVERSITIES_DATA);
}

function renderUniversities(data) {
  const grid = document.getElementById('uniGrid');
  if (!data.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🎓</div>
      <h3>No universities found</h3>
      <p>Try adjusting your filters</p>
    </div>`;
    return;
  }
  grid.innerHTML = data.map(uni => `
    <div class="uni-card fade-in">
      <span class="uni-flag">${uni.flag}</span>
      <div class="uni-name">${uni.name}</div>
      <div class="uni-country">📍 ${uni.country}</div>
      <div class="uni-meta">
        <span class="tag">Rank #${uni.ranking}</span>
        <span class="tag-purple tag">${uni.tuition}/yr</span>
        <span class="tag-green tag">${uni.type}</span>
      </div>
      <div class="uni-meta" style="margin-bottom:0">
        ${uni.degrees.slice(0,3).map(d => `<span class="tag-orange tag">${d}</span>`).join('')}
      </div>
      <div class="uni-footer">
        <div class="deadline-text">Deadline: <span>${uni.deadline}</span></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-ghost" onclick="viewUniDetails(${uni.id})">Details</button>
          <button class="btn btn-sm ${savedUniIds.has(uni.id) ? 'btn-danger' : 'btn-secondary'}" 
            onclick="toggleSaveUni(${uni.id}, this)">
            ${savedUniIds.has(uni.id) ? '❤️ Saved' : '🤍 Save'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterUniversities() {
  const search = document.getElementById('uniSearch').value.toLowerCase();
  const country = document.getElementById('uniCountryFilter').value;
  const tuition = document.getElementById('uniTuitionFilter').value;
  const degree = document.getElementById('uniDegreeFilter').value;

  filteredUniversities = UNIVERSITIES_DATA.filter(uni => {
    if (search && !uni.name.toLowerCase().includes(search) && !uni.country.toLowerCase().includes(search)) return false;
    if (country && uni.country !== country) return false;
    if (tuition) {
      const [min, max] = tuition.split('-').map(Number);
      if (max && (uni.tuition_usd < min || uni.tuition_usd > max)) return false;
      if (!max && uni.tuition_usd < min) return false;
    }
    if (degree && !uni.degrees.some(d => d.toLowerCase().includes(degree.toLowerCase()))) return false;
    return true;
  });
  renderUniversities(filteredUniversities);
}

async function toggleSaveUni(uniId, btn) {
  if (!currentUser) return showToast('Please log in first', 'error');
  if (savedUniIds.has(uniId)) {
    await sb.from('saved_universities').delete().eq('user_id', currentUser.id).eq('university_id', uniId);
    savedUniIds.delete(uniId);
    btn.className = 'btn btn-sm btn-secondary';
    btn.textContent = '🤍 Save';
    showToast('Removed from saved universities', 'info');
  } else {
    await sb.from('saved_universities').insert({ user_id: currentUser.id, university_id: uniId });
    savedUniIds.add(uniId);
    btn.className = 'btn btn-sm btn-danger';
    btn.textContent = '❤️ Saved';
    showToast('University saved!', 'success');
    await logActivity('Saved university: ' + UNIVERSITIES_DATA.find(u => u.id === uniId)?.name);
  }
}

function viewUniDetails(id) {
  const uni = UNIVERSITIES_DATA.find(u => u.id === id);
  if (!uni) return;
  document.getElementById('modalTitle').textContent = uni.name;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:3rem">${uni.flag}</span>
        <div>
          <div style="font-size:1.2rem;font-weight:700">${uni.name}</div>
          <div style="color:var(--text-secondary)">${uni.country} • Rank #${uni.ranking}</div>
        </div>
      </div>
      <hr class="divider">
      <div class="grid-2" style="gap:12px">
        <div><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">TUITION</div><div style="font-weight:600">${uni.tuition}/year</div></div>
        <div><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">TYPE</div><div style="font-weight:600">${uni.type}</div></div>
        <div><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">APPLICATION DEADLINE</div><div style="font-weight:600;color:var(--warning)">${uni.deadline}</div></div>
        <div><div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">AVAILABLE DEGREES</div><div style="font-weight:600">${uni.degrees.join(', ')}</div></div>
      </div>
      <div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px">REQUIREMENTS</div>
        <div style="font-size:0.9rem;line-height:1.6">${uni.requirements}</div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a href="${uni.website}" target="_blank" class="btn btn-secondary btn-sm">🌐 Visit Website</a>
        <button class="btn btn-primary btn-sm" onclick="addToTracker('${uni.name}');closeModal()">+ Add to Tracker</button>
      </div>
    </div>
  `;
  openModal();
}

// ── SCHOLARSHIPS DATA ──
const SCHOLARSHIPS_DATA = [
  { id: 1, title: 'MasterCard Foundation Scholars Program', provider: 'MasterCard Foundation', amount: 'Full Scholarship', eligibility: 'African students, undergraduate', deadline: '2025-12-01', link: 'https://mastercardfdn.org/scholarships', type: 'Full', country: 'Various', flag: '🌍' },
  { id: 2, title: 'Chevening Scholarship', provider: 'UK Government', amount: 'Full Tuition + Living', eligibility: 'Master\'s, leadership potential', deadline: '2025-11-05', link: 'https://www.chevening.org', type: 'Full', country: 'United Kingdom', flag: '🇬🇧' },
  { id: 3, title: 'Commonwealth Scholarship', provider: 'Commonwealth', amount: 'Full Scholarship', eligibility: 'Commonwealth citizens, postgrad', deadline: '2025-11-15', link: 'https://cscuk.fcdo.gov.uk', type: 'Full', country: 'United Kingdom', flag: '🇬🇧' },
  { id: 4, title: 'DAAD Scholarship', provider: 'German Academic Exchange', amount: '€750-1200/month', eligibility: 'Undergrad & postgrad, various fields', deadline: '2025-10-15', link: 'https://www.daad.de', type: 'Partial', country: 'Germany', flag: '🇩🇪' },
  { id: 5, title: 'Erasmus Mundus Scholarship', provider: 'European Commission', amount: '€1,400/month + tuition', eligibility: 'Graduate students, non-EU citizens', deadline: '2026-01-15', link: 'https://erasmus-plus.ec.europa.eu', type: 'Full', country: 'Europe', flag: '🇪🇺' },
  { id: 6, title: 'African Union Scholarships', provider: 'African Union', amount: 'Varies', eligibility: 'African citizens, postgraduate', deadline: '2025-09-30', link: 'https://au.int', type: 'Partial', country: 'Africa', flag: '🌍' },
  { id: 7, title: 'Orange Knowledge Programme', provider: 'Netherlands', amount: 'Full Scholarship', eligibility: 'Mid-career professionals', deadline: '2025-10-01', link: 'https://www.nuffic.nl', type: 'Full', country: 'Netherlands', flag: '🇳🇱' },
  { id: 8, title: 'USAID Merit and Needs Scholarships', provider: 'USAID', amount: '$5,000-$15,000', eligibility: 'African students, STEM', deadline: '2025-08-15', link: 'https://www.usaid.gov', type: 'Partial', country: 'USA', flag: '🇺🇸' },
  { id: 9, title: 'Korean Government Scholarship (GKS)', provider: 'Korean Government', amount: 'Full Scholarship + allowance', eligibility: 'Undergrad & graduate students', deadline: '2025-09-01', link: 'https://www.niied.go.kr', type: 'Full', country: 'South Korea', flag: '🇰🇷' },
  { id: 10, title: 'World Bank Graduate Scholarship', provider: 'World Bank Group', amount: 'Full scholarship', eligibility: 'Citizens of World Bank member states', deadline: '2026-02-01', link: 'https://www.worldbank.org', type: 'Full', country: 'Various', flag: '🌐' },
  { id: 11, title: 'Ecobank Foundation Scholarship', provider: 'Ecobank', amount: '$10,000/year', eligibility: 'African students, Finance/Banking', deadline: '2025-07-31', link: 'https://ecobank.com', type: 'Partial', country: 'Africa', flag: '🌍' },
  { id: 12, title: 'AAUW International Fellowships', provider: 'AAUW', amount: '$18,000-30,000', eligibility: 'Women, non-US citizens', deadline: '2025-11-15', link: 'https://www.aauw.org', type: 'Partial', country: 'USA', flag: '🇺🇸' },
];

let savedScholIds = new Set();

async function loadScholarships() {
  if (currentUser) {
    const { data } = await sb.from('saved_scholarships').select('scholarship_id').eq('user_id', currentUser.id);
    savedScholIds = new Set((data || []).map(r => r.scholarship_id));
  }
  renderScholarships(SCHOLARSHIPS_DATA);
}

function renderScholarships(data) {
  const grid = document.getElementById('scholarGrid');
  if (!data.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🏆</div><h3>No scholarships found</h3><p>Try different filters</p></div>`;
    return;
  }
  grid.innerHTML = data.map(s => `
    <div class="scholar-card fade-in">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
        <span style="font-size:1.6rem">${s.flag}</span>
        <span class="tag ${s.type === 'Full' ? 'tag-green' : 'tag-orange'}">${s.type} Funding</span>
      </div>
      <div class="uni-name" style="font-size:0.95rem">${s.title}</div>
      <div class="uni-country" style="margin-bottom:10px">by ${s.provider}</div>
      <div class="uni-meta">
        <span class="tag-purple tag">💰 ${s.amount}</span>
        <span class="tag">📍 ${s.country}</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;line-height:1.5">${s.eligibility}</div>
      <div class="uni-footer">
        <div class="deadline-text">Deadline: <span>${s.deadline}</span></div>
        <div style="display:flex;gap:8px">
          <a href="${s.link}" target="_blank" class="btn btn-sm btn-ghost">Apply →</a>
          <button class="btn btn-sm ${savedScholIds.has(s.id) ? 'btn-danger' : 'btn-secondary'}" 
            onclick="toggleSaveSchol(${s.id}, this)">
            ${savedScholIds.has(s.id) ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterScholarships() {
  const search = document.getElementById('scholSearch').value.toLowerCase();
  const type = document.getElementById('scholTypeFilter').value;
  const country = document.getElementById('scholCountryFilter').value;

  const filtered = SCHOLARSHIPS_DATA.filter(s => {
    if (search && !s.title.toLowerCase().includes(search) && !s.provider.toLowerCase().includes(search)) return false;
    if (type && s.type !== type) return false;
    if (country && s.country !== country) return false;
    return true;
  });
  renderScholarships(filtered);
}

async function toggleSaveSchol(id, btn) {
  if (!currentUser) return showToast('Please log in first', 'error');
  if (savedScholIds.has(id)) {
    await sb.from('saved_scholarships').delete().eq('user_id', currentUser.id).eq('scholarship_id', id);
    savedScholIds.delete(id);
    btn.className = 'btn btn-sm btn-secondary';
    btn.textContent = '🤍';
    showToast('Removed from saved scholarships', 'info');
  } else {
    await sb.from('saved_scholarships').insert({ user_id: currentUser.id, scholarship_id: id });
    savedScholIds.add(id);
    btn.className = 'btn btn-sm btn-danger';
    btn.textContent = '❤️';
    showToast('Scholarship saved!', 'success');
  }
}

// ── APPLICATION TRACKER ──
const STATUS_PROGRESS = {
  'researching': 10, 'draft': 25, 'in_progress': 45, 'submitted': 65,
  'interview': 80, 'waitlisted': 70, 'accepted': 100, 'rejected': 100
};

async function loadTracker() {
  if (!currentUser) return;
  const { data: apps, error } = await sb.from('applications')
    .select('*').eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  const grid = document.getElementById('trackerGrid');
  if (!apps || apps.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">📋</div><h3>No applications yet</h3>
      <p>Start tracking your university applications</p>
      <button class="btn btn-primary" onclick="openAddAppModal()">+ Add Application</button>
    </div>`;
    document.getElementById('statApps').textContent = 0;
    return;
  }

  document.getElementById('statApps').textContent = apps.length;
  grid.innerHTML = apps.map(app => `
    <div class="app-card fade-in">
      <div class="app-status status-${app.status.replace('_', '-')}">
        <span>${getStatusIcon(app.status)}</span>
        <span>${formatStatus(app.status)}</span>
      </div>
      <div class="app-title">${app.program || 'Program'}</div>
      <div class="app-uni">🏛 ${app.university_name || 'University'}</div>
      ${app.deadline ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">📅 Deadline: ${app.deadline}</div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill" style="width:${STATUS_PROGRESS[app.status] || 10}%"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <select class="filter-select" style="flex:1;font-size:0.8rem;padding:6px 8px" onchange="updateAppStatus(${app.id}, this.value)">
          ${['researching','draft','in_progress','submitted','interview','waitlisted','accepted','rejected']
            .map(s => `<option value="${s}" ${app.status === s ? 'selected' : ''}>${formatStatus(s)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="deleteApp(${app.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

function getStatusIcon(status) {
  const icons = { researching: '🔍', draft: '✏️', in_progress: '⚙️', submitted: '📤', interview: '💬', waitlisted: '⏳', accepted: '🎉', rejected: '❌' };
  return icons[status] || '📋';
}

function formatStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function addApplication(e) {
  e.preventDefault();
  if (!currentUser) return;
  const data = {
    user_id: currentUser.id,
    university_name: document.getElementById('appUniName').value,
    program: document.getElementById('appProgram').value,
    deadline: document.getElementById('appDeadline').value || null,
    status: document.getElementById('appStatus').value,
    notes: document.getElementById('appNotes').value || null
  };
  const { error } = await sb.from('applications').insert(data);
  if (error) showToast('Failed to add application', 'error');
  else {
    showToast('Application added!', 'success');
    closeModal();
    loadTracker();
    await logActivity(`Added application: ${data.program} at ${data.university_name}`);
  }
}

async function updateAppStatus(id, status) {
  const { error } = await sb.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (!error) showToast(`Status updated to ${formatStatus(status)}`, 'success');
}

async function deleteApp(id) {
  if (!confirm('Delete this application?')) return;
  await sb.from('applications').delete().eq('id', id);
  showToast('Application removed', 'info');
  loadTracker();
}

async function addToTracker(uniName) {
  if (!currentUser) return;
  navigateTo('tracker');
  document.getElementById('appUniName').value = uniName;
  openAddAppModal();
}

function openAddAppModal() {
  document.getElementById('modalTitle').textContent = '+ New Application';
  document.getElementById('modalBody').innerHTML = `
    <form id="addAppForm">
      <div class="form-group"><label>University Name</label><input id="appUniName" placeholder="e.g. University of Cape Town" required></div>
      <div class="form-group"><label>Program / Course</label><input id="appProgram" placeholder="e.g. BSc Computer Science" required></div>
      <div class="form-row">
        <div class="form-group"><label>Application Deadline</label><input type="date" id="appDeadline"></div>
        <div class="form-group"><label>Status</label>
          <select id="appStatus">
            <option value="researching">Researching</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="appNotes" rows="3" placeholder="Any notes..."></textarea></div>
      <button type="submit" class="btn btn-primary">Add Application</button>
    </form>
  `;
  document.getElementById('addAppForm').addEventListener('submit', addApplication);
  openModal();
}

// ── DOCUMENTS ──
const DOC_TYPES = [
  { key: 'cv', name: 'CV / Resume', icon: '📄' },
  { key: 'passport', name: 'Passport', icon: '🛂' },
  { key: 'transcript', name: 'Academic Transcript', icon: '📋' },
  { key: 'certificate', name: 'Certificates', icon: '🏆' },
  { key: 'recommendation', name: 'Recommendation Letter', icon: '✉️' },
  { key: 'english_test', name: 'English Test Results', icon: '🇬🇧' },
  { key: 'personal_statement', name: 'Personal Statement', icon: '📝' },
  { key: 'motivation_letter', name: 'Motivation Letter', icon: '💌' },
];

let uploadedDocs = {};

async function loadDocuments() {
  if (!currentUser) return;
  const { data } = await sb.from('documents').select('*').eq('user_id', currentUser.id);
  uploadedDocs = {};
  if (data) data.forEach(d => { uploadedDocs[d.doc_type] = d; });
  renderDocuments();
}

function renderDocuments() {
  const grid = document.getElementById('docsGrid');
  grid.innerHTML = DOC_TYPES.map(doc => {
    const uploaded = uploadedDocs[doc.key];
    return `
      <div class="doc-card ${uploaded ? 'uploaded' : ''}" onclick="triggerUpload('${doc.key}', '${doc.name}')">
        <div class="doc-icon">${doc.icon}</div>
        <div class="doc-name">${doc.name}</div>
        <div class="doc-status">${uploaded ? '✅ Uploaded · ' + formatDate(uploaded.created_at) : 'Click to upload'}</div>
        ${uploaded ? `<div style="margin-top:10px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();viewDoc('${uploaded.file_url}')">View</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteDoc('${uploaded.id}','${doc.key}')">Delete</button>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function triggerUpload(docType, docName) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  input.onchange = (e) => uploadDocument(e.target.files[0], docType, docName);
  input.click();
}

async function uploadDocument(file, docType, docName) {
  if (!file || !currentUser) return;
  if (file.size > 10 * 1024 * 1024) return showToast('File too large (max 10MB)', 'error');

  showToast('Uploading...', 'info');
  const fileName = `${currentUser.id}/${docType}_${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await sb.storage.from('documents').upload(fileName, file);

  if (uploadError) return showToast('Upload failed: ' + uploadError.message, 'error');

  const { data: { publicUrl } } = sb.storage.from('documents').getPublicUrl(fileName);

  // Delete old doc record if exists
  if (uploadedDocs[docType]) {
    await sb.from('documents').delete().eq('id', uploadedDocs[docType].id);
  }

  const { error } = await sb.from('documents').insert({
    user_id: currentUser.id,
    doc_type: docType,
    doc_name: docName,
    file_name: file.name,
    file_url: publicUrl,
    file_size: file.size
  });

  if (error) showToast('Failed to save document record', 'error');
  else {
    showToast(`${docName} uploaded!`, 'success');
    await logActivity(`Uploaded: ${docName}`);
    loadDocuments();
  }
}

async function deleteDoc(id, docType) {
  if (!confirm('Delete this document?')) return;
  await sb.from('documents').delete().eq('id', id);
  delete uploadedDocs[docType];
  showToast('Document deleted', 'info');
  renderDocuments();
}

function viewDoc(url) {
  window.open(url, '_blank');
}

// ── ACTIVITY LOG ──
async function logActivity(action) {
  if (!currentUser) return;
  await sb.from('activity_logs').insert({ user_id: currentUser.id, action });
}

// ── MODAL HELPERS ──
function openModal() {
  document.getElementById('mainModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('mainModal').classList.remove('show');
  document.body.style.overflow = '';
}

// ── UTILS ──
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
