// config/database.js
// ─────────────────────────────────────────────
// Central MongoDB connection.
// Dynamic apps can import this to share the same
// database connection and create their own collections.
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Modern mongoose defaults are good — no need for deprecated options
    });
    console.log(`  ✓ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`  ✗ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };
