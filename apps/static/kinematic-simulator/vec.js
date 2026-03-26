class Vec {
  getAngle(v) {
    let [x, y] = v;
    if (x === 0) x = 0.0001;

    let a = Math.atan(y / x);
    if (x > 0) a += Math.PI;
    a -= Math.PI;

    if (a >= 2 * Math.PI) a -= 2 * Math.PI;
    if (a < 0) a += 2 * Math.PI;

    return a;
  }

  angle(p1, p2) {
    const v = [p2[0] - p1[0], p2[1] - p1[1]];
    return this.getAngle(v);
  }

  aDiff(vec1, vec2) {
    return Math.abs(this.getAngle(vec1) - this.getAngle(vec2));
  }

  mult(v, m) {
    return this.getVec(m * this.mag(v), this.getAngle(v));
  }

  length(vec1, vec2) {
    return Math.hypot(vec2[0] - vec1[0], vec2[1] - vec1[1]);
  }

  mid(p1, p2) {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  mag(v) {
    return Math.hypot(...v);
  }

  distance(vec1, vec2) {
    return this.mag(vec2.map((val, i) => val - vec1[i]));
  }

  dot(vec1, vec2) {
    return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  }

  minus(vec1, vec2) {
    const newV = this.norm(vec2, vec1);
    return vec1.map((val, i) => val - newV[i]);
  }

  add(vec1, vec2) {
    return vec1.map((val, i) => val + vec2[i]);
  }

  subtract(vec1, vec2) {
    return vec1.map((val, i) => val - vec2[i]);
  }

  newAngle(l1, l2) {
    const magn = this.mag(l1) * this.mag(l2);
    return Math.acos(this.dot(l1, l2) / magn);
  }

  angleBetween(vec1, vec2) {
    return this.newAngle(vec1, vec2);
  }

  norm(vec, line) {
    if (this.mag(vec) === 0 || this.mag(line) === 0) return vec;
    const diffA = this.newAngle(vec, line);
    const newL = this.mag(vec) * Math.cos(diffA);
    return this.getVec(newL, this.getAngle(line));
  }

  opp(vec, line) {
    return this.norm(vec, this.rot(line, 0.5 * Math.PI));
  }

  rot(v, angle) {
    return [
      v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
      v[1] * Math.cos(angle) + v[0] * Math.sin(angle),
    ];
  }

  alignTo(vec1, vec2) {
    return this.rot(vec1, -this.getAngle(vec2));
  }

  getVec(length, angle) {
    return this.rot([length, 0], angle);
  }

  isFacing(v1, v2) {
    return Math.abs(this.newAngle(v1, v2)) < Math.PI / 2;
  }

  correct(v) {
    if (v[0] === 0) v[0] = 0.0001;
    return v;
  }
}

// Keep backward-compatible global name
const vec = Vec;
