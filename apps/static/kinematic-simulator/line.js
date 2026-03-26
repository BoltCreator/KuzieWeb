class Line {
  constructor(p1, p2, dir = 1) {
    this._myvec = new Vec();
    this.p1 = p1;
    this.p2 = p2;
    this.type = 'line';
    this.index = 1;
    this.dir = dir;
    this.initlength = this._myvec.length(p1.getpoint(), p2.getpoint());
  }

  getvec() {
    const P1 = this.p1.getpoint();
    const P2 = this.p2.getpoint();
    return [P2[0] - P1[0], P2[1] - P1[1]];
  }

  getangle() {
    return this._myvec.getAngle(this.getvec());
  }

  P1() { return this.p1.getpoint(); }
  P2() { return this.p2.getpoint(); }

  push(p1, p2) {
    const an = this._myvec.getAngle(this._myvec.subtract(p2, p1));
    this.face(an);
  }

  check() {
    return Math.abs(this.initlength - this.length()) <= 0.01;
  }

  face(angle) {
    const nv = this._myvec.getVec(this.initlength, angle);
    const np2 = this._myvec.add(nv, this.P1());
    this.p2.update(np2);
  }

  length() {
    const x = Math.abs(this.P2()[0] - this.P1()[0]);
    const y = Math.abs(this.P2()[1] - this.P1()[1]);
    return Math.hypot(x, y);
  }

  shortdistance(p) {
    const ret = this.facingdistance(p);
    if (p1[0] >= this.P1()[0] && p1[0] <= this.P1()[0] + this.length()) {
      return ret;
    }
    return null;
  }

  rayshoot(p, v = [1, 1.01]) {
    const pos = new Point(p[0], p[1]);
    const newl = new Line(pos.copy(), pos.addto(v));
    const ans = this.intersect(newl);
    return newl.isfacing(ans) && this.isInside(ans);
  }

  shortestpoint(pos) {
    const an = this.getangle() + Math.PI / 2;
    const v = this._myvec.getVec(1, an);
    const newl = new Line(pos.copy(), pos.addto(v));
    return this.doubleshoot(newl);
  }

  copy() {
    return new Line(this.p1.copy(), this.p2.copy());
  }

  move(v) {
    this.p1.move(v[0], v[1]);
    this.p2.move(v[0], v[1]);
  }

  facingdistance(p) {
    const p1 = p.getpoint();
    const pv = this._myvec.subtract(p1, this.P1());
    const rotated = this._myvec.rot(pv, -this._myvec.getAngle(this.getvec()));
    const newP1 = this._myvec.add(this.P1(), rotated);
    return newP1[1] - this.P1()[1];
  }

  isFacing(p) {
    const distance = this.facingdistance(p);
    if (distance == null) return false;
    if (this.dir === 1 && distance >= 0) return true;
    if (this.dir === 2 && distance <= 0) return true;
    return false;
  }

  shoot(l) {
    const ans = this.intersect(l);
    const tp = new Point(ans[0], ans[1]);
    if (this.isfacing(tp) && l.isInside(ans)) return ans;
    return null;
  }

  doubleshoot(l) {
    return this.intersect(l);
  }

  _calparam(p1, p2) {
    let dinum = p2[0] - p1[0];
    if (dinum === 0) dinum = 0.000001;
    const m = (p2[1] - p1[1]) / dinum;
    const c = p1[1] - m * p1[0];
    return [m, c];
  }

  intersect(l) {
    const C1 = this._calparam(this.p1.getpoint(), this.p2.getpoint());
    const C2 = this._calparam(l.p1.getpoint(), l.p2.getpoint());
    let g = C2[0] - C1[0];
    if (g === 0) g = 0.00001;
    const x = (C1[1] - C2[1]) / g;
    const y = C1[0] * x + C1[1];
    return [x, y];
  }

  isInside(p) {
    const p1 = this.p1.getpoint();
    const p2 = this.p2.getpoint();
    if (this._myvec.length(p1, p) === 0 || this._myvec.length(p2, p) === 0) return true;
    if (Math.abs(this._myvec.angle(p1, p2) - this._myvec.angle(p1, p)) < 0.01) {
      if (Math.abs(this._myvec.angle(p2, p1) - this._myvec.angle(p2, p)) < 0.01) return true;
    }
    return false;
  }

  isfacing(p) {
    const p1 = this.p1.getpoint();
    const p2 = this.p2.getpoint();
    // p can be a Point object or a plain array
    const pp = (p && typeof p.getpoint === 'function') ? p.getpoint() : p;
    if (this._myvec.length(p1, pp) === 0 || this._myvec.length(p2, pp) === 0) return true;
    if (Math.abs(this._myvec.angle(p1, p2) - this._myvec.angle(p1, pp)) < 0.01) return true;
    return false;
  }

  draw(c = '#000000') {
    let p1 = this.p1.getpoint();
    let p2 = this.p2.getpoint();
    p1 = mech.toscreen(p1);
    p2 = mech.toscreen(p2);
    can.strokeStyle = c;
    can.beginPath();
    can.lineWidth = 2;
    can.moveTo(p1[0], p1[1]);
    can.lineTo(p2[0], p2[1]);
    can.stroke();
    can.closePath();
  }
}

// Backward-compatible alias
const line = Line;
