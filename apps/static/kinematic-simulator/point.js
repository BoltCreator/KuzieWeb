class Point {
  constructor(x, y, base = null) {
    this.origin = base;
    this.type = 'point';
    this.x = x;
    this.y = y;
    this.avel = 0;
    this.angle = 0;
    this.path = null;
    this.gear = null;
    this.pushing = false;
    this.shape = null;
    this.color = 'blue';
    this.selected = false;
    this.connections = [];
    this.lengths = [];
    this.constraints = [];
    this.solved = false;
    this.isStatic = false;
    this.rotated = false;
    this.pos = [];
    this.visible = true;
    this.pathpoint = false;
    this.pathparent = null;
    this.pathchild = null;
    this.pathself = null;
    this.r = 20;
  }

  connect(po) {
    const myvec = new Vec();
    const p1 = this.getpoint();
    const p2 = po.getpoint();
    const l = myvec.length(p1, p2);
    this.connections.push(po);
    po.connections.push(this);
    this.lengths.push(l);
    po.lengths.push(l);
  }

  norm(l1, l2, p1, p2) {
    const myvec = new Vec();
    const vl = myvec.subtract(l2, l1);
    const vp = myvec.subtract(p2, p1);
    const an = myvec.getAngle(vl);
    return this._rot(vp[0], vp[1], -an);
  }

  conlength(j) {
    for (let i = 0; i < this.connections.length; i++) {
      if (j === this.connections[i]) return this.lengths[i];
    }
    return 0;
  }

  calibrate() {
    const store = [...this.connections];
    this.removeall();
    this.connectall(store);
  }

  getrotated() {
    for (const conn of this.connections) {
      if (conn.rotated) return conn;
    }
    return null;
  }

  remove(po) {
    const newC = [];
    const newL = [];
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i] !== po) {
        newC.push(this.connections[i]);
        newL.push(this.lengths[i]);
      }
    }
    this.connections = newC;
    this.lengths = newL;
  }

  removeboth(p) {
    p.remove(this);
    this.remove(p);
  }

  removeall() {
    for (let i = this.connections.length - 1; i >= 0; i--) {
      this.removeboth(this.connections[i]);
    }
  }

  isstill() {
    return this.isStatic || !this.visible;
  }

  connectall(points) {
    for (const p of points) {
      this.connect(p);
    }
  }

  rotateconnect(p1, p2) {
    const myvec = new Vec();
    for (let i = this.connections.length - 1; i >= 0; i--) {
      if (this.connections[i].isstill()) {
        const a1 = myvec.angle(this.connections[i].getpoint(), p1);
        const a2 = myvec.angle(this.connections[i].getpoint(), p2);
        const da = a2 - a1;
        if (!isNaN(da)) {
          this.connections[i].angle += da;
          if (this.connections[i].gear != null) {
            this.connections[i].gear.rotate(da);
          }
        }
      }
    }
  }

  staylinked(p) {
    const myvec = new Vec();
    this.rotated = true;
    this.face(p);
    const dmove = myvec.subtract(p, this.getpoint());
    const former = this.getpos();
    this.move(dmove[0], dmove[1]);
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i].rotated) {
        const sub = myvec.subtract(this.connections[i].getpoint(), former);
        const newpos = myvec.add(this.getpos(), sub);
        this.connections[i].staylinked(newpos);
      }
    }
  }

  guess() {
    const myvec = new Vec();
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.check(i)) {
        const po = this.connections[i].getpoint();
        const mpo = this.getpoint();
        const an = myvec.getAngle(myvec.subtract(mpo, po));
        const nv = myvec.getVec(this.lengths[i], an);
        const np = myvec.add(nv, po);
        this.update(np);
        this.rotated = true;
        this.giveconstraint();
        return true;
      }
    }
    return false;
  }

  check(i) {
    const myvec = new Vec();
    const leng = myvec.length(this.connections[i].getpoint(), this.getpoint());
    const diff = this.lengths[i] - leng;
    return Math.abs(diff) <= 0.01;
  }

  newrotate(da) {
    const myvec = new Vec();
    this.rotated = true;
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.connections[i].rotated) {
        const po = myvec.subtract(this.connections[i].getpoint(), this.getpoint());
        const a = this._rot(po[0], po[1], da);
        const result = myvec.add(a, this.getpoint());
        this.connections[i].followall(result);
      }
    }
    this.clear();
  }

  addconstraint(po, length) {
    const co = new Circle(po.getpoint(), length);
    this.constraints.push(co);
  }

  giveconstraint() {
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.connections[i].rotated) {
        this.connections[i].addconstraint(this, this.lengths[i]);
      }
    }
  }

  shortrotate(da) {
    for (const conn of this.connections) {
      if (!conn.isStatic) {
        conn.rotateabout(this, da);
      }
    }
  }

  rotate(da) {
    this.rotated = true;
    for (const conn of this.connections) {
      this.rotateabout(this, da);
    }
    this.clear();
  }

  rotateAbout(po, da) {
    const myvec = new Vec();
    this.rotated = true;
    const diff = myvec.subtract(this.getpoint(), po.getpoint());
    const ans = this._rot(diff[0], diff[1], da);
    const val = myvec.add(ans, po.getpoint());
    this.update(val);
    this.evalpos();
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.connections[i].rotated) {
        this.connections[i].addconstraint(this, this.lengths[i]);
        this.connections[i].rotateAbout(po, da);
      }
    }
  }

  rotateabout(po, da) {
    const myvec = new Vec();
    const diff = myvec.subtract(this.getpoint(), po.getpoint());
    const ans = this._rot(diff[0], diff[1], da);
    const val = myvec.add(ans, po.getpoint());
    this.update(val);
  }

  evalpos() {
    const myvec = new Vec();
    if (this.path != null && this.constraints.length === 1) {
      const c1 = this.constraints[0];
      const sols = c1.linepoints(this.path);
      const ans = this._getclose(this.getpoint(), sols);
      const p1 = this.getpoint();
      this.update(ans);
      this.rotateconnect(p1, this.getpoint());
    } else if (this.constraints.length > 1) {
      const c1 = this.constraints[0];
      const c2 = this.constraints[1];
      const sols = c1.colpoints(c2);
      const ans = this._getclose(this.getpoint(), sols);
      const p1 = this.getpoint();
      this.update(ans);
      this.rotateconnect(p1, this.getpoint());
    }
  }

  _getclose(pos, sols) {
    const myvec = new Vec();
    let ans = myvec.mag(myvec.subtract(pos, sols[0]));
    let ret = sols[0];
    for (let i = 1; i < sols.length; i++) {
      const diff = myvec.mag(myvec.subtract(pos, sols[i]));
      if (diff < ans) {
        ans = diff;
        ret = sols[i];
      }
    }
    return ret;
  }

  clear() {
    this.rotated = false;
    this.pos = [];
    this.constraints = [];
    for (const conn of this.connections) {
      if (conn.rotated) conn.clear();
    }
  }

  constraint() {
    this.rotated = true;
    this.adjust();
    this.clear();
  }

  adjust() {
    const myvec = new Vec();
    if (this.pos.length > 0) {
      const former = this.getpos();
      const current = this.pos;
      this.pos = [];
      this.rotated = true;
      for (let i = 0; i < this.connections.length; i++) {
        if (!this.connections[i].rotated) {
          const cpos = this.connections[i].getpos();
          const clength = myvec.length(former, cpos);
          const avec = myvec.minus(cpos, current);
          const an = myvec.getAngle(avec);
          const dv = myvec.getVec(clength, an);
          this.connections[i].pos = myvec.add(dv, cpos);
          this.connections[i].adjust();
        }
      }
      this.update(current);
    }
  }

  goodface(p) {
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.connections[i].rotated) {
        this.face(p, i);
      }
    }
  }

  face(p, i = 0) {
    const myvec = new Vec();
    if (this.connections.length > i) {
      const avec = myvec.subtract(p, this.connections[i].getpoint());
      const an = myvec.getAngle(avec);
      const clength = myvec.length(this.connections[i].getpoint(), this.getpoint());
      const dv = myvec.getVec(clength, an);
      const newpos = myvec.add(this.connections[i].getpoint(), dv);
      this.newupdate(newpos);
    }
  }

  moveto(p) {
    const myvec = new Vec();
    const diff = myvec.subtract(p, this.getpoint());
    this.move(diff[0], diff[1]);
  }

  moveall(v) {
    this.rotated = true;
    this.move(v[0], v[1]);
    for (const conn of this.connections) {
      if (!conn.rotated) conn.moveall(v);
    }
  }

  moveallto(p) {
    const myvec = new Vec();
    const diff = myvec.subtract(p, this.getpoint());
    this.moveall(diff);
  }

  followall(p, _i = 0) {
    const myvec = new Vec();
    this.rotated = true;
    this.goodface(p);
    const dmove = myvec.subtract(p, this.getpoint());
    const former = this.getpos();
    this.move(dmove[0], dmove[1]);
    for (let i = 0; i < this.connections.length; i++) {
      if (!this.connections[i].rotated) {
        const sub = myvec.subtract(this.connections[i].getpoint(), former);
        const newpos = myvec.add(this.getpos(), sub);
        this.connections[i].followall(newpos);
      }
    }
  }

  follow(p) {
    this.face(p);
    this.moveto(p);
  }

  newupdate(p) {
    this.update(p);
  }

  minus(po) {
    const p1 = po.getpoint();
    const sp = this.getpoint();
    return [sp[0] - p1[0], sp[1] - p1[1]];
  }

  update(ans) {
    this.x = ans[0];
    this.y = ans[1];
  }

  _rot(x, y, angle) {
    return [
      x * Math.cos(angle) - y * Math.sin(angle),
      y * Math.cos(angle) + x * Math.sin(angle),
    ];
  }

  getangle() {
    if (this.origin == null) return this.angle;
    return this.angle + this.origin.getangle();
  }

  addorigin(p) {
    p.origin = this;
  }

  pushorigin(p) {
    if (this.origin == null) {
      this.origin = p;
    } else {
      this.origin.pushorigin(p);
    }
  }

  _oval(x, y, w, h) {
    can.beginPath();
    can.ellipse(x, y, w / 2, h / 2, 0, 0, 2 * Math.PI);
    can.closePath();
  }

  collide(p) {
    const myvec = new Vec();
    const pos = this.getpoint();
    return myvec.length(pos, p) <= this.r;
  }

  draw() {
    if (!this.visible) return;

    can.fillStyle = this.color;
    can.strokeStyle = 'gray';

    if (this.selected) can.fillStyle = 'yellow';
    if (this.pathpoint) {
      can.fillStyle = 'black';
      can.strokeStyle = 'black';
    }

    let pos = this.getpoint();
    pos = mech.toscreen(pos);

    if (this.pathpoint) {
      this._oval(pos[0], pos[1], 5 * mech.scale, 5 * mech.scale);
    } else {
      this._oval(pos[0], pos[1], 2 * this.r * mech.scale, 2 * this.r * mech.scale);
    }
    can.fill();
    can.stroke();
  }

  diameter() {
    return 2 * this.r;
  }

  getpoint() {
    let ans = [this.x, this.y];
    if (this.origin != null) {
      ans = this._rot(this.x, this.y, this.origin.getangle());
      const op = this.origin.getpoint();
      ans = [ans[0] + op[0], ans[1] + op[1]];
    }
    return ans;
  }

  getpos() {
    return [this.x, this.y];
  }

  copy() {
    const po = this.getpoint();
    return new Point(po[0], po[1]);
  }

  addto(v) {
    const gp = this.getpoint();
    return new Point(gp[0] + v[0], gp[1] + v[1]);
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
}

// Backward-compatible alias
const point = Point;
