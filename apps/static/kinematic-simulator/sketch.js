// ── Globals ───────────────────────────────────────────
let can, canvas;
const myvec = new Vec();
const loader = new Storage();
const mech = new Mechanism();
const gui = new ManageGUI();
const saveManager = new SaveManager();
let clicking = false, mouseX = 0, mouseY = 0, width = 0, height = 0;
let isPanning = false, panStartX = 0, panStartY = 0;
let stayRight = false, stayDown = false, xMiddle = false, yMiddle = false;

// Touch state
let activeTouches = [];
let lastPinchDist = 0;
let isTouchPanning = false;
let touchStartedOnElement = false;

function setup() {
  canvas = document.getElementById('game');
  if (!canvas.getContext) { alert("Canvas not supported."); return; }
  can = canvas.getContext('2d');
  resizeCanvas();

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ── Mouse events ────────────────────────────────────
  canvas.addEventListener('mousedown', e => {
    const [mx, my] = canvasCoords(e);
    if (e.button === 1 || e.button === 2) { startPan(e); e.preventDefault(); return; }
    if (mech.mousedown([mx, my])) clicking = true;
    else startPan(e);
  });
  canvas.addEventListener('mousemove', e => {
    if (isPanning) { mech.panX += e.clientX - panStartX; mech.panY += e.clientY - panStartY; panStartX = e.clientX; panStartY = e.clientY; return; }
    const [mx, my] = canvasCoords(e);
    mouseX = mx; mouseY = my;
    mech.mousemove([mx, my]);
  });
  canvas.addEventListener('mouseup', e => {
    if (isPanning) { endPan(); return; }
    clicking = false; mech.mouseup(canvasCoords(e));
  });
  window.addEventListener('mouseup', () => { if (isPanning) endPan(); });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const [mx, my] = canvasCoords(e);
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const oldS = mech.scale;
    const newS = clampScale(oldS * factor);
    applyZoom(mx, my, oldS, newS);
    gui.syncZoom();
  }, { passive: false });

  // ── Touch events ────────────────────────────────────
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  gui.init();
  window._gameLoopId = setInterval(gameloop, 1000 / 60);
}

// ── Touch handlers ────────────────────────────────────
function handleTouchStart(e) {
  e.preventDefault();
  activeTouches = [...e.touches];

  if (e.touches.length === 1) {
    // Single finger: interact with mechanism or pan
    const [mx, my] = touchCoords(e.touches[0]);
    touchStartedOnElement = mech.mousedown([mx, my]);
    if (!touchStartedOnElement) {
      isTouchPanning = true;
      panStartX = e.touches[0].clientX;
      panStartY = e.touches[0].clientY;
    }
  } else if (e.touches.length === 2) {
    // Two fingers: start pinch/pan
    if (touchStartedOnElement) {
      // Release mechanism interaction
      mech.mouseup(touchCoords(e.touches[0]));
      touchStartedOnElement = false;
    }
    isTouchPanning = true;
    lastPinchDist = pinchDistance(e.touches);
    const mid = pinchMidpoint(e.touches);
    panStartX = mid[0];
    panStartY = mid[1];
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  activeTouches = [...e.touches];

  if (e.touches.length === 1 && !isTouchPanning && touchStartedOnElement) {
    // Single finger dragging mechanism element
    const [mx, my] = touchCoords(e.touches[0]);
    mech.mousemove([mx, my]);
  } else if (e.touches.length === 1 && isTouchPanning) {
    // Single finger panning (on empty space)
    const dx = e.touches[0].clientX - panStartX;
    const dy = e.touches[0].clientY - panStartY;
    mech.panX += dx; mech.panY += dy;
    panStartX = e.touches[0].clientX;
    panStartY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    // Pinch zoom + two-finger pan
    const dist = pinchDistance(e.touches);
    const mid = pinchMidpoint(e.touches);

    // Pan
    mech.panX += mid[0] - panStartX;
    mech.panY += mid[1] - panStartY;
    panStartX = mid[0];
    panStartY = mid[1];

    // Zoom
    if (lastPinchDist > 0) {
      const factor = dist / lastPinchDist;
      const oldS = mech.scale;
      const newS = clampScale(oldS * factor);
      const rect = canvas.getBoundingClientRect();
      const cx = mid[0] - rect.left;
      const cy = mid[1] - rect.top;
      applyZoom(cx, cy, oldS, newS);
      gui.syncZoom();
    }
    lastPinchDist = dist;
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  if (e.touches.length === 0) {
    if (touchStartedOnElement) {
      // Lift finger off mechanism element
      if (activeTouches.length > 0) {
        mech.mouseup(touchCoords(activeTouches[activeTouches.length - 1]));
      }
    }
    isTouchPanning = false;
    touchStartedOnElement = false;
    lastPinchDist = 0;
    activeTouches = [];
  } else if (e.touches.length === 1) {
    // Went from 2 fingers to 1
    isTouchPanning = true;
    panStartX = e.touches[0].clientX;
    panStartY = e.touches[0].clientY;
    lastPinchDist = 0;
  }
}

function touchCoords(touch) {
  const rect = canvas.getBoundingClientRect();
  return [touch.clientX - rect.left, touch.clientY - rect.top];
}

function pinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function pinchMidpoint(touches) {
  return [
    (touches[0].clientX + touches[1].clientX) / 2,
    (touches[0].clientY + touches[1].clientY) / 2,
  ];
}

// ── Zoom helpers ──────────────────────────────────────
function clampScale(s) { return Math.max(0.1, Math.min(5, s)); }

function applyZoom(mx, my, oldS, newS) {
  const r = newS / oldS;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  mech.panX = (mx - cx) * (1 - r) + mech.panX * r;
  mech.panY = (my - cy) * (1 - r) + mech.panY * r;
  mech.scale = newS;
}

// ── Mouse helpers ─────────────────────────────────────
function startPan(e) { isPanning = true; panStartX = e.clientX; panStartY = e.clientY; canvas.style.cursor = 'grabbing'; }
function endPan() { isPanning = false; canvas.style.cursor = ''; }
function canvasCoords(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

function resizeCanvas() {
  const tbH = document.getElementById('topbar')?.offsetHeight || 48;
  const bbH = document.getElementById('bottombar')?.offsetHeight || 34;
  const isMobile = window.innerWidth <= 768;
  const isCollapsed = document.body.classList.contains('sidebar-collapsed');
  const slW = (isMobile || isCollapsed) ? 0 : (document.getElementById('sidebar')?.offsetWidth || 200);

  const w = Math.max(1, window.innerWidth - slW);
  const h = Math.max(1, window.innerHeight - tbH - bbH);
  canvas.width = w;
  canvas.height = h;
  width = w;
  height = h;
}

// ── Game Loop ─────────────────────────────────────────
function gameloop() { clearScreen(); mech.update(); mech.draw(); }

function clearScreen() {
  can.fillStyle = gui.getCanvasColor();
  can.fillRect(0, 0, canvas.width, canvas.height);
}

function tests() {}
function randrange(s, e) { return Math.floor(Math.random() * (e - s)) + s; }
