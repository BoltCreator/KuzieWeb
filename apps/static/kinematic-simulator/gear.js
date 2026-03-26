class Gear {
  constructor(po, tno = 30) {
    this._myvec = new Vec();
    this.pos = po;
    this.type = 'gear';
    this.teethno = tno;
    this.size = 25;
    this.ratio = 0.5;
    this.color = '#84888e';
    this.angle = 0;
    this.da = 0;
    this.connections = [];
    this.rotated = false;
    this.pos.gear = this;
    this.points = [];

    this.pos.visible = false;
    this.pos.r = this.radius();
  }

  parameter() { return this.size * this.teethno; }
  radius() { return this.parameter() / (2 * Math.PI); }

  clear() {
    this.rotated = false;
    for (const conn of this.connections) {
      if (conn.rotated) conn.clear();
    }
  }

  rotate(da) {
    this.clear();
    this.rotateall(da);
    this.clear();
  }

  rotateall(da) {
    this.rotated = true;
    for (const conn of this.connections) {
      if (!conn.rotated) {
        const before = conn.pos.angle;
        conn.surfmove(this.getsmove(-da));
        conn.rotatekids(-da);
        const after = conn.pos.angle;
        conn.rotateall(after - before);
      }
    }
  }

  rotatekids(da) {
    this.pos.shortrotate(da);
    this.pos.clear();
    for (const conn of this.pos.connections) {
      if (!conn.rotated) {
        conn.rotated = true;
        conn.giveconstraint();
      }
    }
  }

  gearcollide(g) {
    const dist = this._myvec.length(this.pos.getpoint(), g.pos.getpoint());
    return dist <= this.radius() + g.radius() + 0.001;
  }

  checkconnect(g) {
    this.rotated = true;
    if (this.gearcollide(g)) {
      g.connections.push(this);
      this.connections.push(g);
      this.connect(g);
      g.push();
    }
    this.clear();
  }

  push() {
    this.rotated = true;
    for (let i = this.connections.length - 1; i >= 0; i--) {
      if (!this.connections[i].rotated) {
        if (this.gearcollide(this.connections[i])) {
          this.connect(this.connections[i]);
          this.connections[i].push();
        } else {
          this.connections[i].remove(this);
          this.remove(this.connections[i]);
        }
      }
    }
  }

  remove(g) {
    this.connections = this.connections.filter(c => c !== g);
  }

  removeall() {
    for (let i = this.connections.length - 1; i >= 0; i--) {
      this.connections[i].remove(this);
      this.remove(this.connections[i]);
    }
  }

  getpoint(an, d = 0) {
    const ve = this._myvec.getVec(this.radius() + d, an);
    return this._myvec.add(this.pos.getpoint(), ve);
  }

  dangle() { return (2 * Math.PI) / this.teethno; }

  drawteeth(an, dr) {
    let po = this.pos.getpoint();
    po = mech.toscreen(po);
    const r = this.radius();
    const ean = an + this.dangle();
    can.arc(po[0], po[1], (r + dr) * mech.scale, an, ean);
  }

  adjust(p1, p2) {
    const nr = this._myvec.length(this.pos.getpoint(), p2);
    const tno = this._getteethno(nr);
    this.teethno = this._makeeven(tno);
    this.pos.r = this.radius();
  }

  edgecollide(p) {
    const leng = this._myvec.length(p, this.pos.getpoint());
    return Math.abs(leng - this.radius()) <= 5;
  }

  update(p) { this.pos.update(p); }

  _makeeven(no) { return Math.round(no / 2) * 2; }

  _getteethno(r) { return (r * 2 * Math.PI) / this.size; }

  collide(p) { return this.pos.collide(p); }

  surfmove(ds) {
    const da = ds / this.radius();
    this.pos.angle += da;
  }

  getsmove(da) { return da * this.radius(); }

  connect(g) {
    const idl = this.radius() + g.radius();
    const dist = this._myvec.length(g.pos.getpoint(), this.pos.getpoint()) - idl;
    const mv = this._myvec.getVec(dist, this._myvec.angle(g.pos.getpoint(), this.pos.getpoint()));
    g.move(mv[0], mv[1]);
    const oth = this._myvec.angle(this.pos.getpoint(), g.pos.getpoint()) - this.pos.angle;
    g.pos.angle = this._myvec.angle(g.pos.getpoint(), this.pos.getpoint());
    g.surfmove(this.getsmove(oth));
  }

  move(dx, dy) { this.pos.move(dx, dy); }

  drawcenter() {
    let po = this.pos.getpoint();
    po = mech.toscreen(po);
    const r = this.radius() * 0.25 * mech.scale;
    can.arc(po[0], po[1], r, 0, 2 * Math.PI);
  }

  draw() {
    let an = this.pos.angle;
    can.fillStyle = this.color;
    can.strokeStyle = 'black';
    if (this.pos.selected) can.fillStyle = '#c2c9d3';

    can.beginPath();
    this.drawcenter();
    let dm = this.getpoint(an);
    dm = mech.toscreen(dm);
    can.moveTo(dm[0], dm[1]);

    let da = 5;
    for (let i = 0; i < this.teethno; i++) {
      this.drawteeth(an, da);
      da *= -1;
      an += this.dangle();
    }
    can.closePath();
    can.fill();
    can.stroke();
  }
}

// Backward-compatible alias
const gear = Gear;
