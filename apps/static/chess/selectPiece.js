/**
 * Renders a selection panel of pieces (used for promotion UI, etc.).
 * Currently not visible in the main UI but kept for API compatibility.
 */
class SelectPiece {
  constructor(pos, size) {
    this.pos = pos;
    this.width = size;
    this.height = size;
    this.size = size;
    this.pieces = [];
    this.squares = [];
    this.direction = 1;
    this.defaultPieces = [9, 5, 4, 3];
    this.ratio = 0.9;
    // Don't init — not used in current UI
  }

  getDefaultIndices() {
    return this.defaultPieces.map((value) => value * this.direction);
  }

  init() {
    this.pieces = [];
    this.squares = [];
  }

  draw(_ctx) {
    // No-op in redesigned UI
  }
}
