class Storage {
  fourbars() {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const s = 3;
    mech.DeleteAll();
    mech.getjoint([-30 * s + x, 30 * s + y]);
    mech.getjoint([-10 * s + x, -10 * s + y]);
    mech.getjoint([75 * s + x, -90 * s + y]);
    mech.getjoint([110 * s + x, 0 * s + y]);
    mech.makelink(0, 1);
    mech.makelink(2, 1);
    mech.makelink(3, 2);
    mech.fix(3);
  }

  sixbars() {
    const x = canvas.width / 2 - 100;
    const y = canvas.height / 2 + 100;
    const s = 15;
    mech.DeleteAll();
    mech.getjoint([0 * s + x, 0 * s + y]);
    mech.getjoint([5 * s + x, -5 * s + y]);
    mech.getjoint([10 * s + x, -18 * s + y]);
    mech.getjoint([18 * s + x, -14 * s + y]);
    mech.getjoint([20 * s + x, 0 * s + y]);
    mech.getjoint([24 * s + x, -24 * s + y]);
    mech.getjoint([24 * s + x, -12 * s + y]);
    mech.makelink(0, 1);
    mech.makelinks([2, 3, 1]);
    mech.makelink(3, 4);
    mech.makelink(2, 5);
    mech.makelink(5, 6);
    mech.fix(4);
    mech.fix(6);
  }

  mech1() {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    mech.DeleteAll();
    mech.getgear([-30 + x, 0 + y]);
    mech.getgear([0 + x, 0 + y], 24);
    mech.gearjoin(0, 1);
    mech.getjoint([240 + x, -25 + y]);
    mech.jointdrag(mech.joints[2]);
    mech.getjoint([280 + x, -180 + y]);
    mech.getjoint([480 + x, 0 + y]);
    mech.makelink(2, 3);
    mech.makelink(3, 4);
    mech.fix(4);
  }

  mech2() {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    mech.DeleteAll();
    mech.getgear([-30 + x, 0 + y], 50);
    mech.getjoint([100 + x, -100 + y]);
    mech.jointdrag(mech.joints[1]);
    mech.getjoint([380 + x, -200 + y]);
    mech.getjoint([80 + x, -300 + y]);
    mech.getjoint([500 + x, -350 + y]);
    mech.makepath(3, 4);
    mech.makejoin(2, 0);
    mech.makelink(1, 2);
    mech.getjoint([500 + x, -500 + y]);
    mech.getjoint([350 + x, -550 + y]);
    mech.makelink(5, 2);
    mech.makelink(5, 6);
    mech.fix(6);
  }
}

// Backward-compatible alias
const storage = Storage;


// ── Save / Load Manager ──────────────────────────────────────────

class SaveManager {
  constructor() {
    this.STORAGE_KEY = 'kinematic_sim_designs';
  }

  // ── localStorage helpers ────────────────────────────────────

  _getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to read localStorage:', e);
      return {};
    }
  }

  _putAll(designs) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
    } catch (e) {
      console.error('Failed to write localStorage:', e);
      alert('Save failed — localStorage may be full.');
    }
  }

  // ── Public API ──────────────────────────────────────────────

  /** List saved design names */
  listSaved() {
    const all = this._getAll();
    return Object.keys(all).sort();
  }

  /** Save current mechanism to localStorage under `name` */
  saveToLocal(name) {
    if (!name) return;
    const data = mech.serialize(name);
    const all = this._getAll();
    all[name] = data;
    this._putAll(all);
  }

  /** Load a design from localStorage by name */
  loadFromLocal(name) {
    const all = this._getAll();
    if (all[name]) {
      mech.loadDesign(all[name]);
    } else {
      alert(`Design "${name}" not found.`);
    }
  }

  /** Delete a design from localStorage */
  deleteFromLocal(name) {
    const all = this._getAll();
    delete all[name];
    this._putAll(all);
  }

  /** Download current mechanism as a .json file */
  downloadFile(name) {
    if (!name) name = 'mechanism';
    const data = mech.serialize(name);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Open a file picker and load the selected .json file */
  uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.version == null || !data.joints) {
            alert('Invalid design file.');
            return;
          }
          mech.loadDesign(data);
        } catch (err) {
          console.error('Load failed:', err);
          alert('Failed to read file — it may be corrupted.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /** Show a modal dialog for saving */
  showSaveDialog() {
    this._removeDialog();
    const overlay = this._createOverlay();

    const box = this._createBox('Save Design');

    // Name input
    const label = document.createElement('label');
    label.textContent = 'Design name:';
    label.style.cssText = 'display:block;margin-bottom:6px;font-size:14px;color:#555;';
    box.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'My Mechanism';
    nameInput.value = 'Untitled';
    nameInput.style.cssText = 'width:100%;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;font-size:15px;margin-bottom:16px;';
    box.appendChild(nameInput);

    // Buttons row
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';

    const btnLocal = this._btn('Save to Browser', '#4a8', () => {
      this.saveToLocal(nameInput.value.trim());
      this._removeDialog();
    });
    const btnFile = this._btn('Download File', '#48a', () => {
      this.downloadFile(nameInput.value.trim());
      this._removeDialog();
    });
    const btnCancel = this._btn('Cancel', '#888', () => this._removeDialog());

    row.appendChild(btnLocal);
    row.appendChild(btnFile);
    row.appendChild(btnCancel);
    box.appendChild(row);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    nameInput.focus();
    nameInput.select();
  }

  /** Show a modal dialog for loading */
  showLoadDialog() {
    this._removeDialog();
    const overlay = this._createOverlay();
    const box = this._createBox('Load Design');

    // Saved designs list
    const names = this.listSaved();
    if (names.length > 0) {
      const subhead = document.createElement('div');
      subhead.textContent = 'Saved in browser:';
      subhead.style.cssText = 'font-size:13px;color:#666;margin-bottom:6px;';
      box.appendChild(subhead);

      const list = document.createElement('div');
      list.style.cssText = 'max-height:220px;overflow-y:auto;margin-bottom:14px;border:1px solid #ddd;border-radius:6px;';

      for (const name of names) {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;gap:10px;transition:background 0.12s;';
        item.addEventListener('mouseenter', () => item.style.background = '#f0f4f8');
        item.addEventListener('mouseleave', () => item.style.background = '');

        // File icon
        const icon = document.createElement('span');
        icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        icon.style.cssText = 'flex-shrink:0;display:flex;';
        item.appendChild(icon);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.cssText = 'flex:1;font-size:15px;font-weight:600;color:#1a1a1a;letter-spacing:-0.2px;';
        item.appendChild(nameSpan);

        const loadBtn = this._btn('Load', '#48a', () => {
          this.loadFromLocal(name);
          this._removeDialog();
        });
        loadBtn.style.cssText += 'padding:4px 10px;font-size:12px;margin-left:6px;';
        item.appendChild(loadBtn);

        const delBtn = this._btn('✕', '#c55', () => {
          this.deleteFromLocal(name);
          item.remove();
          if (list.children.length === 0) {
            subhead.textContent = 'No saved designs.';
            list.remove();
          }
        });
        delBtn.style.cssText += 'padding:4px 8px;font-size:12px;margin-left:4px;min-width:auto;';
        item.appendChild(delBtn);

        list.appendChild(item);
      }
      box.appendChild(list);
    } else {
      const empty = document.createElement('div');
      empty.textContent = 'No designs saved in browser yet.';
      empty.style.cssText = 'font-size:14px;color:#999;margin-bottom:14px;';
      box.appendChild(empty);
    }

    // File upload button
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';

    const btnFile = this._btn('Load from File', '#48a', () => {
      this.uploadFile();
      this._removeDialog();
    });
    const btnCancel = this._btn('Cancel', '#888', () => this._removeDialog());

    row.appendChild(btnFile);
    row.appendChild(btnCancel);
    box.appendChild(row);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ── Dialog helpers ──────────────────────────────────────────

  _removeDialog() {
    const existing = document.getElementById('save-load-overlay');
    if (existing) existing.remove();
  }

  _createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'save-load-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._removeDialog();
    });
    return overlay;
  }

  _createBox(title) {
    const box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:10px;padding:24px;min-width:340px;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.18);font-family:Arial,sans-serif;';

    const h = document.createElement('h3');
    h.textContent = title;
    h.style.cssText = 'margin:0 0 16px 0;font-size:18px;color:#333;';
    box.appendChild(h);

    return box;
  }

  _btn(label, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `padding:8px 16px;border:none;border-radius:5px;background:${color};color:white;font-size:14px;cursor:pointer;min-width:80px;`;
    btn.addEventListener('mouseenter', () => btn.style.opacity = '0.85');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '1');
    btn.addEventListener('click', onClick);
    return btn;
  }
}
