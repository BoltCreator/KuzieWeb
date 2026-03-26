/**
 * Represents a chess piece with its image and position.
 *
 * Piece indices:
 *   1 = Pawn, 3 = Knight, 4 = Bishop, 5 = Rook, 9 = Queen, >10 = King
 *   Positive = white, Negative = black
 */
class Piece {
  static IMAGE_MAP = {
    1:    'img/wP.png',
    3:    'img/wN.png',
    4:    'img/wB.png',
    5:    'img/wR.png',
    9:    'img/wQ.png',
    '-1': 'img/bP.png',
    '-3': 'img/bN.png',
    '-4': 'img/bB.png',
    '-5': 'img/bR.png',
    '-9': 'img/bQ.png',
  };

  // Unicode fallbacks if images fail to load
  static UNICODE_MAP = {
    1:  '♙', 3:  '♘', 4:  '♗', 5:  '♖', 9:  '♕',
    '-1':'♟', '-3':'♞', '-4':'♝', '-5':'♜', '-9':'♛',
  };

  /**
   * Static image cache: once an image for a given src is loaded, every
   * subsequent Piece with the same index reuses the cached Image object.
   * This eliminates the 1-2 frame flicker (Unicode fallback → image)
   * that occurred when syncFromGrid destroyed and recreated all pieces
   * after every AI move.
   */
  static _imageCache = {};

  static getCachedImage(src) {
    if (Piece._imageCache[src]) {
      return Piece._imageCache[src];
    }
    const img = new Image();
    img.src = src;
    Piece._imageCache[src] = img;
    return img;
  }

  constructor(index, pos, size = 100) {
    this.pos = [...pos];
    this.index = index;
    this.size = size;
    this.img = null;
    this.sq = null;
    this.loadImage();
  }

  loadImage() {
    const absIndex = Math.abs(this.index);
    let src;

    if (absIndex > 10) {
      src = this.index > 0 ? 'img/wK.png' : 'img/bK.png';
    } else {
      const key = this.index > 0 ? absIndex : -absIndex;
      src = Piece.IMAGE_MAP[key];
    }

    if (src) {
      this.img = Piece.getCachedImage(src);
    }
  }

  /** True when the image is decoded and ready to draw. */
  get imgLoaded() {
    return this.img && this.img.complete && this.img.naturalWidth > 0;
  }

  /** Update position so the piece is centred on the given point. */
  updateMid(point) {
    this.pos = [point[0] - this.size / 2, point[1] - this.size / 2];
  }

  /** Return the centre of the piece. */
  getMid() {
    return [this.pos[0] + this.size / 2, this.pos[1] + this.size / 2];
  }

  /** Snap the piece back to its assigned square. */
  revert() {
    if (this.sq) {
      this.updateMid(this.sq.getMid());
      this.sq.focused = false;
      this.sq.piece = this;
    }
  }

  move(dx, dy) {
    this.pos[0] += dx;
    this.pos[1] += dy;
  }

  draw(ctx, dragging = false) {
    if (dragging) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 6;
    }

    if (this.imgLoaded) {
      ctx.drawImage(this.img, this.pos[0], this.pos[1], this.size, this.size);
    } else {
      // Unicode fallback
      const absIndex = Math.abs(this.index);
      let key;
      if (absIndex > 10) {
        key = this.index > 0 ? 'K' : '-K';
      } else {
        key = this.index > 0 ? String(absIndex) : String(-absIndex);
      }

      const unicodeKing = this.index > 0 ? '♔' : '♚';
      const ch = absIndex > 10
        ? unicodeKing
        : (Piece.UNICODE_MAP[key] || '?');

      ctx.font = `${this.size * 0.75}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.index > 0 ? '#f5f0e8' : '#1a1a1a';
      ctx.fillText(
        ch,
        this.pos[0] + this.size / 2,
        this.pos[1] + this.size / 2 + 2
      );
    }

    if (dragging) {
      ctx.restore();
    }
  }
}
