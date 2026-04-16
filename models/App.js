// models/App.js
// ─────────────────────────────────────────────
// Schema for web apps registered on the platform.
// Supports both static (HTML/CSS/JS) and dynamic (Express
// sub-apps with MongoDB access) application types.
// ─────────────────────────────────────────────
 
const mongoose = require('mongoose');
 
const appSchema = new mongoose.Schema({
  // Display info
  title: {
    type: String,
    required: [true, 'App title is required'],
    trim: true,
    maxlength: 120
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'Website'
  },
 
  // Type: 'static' = served as flat files, 'dynamic' = Express sub-app with DB
  type: {
    type: String,
    enum: ['static', 'dynamic'],
    default: 'static'
  },
 
  // Tech stack tags shown on the card
  tech: {
    type: [String],
    default: ['HTML', 'CSS', 'JS']
  },
 
  // Number of pages (for display)
  pages: {
    type: Number,
    default: 1,
    min: 1
  },
 
  // Thumbnail image path (relative to /public/uploads/)
  thumbnail: {
    type: String,
    default: null
  },
 
  // Optional custom SVG markup for the card preview
  // When set, this renders instead of the live snapshot or pattern
  svgIcon: {
    type: String,
    default: null
  },
 
  // Placeholder pattern when no thumbnail: grid | dots | diagonal | circles
  pattern: {
    type: String,
    enum: ['grid', 'dots', 'diagonal', 'circles'],
    default: 'grid'
  },
 
  // For static apps: folder name inside /apps/static/
  // For dynamic apps: folder name inside /apps/dynamic/
  folder: {
    type: String,
    required: true
  },
 
  // For dynamic apps: the entry module filename (default: index.js)
  // This module should export an Express router
  entryFile: {
    type: String,
    default: 'index.js'
  },
 
  // Whether the app needs its own MongoDB collections
  usesDatabase: {
    type: Boolean,
    default: false
  },
 
  // Visibility
  active: {
    type: Boolean,
    default: true
  },
 
  // Ordering
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
 
// Virtual: build the URL path for this app
appSchema.virtual('url').get(function () {
  return `/apps/${this.slug}`;
});
 
// Virtual: build the thumbnail URL
appSchema.virtual('thumbnailUrl').get(function () {
  if (!this.thumbnail) return null;
  return `/uploads/${this.thumbnail}`;
});
 
// Ensure virtuals are included in JSON
appSchema.set('toJSON', { virtuals: true });
appSchema.set('toObject', { virtuals: true });
 
module.exports = mongoose.model('App', appSchema);