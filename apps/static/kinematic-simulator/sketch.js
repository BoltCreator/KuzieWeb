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
let touchStartPos = [0, 0];    // screen coords at touch start
let touchDragStarted = false;  // has finger moved past threshold?
const TOUCH_DRAG_THRESHOLD = 10; // pixels before a tap becomes a drag

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
    const [mx, my] = touchCoords(e.touches[0]);
    touchStartPos = [e.touches[0].clientX, e.touches[0].clientY];
    touchDragStarted = false;

    // Test if we're hitting a mechanism element (but DON'T start dragging yet)
    touchStartedOnElement = mech.testClick([mx, my]);

    if (!touchStartedOnElement) {
      // Empty space — will become pan once finger moves
      isTouchPanning = false; // wait for threshold
    }
  } else if (e.touches.length === 2) {
    // Two fingers: cancel any single-finger interaction, start pinch/pan
    if (touchStartedOnElement && touchDragStarted) {
      mech.mouseup(touchCoords(e.touches[0]));
    }
    touchStartedOnElement = false;
    touchDragStarted = false;
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

  if (e.touches.length === 1) {
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    const dist = Math.hypot(cx - touchStartPos[0], cy - touchStartPos[1]);

    if (!touchDragStarted && dist < TOUCH_DRAG_THRESHOLD) {
      // Finger hasn't moved enough — ignore (prevents accidental drags)
      return;
    }

    if (!touchDragStarted) {
      // Threshold just crossed — commit to drag or pan
      touchDragStarted = true;
      if (touchStartedOnElement) {
        // Now actually start the mechanism drag
        const [mx, my] = touchCoords(e.touches[0]);
        mech.mousedown([mx, my]);
      } else {
        // Start panning
        isTouchPanning = true;
        panStartX = cx;
        panStartY = cy;
      }
      return; // consume this first move event
    }

    // Ongoing drag or pan
    if (touchStartedOnElement && !isTouchPanning) {
      const [mx, my] = touchCoords(e.touches[0]);
      mech.mousemove([mx, my]);
    } else if (isTouchPanning) {
      mech.panX += cx - panStartX;
      mech.panY += cy - panStartY;
      panStartX = cx;
      panStartY = cy;
    }
  } else if (e.touches.length === 2) {
    // Pinch zoom + two-finger pan
    const dist = pinchDistance(e.touches);
    const mid = pinchMidpoint(e.touches);
    mech.panX += mid[0] - panStartX;
    mech.panY += mid[1] - panStartY;
    panStartX = mid[0];
    panStartY = mid[1];
    if (lastPinchDist > 0) {
      const factor = dist / lastPinchDist;
      const oldS = mech.scale;
      const newS = clampScale(oldS * factor);
      const rect = canvas.getBoundingClientRect();
      applyZoom(mid[0] - rect.left, mid[1] - rect.top, oldS, newS);
      gui.syncZoom();
    }
    lastPinchDist = dist;
  }
}

function handleTouchEnd(e) {
  e.preventDefault();

  if (e.touches.length === 0) {
    if (touchStartedOnElement && !touchDragStarted) {
      // Short tap on an element — select it (do the mousedown now, then immediately mouseup)
      const [mx, my] = [touchStartPos[0] - canvas.getBoundingClientRect().left,
                         touchStartPos[1] - canvas.getBoundingClientRect().top];
      mech.mousedown([mx, my]);
      mech.mouseup([mx, my]);
    } else if (touchStartedOnElement && touchDragStarted) {
      // Was dragging — release
      if (activeTouches.length > 0) {
        mech.mouseup(touchCoords(activeTouches[activeTouches.length - 1]));
      } else {
        mech.mouseup(touchStartPos);
      }
    }

    // Reset all touch state
    isTouchPanning = false;
    touchStartedOnElement = false;
    touchDragStarted = false;
    lastPinchDist = 0;
    activeTouches = [];
  } else if (e.touches.length === 1) {
    // Went from 2 fingers to 1 — continue panning
    isTouchPanning = true;
    touchStartedOnElement = false;
    touchDragStarted = true;
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
