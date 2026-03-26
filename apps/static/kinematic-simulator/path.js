class Path {
  constructor(p1, p2) {
    this._myvec = new Vec();
    this.p1 = p1;
    this.p2 = p2;
    this.type = 'path';
    this.line = new Line(p1, p2);
    this.joints = [this.p1, this.p2];
    this.width = p1.diameter();
    this.selected = false;
    this.points = [p1, p2];

    this.p1.pathpoint = true;
    this.p2.pathpoint = true;
    this.p1.pathself = this;
    this.p2.pathself = this;
  }

  collide(p) {
    const po = new Point(p[0], p[1]);
    const np = this.line.shortestpoint(po);
    if (np != null) {
      if (this._myvec.length(np, p) <= this.width / 2 && this.line.isInside(np)) {
        return true;
      }
    }
    return false;
  }

  join(po) {
    if (po.shape == null) {
      po.path = this.line;
      po.pathparent = this;
      this.align(po);
    }
  }

  check() { return true; }

  ischild() {
    return this.points.every(p => p.shape != null);
  }

  Delete() {
    this.p1.removeboth(this.p2);
  }

  allrotated() {
    return this.points.every(p => p.rotated);
  }

  move(dx, dy, mec = null) {
    for (const p of this.points) {
      p.move(dx, dy);
      if (mec != null) mec.jointdrag(p);
    }
  }

  getother() {}

  adjustself(p) {
    const ans = this._getrotated();
    if (ans != null) {
      const an = this._myvec.angle(ans.getpoint(), p.getpoint());
      for (const pt of this.points) {
        const leng = this._myvec.length(ans.getpoint(), pt.getpoint());
        const vect = this._myvec.getVec(leng, an);
        const newv = this._myvec.add(ans.getpoint(), vect);
        pt.update(ans);
      }
    }
  }

  _getrotated() {
    for (const pt of this.points) {
      const ans = pt.getrotated();
      if (ans != null) return ans;
    }
    return null;
  }

  adjust(p) {
    const np = this.line.shortestpoint(p);
    let vec = this._myvec.subtract(np, p.getpoint());
    if (!this.line.isInside(np)) {
      vec = this._myvec.add(this._moveto(np), vec);
    }
    return vec;
  }

  _moveto(p) {
    let ans = [0, 0];
    let dist = null;
    for (const pt of this.points) {
      const leng = this._myvec.length(p, pt.getpoint());
      if (dist == null || dist > leng) {
        dist = leng;
        ans = this._myvec.subtract(pt.getpoint(), p);
      }
    }
    return ans;
  }

  align(j) {
    const vec = this.adjust(j);
    j.move(vec[0], vec[1]);
  }

  _getnext(i, leng = this.joints.length) {
    return i >= leng - 1 ? 0 : i + 1;
  }

  getpoints() {
    const ans = [];
    const diff = Math.PI / 2;
    for (let i = 0; i < this.joints.length; i++) {
      const j = this.joints[this._getnext(i)];
      const an = this._myvec.angle(this.joints[i].getpoint(), j.getpoint());
      const dm = this._myvec.getVec(this.width / 2, an + diff);
      const n1 = this.joints[i].copy();
      const n2 = j.copy();
      n1.move(dm[0], dm[1]);
      n2.move(dm[0], dm[1]);
      ans.push(n1.getpoint());
      ans.push(n2.getpoint());
    }
    return ans;
  }

  _scalepoints(points) {
    return points.map(p => mech.toscreen(p));
  }

  draw() {
    can.fillStyle = 'white';
    can.strokeStyle = 'black';
    if (this.selected) {
      can.fillStyle = 'white';
      can.strokeStyle = 'yellow';
    }
    let points = this.getpoints();
    points = this._scalepoints(points);
    this._drawpoints(points);
    can.stroke();
    this._drawjoints(false);
    this._drawpoints(points);
    can.fill();
    this._drawjoints();
    this.line.draw();
  }

  _drawpoints(points) {
    can.beginPath();
    can.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      can.lineTo(points[i][0], points[i][1]);
    }
    can.closePath();
  }

  _oval(x, y, w, h) {
    can.beginPath();
    can.ellipse(x, y, w / 2, h / 2, 0, 0, 2 * Math.PI);
    can.closePath();
  }

  _drawjoints(f = true) {
    for (const joint of this.joints) {
      let pos = joint.getpoint();
      pos = mech.toscreen(pos);
      this._oval(pos[0], pos[1], this.width * mech.scale, this.width * mech.scale);
      if (f) can.fill();
      else can.stroke();
    }
  }
}

// Backward-compatible alias
const path = Path;
