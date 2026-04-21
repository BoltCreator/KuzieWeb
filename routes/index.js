// routes/index.js
// ─────────────────────────────────────────────
// Homepage route — fetches all active apps from
// MongoDB and renders the showcase page.
// ─────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const App = require('../models/App');

router.get('/', async (req, res) => {
  try {
    const apps = await App.find({ active: true }).sort({ order: 1, createdAt: -1 });
    res.render('index', {
      apps: apps.map(a => a.toObject()),
      title: 'Kuzielum —  A collection of web apps'
    });
  } catch (err) {
    console.error('Homepage error:', err.message);
    res.render('index', { apps: [], title: 'Kuzielum —  A collection of web apps' });
  }
});

module.exports = router;
