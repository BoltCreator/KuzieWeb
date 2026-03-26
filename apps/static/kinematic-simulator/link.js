class Linkage {
  constructor(groups) {
    this._myvec = new Vec();
    this.scale = 3;
    this.width = 0;
    this.selected = false;
    this.edges = [];
    this.joints = [];
    this.color = '#84888e';
    this.type = 'link';

    for (const group of groups) {
      this.joints.push(group);
      if (group.diameter() > this.width) {
        this.width = group.diameter();
      }
    }
    this.width *= this.scale;

    for (let a = 0; a < this.joints.length - 1; a++) {
      for (let b = a + 1; b < this.joints.length; b++) {
        this.joints[a].connect(this.joints[b]);
      }
    }
  }

  check() {
    for (let a = 0; a < this.joints.length - 1; a++) {
      for (let b = a + 1; b < this.joints.length; b++) {
        const diff = this.joints[a].conlength(this.joints[b]) -
          this._myvec.length(this.joints[a].getpoint(), this.joints[b].getpoint());
        if (Math.abs(diff) > 0.01) return false;
      }
    }
    return true;
  }

  Delete() {
    for (let a = 0; a < this.joints.length - 1; a++) {
      for (let b = a + 1; b < this.joints.length; b++) {
        this.joints[a].removeboth(this.joints[b]);
      }
    }
  }

  move(dx, dy, mec = null) {
    for (const joint of this.joints) {
      joint.move(dx, dy);
      if (mec != null) mec.jointdrag(joint);
    }
  }

  ischild() { return false; }

  connect(j) {
    for (const joint of this.joints) joint.connect(j);
  }

  removeboth(j) {
    for (const joint of this.joints) joint.removeboth(j);
  }

  contains(j) {
    return this.joints.includes(j);
  }

  addjoints(j) {
    if (!this.joints.includes(j)) {
      if (j.diameter() > this.width / this.scale) {
        this.width = j.diameter() * this.scale;
      }
      this.joints.push(j);
    }
  }

  checkWidth(w) {
    return this.joints.every(j => j.diameter() < w);
  }

  _getnext(i, leng = this.joints.length) {
    return i >= leng - 1 ? 0 : i + 1;
  }

  getpoints() {
    const ans = [];
    let diff = Math.PI / 2;
    if (this.joints.length > 2) diff = this._getdiff();

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

  _getdiff() {
    let a = 0;
    let b = 0;
    const c = this.center();
    const cPoint = new Point(c[0], c[1]);

    for (let i = 0; i < this.joints.length; i++) {
      const j = this.joints[this._getnext(i)];
      const tl = new Line(this.joints[i], j);
      const po = tl.shortestpoint(cPoint);
      if (po != null) {
        const A = this._myvec.angle(this.joints[i].getpoint(), j.getpoint());
        const an = this._myvec.angle(po, cPoint.getpoint());
        if (an - A > 0) a++;
        else b++;
      }
    }
    return a >= b ? -Math.PI / 2 : Math.PI / 2;
  }

  collide(p) {
    let count = 0;
    const points = this.getpoints();
    for (let i = 0; i < points.length; i++) {
      const npo = points[this._getnext(i, points.length)];
      const tl = new Line(
        new Point(points[i][0], points[i][1]),
        new Point(npo[0], npo[1])
      );
      if (tl.rayshoot(p, [1.001, 0.102])) count++;
    }
    return count % 2 === 1;
  }

  center() {
    const sum = [0, 0];
    for (const joint of this.joints) {
      const pos = joint.getpoint();
      sum[0] += pos[0];
      sum[1] += pos[1];
    }
    return [sum[0] / this.joints.length, sum[1] / this.joints.length];
  }

  draw() {
    can.fillStyle = this.color;
    can.strokeStyle = 'black';
    if (this.selected) can.fillStyle = '#bcbfc4';

    let points = this.getpoints();
    points = this._scalepoints(points);
    this._drawpoints(points);
    can.stroke();
    this._drawjoints(false);
    this._drawpoints(points);
    can.fill();
    this._drawjoints();
  }

  _drawpoints(points) {
    can.beginPath();
    can.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      can.lineTo(points[i][0], points[i][1]);
    }
    can.closePath();
  }

  _scalepoints(points) {
    return points.map(p => mech.toscreen(p));
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
const linkage = Linkage;
