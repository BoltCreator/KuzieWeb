class Mechanism {
  constructor() {
    this._myvec = new Vec();
    this.links = [];
    this.joints = [];
    this.lines = [];
    this.gears = [];
    this.group = [];
    this.mousep = [0, 0];
    this.jpointer = null;
    this.lpointer = null;
    this.gpointer = null;
    this.updating = false;
    this.adjusting = false;
    this.mousetype = 'default';
    this.maxtime = 8;
    this.time = 0;
    this.start = null;
    this.end = null;
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.ismousedown = false;
    this.isdragging = false;
    this.ldragging = false;
    this.showFixed = false;
    this.showRotating = false;
    this.showGrid = true;
    this.defaultJointRadius = 20;
    this.clickpointer = null;
    this.clickinfo = null;
  }

  mouseup(p) {
    p = this.toworld(p);
    this.ismousedown = false;
    this.isdragging = false;
    this.adjusting = false;
    this.ldragging = false;
  }

  mousemove(p) {
    p = this.toworld(p);
    if (this.adjusting && this.gpointer != null) {
      this.gpointer.removeall();
      this.gpointer.adjust(this.mousep, p);
      this._gearconnect(this.gpointer);
    }
    if (this.isdragging && this.jpointer != null) {
      const diff = this._myvec.subtract(p, this.mousep);
      this.jpointer.move(diff[0], diff[1]);
      if (this.jpointer.pathparent != null) this.jpointer.pathparent.align(this.jpointer);
      if (this.jpointer.gear != null) {
        this.jpointer.gear.removeall();
        this._gearconnect(this.jpointer.gear);
      } else {
        this.jointconnect(this.jpointer);
      }
    }
    if (this.ldragging && this.lpointer != null) {
      const diff = this._myvec.subtract(p, this.mousep);
      this.lpointer.move(diff[0], diff[1], this);
    }
    if (this.clickpointer != null) this.clickpointer.update(p);
    this.mousep = p;
  }

  /** Non-destructive hit test: returns true if p (screen coords) hits any element.
   *  Does NOT start dragging or change any state. Used by touch to decide tap vs pan. */
  testClick(p) {
    const wp = this.toworld([p[0], p[1]]);
    // Check joints (with inflated radius for touch)
    const touchBonus = ('ontouchstart' in window) ? 15 : 0;
    for (let i = this.joints.length - 1; i >= 0; i--) {
      const myvec = this._myvec;
      const pos = this.joints[i].getpoint();
      if (myvec.length(pos, wp) <= this.joints[i].r + touchBonus) return true;
    }
    // Check links
    for (let j = this.links.length - 1; j >= 0; j--) {
      if (this.links[j].collide(wp)) return true;
    }
    return false;
  }

  mousedown(p) {
    p = this.toworld(p);
    this.ismousedown = true;
    if (this.mousetype === 'e-resize') {
      this.adjusting = true;
      this.time = 0;
      return true;
    } else if (this._click(p)) {
      this.time = 0;
      return true;
    } else if (this.clickinfo != null) {
      // A tool is active — place the element
      this._doclick(p);
      this.clear();
      this.time = 0;
      return true;
    }
    // Nothing was hit and no tool active → empty space
    this.clear();
    this.time = 0;
    return false;
  }

  _gearconnect(g) {
    for (const gear of this.gears) { if (gear !== g) g.checkconnect(gear); }
  }

  _doclick(p) {
    if (this.clickinfo === 'joint') {
      this.getjoint(p);
    } else if (this.clickinfo === 'gear') {
      this.getgear(p);
    } else if (this.clickinfo === 'path') {
      const p1 = new Point(this.mousep[0], this.mousep[1]);
      const p2 = new Point(this.mousep[0], this.mousep[1]);
      this.joints.push(p1); this.joints.push(p2);
      this.links.push(new Path(p1, p2));
      this.clickinfo = 'pathing';
      this.clickpointer = p2;
    } else if (this.clickinfo === 'pathing') {
      this.clickpointer = null;
      this.clickinfo = null;
    }
  }

  manageclick() {
    if (this.clickinfo === 'joint') {
      this.clickpointer = new Point(this.mousep[0], this.mousep[1]);
    } else if (this.clickinfo === 'gear') {
      this.clickpointer = new Gear(new Point(this.mousep[0], this.mousep[1]), 16);
    } else if (this.clickinfo === 'path') {
      const po = new Point(this.mousep[0], this.mousep[1]);
      po.color = 'white';
      this.clickpointer = po;
    } else {
      this.clickpointer = null;
      this.clickinfo = null;
    }
  }

  jointdrag(j) {
    if (j.pathparent != null) j.pathparent.align(j);
    if (j.gear != null) { j.gear.removeall(); this._gearconnect(j.gear); }
    else this.jointconnect(j);
  }

  jointconnect(j) {
    if (j.shape != null && !j.shape.collide(j.getpoint())) {
      if (j.shape.type === 'gear') { j.shape.pos.removeboth(j); j.shape = null; }
      else if (j.shape.type === 'link') { j.shape.removeboth(j); j.shape = null; }
    }
    if (j.shape == null) {
      for (const gear of this.gears) {
        if (gear.collide(j.getpoint())) { gear.pos.connect(j); j.shape = gear; break; }
      }
    }
    if (j.shape == null && j.path == null) {
      for (const link of this.links) {
        if (link.type === 'link' && !link.contains(j) && link.collide(j.getpoint())) {
          link.connect(j); j.shape = link; break;
        }
      }
    }
    const store = j.connections;
    j.removeall();
    j.connectall(store);
  }

  _click(p) {
    const touchBonus = ('ontouchstart' in window) ? 15 : 0;
    for (let i = this.joints.length - 1; i >= 0; i--) {
      const pos = this.joints[i].getpoint();
      if (this._myvec.length(pos, p) <= this.joints[i].r + touchBonus) {
        this.isdragging = true;
        this.jpointer = this.joints[i];
        this.jpointer.selected = true;
        this._showjoint();
        if (!this._ingroup(this.joints[i])) this.group.push(this.joints[i]);
        this.clickpointer = null; this.clickinfo = null;
        return true;
      }
    }
    for (let j = this.links.length - 1; j >= 0; j--) {
      if (this.links[j].collide(p)) {
        this.links[j].selected = true;
        this.lpointer = this.links[j]; this.ldragging = true;
        this.clickpointer = null; this.clickinfo = null;
        return true;
      }
    }
    return false;
  }

  Delete() {
    if (this.jpointer != null && this.jpointer.selected) {
      this.jpointer.removeall();
      if (this.jpointer.gear != null) {
        this.jpointer.gear.removeall();
        this.gears = this._remove(this.gears, this.jpointer.gear);
      }
      for (let i = this.links.length - 1; i >= 0; i--) {
        this.links[i].joints = this._remove(this.links[i].joints, this.jpointer);
        if (this.links[i].joints.length < 2) this.links = this._remove(this.links, this.links[i]);
      }
      this.joints = this._remove(this.joints, this.jpointer);
    }
    if (this.lpointer != null && this.lpointer.selected) {
      this.lpointer.Delete();
      if (this.lpointer.type === 'path') {
        for (const joint of this.joints) {
          if (this.lpointer === joint.pathparent) { joint.pathparent = null; joint.path = null; }
        }
        this.joints = this._remove(this.joints, this.lpointer.p1);
        this.joints = this._remove(this.joints, this.lpointer.p2);
      }
      this.links = this._remove(this.links, this.lpointer);
    }
  }

  DeleteAll() {
    this.joints = []; this.links = []; this.gears = [];
    this.jpointer = null; this.lpointer = null; this.start = null;
  }

  _remove(arr, ele) { return arr.filter(item => item !== ele); }

  _showjoint() {
    if (this.jpointer && gui) gui.showJointProps(this.jpointer);
  }

  updatejoint() {
    const j = this.jpointer;
    if (j != null && j.selected) {
      j.isStatic = this.showFixed;
      const speed = (typeof gui !== 'undefined' && gui.getDefaultMotorSpeed) ? gui.getDefaultMotorSpeed() : 0.1;
      j.avel = this.showRotating ? speed : 0;
    }
  }

  _ingroup(j) { return !j.visible || this.group.includes(j); }

  clear() {
    for (const gear of this.gears) gear.pos.selected = false;
    for (const g of this.group) g.selected = false;
    for (const link of this.links) link.selected = false;
    this.group = [];
    if (typeof gui !== 'undefined' && gui._hideJointPanel) gui._hideJointPanel();
  }

  getjoint(p) {
    const po = new Point(p[0], p[1]);
    po.r = this.defaultJointRadius;
    this.joints.push(po);
    if (this.start == null) {
      this.start = po;
      po.isStatic = true;
      const speed = (typeof gui !== 'undefined' && gui.getDefaultMotorSpeed) ? gui.getDefaultMotorSpeed() : 0.1;
      po.avel = speed;
    }
  }

  getlink() {
    if (this.group.length > 1 && this.group.length < 4) this.links.push(new Linkage(this.group));
  }

  getgear(p, tno = 30) {
    this.getjoint(p);
    this.gears.push(new Gear(this.joints[this.joints.length - 1], tno));
  }

  getpath() {
    if (this.group.length === 2) this.links.push(new Path(this.group[0], this.group[1]));
  }

  join() {
    if (this.lpointer?.selected && this.jpointer?.selected) {
      if (this.lpointer.type === 'path' && this.jpointer.path == null) this.lpointer.join(this.jpointer);
    }
  }

  update() {
    if (this.time < this.maxtime) this.time++;
    if (this.updating) this.UPDATE();
    this.mousetype = 'default';
    for (const gear of this.gears) {
      if (gear.edgecollide(this.mousep)) { this.mousetype = 'e-resize'; this.gpointer = gear; }
    }
    canvas.style.cursor = this.mousetype;
  }

  draw() {
    if (this.showGrid) this._drawGrid();
    for (const gear of this.gears) gear.draw();
    for (const link of this.links) link.draw();
    for (const joint of this.joints) joint.draw();
    if (this.clickpointer != null) this.clickpointer.draw();
  }

  toscreen(p) {
    p[0] = (p[0] - canvas.width / 2) * this.scale + canvas.width / 2 + this.panX;
    p[1] = (p[1] - canvas.height / 2) * this.scale + canvas.height / 2 + this.panY;
    return p;
  }

  toworld(p) {
    p[0] = (p[0] - canvas.width / 2 - this.panX) / this.scale + canvas.width / 2;
    p[1] = (p[1] - canvas.height / 2 - this.panY) / this.scale + canvas.height / 2;
    return p;
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    // Sync the zoom slider
    const slider = document.getElementById('zoom-slider');
    if (slider) slider.value = 50;
  }

  _drawGrid() {
    const gridsize = 50 * this.scale;
    if (gridsize < 4) return; // too dense to draw

    // Find where world-origin grid lines appear on screen
    const cx = canvas.width / 2 + this.panX;
    const cy = canvas.height / 2 + this.panY;

    // Offset the start so grid lines tile correctly from the center
    const startX = cx % gridsize;
    const startY = cy % gridsize;

    can.strokeStyle = '#d0d2d4';
    can.lineWidth = 1;
    can.beginPath();
    for (let x = startX; x < canvas.width; x += gridsize) {
      can.moveTo(x, 0);
      can.lineTo(x, canvas.height);
    }
    for (let y = startY; y < canvas.height; y += gridsize) {
      can.moveTo(0, y);
      can.lineTo(canvas.width, y);
    }
    can.stroke();

    // Draw origin crosshair (heavier lines)
    can.strokeStyle = '#b0b4b8';
    can.lineWidth = 2;
    can.beginPath();
    if (cx >= 0 && cx <= canvas.width) {
      can.moveTo(cx, 0); can.lineTo(cx, canvas.height);
    }
    if (cy >= 0 && cy <= canvas.height) {
      can.moveTo(0, cy); can.lineTo(canvas.width, cy);
    }
    can.stroke();
  }

  _drawLine(p1, p2) {
    can.strokeStyle = '#6f7072';
    can.beginPath(); can.lineWidth = 2;
    can.moveTo(p1[0], p1[1]); can.lineTo(p2[0], p2[1]);
    can.stroke(); can.closePath();
  }

  _getpos() { return this.joints.map(j => j.getpoint()); }

  _guess() {
    for (const j of this.joints) {
      if (!j.rotated && j.pathparent != null) {
        j.pathparent.align(j); j.rotated = true; j.giveconstraint(); return 1;
      }
    }
    for (const j of this.joints) { if (!j.rotated && j.guess()) return 1; }
    return 0;
  }

  _shouldeval(i) {
    if (this.joints[i].constraints.length > 1) return true;
    if (this.joints[i].constraints.length === 1 && this.joints[i].path != null) {
      const per = this.joints[i].pathparent;
      if (per.ischild() && !per.allrotated()) return false;
      return true;
    }
    return false;
  }

  _cal1(index = -1) {
    let count = 0;
    for (let i = 0; i < this.joints.length; i++) {
      if (!this.joints[i].rotated) {
        if (this.joints[i].isStatic || this.joints[i].avel !== 0 || i === index || !this.joints[i].visible) {
          this.joints[i].rotated = true; this.joints[i].giveconstraint(); count++;
        } else if (this._shouldeval(i)) {
          this.joints[i].evalpos(); this.joints[i].rotated = true; this.joints[i].giveconstraint(); count++;
        }
      }
    }
    return count;
  }

  _reverse() { for (const j of this.joints) j.avel *= -1; }

  _updateall(pos) {
    if (pos.length === this.joints.length)
      for (let i = 0; i < this.joints.length; i++) this.joints[i].update(pos[i]);
  }

  _isgood() {
    for (const j of this.joints) {
      const p = j.getpoint();
      if (isNaN(p[0]) || isNaN(p[1])) return false;
      if (j.path != null && !j.path.isInside(p)) return false;
    }
    for (const l of this.links) { if (!l.check()) return false; }
    return true;
  }

  STEP() {
    const store = this._getpos();
    let count = 1;
    while (count > 0) { count = this._cal1(); if (count === 0) count = this._guess(); }
    if (!this._isgood()) { this._updateall(store); this._reverse(); }
  }

  UPDATE() {
    const store = this._getpos();
    for (let a = 0; a < this.joints.length; a++) {
      const da = this.joints[a].avel;
      if (da !== 0) {
        this.joints[a].angle += da;
        this.joints[a].shortrotate(da);
        this.joints[a].clear();
        if (this.joints[a].gear != null) this.joints[a].gear.rotate(da);
        for (const conn of this.joints[a].connections) {
          if (!conn.rotated) { conn.rotated = true; conn.giveconstraint(); }
        }
      }
    }
    let count = 1;
    while (count > 0) { count = this._cal1(); if (count === 0) count = this._guess(); }
    if (!this._isgood()) { this._updateall(store); this._reverse(); }
  }

  makelink(a, b) { if (a < this.joints.length && b < this.joints.length) this.links.push(new Linkage([this.joints[a], this.joints[b]])); }
  makelinks(g) { this.links.push(new Linkage(g.map(i => this.joints[i]))); }
  fix(i, sp = 0) { if (i < this.joints.length) { this.joints[i].isStatic = true; this.joints[i].avel = sp; } }
  makepath(a, b) { if (a < this.joints.length && b < this.joints.length) this.links.push(new Path(this.joints[a], this.joints[b])); }
  makejoin(ji, pi) { if (ji < this.joints.length && pi < this.links.length && this.links[pi].type === 'path') this.links[pi].join(this.joints[ji]); }
  gearjoin(a, b) { this.gears[a].checkconnect(this.gears[b]); }

  serialize(name = 'Untitled') {
    const ji = (j) => this.joints.indexOf(j);
    const gi = (g) => this.gears.indexOf(g);
    const joints = this.joints.map(j => ({ x: j.x, y: j.y, isStatic: j.isStatic, avel: j.avel, angle: j.angle, visible: j.visible }));
    const links = [], paths = [];
    for (const lk of this.links) {
      if (lk.type === 'link') links.push({ type: 'link', joints: lk.joints.map(j => ji(j)) });
      else if (lk.type === 'path') {
        const att = []; for (let i = 0; i < this.joints.length; i++) if (this.joints[i].pathparent === lk) att.push(i);
        paths.push({ p1: ji(lk.p1), p2: ji(lk.p2), attached: att });
      }
    }
    const gears = this.gears.map(g => ({ joint: ji(g.pos), teethno: g.teethno, connections: g.connections.map(c => gi(c)) }));
    return { version: 1, name, created: new Date().toISOString(), joints, links, gears, paths, startJoint: this.start ? ji(this.start) : -1 };
  }

  loadDesign(data) {
    this.updating = false; this.DeleteAll();
    for (const jd of data.joints) {
      const po = new Point(jd.x, jd.y); po.isStatic = jd.isStatic; po.avel = jd.avel; po.angle = jd.angle; po.visible = jd.visible;
      this.joints.push(po);
    }
    if (data.startJoint >= 0 && data.startJoint < this.joints.length) this.start = this.joints[data.startJoint];
    for (const gd of data.gears) if (gd.joint >= 0 && gd.joint < this.joints.length) this.gears.push(new Gear(this.joints[gd.joint], gd.teethno));
    for (let i = 0; i < data.gears.length; i++) for (const ci of data.gears[i].connections) if (ci > i && ci < this.gears.length) this.gears[i].checkconnect(this.gears[ci]);
    for (const ld of data.links) { const refs = ld.joints.map(i => this.joints[i]); if (refs.every(j => j != null)) this.links.push(new Linkage(refs)); }
    for (const pd of data.paths) { if (pd.p1 < this.joints.length && pd.p2 < this.joints.length) { const p = new Path(this.joints[pd.p1], this.joints[pd.p2]); this.links.push(p); for (const ai of pd.attached) if (ai < this.joints.length) p.join(this.joints[ai]); } }
    for (const j of this.joints) if (j.gear == null && j.shape == null) this.jointconnect(j);
  }
}

const mechanism = Mechanism;
