// main.js — Client-side rendering for Kuzielum showcase
// ─────────────────────────────────────────────────
// APPS is injected by the server into a <script> tag
// before this file loads.
// ─────────────────────────────────────────────────

const patterns = ['pattern-grid', 'pattern-dots', 'pattern-diagonal', 'pattern-circles'];
const icons = ['◆', '◇', '△', '○', '□', '⬡'];

function getCategories() {
  const cats = [...new Set(APPS.map(a => a.category))];
  return ['All', ...cats];
}

function renderFilters() {
  const container = document.getElementById('filters');
  if (!container) return;

  const categories = getCategories();
  container.innerHTML = categories.map((cat, i) => `
    <button class="filter-btn${i === 0 ? ' active' : ''}" data-category="${cat}">${cat}</button>
  `).join('');

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(btn.dataset.category);
    });
  });
}

function renderGrid(filter = 'All') {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  const filtered = filter === 'All' ? APPS : APPS.filter(a => a.category === filter);
  const countEl = document.getElementById('gridCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} app${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state__icon">◇</div>
        <h3 class="empty-state__title">No apps yet</h3>
        <p class="empty-state__desc">Register your first killer web app via the API or seed script to see it here.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((app, i) => {
    const techTags = (app.tech || []).map(t => `<span class="project-card__tech-tag">${t}</span>`).join('');
    const pagesText = app.pages ? `${app.pages} page${app.pages > 1 ? 's' : ''}` : '';
    const appUrl = app.url || `/apps/${app.slug}`;
    const thumbnailUrl = app.thumbnailUrl || (app.thumbnail ? `/uploads/${app.thumbnail}` : null);

    const typeClass = app.type === 'dynamic' ? 'project-card__type--dynamic' : 'project-card__type--static';
    const typeLabel = app.type === 'dynamic' ? 'Dynamic' : 'Static';

    // ── Preview priority: 1) custom SVG  2) thumbnail image  3) live snapshot  4) pattern fallback ──
    let preview;
    if (app.svgIcon) {
      // Custom SVG provided — render it centered in the preview area
      preview = `<div class="project-card__preview-svg">${app.svgIcon}</div>`;
    } else if (thumbnailUrl) {
      // Uploaded thumbnail image
      preview = `<img src="${thumbnailUrl}" alt="${app.title} preview" loading="lazy">`;
    } else {
      // Live iframe snapshot of the actual app
      preview = `<div class="project-card__preview-snapshot">
           <iframe src="${appUrl}" loading="lazy" tabindex="-1" aria-hidden="true" sandbox="allow-same-origin allow-scripts"></iframe>
           <div class="project-card__preview-overlay"></div>
         </div>`;
    }

    return `
      <a href="${appUrl}" class="project-card" style="transition-delay: ${i * 0.08}s">
        <div class="project-card__preview">${preview}</div>
        <div class="project-card__body">
          <div class="project-card__meta">
            <span class="project-card__tag">${app.category}</span>
            <span class="project-card__type ${typeClass}">${typeLabel}</span>
            ${pagesText ? `<span class="project-card__pages">${pagesText}</span>` : ''}
          </div>
          <h3 class="project-card__title">${app.title}</h3>
          <p class="project-card__desc">${app.description}</p>
          <div class="project-card__footer">
            <div class="project-card__tech">${techTags}</div>
            <div class="project-card__arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7V17"/>
              </svg>
            </div>
          </div>
        </div>
      </a>`;
  }).join('');

  // Staggered reveal
  requestAnimationFrame(() => {
    grid.querySelectorAll('.project-card').forEach((card, i) => {
      setTimeout(() => card.classList.add('visible'), i * 100);
    });
  });

  // Scale snapshot iframes to fill their containers
  scaleSnapshots();
}

function scaleSnapshots() {
  document.querySelectorAll('.project-card__preview-snapshot').forEach(container => {
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    if (containerWidth === 0) return;

    const iframeWidth = 1280;
    const iframeHeight = 800;

    // Scale to fill — use the larger of width/height ratios so no gaps remain
    const scaleX = containerWidth / iframeWidth;
    const scaleY = containerHeight / iframeHeight;
    const scale = Math.max(scaleX, scaleY);

    container.style.setProperty('--snapshot-scale', scale);
  });
}

/* ========== INIT ========== */
document.getElementById('year').textContent = new Date().getFullYear();

renderFilters();
renderGrid();

// Re-scale snapshots on window resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleSnapshots, 150);
}, { passive: true });

// Re-scale after iframes have had a moment to render
setTimeout(scaleSnapshots, 500);

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Intersection Observer for reveals
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
