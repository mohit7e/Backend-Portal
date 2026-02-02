const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { upload } = require('../middleware/upload');
const { authMiddleware, requireRole } = require('../middleware/auth');

// List projects with optional search, tag, status, featured, sort
router.get('/', (req, res) => {
  try {
    const { search, tag, status, featured, sort } = req.query;
    const projects = db.listProjects({ search, tag, status, featured, sort });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single project by id (full detail page)
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });
    const project = db.getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create project (requires auth + developer or admin role; supports multipart)
router.post('/', authMiddleware, requireRole('developer', 'admin'), upload.array('images', 20), (req, res) => {
  try {
    const body = req.body || {};
    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const data = {
      title: body.title,
      developer_name: body.developer_name,
      description: body.description,
      timeline: body.timeline,
      link: body.link,
      tech_stack: body.tech_stack,
      images,
      tags: body.tags ? JSON.parse(body.tags) : [],
      featured: body.featured === 'true' || body.featured === '1',
      status: body.status || 'published',
      created_by_user_id: req.user.id,
      created_by_username: req.user.username,
    };
    const project = db.createProject(data);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Only the creator or an admin can edit or delete
function canEditOrDelete(project, user) {
  if (user.role === 'admin') return true;
  if (project.created_by_user_id == null) return false;
  return project.created_by_user_id === user.id;
}

// Update project — accepts JSON or multipart (with optional new images); creator or admin only
const putHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });
    const existing = db.getProjectById(id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    if (!canEditOrDelete(existing, req.user)) {
      return res.status(403).json({ error: 'Only the person who created this project or an admin can edit it' });
    }

    const body = req.body || {};
    const isJson = req.is('application/json');
    let images = existing.images;

    if (isJson) {
      if (body.images !== undefined) images = Array.isArray(body.images) ? body.images : existing.images;
      const data = {
        title: body.title ?? existing.title,
        developer_name: body.developer_name ?? existing.developer_name,
        description: body.description ?? existing.description,
        timeline: body.timeline ?? existing.timeline,
        link: body.link ?? existing.link,
        tech_stack: body.tech_stack ?? existing.tech_stack,
        images,
        tags: body.tags !== undefined ? body.tags : (existing.tags || []),
        featured: body.featured !== undefined ? !!body.featured : !!existing.featured,
        status: body.status ?? existing.status ?? 'published',
      };
      const project = db.updateProject(id, data);
      return res.json(project);
    }

    const newImages = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const keepImages = body.keep_images ? JSON.parse(body.keep_images) : existing.images;
    images = Array.isArray(keepImages) ? [...keepImages, ...newImages] : newImages;

    const data = {
      title: body.title ?? existing.title,
      developer_name: body.developer_name ?? existing.developer_name,
      description: body.description ?? existing.description,
      timeline: body.timeline ?? existing.timeline,
      link: body.link ?? existing.link,
      tech_stack: body.tech_stack ?? existing.tech_stack,
      images,
      tags: body.tags ? JSON.parse(body.tags) : (existing.tags || []),
      featured: body.featured !== undefined ? (body.featured === 'true' || body.featured === '1') : !!existing.featured,
      status: (body.status && body.status.trim()) ? body.status.trim() : (existing.status || 'published'),
    };
    const project = db.updateProject(id, data);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.put('/:id', authMiddleware, (req, res, next) => {
  if (req.is('application/json')) return putHandler(req, res);
  upload.array('images', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    putHandler(req, res);
  });
});

// Delete project (requires auth; creator only)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });
    const project = db.getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canEditOrDelete(project, req.user)) {
      return res.status(403).json({ error: 'Only the person who created this project or an admin can delete it' });
    }
    const deleted = db.deleteProject(id);
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
