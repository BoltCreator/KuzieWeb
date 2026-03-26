// Button class — retained as stub for backward compatibility.
// All UI buttons are now HTML elements styled with CSS.

class Button {
  constructor(x, y, width, height, t = 'TEXT') {
    this.pos = [x, y]; this.width = width; this.height = height; this.word = t;
    this.highlighted = false; this.clicked = false;
  }
  collide() { return false; }
  draw() {}
}
