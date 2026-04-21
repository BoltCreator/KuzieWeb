// seed.js
// ─────────────────────────────────────────────
// Seeds the database with example web apps.
// Run: npm run seed
// ─────────────────────────────────────────────

require('dotenv').config();
const { connectDB, mongoose } = require('./config/database');
const App = require('./models/App');

const seedApps = [
  {
    title: 'Vector Designer',
    slug: 'designing',
    description: 'Design your graphics using this awesome application',
    category: 'Website',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 1,
    folder: 'vector-designer',
    pattern: 'grid',
    order: 1
  },
  {
    title: 'Kinematic Simulator',
    slug: 'simulating',
    description: 'Create 2d mechanical designs and simulators',
    category: 'Website',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 1,
    folder: 'kinematic-simulator',
    pattern: 'grid',
    order: 2
  },
  {
    title: 'Chess',
    slug: 'chess',
    description: 'Play chess against an AI engine with various difficulty levels',
    category: 'Gaming',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 1,
    folder: 'chess',
    pattern: 'grid',
    order: 3
  },
  {
    title: 'X and O',
    slug: 'gaming',
    description: 'Play x and o against the computer',
    category: 'Gaming',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 1,
    folder: 'x-and-o',
    pattern: 'grid',
    order: 4
  },
  {
    title: 'Game of Life',
    slug: 'sim',
    description: 'Cellular Automation Simulator',
    category: 'Gaming',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 1,
    folder: 'game-of-life',
    pattern: 'grid',
    order: 5
  },
  /*
  {
    title: 'Landing Page',
    slug: 'landing-page',
    description: 'A conversion-focused landing page with smooth scroll animations and a bold visual identity.',
    category: 'Landing',
    type: 'static',
    tech: ['HTML', 'CSS'],
    pages: 1,
    folder: 'landing-page',
    pattern: 'dots',
    order: 6
  },
  {
    title: 'Interactive Quiz',
    slug: 'interactive-quiz',
    description: 'A multi-step quiz application with score tracking, timed rounds, and dynamic result pages.',
    category: 'App',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 3,
    folder: 'interactive-quiz',
    pattern: 'circles',
    order: 7
  },
  {
    title: 'Notes App',
    slug: 'notes-app',
    description: 'A full-stack notes application powered by MongoDB. Create, edit, and delete notes with rich text support.',
    category: 'App',
    type: 'dynamic',
    tech: ['Express', 'MongoDB', 'EJS'],
    pages: 3,
    folder: 'notes-app',
    entryFile: 'index.js',
    usesDatabase: true,
    pattern: 'diagonal',
    order: 8
  }
  */
];

// ── Export for auto-seed in server.js ──
module.exports = { seedApps };

// ── Run standalone: npm run seed ──
if (require.main === module) {
  async function seed() {
    await connectDB();

    console.log('  Clearing existing apps...');
    await App.deleteMany({});

    console.log('  Seeding example apps...');
    const created = await App.insertMany(seedApps);

    console.log(`  ✓ Seeded ${created.length} apps:`);
    created.forEach(a => console.log(`    • ${a.title} (${a.type})`));

    await mongoose.connection.close();
    console.log('  ✓ Done.\n');
  }

  seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
