// routes/api.js
// ─────────────────────────────────────────────
// REST API for managing killer web apps.
//
//  GET    /api/apps          — List all apps
//  GET    /api/apps/:slug    — Get single app
//  POST   /api/apps          — Register a new app
//  PUT    /api/apps/:slug    — Update an app
//  DELETE /api/apps/:slug    — Delete an app
// ─────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const App = require('../models/App');
const upload = require('../middleware/upload');

// List all apps
router.get('/apps', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const apps = await App.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single app by slug
router.get('/apps/:slug', async (req, res) => {
  try {
    const app = await App.findOne({ slug: req.params.slug });
    if (!app) return res.status(404).json({ success: false, error: 'App not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register a new app
router.post('/apps', upload.single('thumbnail'), async (req, res) => {
  try {
    const data = { ...req.body };

    // Parse arrays sent as JSON strings
    if (typeof data.tech === 'string') {
      try { data.tech = JSON.parse(data.tech); } catch { data.tech = data.tech.split(',').map(s => s.trim()); }
    }

    // Handle thumbnail upload
    if (req.file) {
      data.thumbnail = req.file.filename;
    }

    // Parse boolean
    if (typeof data.usesDatabase === 'string') {
      data.usesDatabase = data.usesDatabase === 'true';
    }
    if (typeof data.active === 'string') {
      data.active = data.active === 'true';
    }

    const app = await App.create(data);
    res.status(201).json({ success: true, data: app });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'An app with that slug already exists' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update an app
router.put('/apps/:slug', upload.single('thumbnail'), async (req, res) => {
  try {
    const data = { ...req.body };

    if (typeof data.tech === 'string') {
      try { data.tech = JSON.parse(data.tech); } catch { data.tech = data.tech.split(',').map(s => s.trim()); }
    }
    if (req.file) {
      data.thumbnail = req.file.filename;
    }
    if (typeof data.usesDatabase === 'string') {
      data.usesDatabase = data.usesDatabase === 'true';
    }
    if (typeof data.active === 'string') {
      data.active = data.active === 'true';
    }

    const app = await App.findOneAndUpdate(
      { slug: req.params.slug },
      data,
      { new: true, runValidators: true }
    );
    if (!app) return res.status(404).json({ success: false, error: 'App not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete an app
router.delete('/apps/:slug', async (req, res) => {
  try {
    const app = await App.findOneAndDelete({ slug: req.params.slug });
    if (!app) return res.status(404).json({ success: false, error: 'App not found' });
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await App.distinct('category', { active: true });
    res.json({ success: true, data: ['All', ...categories] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
