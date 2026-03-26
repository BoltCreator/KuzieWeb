/**
 * Represents a single square on the chessboard.
 */
class Square {
  // Warm walnut board colours
  static COLORS = {
    dark:         '#a67b52',
    light:        '#e8d5b0',
    selected:     'rgba(100, 195, 100, 0.5)',
    focusedLight: '#e4d04c',
    focusedDark:  '#c9a83a',
  };

  constructor(pos, size, color = Square.COLORS.dark) {
    this.pos = pos;
    this.color = color;
    this.width = size;
    this.height = size;
    this.colorIndex = 0;
    this.piece = null;
    this.selected = false;
    this.focused = false;
  }

  getMid() {
    return [
      this.pos[0] + this.width / 2,
      this.pos[1] + this.height / 2,
    ];
  }

  setColor(index) {
    if (index === 1) {
      this.color = Square.COLORS.dark;
      this.colorIndex = 1;
    } else if (index === 2) {
      this.color = Square.COLORS.light;
      this.colorIndex = 2;
    }
  }

  collide(point) {
    const endX = this.pos[0] + this.width;
    const endY = this.pos[1] + this.height;
    return (
      point[0] >= this.pos[0] &&
      point[0] <= endX &&
      point[1] >= this.pos[1] &&
      point[1] <= endY
    );
  }

  draw(ctx) {
    ctx.beginPath();

    if (this.selected) {
      // Draw base colour first, then overlay the selected highlight
      ctx.fillStyle = this.color;
      ctx.fillRect(this.pos[0], this.pos[1], this.width, this.height);

      ctx.fillStyle = Square.COLORS.selected;
      ctx.fillRect(this.pos[0], this.pos[1], this.width, this.height);

      // Draw a small circle indicator for legal moves
      ctx.beginPath();
      const mid = this.getMid();
      if (this.piece) {
        // Capture indicator — ring around the square
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 3;
        ctx.arc(mid[0], mid[1], this.width * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Move indicator — small dot
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.arc(mid[0], mid[1], this.width * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.closePath();
      return;
    }

    if (this.focused) {
      ctx.fillStyle =
        this.colorIndex === 1
          ? Square.COLORS.focusedDark
          : Square.COLORS.focusedLight;
    } else {
      ctx.fillStyle = this.color;
    }

    ctx.fillRect(this.pos[0], this.pos[1], this.width, this.height);
    ctx.closePath();
  }
}
