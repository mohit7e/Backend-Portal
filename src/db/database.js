const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const storePath = path.join(dataDir, 'projects.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readStore() {
  ensureDataDir();
  if (!fs.existsSync(storePath)) {
    return { nextId: 1, projects: [] };
  }
  const raw = fs.readFileSync(storePath, 'utf8');
  return JSON.parse(raw);
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

// Search across all text fields and attachment names; return match info for snippet/highlighting
function projectMatchesSearch(project, qLower) {
  const str = (v) => (v != null && String(v).toLowerCase().includes(qLower));
  const title = (project.title || '').toLowerCase();
  const dev = (project.developer_name || '').toLowerCase();
  const desc = (project.description || '').toLowerCase();
  const timeline = (project.timeline || '').toLowerCase();
  const link = (project.link || '').toLowerCase();
  const tech = (project.tech_stack || '').toLowerCase();
  const createdBy = (project.created_by_username || '').toLowerCase();
  if (title.includes(qLower)) return { field: 'title', preview: project.title || '' };
  if (dev.includes(qLower)) return { field: 'developer', preview: project.developer_name || '' };
  if (desc.includes(qLower)) {
    const idx = desc.indexOf(qLower);
    const start = Math.max(0, idx - 35);
    const end = Math.min((project.description || '').length, idx + qLower.length + 35);
    let preview = (project.description || '').slice(start, end);
    if (start > 0) preview = '…' + preview;
    if (end < (project.description || '').length) preview += '…';
    return { field: 'description', preview };
  }
  if (timeline.includes(qLower)) return { field: 'timeline', preview: project.timeline || '' };
  if (link.includes(qLower)) return { field: 'link', preview: project.link || '' };
  if (tech.includes(qLower)) return { field: 'tech stack', preview: project.tech_stack || '' };
  if (createdBy.includes(qLower)) return { field: 'created by', preview: project.created_by_username || '' };
  const tags = project.tags || [];
  for (let i = 0; i < tags.length; i++) {
    if (String(tags[i]).toLowerCase().includes(qLower)) return { field: 'tag', preview: String(tags[i]) };
  }
  const attachments = project.attachments || [];
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const name = (a && typeof a === 'object' && a.name) ? a.name : (typeof a === 'string' ? a.split('/').pop() : '');
    if (name && name.toLowerCase().includes(qLower)) return { field: 'attachment', preview: name };
  }
  // Image file names (stored as URLs like /uploads/filename.ext)
  const images = project.images || [];
  for (let i = 0; i < images.length; i++) {
    const url = typeof images[i] === 'string' ? images[i] : '';
    const fileName = url.split('/').pop() || '';
    if (fileName && fileName.toLowerCase().includes(qLower)) return { field: 'image', preview: fileName };
  }
  return null;
}

function listProjects(opts = {}) {
  const store = readStore();
  const { search, tag, status: statusFilter, featured, sort = 'date' } = opts;
  const q = search && search.trim() ? search.trim().toLowerCase() : '';

  // When searching, filter by full project and attach match info
  let projects = store.projects;
  if (q) {
    projects = projects.filter((p) => projectMatchesSearch(p, q));
  }

  let list = projects.map((p) => {
    const item = {
      id: p.id,
      title: p.title,
      developer_name: p.developer_name,
      created_at: p.created_at,
      updated_at: p.updated_at,
      tags: p.tags || [],
      featured: !!p.featured,
      status: p.status || 'published',
      images: p.images || [],
      attachments: p.attachments || [],
      display_image_index: p.display_image_index ?? 0,
      created_by_user_id: p.created_by_user_id ?? null,
      created_by_username: p.created_by_username ?? null,
    };
    if (q) {
      const match = projectMatchesSearch(p, q);
      if (match) {
        item.match_field = match.field;
        item.match_preview = match.preview;
      }
    }
    return item;
  });

  if (tag && tag.trim()) {
    const t = tag.trim().toLowerCase();
    list = list.filter((p) => Array.isArray(p.tags) && p.tags.some((x) => String(x).toLowerCase() === t));
  }
  if (statusFilter && statusFilter.trim()) {
    list = list.filter((p) => (p.status || 'published') === statusFilter.trim());
  }
  if (featured === true || featured === '1') {
    list = list.filter((p) => p.featured);
  }

  if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else if (sort === 'developer') list.sort((a, b) => (a.developer_name || '').localeCompare(b.developer_name || ''));
  else list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  return list;
}

function getProjectById(id) {
  const store = readStore();
  const project = store.projects.find((p) => p.id === id);
  if (!project) return null;
  return {
    ...project,
    images: project.images || [],
    attachments: project.attachments || [],
    display_image_index: project.display_image_index ?? 0,
    tags: project.tags || [],
    featured: !!project.featured,
    status: project.status || 'published',
    created_by_user_id: project.created_by_user_id ?? null,
    created_by_username: project.created_by_username ?? null,
  };
}

function createProject(data) {
  const store = readStore();
  const id = store.nextId++;
  const now = new Date().toISOString();
  const project = {
    id,
    title: data.title || '',
    developer_name: data.developer_name || '',
    description: data.description || '',
    timeline: data.timeline || '',
    link: data.link || '',
    tech_stack: data.tech_stack || '',
    images: data.images || [],
    attachments: data.attachments || [],
    display_image_index: (() => { const imgs = data.images || []; const idx = parseInt(data.display_image_index, 10) || 0; return Math.max(0, Math.min(idx, (imgs.length - 1) || 0)); })(),
    tags: data.tags || [],
    featured: !!data.featured,
    status: data.status || 'published',
    created_by_user_id: data.created_by_user_id ?? null,
    created_by_username: data.created_by_username ?? null,
    created_at: now,
    updated_at: now,
  };
  store.projects.push(project);
  writeStore(store);
  return getProjectById(id);
}

function updateProject(id, data) {
  const store = readStore();
  const index = store.projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const existing = store.projects[index];
  const images = data.images !== undefined ? data.images : existing.images;
  const display_image_index = data.display_image_index !== undefined
    ? Math.max(0, Math.min(parseInt(data.display_image_index, 10) || 0, (images.length - 1) || 0))
    : (existing.display_image_index ?? 0);
  const project = {
    ...existing,
    title: data.title ?? existing.title,
    developer_name: data.developer_name ?? existing.developer_name,
    description: data.description ?? existing.description,
    timeline: data.timeline ?? existing.timeline,
    link: data.link ?? existing.link,
    tech_stack: data.tech_stack ?? existing.tech_stack,
    images,
    attachments: data.attachments !== undefined ? data.attachments : (existing.attachments || []),
    display_image_index,
    tags: data.tags !== undefined ? data.tags : (existing.tags || []),
    featured: data.featured !== undefined ? !!data.featured : !!existing.featured,
    status: data.status ?? existing.status ?? 'published',
    created_by_user_id: existing.created_by_user_id ?? null,
    created_by_username: existing.created_by_username ?? null,
    updated_at: new Date().toISOString(),
  };
  store.projects[index] = project;
  writeStore(store);
  return getProjectById(id);
}

function deleteProject(id) {
  const store = readStore();
  const index = store.projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  store.projects.splice(index, 1);
  writeStore(store);
  return true;
}

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
