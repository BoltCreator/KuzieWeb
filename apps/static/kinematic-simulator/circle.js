class Circle {
  constructor(pos, radius) {
    this.pos = pos;
    this.r = radius;
  }

  colpoints(c) {
    const myvec = new Vec();
    const length = myvec.length(this.pos, c.pos);
    const trigs = this.getvals(this.r, c.r, length);
    const v = myvec.subtract(c.pos, this.pos);
    const p3 = myvec.add(this.pos, myvec.getVec(trigs[0], myvec.getAngle(v)));
    const an = myvec.getAngle(myvec.subtract(c.pos, this.pos));
    const a1 = myvec.add(myvec.getVec(trigs[1], an + Math.PI / 2), p3);
    const a2 = myvec.add(myvec.getVec(trigs[1], an - Math.PI / 2), p3);
    return [a1, a2];
  }

  linepoints(l) {
    const myvec = new Vec();
    const po = new Point(this.pos[0], this.pos[1]);
    const np = l.shortestpoint(po);
    const length = myvec.length(this.pos, np);
    const an = myvec.getAngle(myvec.subtract(np, this.pos));
    const opp = this.r ** 2 - length ** 2;
    const oppSqrt = Math.sqrt(opp);

    if (length <= this.r) {
      const a1 = myvec.add(myvec.getVec(oppSqrt, an + Math.PI / 2), np);
      const a2 = myvec.add(myvec.getVec(oppSqrt, an - Math.PI / 2), np);
      return [a1, a2];
    }
    return [[NaN, NaN]];
  }

  getvals(r1, r2, d) {
    const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
    const h = Math.sqrt(r1 ** 2 - a ** 2);
    return [a, h];
  }
}

// Keep backward-compatible name
const circle = Circle;
