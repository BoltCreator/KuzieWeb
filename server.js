// server.js
// ─────────────────────────────────────────────
// Kuzielum — Killer Web Apps Platform
// ─────────────────────────────────────────────
// An Express.js server that:
//  1. Serves a beautiful showcase homepage
//  2. Hosts static web apps (HTML/CSS/JS)
//  3. Mounts dynamic Express sub-apps with
//     shared MongoDB access
//  4. Provides a REST API for managing apps
// ─────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { connectDB } = require('./config/database');
const { loadApps } = require('./middleware/appLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// ── View engine ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Core middleware ──
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static assets ──
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ── Routes ──
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/api'));

// ── Boot sequence ──
async function boot() {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║     KUZIELUM — Killer Web Apps       ║');
  console.log('  ╚══════════════════════════════════════╝\n');

  // Guard: ensure MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('  ✗ MONGODB_URI environment variable is not set!');
    console.error('  → Set it in your hosting provider\'s dashboard (e.g. Railway Variables tab)');
    process.exit(1);
  }

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Sync seed apps to database (upsert on every boot)
  const App = require('./models/App');
  const { seedApps } = require('./seed');
  let synced = 0;
  for (const appData of seedApps) {
    await App.findOneAndUpdate(
      { slug: appData.slug },
      { $set: { ...appData, active: appData.active !== false } },
      { upsert: true, new: true }
    );
    synced++;
  }
  console.log(`  ✓ Synced ${synced} app(s) from seed data`);

  // 3. Set up sessions (after DB is confirmed available)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'kuzielum-dev-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // 3. Load and mount all registered apps
  await loadApps(app);

  // 4. Start listening
  app.listen(PORT, () => {
    console.log(`\n  ✓ Server running at http://localhost:${PORT}`);
    console.log(`  ✓ API available at http://localhost:${PORT}/api/apps`);
    console.log(`  ✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

boot().catch(err => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});

module.exports = app;
