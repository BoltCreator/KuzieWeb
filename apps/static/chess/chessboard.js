/**
 * Visual chessboard — bridges the UI (canvas) with the move generator / AI.
 *
 * Promotion: When a human pawn reaches the last rank, the move is held in
 * a "pendingPromotion" state and a chooser overlay is drawn on the canvas.
 * The player clicks one of the four piece options to complete the move.
 * The AI passes its chosen promotion piece through executeMove.
 */
class Chessboard {
  static DEFAULT_POSITION = [
    [-5, -3, -4, -9, -45, -4, -3, -5],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [5, 3, 4, 9, 45, 4, 3, 5],
  ];

  static PROMO_PIECES = [9, 5, 4, 3]; // Queen, Rook, Bishop, Knight

  constructor(pos, size) {
    this.boardSize = 8;
    this.pos = pos;
    this.width = size;
    this.height = size;
    this.pieces = [];
    this.squares = [];
    this.currentPiece = null;
    this.moveGen = new MoveGenerator();
    this.ai = new Brain();
    this.selected = false;
    this.turn = 0;
    this.mouse = [0, 0];
    this.ratio = 0.88;
    this.maxCooldown = 2;
    this.cooldown = this.maxCooldown;
    this.flipped = false;
    this.gameover = false;

    // Promotion chooser state
    this.pendingPromotion = null;

    // Premove system
    this.premoves = [];           // array of { from: [x,y], to: [x,y] }
    this.premovesEnabled = false;
    this.premovePiece = null;     // piece currently being dragged for premove
    this.premoveOriginSq = null;  // square it was picked up from
  }

  // ── Coordinate helpers ──────────────────────────────────────────────

  pixelToIndex(pos) {
    const cellW = this.width / this.boardSize;
    const cellH = this.height / this.boardSize;
    let x = Math.floor((pos[0] - this.pos[0]) / cellW);
    let y = Math.floor((pos[1] - this.pos[1]) / cellH);
    if (this.flipped) y = 7 - y;
    return [x, y];
  }

  getSquareAt(x, y) {
    const i = y * this.boardSize + x;
    if (x < 0 || y < 0 || x >= this.boardSize || y >= this.boardSize) return null;
    return i < this.squares.length ? this.squares[i] : null;
  }

  clickToSquare(pos) {
    const [x, y] = this.pixelToIndex(pos);
    return this.getSquareAt(x, y);
  }

  cellSize() {
    return this.width / this.boardSize;
  }

  // ── Mouse interaction ───────────────────────────────────────────────

  mouseUp(pos) {
    // Promotion chooser
    if (this.pendingPromotion) {
      this.handlePromoClick(pos);
      return;
    }

    // ── Premove drop ────────────────────────────────────────────────
    if (this.premovePiece) {
      const sq = this.clickToSquare(pos);
      const fromCoord = this.pixelToIndex(this.premoveOriginSq.getMid());

      if (sq && sq !== this.premoveOriginSq) {
        const toCoord = this.pixelToIndex(sq.getMid());
        // Don't premove to own piece square (same color)
        this.premoves.push({ from: [...fromCoord], to: [...toCoord] });
      }

      // Revert piece visually back to its original square
      this.premovePiece.updateMid(this.premoveOriginSq.getMid());
      this.premoveOriginSq.piece = this.premovePiece;
      this.premovePiece.sq = this.premoveOriginSq;
      this.pieces.push(this.premovePiece);
      this.premovePiece = null;
      this.premoveOriginSq = null;
      this.mouse = [...pos];
      return;
    }

    // ── Normal move ─────────────────────────────────────────────────
    if (this.currentPiece) {
      const sq = this.getDropSquare(this.currentPiece, pos);

      if (!sq || sq === this.currentPiece.sq) {
        this.currentPiece.revert();
        this.pieces.push(this.currentPiece);
      } else {
        const from = this.pixelToIndex(this.currentPiece.sq.getMid());
        const to = this.pixelToIndex(sq.getMid());
        const absP = Math.abs(this.currentPiece.index);
        const isPromo = absP === 1 && (to[1] === 0 || to[1] === 7);

        if (isPromo) {
          this.pendingPromotion = {
            from, to,
            sign: this.currentPiece.index > 0 ? 1 : -1,
            sq, piece: this.currentPiece,
            originSq: this.currentPiece.sq,
          };
          if (sq.piece) {
            const idx = this.pieces.indexOf(sq.piece);
            if (idx !== -1) this.pieces.splice(idx, 1);
          }
          this.currentPiece.updateMid(sq.getMid());
          this.pieces.push(this.currentPiece);
          this.currentPiece = null;
          this.mouse = [...pos];
          this.clearSelection();
          return;
        }

        // Player is making a real move — clear premoves
        this.premoves = [];

        this.moveGen.makeMove(from, to);
        this.clearFocus();
        sq.focused = true;
        this.currentPiece.sq.focused = true;

        if (sq.piece) {
          const idx = this.pieces.indexOf(sq.piece);
          if (idx !== -1) this.pieces.splice(idx, 1);
        }

        this.currentPiece.updateMid(sq.getMid());
        this.handleCastling(this.currentPiece, sq);
        this.currentPiece.sq = sq;
        sq.piece = this.currentPiece;
        this.pieces.push(this.currentPiece);
        this.turn++;

        this.syncFromGrid(this.moveGen.getGrid());
        this.turn = this.moveGen.turn;
      }

      this.currentPiece = null;
    }

    this.mouse = [...pos];
    this.clearSelection();
  }

  mouseMove(pos) {
    if (this.pendingPromotion) {
      this.mouse = [...pos];
      return 'pointer';
    }
    const movingPiece = this.currentPiece || this.premovePiece;
    if (movingPiece) {
      const dx = pos[0] - this.mouse[0];
      const dy = pos[1] - this.mouse[1];
      movingPiece.move(dx, dy);
      this.mouse = [...pos];
      return 'grabbing';
    }
    this.mouse = [...pos];
    return this.getCursorStyle(pos);
  }

  mouseDown(pos) {
    if (this.pendingPromotion) return 'pointer';
    this.mouse = [...pos];
    const sq = this.clickToSquare(pos);
    if (!sq?.piece) return this.getCursorStyle(pos);

    const isWhitePiece = sq.piece.index > 0;
    const isWhiteTurn = this.turn % 2 === 0;
    const isActiveTurnPiece = isWhitePiece === isWhiteTurn;

    // Normal move: own piece on own turn with no premoves queued
    if (isActiveTurnPiece && this.premoves.length === 0) {
      this.clearSelection();
      this.showLegalMoves(sq);
      sq.focused = true;
      this.currentPiece = sq.piece;
      this.pieces.splice(this.pieces.indexOf(sq.piece), 1);
      sq.piece = null;
      return 'grabbing';
    }

    // Premove: pick up OWN piece for premove queuing
    // This fires when: (a) premoves enabled and pieces already queued, OR
    //                   (b) premoves enabled and it's not our turn
    if (this.premovesEnabled && !this.gameover) {
      // Only premove with pieces of OUR color (not opponent's)
      // Determine player's color: if premoves are queued, we know our color from the queue
      // Otherwise check: if it's our turn, our color matches isWhiteTurn;
      // if not our turn, our color is the opposite of isWhiteTurn
      const playerIsWhite = isActiveTurnPiece ? isWhiteTurn : !isWhiteTurn;
      if (isWhitePiece === playerIsWhite) {
        this.premovePiece = sq.piece;
        this.premoveOriginSq = sq;
        this.pieces.splice(this.pieces.indexOf(sq.piece), 1);
        sq.piece = null;
        return 'grabbing';
      }
    }

    return this.getCursorStyle(pos);
  }

  getCursorStyle(pos) {
    if (this.pendingPromotion) return 'pointer';
    if (this.currentPiece || this.premovePiece) return 'grabbing';
    const sq = this.clickToSquare(pos);
    if (sq?.piece) {
      const isWhitePiece = sq.piece.index > 0;
      const isWhiteTurn = this.turn % 2 === 0;
      if (isWhitePiece === isWhiteTurn) return 'grab'; // own turn piece
      if (this.premovesEnabled && !this.gameover) return 'grab'; // premove piece
    }
    return 'default';
  }

  // ── Promotion chooser ──────────────────────────────────────────────

  /** Handle a click on the promotion chooser overlay. */
  handlePromoClick(pos) {
    const pp = this.pendingPromotion;
    if (!pp) return;

    const chosen = this.getPromoChoiceAt(pos);
    if (chosen === null) {
      // Clicked outside the chooser — cancel promotion, revert
      this.cancelPromotion();
      return;
    }

    // Complete the move with chosen piece
    this.moveGen.makeMove(pp.from, pp.to, chosen);

    this.clearFocus();
    pp.sq.focused = true;
    pp.originSq.focused = true;

    this.turn++;
    this.syncFromGrid(this.moveGen.getGrid());
    this.turn = this.moveGen.turn;

    this.pendingPromotion = null;
    this.clearSelection();
  }

  cancelPromotion() {
    const pp = this.pendingPromotion;
    if (!pp) return;
    // Revert the piece visually
    pp.piece.updateMid(pp.originSq.getMid());
    pp.originSq.piece = pp.piece;
    this.syncFromGrid(this.moveGen.getGrid());
    this.pendingPromotion = null;
    this.clearSelection();
  }

  /**
   * Given a pixel position, determine which promotion piece was clicked.
   * Returns the piece id (9, 5, 4, 3) or null if outside.
   */
  getPromoChoiceAt(pos) {
    const rects = this.getPromoRects();
    for (const { id, x, y, w, h } of rects) {
      if (pos[0] >= x && pos[0] <= x + w && pos[1] >= y && pos[1] <= y + h) {
        return id;
      }
    }
    return null;
  }

  /**
   * Compute the 4 promotion option rectangles (in canvas pixel coords).
   * Displayed as a vertical column extending from the promotion square.
   */
  getPromoRects() {
    const pp = this.pendingPromotion;
    if (!pp) return [];

    const cell = this.cellSize();
    const toX = pp.to[0];
    let toY = pp.to[1];
    if (this.flipped) toY = 7 - toY;

    const px = this.pos[0] + toX * cell;
    const startIsTop = toY === 0;
    const dir = startIsTop ? 1 : -1;

    return Chessboard.PROMO_PIECES.map((id, i) => ({
      id,
      x: px,
      y: this.pos[1] + (startIsTop ? i : toY - i) * cell,
      w: cell,
      h: cell,
    }));
  }

  // ── Castling (visual) ───────────────────────────────────────────────

  handleCastling(piece, targetSq) {
    if (Math.abs(piece.index) <= 10 || targetSq.piece !== null) return;
    const current = this.pixelToIndex(targetSq.getMid());
    const former = this.pixelToIndex(piece.sq.getMid());
    const dx = current[0] - former[0];
    if (Math.abs(dx) !== 2) return;

    const sign = dx > 0 ? 1 : -1;
    const rookX = dx > 0 ? 7 : 0;
    const rookSq = this.getSquareAt(rookX, current[1]);

    if (rookSq?.piece && Math.abs(rookSq.piece.index) === 5) {
      const newRookSq = this.getSquareAt(current[0] - sign, current[1]);
      this.movePiece(rookSq, newRookSq);
    }
  }

  movePiece(fromSq, toSq) {
    if (!fromSq.piece || toSq.piece) return;
    fromSq.piece.updateMid(toSq.getMid());
    toSq.piece = fromSq.piece;
    fromSq.piece = null;
    toSq.piece.sq = toSq;
  }

  // ── Focus / selection ───────────────────────────────────────────────

  clearFocus() {
    for (const sq of this.squares) sq.focused = false;
  }

  clearSelection() {
    for (const sq of this.squares) sq.selected = false;
    this.selected = false;
  }

  showLegalMoves(sq) {
    if (!sq.piece) return;
    const pos = this.pixelToIndex(sq.getMid());
    const moves = this.moveGen.getLegalMoves(sq.piece.index, pos);
    for (const [mx, my] of moves) {
      const targetSq = this.getSquareAt(mx, my);
      if (targetSq) targetSq.selected = true;
    }
    this.selected = true;
  }

  getDropSquare(piece, pos) {
    const sq = this.clickToSquare(pos);
    return sq?.selected ? sq : null;
  }

  // ── Board setup / sync ──────────────────────────────────────────────

  init() {
    this.gameover = false;
    this.pendingPromotion = null;
    this.premoves = [];
    this.premovePiece = null;
    this.premoveOriginSq = null;
    this.clear();
    if (this.flipped) this.flip();

    let colorToggle = 1;
    const cellW = this.width / this.boardSize;

    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        const xPos = this.pos[0] + cellW * x;
        const yPos = this.pos[1] + cellW * y;
        const sq = new Square([xPos, yPos], cellW);
        sq.setColor(colorToggle + 1);
        this.squares.push(sq);

        if (x !== this.boardSize - 1) {
          colorToggle = colorToggle === 0 ? 1 : 0;
        }
      }
    }

    this.initPieces();
    this.moveGen.turn = this.turn;
    this.moveGen.grid = this.getGridState();
  }

  getGridState() {
    const grid = [];
    for (let y = 0; y < this.boardSize; y++) {
      grid.push([]);
      for (let x = 0; x < this.boardSize; x++) {
        const sq = this.getSquareAt(x, y);
        grid[y].push(sq?.piece ? sq.piece.index : 0);
      }
    }
    return grid;
  }

  clear() {
    this.pieces = [];
    this.squares = [];
    this.turn = 0;
    this.moveGen = new MoveGenerator();
  }

  initPieces(grid = null) {
    const source = grid ?? Chessboard.DEFAULT_POSITION;
    for (let y = 0; y < source.length; y++) {
      for (let x = 0; x < source[y].length; x++) {
        this.addPiece(source[y][x], x, y);
      }
    }
  }

  addPiece(index, x, y) {
    if (index === 0) return;
    const sq = this.getSquareAt(x, y);
    if (!sq) return;
    const p = new Piece(index, [100, 100], sq.width * this.ratio);
    p.updateMid(sq.getMid());
    p.sq = sq;
    sq.piece = p;
    this.pieces.push(p);
  }

  syncFromGrid(cells) {
    this.pieces = [];
    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        const sq = this.getSquareAt(x, y);
        if (sq) { sq.piece = null; sq.selected = false; }
      }
    }
    this.initPieces(cells);
  }

  // ── Board actions ───────────────────────────────────────────────────

  undo() {
    this.pendingPromotion = null;
    this.moveGen.undo();
    this.syncFromGrid(this.moveGen.getGrid());
    this.turn = this.moveGen.turn;
    this.clearFocus();

    const lastMove = this.moveGen.getLastMove();
    if (lastMove.length > 0) {
      const sq1 = this.getSquareAt(lastMove[1][0], lastMove[1][1]);
      if (sq1) sq1.focused = true;
      const sq2 = this.getSquareAt(lastMove[3][0], lastMove[3][1]);
      if (sq2) sq2.focused = true;
    }
  }

  flip() {
    const wasFlipped = this.flipped;
    this.flipped = false;
    const cellH = this.height / this.boardSize;
    for (const sq of this.squares) {
      const [, iy] = this.pixelToIndex(sq.getMid());
      const newY = (7 - iy) * cellH + this.pos[1];
      if (newY !== sq.pos[1]) sq.pos = [sq.pos[0], newY];
      if (sq.piece) sq.piece.updateMid(sq.getMid());
    }
    this.flipped = !wasFlipped;
  }

  /**
   * Execute a move programmatically (used by AI).
   * @param {number[]} from - [x, y]
   * @param {number[]} to - [x, y]
   * @param {number} promo - promotion piece id (9=Q, 5=R, 4=B, 3=N, 0=none)
   */
  executeMove(from, to, promo = 0) {
    const promoPiece = promo > 0 ? promo : 9;
    this.moveGen.makeMove(from, to, promoPiece);

    this.clearFocus();
    const sq1 = this.getSquareAt(from[0], from[1]);
    const sq2 = this.getSquareAt(to[0], to[1]);
    if (sq1) sq1.focused = true;
    if (sq2) sq2.focused = true;

    this.syncFromGrid(this.moveGen.getGrid());
    this.turn = this.moveGen.turn;
  }

  playRandom() {
    this.moveGen.turn = this.turn;
    this.moveGen.grid = this.getGridState();
    const moves = this.moveGen.getAllLegalMoves();
    if (moves.length > 0) {
      const m = moves[randomInt(0, moves.length)];
      this.executeMove(m[0], m[1], m[2] || 0);
    }
  }

  play(searchTimeSeconds = 1) {
    if (this.cooldown === 0 && !this.gameover) {
      this.moveGen.turn = this.turn;
      this.moveGen.grid = this.getGridState();
      const move = this.ai.play(this.moveGen, searchTimeSeconds);
      if (move) this.executeMove(move[0], move[1], move[2] || 0);
      this.cooldown = this.maxCooldown;
    } else if (this.cooldown > 0) {
      this.cooldown--;
    }
  }

  // ── Drawing ─────────────────────────────────────────────────────────

  draw(ctx) {
    for (const sq of this.squares) {
      sq.draw(ctx);
    }

    // Draw premove highlights BEFORE pieces so pieces sit on top
    this.drawPremoves(ctx);

    for (const p of this.pieces) {
      p.draw(ctx, false);
    }
    if (this.currentPiece) {
      this.currentPiece.draw(ctx, true);
    }
    if (this.premovePiece) {
      this.premovePiece.draw(ctx, true);
    }

    if (this.pendingPromotion) {
      this.drawPromoChooser(ctx);
    }
  }

  /** Draw premove indicators: red-tinted from/to squares (chess.com style). */
  drawPremoves(ctx) {
    if (this.premoves.length === 0) return;
    const cell = this.cellSize();

    for (const pm of this.premoves) {
      const fy = this.flipped ? 7 - pm.from[1] : pm.from[1];
      const ty = this.flipped ? 7 - pm.to[1] : pm.to[1];

      // From square — subtle red
      ctx.fillStyle = 'rgba(200, 70, 50, 0.35)';
      ctx.fillRect(
        this.pos[0] + pm.from[0] * cell,
        this.pos[1] + fy * cell,
        cell, cell
      );

      // To square — stronger red
      ctx.fillStyle = 'rgba(200, 70, 50, 0.5)';
      ctx.fillRect(
        this.pos[0] + pm.to[0] * cell,
        this.pos[1] + ty * cell,
        cell, cell
      );
    }
  }

  // ── Premove execution ───────────────────────────────────────────────

  /**
   * Try to execute the next premove in the queue.
   * Returns true if a premove was successfully executed.
   */
  tryExecutePremove() {
    if (this.premoves.length === 0) return false;

    const pm = this.premoves.shift();

    // Sync generator to current board
    this.moveGen.turn = this.turn;
    this.moveGen.grid = this.getGridState();

    const pieceId = this.moveGen.indexAt(pm.from);
    if (pieceId === 0) {
      // Piece no longer on that square — invalid premove, clear queue
      this.premoves = [];
      return false;
    }

    // Check legality
    const legalTargets = this.moveGen.getLegalMoves(pieceId, pm.from);
    const isLegal = legalTargets.some(t => t[0] === pm.to[0] && t[1] === pm.to[1]);

    if (!isLegal) {
      this.premoves = [];
      return false;
    }

    // Auto-queen for premove promotions
    const absP = Math.abs(pieceId);
    const isPromo = absP === 1 && (pm.to[1] === 0 || pm.to[1] === 7);

    this.moveGen.makeMove(pm.from, pm.to, isPromo ? 9 : 9);

    this.clearFocus();
    const sq1 = this.getSquareAt(pm.from[0], pm.from[1]);
    const sq2 = this.getSquareAt(pm.to[0], pm.to[1]);
    if (sq1) sq1.focused = true;
    if (sq2) sq2.focused = true;

    this.syncFromGrid(this.moveGen.getGrid());
    this.turn = this.moveGen.turn;

    return true;
  }

  /** Clear all premoves and revert any piece being dragged. */
  clearPremoves() {
    this.premoves = [];
    if (this.premovePiece) {
      this.premovePiece.updateMid(this.premoveOriginSq.getMid());
      this.premoveOriginSq.piece = this.premovePiece;
      this.premovePiece.sq = this.premoveOriginSq;
      this.pieces.push(this.premovePiece);
      this.premovePiece = null;
      this.premoveOriginSq = null;
    }
  }

  drawPromoChooser(ctx) {
    const pp = this.pendingPromotion;
    if (!pp) return;

    // Dim the board
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.pos[0], this.pos[1], this.width, this.height);

    const rects = this.getPromoRects();
    const cell = this.cellSize();
    const pieceSize = cell * this.ratio;
    const hoverRect = this.getPromoChoiceAt(this.mouse);

    for (const { id, x, y, w, h } of rects) {
      // Background
      const isHover = (hoverRect === id);
      ctx.fillStyle = isHover ? '#d4a84a' : '#f0ece6';
      ctx.fillRect(x, y, w, h);

      // Border
      ctx.strokeStyle = isHover ? '#b8942e' : '#a0988a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      // Draw piece image
      const pieceIndex = id * pp.sign;
      const tmpPiece = new Piece(pieceIndex, [0, 0], pieceSize);
      const px = x + (w - pieceSize) / 2;
      const py = y + (h - pieceSize) / 2;
      tmpPiece.pos = [px, py];
      tmpPiece.draw(ctx, false);
    }
  }
}
