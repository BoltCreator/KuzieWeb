// middleware/appLoader.js
// ─────────────────────────────────────────────
// Dynamically loads and mounts all registered apps.
//
//  • Static apps  → served as flat files via express.static
//  • Dynamic apps → require() their entry file which must
//    export an Express Router. They receive the shared
//    mongoose instance so they can create their own models
//    and collections in the central database.
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');
const App = require('../models/App');
const { mongoose } = require('../config/database');

/**
 * Mounts all active apps onto the Express application.
 * Call this after DB connection is established.
 *
 * @param {express.Application} app - The main Express app
 */
async function loadApps(app) {
  try {
    const registeredApps = await App.find({ active: true }).sort({ order: 1 });
    let staticCount = 0;
    let dynamicCount = 0;

    for (const entry of registeredApps) {
      const mountPath = `/apps/${entry.slug}`;

      if (entry.type === 'static') {
        // ── Static app: serve the folder as flat files ──
        const staticDir = path.join(__dirname, '..', 'apps', 'static', entry.folder);

        if (fs.existsSync(staticDir)) {
          app.use(mountPath, express.static(staticDir));
          staticCount++;
        } else {
          console.warn(`  ⚠ Static app "${entry.title}" folder not found: ${staticDir}`);
        }

      } else if (entry.type === 'dynamic') {
        // ── Dynamic app: require its router module ──
        const appDir = path.join(__dirname, '..', 'apps', 'dynamic', entry.folder);
        const entryPath = path.join(appDir, entry.entryFile || 'index.js');

        if (fs.existsSync(entryPath)) {
          try {
            const appModule = require(entryPath);

            // The dynamic app module can export:
            //  • A plain Router
            //  • A function(mongoose) => Router (if it needs DB)
            //  • An object { router, init } where init(mongoose) is async setup

            let router;

            if (typeof appModule === 'function') {
              // Could be a router or a factory function
              if (appModule.length >= 1) {
                // Factory: pass shared mongoose so app can define its own models
                router = appModule(mongoose);
              } else {
                router = appModule;
              }
            } else if (appModule.router) {
              // Object with { router, init? }
              if (typeof appModule.init === 'function') {
                await appModule.init(mongoose);
              }
              router = appModule.router;
            } else {
              router = appModule;
            }

            // Serve static assets from the dynamic app's /public subfolder
            const publicDir = path.join(appDir, 'public');
            if (fs.existsSync(publicDir)) {
              app.use(mountPath, express.static(publicDir));
            }

            app.use(mountPath, router);
            dynamicCount++;
          } catch (err) {
            console.error(`  ✗ Failed to load dynamic app "${entry.title}":`, err.message);
          }
        } else {
          console.warn(`  ⚠ Dynamic app "${entry.title}" entry not found: ${entryPath}`);
        }
      }
    }

    console.log(`  ✓ Apps loaded: ${staticCount} static, ${dynamicCount} dynamic`);
    return registeredApps;
  } catch (err) {
    console.error('  ✗ App loader error:', err.message);
    return [];
  }
}

module.exports = { loadApps };
