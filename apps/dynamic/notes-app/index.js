// apps/dynamic/notes-app/index.js
// ─────────────────────────────────────────────
// Example dynamic app: Notes
//
// This demonstrates how a dynamic app plugs into
// the Kuzielum platform. It receives the shared
// mongoose instance and creates its own model
// and collection in the central database.
//
// Export pattern: function(mongoose) => Router
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');

module.exports = function (mongoose) {
  const router = express.Router();

  // ── Define this app's own schema in the shared DB ──
  const noteSchema = new mongoose.Schema({
    title:   { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    color:   { type: String, default: '#ffffff' }
  }, { timestamps: true });

  // Prefix the model name to avoid collisions with other dynamic apps
  const Note = mongoose.models.NotesApp_Note || mongoose.model('NotesApp_Note', noteSchema);

  // ── Views: serve HTML for the notes UI ──
  router.get('/', async (req, res) => {
    try {
      const notes = await Note.find().sort({ updatedAt: -1 });
      // Serve a self-contained HTML page
      res.send(renderPage(notes));
    } catch (err) {
      res.status(500).send('Error loading notes: ' + err.message);
    }
  });

  // ── API: CRUD endpoints ──
  router.post('/notes', async (req, res) => {
    try {
      const note = await Note.create({
        title: req.body.title || 'Untitled',
        content: req.body.content || '',
        color: req.body.color || '#ffffff'
      });
      res.redirect(req.baseUrl);
    } catch (err) {
      res.status(400).send('Error creating note: ' + err.message);
    }
  });

  router.post('/notes/:id/delete', async (req, res) => {
    try {
      await Note.findByIdAndDelete(req.params.id);
      res.redirect(req.baseUrl);
    } catch (err) {
      res.status(400).send('Error deleting note: ' + err.message);
    }
  });

  // JSON API for programmatic access
  router.get('/api/notes', async (req, res) => {
    const notes = await Note.find().sort({ updatedAt: -1 });
    res.json({ success: true, data: notes });
  });

  router.post('/api/notes', async (req, res) => {
    try {
      const note = await Note.create(req.body);
      res.status(201).json({ success: true, data: note });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/api/notes/:id', async (req, res) => {
    try {
      await Note.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
};

// ── Self-contained HTML renderer ──
function renderPage(notes) {
  const noteCards = notes.map(n => `
    <div class="note" style="border-left: 4px solid ${n.color}">
      <div class="note__header">
        <h3>${escHtml(n.title)}</h3>
        <form method="POST" action="/apps/notes-app/notes/${n._id}/delete" style="margin:0">
          <button type="submit" class="note__delete" title="Delete">&times;</button>
        </form>
      </div>
      <p>${escHtml(n.content)}</p>
      <time>${new Date(n.updatedAt).toLocaleDateString()}</time>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notes App — Kuzielum</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #f6f4f0;
      color: #1a1a1f;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 720px; margin: 0 auto; }
    .back { color: #e85d26; text-decoration: none; font-size: 0.85rem; display: inline-block; margin-bottom: 24px; }
    .back:hover { text-decoration: underline; }
    h1 { font-size: 2rem; margin-bottom: 8px; }
    .subtitle { color: #5c5c66; margin-bottom: 32px; font-size: 0.95rem; }

    .form-card {
      background: #fff;
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .form-card input, .form-card textarea {
      width: 100%;
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 8px;
      padding: 10px 14px;
      font-family: inherit;
      font-size: 0.9rem;
      margin-bottom: 12px;
      background: #faf9f7;
    }
    .form-card textarea { min-height: 80px; resize: vertical; }
    .form-card input:focus, .form-card textarea:focus {
      outline: none;
      border-color: #e85d26;
      box-shadow: 0 0 0 3px rgba(232,93,38,0.1);
    }
    .form-row { display: flex; gap: 12px; align-items: center; }
    .form-row input[type="color"] {
      width: 42px; height: 42px; padding: 2px; border-radius: 8px;
      cursor: pointer; flex-shrink: 0;
    }
    .btn {
      background: #e85d26;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #d14e1c; }

    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .note {
      background: #fff;
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 12px;
      padding: 20px;
    }
    .note__header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    .note__header h3 { font-size: 1.05rem; }
    .note__delete {
      background: none; border: none; font-size: 1.3rem;
      color: #9495a0; cursor: pointer; line-height: 1;
    }
    .note__delete:hover { color: #e85d26; }
    .note p { color: #5c5c66; font-size: 0.88rem; line-height: 1.5; margin-bottom: 12px; }
    .note time { font-size: 0.75rem; color: #9495a0; }

    .empty { text-align: center; padding: 48px 20px; color: #9495a0; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">← Back to Kuzielum</a>
    <h1>Notes App</h1>
    <p class="subtitle">A dynamic app powered by MongoDB — create, read, and delete notes.</p>

    <div class="form-card">
      <form method="POST" action="/apps/notes-app/notes">
        <input type="text" name="title" placeholder="Note title..." required>
        <textarea name="content" placeholder="Write something..."></textarea>
        <div class="form-row">
          <input type="color" name="color" value="#e85d26">
          <button type="submit" class="btn">Add Note</button>
        </div>
      </form>
    </div>

    ${notes.length > 0
      ? `<div class="notes-grid">${noteCards}</div>`
      : `<div class="empty"><p>No notes yet. Create your first one above!</p></div>`
    }
  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
