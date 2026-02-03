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

function listProjects(opts = {}) {
  const store = readStore();
  let list = store.projects.map((p) => ({
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
  }));

  const { search, tag, status: statusFilter, featured, sort = 'date' } = opts;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.developer_name && p.developer_name.toLowerCase().includes(q))
    );
  }
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
