// ── Globals ───────────────────────────────────────────
let can;
let canvas;
const myvec = new Vec();
const loader = new Storage();
const mech = new Mechanism();
const gui = new ManageGUI();
const saveManager = new SaveManager();
let clicking = false;
let mouseX = 0;
let mouseY = 0;
let width = 0;
let height = 0;

let isPanning = false;
let panStartX = 0;
let panStartY = 0;

let stayRight = false;
let stayDown = false;
let xMiddle = false;
let yMiddle = false;

// ── Setup ─────────────────────────────────────────────
function setup() {
  canvas = document.getElementById('game');
  if (!canvas.getContext) { alert("Canvas not supported."); return; }
  can = canvas.getContext('2d');
  resizeCanvas();

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('mousedown', (e) => {
    const [mx, my] = canvasCoords(e);
    if (e.button === 1 || e.button === 2) { startPan(e); e.preventDefault(); return; }
    if (mech.mousedown([mx, my])) { clicking = true; }
    else { startPan(e); }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
      mech.panX += e.clientX - panStartX;
      mech.panY += e.clientY - panStartY;
      panStartX = e.clientX;
      panStartY = e.clientY;
      return;
    }
    const [mx, my] = canvasCoords(e);
    mouseX = mx; mouseY = my;
    mech.mousemove([mx, my]);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (isPanning) { endPan(); return; }
    clicking = false;
    mech.mouseup(canvasCoords(e));
  });

  window.addEventListener('mouseup', () => { if (isPanning) endPan(); });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [mx, my] = canvasCoords(e);
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const oldS = mech.scale;
    const newS = Math.max(0.1, Math.min(5, oldS * factor));
    const r = newS / oldS;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    mech.panX = (mx - cx) * (1 - r) + mech.panX * r;
    mech.panY = (my - cy) * (1 - r) + mech.panY * r;
    mech.scale = newS;
    gui.syncZoom();
  }, { passive: false });

  gui.init();
  window._gameLoopId = setInterval(gameloop, 1000 / 60);
}

function startPan(e) {
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  canvas.style.cursor = 'grabbing';
}
function endPan() {
  isPanning = false;
  canvas.style.cursor = '';
}

function canvasCoords(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function resizeCanvas() {
  const tbH = document.getElementById('topbar')?.offsetHeight || 48;
  const slW = document.getElementById('sidebar')?.offsetWidth || 200;
  const bbH = document.getElementById('bottombar')?.offsetHeight || 34;
  canvas.width = window.innerWidth - slW;
  canvas.height = window.innerHeight - tbH - bbH;
  width = canvas.width;
  height = canvas.height;
}

// ── Game Loop ─────────────────────────────────────────
function gameloop() {
  clearScreen();
  mech.update();
  mech.draw();
}

function clearScreen() {
  can.fillStyle = gui.getCanvasColor();
  can.fillRect(0, 0, canvas.width, canvas.height);
}

function tests() {}
function randrange(s, e) { return Math.floor(Math.random() * (e - s)) + s; }
