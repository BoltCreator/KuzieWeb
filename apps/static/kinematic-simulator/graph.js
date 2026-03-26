class Graph {
  constructor() {
    this.points = [];
    this.lines = [];
  }

  setup(info) {
    for (const cu of info) {
      if (cu[0] < this.points.length) {
        this.points[cu[0]].avel = cu[1];
      }
    }
  }

  addNode(p) {
    this.points.push(new Point(p[0], p[1]));
  }

  addEdge(a, b) {
    if (this.points.length > a && this.points.length > b) {
      this.points[a].connect(this.points[b]);
      this.lines.push(new Line(this.points[a], this.points[b]));
    }
  }

  fix(index, avel = null) {
    if (this.points.length > index) {
      this.points[index].isStatic = true;
      if (avel != null) this.points[index].avel = avel;
    }
  }

  addconstraints() {
    for (const po of this.points) {
      if (po.isStatic) {
        po.rotated = true;
        for (let j = 0; j < po.connections.length; j++) {
          po.connections[j].addconstraint(po, po.lengths[j]);
        }
      }
    }
  }

  draw() {
    for (const l of this.lines) l.draw();
  }

  move(dx, dy) {
    for (const p of this.points) p.move(dx, dy);
  }

  rotate(da, index = 0) {
    if (this.points.length > index) {
      this.addconstraints();
      this.points[index].rotateAbout(this.points[index], da);
      this.points[index].clear();
    }
  }

  reverse() {
    for (const p of this.points) p.avel *= -1;
  }

  update() {
    const store = this.getpos();
    for (let a = 0; a < this.points.length; a++) {
      const da = this.points[a].avel;
      if (da !== 0) {
        this.points[a].shortrotate(da);
        this.points[a].clear();
        for (const conn of this.points[a].connections) {
          if (!conn.rotated) {
            conn.rotated = true;
            conn.giveconstraint();
          }
        }
      }
    }
    let count = 1;
    while (count > 0) {
      count = this._cal1();
      if (count === 0) count = this._guess();
    }
    if (!this._isgood()) {
      this._updateall(store);
      this.reverse();
    }
  }

  _guess() {
    for (const p of this.points) {
      if (!p.rotated && p.guess()) return 1;
    }
    return 0;
  }

  _cal1(index = -1) {
    let count = 0;
    for (let i = 0; i < this.points.length; i++) {
      if (!this.points[i].rotated) {
        if (this.points[i].isStatic || this.points[i].avel !== 0 || i === index) {
          this.points[i].rotated = true;
          this.points[i].giveconstraint();
          count++;
        } else if (this.points[i].constraints.length > 1 ||
                   (this.points[i].constraints.length === 1 && this.points[i].path != null)) {
          this.points[i].evalpos();
          this.points[i].rotated = true;
          this.points[i].giveconstraint();
          count++;
        }
      }
    }
    return count;
  }

  getpos() {
    return this.points.map(p => p.getpoint());
  }

  _updateall(pos) {
    if (pos.length === this.points.length) {
      for (let i = 0; i < this.points.length; i++) {
        this.points[i].update(pos[i]);
      }
    }
  }

  _isgood() {
    for (const p of this.points) {
      const pt = p.getpoint();
      if (isNaN(pt[0]) || isNaN(pt[1])) return false;
      if (p.path != null && !p.path.isInside(pt)) return false;
    }
    return true;
  }
}
