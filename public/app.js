const API = '/api/projects';
const AUTH_API = '/api/auth';
const USERS_API = '/api/users';

const TOKEN_KEY = 'project-portal-token';

const $ = (id) => document.getElementById(id);
const listView = $('list-view');
const detailView = $('detail-view');
const formView = $('form-view');
const loginView = $('login-view');
const registerView = $('register-view');
const adminView = $('admin-view');
const apisView = $('apis-view');
const projectList = $('project-list');
const projectGrid = $('project-grid');
const listEmpty = $('list-empty');
const listSkeleton = $('list-skeleton');
const listContainer = $('list-container');
const detailContent = $('detail-content');
const editLink = $('edit-link');
const deleteBtn = $('delete-btn');
const shareBtn = $('share-btn');
const projectForm = $('project-form');
const formTitleEl = $('form-title');
const formBack = $('form-back');
const projectIdInput = $('project-id');
const globalSearch = $('global-search');
const sortSelect = $('sort-select');
const filterStatus = $('filter-status');
const filterFeatured = $('filter-featured');
const viewListBtn = $('view-list');
const viewGridBtn = $('view-grid');
const themeToggle = $('theme-toggle');
const modalOverlay = $('modal-overlay');
const modalCancel = $('modal-cancel');
const modalConfirm = $('modal-confirm');
const lightbox = $('lightbox');
const lightboxImg = $('lightbox-img');
const lightboxClose = $('lightbox-close');
const imagesInput = $('images-input');
const imagePreviews = $('image-previews');
const tagsInput = $('tags-input');
const tagsChips = $('tags-chips');
const tagsHidden = $('tags-hidden');
const toastContainer = $('toast-container');

let currentProjectId = null;
let listViewMode = 'list';
let searchTimeout = null;
let currentUser = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function fetchMe() {
  const res = await fetch(AUTH_API + '/me', { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

function userRole() {
  return (currentUser && (currentUser.role || (currentUser.is_admin ? 'admin' : 'viewer'))) || 'viewer';
}

function updateHeader() {
  const navLogin = $('nav-login');
  const navRegister = $('nav-register');
  const navLogout = $('nav-logout');
  const navUser = $('nav-user');
  const role = userRole();
  if (currentUser) {
    if (navLogin) navLogin.classList.add('hidden');
    if (navRegister) navRegister.classList.add('hidden');
    if (navLogout) navLogout.classList.remove('hidden');
    if (navUser) {
      navUser.textContent = currentUser.username;
      navUser.classList.remove('hidden');
    }
    if ($('nav-admin-link')) $('nav-admin-link').classList.toggle('hidden', role !== 'admin');
    if ($('nav-apis-link')) $('nav-apis-link').classList.toggle('hidden', role !== 'admin');
    if ($('nav-developer-badge')) $('nav-developer-badge').classList.toggle('hidden', role !== 'developer');
    if ($('nav-admin-badge')) $('nav-admin-badge').classList.toggle('hidden', role !== 'admin');
    const canCreate = role === 'developer' || role === 'admin';
    document.querySelectorAll('.nav-create, .list-create-btn').forEach((el) => el && el.classList.toggle('hidden', !canCreate));
  } else {
    if (navLogin) navLogin.classList.remove('hidden');
    if (navRegister) navRegister.classList.remove('hidden');
    if (navLogout) navLogout.classList.add('hidden');
    if (navUser) navUser.classList.add('hidden');
    if ($('nav-admin-link')) $('nav-admin-link').classList.add('hidden');
    if ($('nav-apis-link')) $('nav-apis-link').classList.add('hidden');
    if ($('nav-developer-badge')) $('nav-developer-badge').classList.add('hidden');
    if ($('nav-admin-badge')) $('nav-admin-badge').classList.add('hidden');
    document.querySelectorAll('.nav-create, .list-create-btn').forEach((el) => el && el.classList.add('hidden'));
  }
}

function showView(view) {
  listView.classList.add('hidden');
  detailView.classList.add('hidden');
  formView.classList.add('hidden');
  if (loginView) loginView.classList.add('hidden');
  if (registerView) registerView.classList.add('hidden');
  if (adminView) adminView.classList.add('hidden');
  if (apisView) apisView.classList.add('hidden');
  view.classList.remove('hidden');
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function parseHash() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'login') return { view: 'login' };
  if (parts[0] === 'register') return { view: 'register' };
  if (parts[0] === 'admin') return { view: 'admin' };
  if (parts[0] === 'apis') return { view: 'apis' };
  if (parts[0] === 'new') return { view: 'form', mode: 'new' };
  if (parts[0] === 'projects' && parts[1]) {
    const id = parseInt(parts[1], 10);
    if (parts[2] === 'edit') return { view: 'form', mode: 'edit', id };
    return { view: 'detail', id };
  }
  return { view: 'list' };
}

function buildQuery() {
  const params = new URLSearchParams();
  const q = globalSearch && globalSearch.value ? globalSearch.value.trim() : '';
  if (q) params.set('search', q);
  if (filterStatus && filterStatus.value) params.set('status', filterStatus.value);
  if (filterFeatured && filterFeatured.checked) params.set('featured', '1');
  if (sortSelect && sortSelect.value) params.set('sort', sortSelect.value);
  return params.toString();
}

async function fetchProjects() {
  const q = buildQuery();
  const url = q ? `${API}?${q}` : API;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

async function fetchProject(id) {
  const res = await fetch(`${API}/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Project not found');
  return res.json();
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function statusPill(status) {
  const s = (status || 'published').toLowerCase();
  return `<span class="status-pill ${s}">${escapeHtml(s)}</span>`;
}

function renderList(projects) {
  if (listSkeleton) listSkeleton.classList.add('hidden');
  if (listContainer) listContainer.classList.remove('hidden');
  if (!projects.length) {
    projectList.innerHTML = '';
    projectGrid.innerHTML = '';
    projectList.classList.add('hidden');
    projectGrid.classList.add('hidden');
    listEmpty.classList.remove('hidden');
    return;
  }
  listEmpty.classList.add('hidden');

  const thumb = (p) => (p.images && p.images[0]) ? `<img class="thumb" src="${escapeAttr(p.images[0])}" alt="">` : '<div class="thumb-placeholder">📁</div>';
  const tagsRow = (p) => (p.tags && p.tags.length) ? `<div class="tags-row">${p.tags.slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : '';
  const createdBy = (p) => (p.created_by_username) ? `<div class="created-by">Created by ${escapeHtml(p.created_by_username)}</div>` : '';

  projectList.innerHTML = projects.map((p) => `
    <li>
      <a href="#/projects/${p.id}">
        ${thumb(p)}
        <div class="list-body">
          <span class="title">${p.featured ? '<span class="featured-star" aria-hidden="true">★</span>' : ''}${escapeHtml(p.title)} ${statusPill(p.status)}</span>
          <div class="meta">${escapeHtml(p.developer_name)} · ${p.updated_at ? new Date(p.updated_at).toLocaleDateString() : (p.created_at ? new Date(p.created_at).toLocaleDateString() : '')}</div>
          ${createdBy(p)}
          ${tagsRow(p)}
        </div>
      </a>
    </li>
  `).join('');

  projectGrid.innerHTML = projects.map((p) => {
    const thumbImg = (p.images && p.images[0]) ? `<img class="card-thumb" src="${escapeAttr(p.images[0])}" alt="">` : '<div class="card-thumb-placeholder">📁</div>';
    const tags = (p.tags && p.tags.length) ? p.tags.slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('') : '';
    const createdBy = (p.created_by_username) ? `<div class="created-by">Created by ${escapeHtml(p.created_by_username)}</div>` : '';
    return `
      <a href="#/projects/${p.id}" class="project-card">
        ${thumbImg}
        <div class="card-body">
          <div class="card-title">${p.featured ? '<span class="featured-star">★</span>' : ''}${escapeHtml(p.title)} ${statusPill(p.status)}</div>
          <div class="card-meta">${escapeHtml(p.developer_name)}</div>
          ${createdBy}
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        </div>
      </a>
    `;
  }).join('');

  if (listViewMode === 'grid') {
    projectList.classList.add('hidden');
    projectGrid.classList.remove('hidden');
  } else {
    projectList.classList.remove('hidden');
    projectGrid.classList.add('hidden');
  }
}

function renderDetail(project) {
  currentProjectId = project.id;
  const fields = [];
  if (project.description) fields.push({ label: 'Description', value: project.description });
  if (project.timeline) fields.push({ label: 'Timeline', value: project.timeline });
  if (project.link) fields.push({ label: 'Link', value: project.link, link: true });
  if (project.tech_stack) fields.push({ label: 'Tech stack', value: project.tech_stack });

  const tags = (project.tags && project.tags.length) ? project.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('') : '';
  let imagesHtml = '';
  if (project.images && project.images.length) {
    imagesHtml = `
      <div class="field">
        <div class="field-label">Images</div>
        <div class="images">
          ${project.images.map((src) => `<img src="${escapeAttr(src)}" alt="" data-src="${escapeAttr(src)}">`).join('')}
        </div>
      </div>
    `;
  }

  const createdByLine = project.created_by_username ? `<p class="created-by">Created by ${escapeHtml(project.created_by_username)}</p>` : '';
  detailContent.innerHTML = `
    <h2>${project.featured ? '<span class="featured-star">★</span> ' : ''}${escapeHtml(project.title)}</h2>
    <p class="developer">${escapeHtml(project.developer_name)}</p>
    ${createdByLine}
    ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
    <div class="detail-meta">${statusPill(project.status)}</div>
    ${fields.map((f) => `
      <div class="field">
        <div class="field-label">${escapeHtml(f.label)}</div>
        <div class="field-value">${f.link ? `<a href="${escapeAttr(f.value)}" target="_blank" rel="noopener">${escapeHtml(f.value)}</a>` : escapeHtml(f.value)}</div>
      </div>
    `).join('')}
    ${imagesHtml}
  `;

  detailContent.querySelectorAll('.images img').forEach((img) => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.dataset.src || img.src;
      lightbox.classList.remove('hidden');
      lightbox.setAttribute('aria-hidden', 'false');
    });
  });

  editLink.href = `#/projects/${project.id}/edit`;
  const isAdmin = currentUser && (userRole() === 'admin');
  const canEdit = currentUser && ((project.created_by_user_id == currentUser.id) || isAdmin);
  editLink.classList.toggle('hidden', !canEdit);
  deleteBtn.classList.toggle('hidden', !canEdit);
}

function openDeleteModal() {
  modalOverlay.classList.remove('hidden');
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalConfirm.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.setAttribute('aria-hidden', 'true');
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  lightbox.setAttribute('aria-hidden', 'true');
}

let currentTags = [];
function syncTagsHidden() {
  tagsHidden.value = JSON.stringify(currentTags);
}

function addTag(tag) {
  const t = String(tag).trim();
  if (!t || currentTags.includes(t)) return;
  currentTags.push(t);
  syncTagsHidden();
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.innerHTML = `${escapeHtml(t)} <button type="button" aria-label="Remove tag">×</button>`;
  chip.querySelector('button').addEventListener('click', () => {
    currentTags = currentTags.filter((x) => x !== t);
    syncTagsHidden();
    chip.remove();
  });
  tagsChips.appendChild(chip);
}

function fillForm(project) {
  projectIdInput.value = project.id;
  projectForm.title.value = project.title;
  projectForm.developer_name.value = project.developer_name || '';
  projectForm.description.value = project.description || '';
  projectForm.timeline.value = project.timeline || '';
  projectForm.link.value = project.link || '';
  projectForm.tech_stack.value = project.tech_stack || '';
  projectForm.status.value = project.status || 'published';
  $('featured-checkbox').checked = !!project.featured;
  projectForm.images.value = '';
  currentTags = project.tags && Array.isArray(project.tags) ? [...project.tags] : [];
  syncTagsHidden();
  tagsChips.innerHTML = '';
  currentTags.forEach((t) => addTag(t));
  imagePreviews.innerHTML = '';
}

function clearForm() {
  projectIdInput.value = '';
  projectForm.reset();
  currentTags = [];
  syncTagsHidden();
  tagsChips.innerHTML = '';
  imagePreviews.innerHTML = '';
}

imagesInput.addEventListener('change', () => {
  imagePreviews.innerHTML = '';
  const files = imagesInput.files;
  for (let i = 0; i < files.length; i++) {
    const fr = new FileReader();
    fr.onload = () => {
      const img = document.createElement('img');
      img.className = 'preview';
      img.src = fr.result;
      imagePreviews.appendChild(img);
    };
    fr.readAsDataURL(files[i]);
  }
});

tagsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag(tagsInput.value);
    tagsInput.value = '';
  }
});

function applyFiltersAndLoad() {
  listView.classList.remove('hidden');
  listSkeleton.classList.remove('hidden');
  listContainer.classList.add('hidden');
  listEmpty.classList.add('hidden');
  fetchProjects()
    .then((projects) => {
      renderList(projects);
    })
    .catch(() => {
      listSkeleton.classList.add('hidden');
      listContainer.classList.remove('hidden');
      toast('Failed to load projects', 'error');
    });
}

async function loadList() {
  showView(listView);
  applyFiltersAndLoad();
}

async function loadDetail(id) {
  showView(detailView);
  detailContent.innerHTML = '<p class="sub">Loading…</p>';
  try {
    const project = await fetchProject(id);
    renderDetail(project);
  } catch (e) {
    toast(e.message || 'Failed to load project', 'error');
    window.location.hash = '#/';
    loadList();
  }
}

async function loadAdmin() {
  if (!getToken()) {
    window.location.hash = '#/login';
    return;
  }
  if (userRole() !== 'admin') {
    toast('Only admins can access this page.', 'error');
    window.location.hash = '#/';
    return;
  }
  showView(adminView);
  const tbody = $('admin-users-tbody');
  const loadingEl = $('admin-loading');
  const errorEl = $('admin-error');
  if (tbody) tbody.innerHTML = '';
  if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }
  if (loadingEl) loadingEl.classList.remove('hidden');
  try {
    const res = await fetch(USERS_API, { headers: authHeaders(), method: 'GET' });
    let data;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (res.status === 401 || res.status === 403) {
      if (res.status === 401) clearToken();
      updateHeader();
      toast(data.error || 'Access denied.', 'error');
      window.location.hash = res.status === 401 ? '#/login' : '#/';
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Failed to load users (' + res.status + ')');
    const users = Array.isArray(data) ? data : [];
    if (loadingEl) loadingEl.classList.add('hidden');
    if (tbody) {
      tbody.innerHTML = users.map((u) => {
        const created = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
        return `
          <tr data-user-id="${u.id}">
            <td>${escapeHtml(u.username)}</td>
            <td>
              <select class="user-role-select" data-user-id="${u.id}" aria-label="Role for ${escapeHtml(u.username)}">
                <option value="viewer" ${(u.role || 'viewer') === 'viewer' ? 'selected' : ''}>Viewer</option>
                <option value="developer" ${(u.role || '') === 'developer' ? 'selected' : ''}>Developer</option>
                <option value="admin" ${(u.role || '') === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>${escapeHtml(created)}</td>
            <td><button type="button" class="btn btn-primary btn-sm save-role-btn" data-user-id="${u.id}">Save</button></td>
          </tr>
        `;
      }).join('');
    }
    adminView.querySelectorAll('.save-role-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = parseInt(btn.dataset.userId, 10);
        const row = adminView.querySelector(`tr[data-user-id="${userId}"]`);
        const select = row && row.querySelector('.user-role-select');
        if (!select) return;
        const role = select.value;
        try {
          const r = await fetch(`${USERS_API}/${userId}/role`, {
            method: 'PUT',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || 'Failed to update');
          toast('Role updated.');
        } catch (e) {
          toast(e.message || 'Failed to update role', 'error');
        }
      });
    });
  } catch (e) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) { errorEl.textContent = e.message || 'Failed to load users'; errorEl.classList.remove('hidden'); }
  }
}

async function loadApis() {
  showView(apisView);
  const baseEl = $('api-base-url');
  if (baseEl) baseEl.textContent = window.location.origin + '/api';

  const healthEl = $('api-health-output');
  const projectsEl = $('api-projects-output');
  const meEl = $('api-me-output');
  const usersEl = $('api-users-output');

  if (healthEl) healthEl.querySelector('code').textContent = 'Loading…';
  if (projectsEl) projectsEl.querySelector('code').textContent = 'Loading…';
  if (meEl) meEl.querySelector('code').textContent = 'Loading…';
  if (usersEl) usersEl.querySelector('code').textContent = 'Loading…';

  try {
    const [healthRes, projectsRes] = await Promise.all([
      fetch('/api/health'),
      fetch('/api/projects', { headers: authHeaders() }),
    ]);
    const health = await healthRes.json().catch(() => ({}));
    const projects = await projectsRes.json().catch(() => ({}));
    if (healthEl) healthEl.querySelector('code').textContent = JSON.stringify(health, null, 2);
    if (projectsEl) projectsEl.querySelector('code').textContent = JSON.stringify(projects, null, 2);
  } catch (e) {
    if (healthEl) healthEl.querySelector('code').textContent = 'Error: ' + e.message;
    if (projectsEl) projectsEl.querySelector('code').textContent = 'Error: ' + e.message;
  }

  try {
    if (getToken()) {
      const meRes = await fetch('/api/auth/me', { headers: authHeaders() });
      const me = await meRes.json().catch(() => ({}));
      if (meEl) meEl.querySelector('code').textContent = meRes.ok ? JSON.stringify(me, null, 2) : (me.error || meRes.statusText || 'Unauthorized');
    } else {
      if (meEl) meEl.querySelector('code').textContent = 'Not logged in. Send Authorization: Bearer <token>.';
    }
  } catch (e) {
    if (meEl) meEl.querySelector('code').textContent = 'Error: ' + e.message;
  }

  try {
    const usersRes = await fetch(USERS_API, { headers: authHeaders(), method: 'GET' });
    const usersData = usersRes.ok ? await usersRes.json().catch(() => []) : { error: usersRes.status === 401 ? 'Unauthorized' : usersRes.status === 403 ? 'Forbidden (admin only)' : 'Error ' + usersRes.status };
    if (usersEl) usersEl.querySelector('code').textContent = typeof usersData === 'object' && !Array.isArray(usersData) && usersData.error ? usersData.error : JSON.stringify(usersData, null, 2);
  } catch (e) {
    if (usersEl) usersEl.querySelector('code').textContent = 'Error: ' + e.message;
  }
}

function loadLogin() {
  showView(loginView);
  const err = $('login-error');
  if (err) { err.classList.add('hidden'); err.textContent = ''; }
  $('login-form')?.reset();
}

function loadRegister() {
  showView(registerView);
  const err = $('register-error');
  if (err) { err.classList.add('hidden'); err.textContent = ''; }
  $('register-form')?.reset();
}

async function loadForm(mode, id) {
  showView(formView);
  formTitleEl.textContent = mode === 'edit' ? 'Edit Project' : 'Add Project';
  formBack.href = id ? `#/projects/${id}` : '#/';

  if (mode === 'edit' && id) {
    try {
      const project = await fetchProject(id);
      fillForm(project);
    } catch (e) {
      toast(e.message || 'Failed to load project', 'error');
    }
  } else {
    clearForm();
  }
}

async function submitForm(e) {
  e.preventDefault();
  const form = projectForm;
  const id = projectIdInput.value ? parseInt(projectIdInput.value, 10) : null;
  const isEdit = !!id;

  const formData = new FormData();
  formData.append('title', form.title.value.trim());
  formData.append('developer_name', form.developer_name.value.trim());
  formData.append('description', form.description.value.trim());
  formData.append('timeline', form.timeline.value.trim());
  formData.append('link', form.link.value.trim());
  formData.append('tech_stack', form.tech_stack.value.trim());
  formData.append('status', form.status.value || 'published');
  formData.append('featured', $('featured-checkbox').checked ? '1' : '0');
  formData.append('tags', JSON.stringify(currentTags));

  const files = form.images.files;
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }

  if (isEdit) {
    const project = await fetchProject(id);
    formData.append('keep_images', JSON.stringify(project.images || []));
  }

  try {
    const url = isEdit ? `${API}/${id}` : API;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders(), body: formData });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearToken();
      updateHeader();
      toast(data.error || 'Please log in again.', 'error');
      window.location.hash = '#/login';
      return;
    }
    if (res.status === 403) {
      toast(data.error || 'You do not have permission to edit this project.', 'error');
      return;
    }
    if (!res.ok) throw new Error(data.error || res.statusText);
    toast(isEdit ? 'Project updated.' : 'Project created.');
    window.location.hash = isEdit ? `#/projects/${id}` : '#/';
    if (isEdit) loadDetail(id);
    else loadList();
  } catch (err) {
    toast(err.message || 'Failed to save project', 'error');
  }
}

function doDelete() {
  if (!currentProjectId) return;
  closeModal();
  fetch(`${API}/${currentProjectId}`, { method: 'DELETE', headers: authHeaders() })
    .then(async (res) => {
      const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearToken();
        updateHeader();
        toast(data.error || 'Please log in again.', 'error');
        window.location.hash = '#/login';
        return;
      }
      if (res.status === 403) {
        toast(data.error || 'Only the creator can delete this project.', 'error');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast('Project deleted.');
      window.location.hash = '#/';
      loadList();
    })
    .catch((err) => toast(err.message || 'Failed to delete project', 'error'));
}

function route() {
  const { view, mode, id } = parseHash();
  const token = getToken();
  const publicViews = ['login', 'register'];
  if (!publicViews.includes(view) && !token) {
    window.location.hash = '#/login';
    return;
  }
  if (view === 'login') loadLogin();
  else if (view === 'register') loadRegister();
  else if (view === 'admin') loadAdmin();
  else if (view === 'list') loadList();
  else if (view === 'apis') {
    if (userRole() !== 'admin') {
      toast('Only admins can view the API reference.', 'error');
      window.location.hash = '#/';
      return;
    }
    loadApis();
  }
  else if (view === 'detail' && id) loadDetail(id);
  else if (view === 'form') {
    if (userRole() !== 'developer' && userRole() !== 'admin') {
      toast('Only developers and admins can create or edit projects.', 'error');
      window.location.hash = '#/';
      return;
    }
    loadForm(mode, id);
  } else loadList();
}

function setViewMode(mode) {
  listViewMode = mode;
  if (listViewMode === 'grid') {
    viewListBtn.classList.remove('active');
    viewGridBtn.classList.add('active');
    projectList.classList.add('hidden');
    projectGrid.classList.remove('hidden');
  } else {
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    projectList.classList.remove('hidden');
    projectGrid.classList.add('hidden');
  }
}

function initTheme() {
  const saved = localStorage.getItem('project-portal-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isLight = saved === 'light' || (saved !== 'dark' && !prefersDark);
  if (isLight) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeToggle) themeToggle.textContent = isLight ? '🌙' : '☀️';
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  if (themeToggle) themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
  localStorage.setItem('project-portal-theme', next);
}

window.addEventListener('hashchange', route);
window.addEventListener('load', async () => {
  initTheme();
  const token = getToken();
  if (token) {
    try {
      currentUser = await fetchMe();
      if (!currentUser) clearToken();
    } catch {
      clearToken();
    }
  }
  updateHeader();
  route();
});

$('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const err = $('login-error');
  err.classList.add('hidden');
  try {
    const res = await fetch(AUTH_API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.error || 'Login failed';
      err.classList.remove('hidden');
      return;
    }
    setToken(data.token);
    currentUser = data.user;
    updateHeader();
    toast('Logged in.');
    window.location.hash = '#/';
    loadList();
  } catch (e) {
    err.textContent = e.message || 'Login failed';
    err.classList.remove('hidden');
  }
});

$('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const err = $('register-error');
  err.classList.add('hidden');
  try {
    const res = await fetch(AUTH_API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      err.textContent = data.error || 'Registration failed';
      err.classList.remove('hidden');
      return;
    }
    setToken(data.token);
    currentUser = data.user;
    updateHeader();
    toast('Account created.');
    window.location.hash = '#/';
    loadList();
  } catch (e) {
    err.textContent = e.message || 'Registration failed';
    err.classList.remove('hidden');
  }
});

$('nav-logout')?.addEventListener('click', () => {
  clearToken();
  updateHeader();
  toast('Logged out.');
  window.location.hash = '#/login';
  loadLogin();
});

globalSearch.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFiltersAndLoad, 300);
});
sortSelect.addEventListener('change', applyFiltersAndLoad);
filterStatus.addEventListener('change', applyFiltersAndLoad);
filterFeatured.addEventListener('change', applyFiltersAndLoad);

viewListBtn.addEventListener('click', () => setViewMode('list'));
viewGridBtn.addEventListener('click', () => setViewMode('grid'));

themeToggle.addEventListener('click', toggleTheme);

projectForm.addEventListener('submit', submitForm);
deleteBtn.addEventListener('click', openDeleteModal);
modalCancel.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', doDelete);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeLightbox();
  }
});

shareBtn.addEventListener('click', () => {
  const url = window.location.origin + window.location.pathname + '#/projects/' + currentProjectId;
  navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard.')).catch(() => toast('Could not copy link', 'error'));
});
