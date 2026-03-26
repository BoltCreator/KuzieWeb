// GUI classes — retained as stubs for backward compatibility.
// The HTML/CSS GUI in manageGUI.js replaces all canvas-drawn UI.

class Pos {
  constructor(x, y, width, height) {
    this.pos = [x, y]; this.width = width; this.height = height;
    this.Parent = null; this.visible = true;
    this.dx = 0; this.dy = 0;
  }
  isvisible() { return this.Parent == null ? this.visible : this.Parent.isvisible(); }
  getmid() { return [this.pos[0] + this.width / 2, this.pos[1] + this.height / 2]; }
  getpos() { return this.pos; }
  prepare() {} resize() {}
}

class Collider {
  constructor(pos) { this.rpos = pos; this.clicked = false; this.highlighted = false; this.tags = []; this.deps = []; }
  collide() { return false; }
  update() {}
  isgood() { return true; }
}

class TextBox { constructor() {} draw() {} }
class ImageBox { constructor() {} draw() {} }
class Drawer { constructor() {} draw() {} }
