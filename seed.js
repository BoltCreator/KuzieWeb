// seed.js
// ─────────────────────────────────────────────
// Seeds the database with example killer web apps.
// Run: npm run seed
// ─────────────────────────────────────────────

require('dotenv').config();
const { connectDB, mongoose } = require('./config/database');
const App = require('./models/App');

const seedApps = [
  {
    title: 'Portfolio Site',
    slug: 'portfolio-site',
    description: 'A clean, responsive personal portfolio showcasing work, skills, and contact info across multiple pages.',
    category: 'Website',
    type: 'static',
    tech: ['HTML', 'CSS', 'JS'],
    pages: 4,
    folder: 'portfolio-site',
    pattern: 'grid',
    order: 1
  },
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
    order: 2
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
    order: 3
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
    order: 4
  }
];

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
