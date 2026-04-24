/**
 * ManageGUI — Responsive HTML controller.
 * Desktop: sidebar always visible. Mobile: sidebar slides in/out via hamburger.
 */
class ManageGUI {
  constructor() {
    this.activeTool = null;
    this._toolBtns = [];
    this._canvasColor = '#f4f5f7';
    this._defaultMotorSpeed = 0.1;
    this._sidebarOpen = false;
  }

  init() {
    this._wireSidebar();
    this._wireTools();
    this._wireTopBar();
    this._wireJointPanel();
    this._wireBottomBar();
    this._wireSamples();
    this._wireSettings();
    this._wireKeyboard();
    this._wireTooltips();
    this._setStatus('Ready', 'idle');
  }

  // ═══ Sidebar toggle ═════════════════════════════════

  _wireSidebar() {
    const backdrop = document.getElementById('sidebar-backdrop');
    document.getElementById('btn-menu').addEventListener('click', () => this._toggleSidebar());
    backdrop.addEventListener('click', () => this._closeSidebar());

    // Re-evaluate sidebar state on resize (e.g., rotating phone)
    window.addEventListener('resize', () => {
      if (!this._isMobile()) {
        // Moving to desktop: close mobile overlay state
        document.getElementById('sidebar').classList.remove('open');
        backdrop.classList.remove('visible');
        backdrop.classList.add('hidden');
        this._sidebarOpen = false;
      }
      // Resize canvas after sidebar state settles
      setTimeout(resizeCanvas, 50);
    });
  }

  _toggleSidebar() {
    this._sidebarOpen ? this._closeSidebar() : this._openSidebar();
  }

  _openSidebar() {
    if (this._isMobile()) {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-backdrop').classList.remove('hidden');
      document.getElementById('sidebar-backdrop').classList.add('visible');
    } else {
      document.body.classList.remove('sidebar-collapsed');
      setTimeout(resizeCanvas, 30);
    }
    this._sidebarOpen = true;
  }

  _closeSidebar() {
    if (this._isMobile()) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('visible');
      document.getElementById('sidebar-backdrop').classList.add('hidden');
    } else {
      document.body.classList.add('sidebar-collapsed');
      setTimeout(resizeCanvas, 30);
    }
    this._sidebarOpen = false;
  }

  _isMobile() { return window.innerWidth <= 768; }

  // ═══ Tools ══════════════════════════════════════════

  _wireTools() {
    for (const btn of document.querySelectorAll('.tool-btn[data-tool]')) {
      this._toolBtns.push(btn);
      btn.addEventListener('click', () => this._handleTool(btn.dataset.tool, btn));
    }
    document.getElementById('btn-clear').addEventListener('click', () => {
      mech.DeleteAll();
      this._clearActiveTool();
      this._hideJointPanel();
      this._setStatus('Canvas cleared', 'idle');
      if (this._isMobile()) this._closeSidebar();
    });
  }

  _handleTool(tool, btn) {
    const immediate = { link: true, join: true, delete: true };
    if (immediate[tool]) {
      if (tool === 'link') mech.getlink();
      if (tool === 'join') mech.join();
      if (tool === 'delete') mech.Delete();
      this._flash(btn);
      if (this._isMobile()) this._closeSidebar();
      return;
    }
    if (this.activeTool === tool) { this._clearActiveTool(); return; }
    this._clearActiveTool();
    this.activeTool = tool;
    btn.classList.add('active');
    mech.clickinfo = tool;
    mech.manageclick();
    this._setStatus(`Tap to place ${tool}`, 'tool');
    if (this._isMobile()) this._closeSidebar();
  }

  _clearActiveTool() {
    this.activeTool = null;
    mech.clickpointer = null;
    mech.clickinfo = null;
    for (const b of this._toolBtns) b.classList.remove('active');
    if (!mech.updating) this._setStatus('Ready', 'idle');
  }

  _flash(btn) { btn.classList.add('active'); setTimeout(() => btn.classList.remove('active'), 150); }

  // ═══ Top Bar ════════════════════════════════════════

  _wireTopBar() {
    // Desktop save/load
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    if (btnSave) btnSave.addEventListener('click', () => saveManager.showSaveDialog());
    if (btnLoad) btnLoad.addEventListener('click', () => saveManager.showLoadDialog());

    // Mobile save/load (inside sidebar)
    const btnSaveM = document.getElementById('btn-save-m');
    const btnLoadM = document.getElementById('btn-load-m');
    if (btnSaveM) btnSaveM.addEventListener('click', () => { this._closeSidebar(); saveManager.showSaveDialog(); });
    if (btnLoadM) btnLoadM.addEventListener('click', () => { this._closeSidebar(); saveManager.showLoadDialog(); });

    // Play/pause
    const simBtn = document.getElementById('btn-sim');
    simBtn.addEventListener('click', () => {
      mech.updating = !mech.updating;
      simBtn.classList.toggle('active', mech.updating);
      document.getElementById('icon-play').classList.toggle('hidden', mech.updating);
      document.getElementById('icon-pause').classList.toggle('hidden', !mech.updating);
      this._setStatus(mech.updating ? 'Running' : 'Paused', mech.updating ? 'running' : 'idle');
    });

    // Grid (desktop)
    const gridCb = document.getElementById('chk-grid');
    if (gridCb) gridCb.addEventListener('change', e => { mech.showGrid = e.target.checked; });

    // Grid (mobile, inside sidebar)
    const gridCbM = document.getElementById('chk-grid-m');
    if (gridCbM) {
      gridCbM.addEventListener('change', e => {
        mech.showGrid = e.target.checked;
        if (gridCb) gridCb.checked = e.target.checked;
      });
    }
  }

  // ═══ Joint Panel ════════════════════════════════════

  _wireJointPanel() {
    const fixedCb = document.getElementById('chk-fixed');
    const motorCb = document.getElementById('chk-rotating');
    const speedSlider = document.getElementById('joint-speed');
    const speedVal = document.getElementById('joint-speed-val');
    const speedRow = document.getElementById('speed-row');

    fixedCb.addEventListener('change', () => { mech.showFixed = fixedCb.checked; mech.updatejoint(); });
    motorCb.addEventListener('change', () => {
      mech.showRotating = motorCb.checked;
      mech.updatejoint();
      speedRow.style.display = motorCb.checked ? 'flex' : 'none';
    });
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(speedSlider.value) / 100;
      speedVal.textContent = v.toFixed(2);
      if (mech.jpointer?.selected) mech.jpointer.avel = v;
    });
  }

  showJointProps(j) {
    if (!j) return;
    const panel = document.getElementById('joint-panel');
    panel.style.display = '';
    const fixedCb = document.getElementById('chk-fixed');
    const motorCb = document.getElementById('chk-rotating');
    const speedSlider = document.getElementById('joint-speed');
    const speedVal = document.getElementById('joint-speed-val');
    const speedRow = document.getElementById('speed-row');
    fixedCb.checked = j.isStatic;
    motorCb.checked = j.avel !== 0;
    mech.showFixed = j.isStatic;
    mech.showRotating = j.avel !== 0;
    speedRow.style.display = j.avel !== 0 ? 'flex' : 'none';
    const spd = Math.abs(j.avel);
    speedSlider.value = Math.round(spd * 100);
    speedVal.textContent = spd.toFixed(2);
  }

  _hideJointPanel() {
    document.getElementById('joint-panel').style.display = 'none';
  }

  // ═══ Bottom Bar ═════════════════════════════════════

  _wireBottomBar() {
    const slider = document.getElementById('zoom-slider');
    if (slider) slider.addEventListener('input', () => {
      mech.scale = (parseFloat(slider.value) / 100) * 1.5 + 0.5;
      this._syncZoomPct();
    });
    document.getElementById('btn-reset-view').addEventListener('click', () => {
      mech.resetView(); this._syncAll(); this._setStatus('View reset', 'idle');
    });
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      mech.scale = Math.min(5, mech.scale * 1.2); this._syncAll();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      mech.scale = Math.max(0.1, mech.scale / 1.2); this._syncAll();
    });
  }

  _syncZoomPct() {
    const el = document.getElementById('zoom-pct');
    if (el) el.textContent = Math.round(mech.scale * 100) + '%';
  }
  _syncSlider() {
    const s = document.getElementById('zoom-slider');
    if (s) s.value = Math.round(((mech.scale - 0.5) / 1.5) * 100);
    this._syncZoomPct();
  }
  _syncAll() { this._syncSlider(); }
  syncZoom() { this._syncAll(); }

  // ═══ Samples ════════════════════════════════════════

  _wireSamples() {
    for (const btn of document.querySelectorAll('.sample-btn')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sample;
        if (id === '4-bars') loader.fourbars();
        if (id === '6-bars') loader.sixbars();
        if (id === 'mech1') loader.mech1();
        if (id === 'mech2') loader.mech2();
        this._clearActiveTool(); this._flash(btn);
        this._setStatus('Loaded: ' + btn.textContent.trim(), 'idle');
        if (this._isMobile()) this._closeSidebar();
      });
    }
  }

  // ═══ Settings ═══════════════════════════════════════

  _wireSettings() {
    const drawer = document.getElementById('settings-drawer');
    document.getElementById('btn-settings').addEventListener('click', e => {
      e.stopPropagation(); drawer.classList.toggle('hidden');
    });
    document.getElementById('btn-settings-close').addEventListener('click', () => drawer.classList.add('hidden'));
    document.addEventListener('mousedown', e => {
      if (!drawer.classList.contains('hidden') && !drawer.contains(e.target) && !e.target.closest('#btn-settings'))
        drawer.classList.add('hidden');
    });

    // Sim speed
    const simSpd = document.getElementById('sim-speed');
    const simVal = document.getElementById('sim-speed-val');
    simSpd.addEventListener('input', () => {
      const fps = parseInt(simSpd.value);
      simVal.textContent = fps + ' fps';
      if (window._gameLoopId) clearInterval(window._gameLoopId);
      window._gameLoopId = setInterval(gameloop, 1000 / fps);
    });

    // Default motor speed
    const dms = document.getElementById('default-motor-speed');
    const dmv = document.getElementById('default-motor-val');
    dms.addEventListener('input', () => {
      this._defaultMotorSpeed = parseInt(dms.value) / 100;
      dmv.textContent = this._defaultMotorSpeed.toFixed(2);
    });

    // Joint size
    const jsz = document.getElementById('joint-size');
    const jsv = document.getElementById('joint-size-val');
    jsz.addEventListener('input', () => { const v = parseInt(jsz.value); jsv.textContent = v; mech.defaultJointRadius = v; });

    // Canvas color
    document.getElementById('canvas-color').addEventListener('input', e => { this._canvasColor = e.target.value; });
  }

  getCanvasColor() { return this._canvasColor; }
  getDefaultMotorSpeed() { return this._defaultMotorSpeed; }

  // ═══ Keyboard ═══════════════════════════════════════

  _wireKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      const map = { j: 'joint', g: 'gear', l: 'link', p: 'path' };
      if (map[key]) {
        const btn = document.querySelector(`.tool-btn[data-tool="${map[key]}"]`);
        if (btn) this._handleTool(map[key], btn);
        e.preventDefault();
      }
      if (key === 'delete' || key === 'backspace') { mech.Delete(); e.preventDefault(); }
      if (key === ' ') { document.getElementById('btn-sim').click(); e.preventDefault(); }
      if (key === 'escape') {
        this._clearActiveTool(); mech.clear();
        document.getElementById('settings-drawer').classList.add('hidden');
        this._closeSidebar();
      }
      if (key === 'home') { mech.resetView(); this._syncAll(); e.preventDefault(); }
      if (e.ctrlKey && key === 's') { saveManager.showSaveDialog(); e.preventDefault(); }
      if (e.ctrlKey && key === 'o') { saveManager.showLoadDialog(); e.preventDefault(); }
    });
  }

  // ═══ Tooltips (desktop only) ════════════════════════

  _wireTooltips() {
    if ('ontouchstart' in window) return; // skip on touch devices
    const tip = document.getElementById('tooltip');
    let timer = null;
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        tip.textContent = el.dataset.tip;
        tip.classList.add('show');
        const r = el.getBoundingClientRect();
        const tw = tip.offsetWidth;
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));
        const top = r.bottom + 8;
        tip.style.left = left + 'px';
        tip.style.top = (top + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : top) + 'px';
      }, 450);
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('[data-tip]')) { clearTimeout(timer); tip.classList.remove('show'); }
    });
    document.addEventListener('mousedown', () => { clearTimeout(timer); tip.classList.remove('show'); });
  }

  // ═══ Status ═════════════════════════════════════════

  _setStatus(msg, mode = 'idle') {
    const txt = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    if (txt) txt.textContent = msg;
    if (dot) {
      dot.className = '';
      if (mode === 'running') dot.classList.add('running');
      else if (mode === 'tool') dot.classList.add('tool-active');
    }
  }

  // Stubs
  mouseup() {} mousemove() {} mousedown() { return false; }
  update() {} draw() {} prepare() {} resize() {}
}

const manageGUI = ManageGUI;
