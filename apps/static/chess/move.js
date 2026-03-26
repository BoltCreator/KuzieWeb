/**
 * Move generation, board state management, and evaluation for the chess engine.
 *
 * Piece indices:
 *   ±1 = Pawn, ±3 = Knight, ±4 = Bishop, ±5 = Rook,
 *   ±9 = Queen, ±45 = King (value > 10)
 *   Positive = white, Negative = black
 */
class MoveGenerator {
  static BOARD_SIZE = 8;

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

  // ── Piece-Square Tables (from white's perspective, index [y][x]) ────
  // These give positional bonuses per piece type and location.
  // Flipped for black at evaluation time.

  static PST_PAWN = [
    [ 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [ 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50],
    [ 0.10, 0.10, 0.20, 0.30, 0.30, 0.20, 0.10, 0.10],
    [ 0.05, 0.05, 0.10, 0.25, 0.25, 0.10, 0.05, 0.05],
    [ 0.00, 0.00, 0.00, 0.20, 0.20, 0.00, 0.00, 0.00],
    [ 0.05,-0.05,-0.10, 0.00, 0.00,-0.10,-0.05, 0.05],
    [ 0.05, 0.10, 0.10,-0.20,-0.20, 0.10, 0.10, 0.05],
    [ 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
  ];

  static PST_KNIGHT = [
    [-0.50,-0.40,-0.30,-0.30,-0.30,-0.30,-0.40,-0.50],
    [-0.40,-0.20, 0.00, 0.00, 0.00, 0.00,-0.20,-0.40],
    [-0.30, 0.00, 0.10, 0.15, 0.15, 0.10, 0.00,-0.30],
    [-0.30, 0.05, 0.15, 0.20, 0.20, 0.15, 0.05,-0.30],
    [-0.30, 0.00, 0.15, 0.20, 0.20, 0.15, 0.00,-0.30],
    [-0.30, 0.05, 0.10, 0.15, 0.15, 0.10, 0.05,-0.30],
    [-0.40,-0.20, 0.00, 0.05, 0.05, 0.00,-0.20,-0.40],
    [-0.50,-0.40,-0.30,-0.30,-0.30,-0.30,-0.40,-0.50],
  ];

  static PST_BISHOP = [
    [-0.20,-0.10,-0.10,-0.10,-0.10,-0.10,-0.10,-0.20],
    [-0.10, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.10],
    [-0.10, 0.00, 0.05, 0.10, 0.10, 0.05, 0.00,-0.10],
    [-0.10, 0.05, 0.05, 0.10, 0.10, 0.05, 0.05,-0.10],
    [-0.10, 0.00, 0.10, 0.10, 0.10, 0.10, 0.00,-0.10],
    [-0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10,-0.10],
    [-0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.05,-0.10],
    [-0.20,-0.10,-0.10,-0.10,-0.10,-0.10,-0.10,-0.20],
  ];

  static PST_ROOK = [
    [ 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [ 0.05, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.05],
    [-0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05],
    [-0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05],
    [-0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05],
    [-0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05],
    [-0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05],
    [ 0.00, 0.00, 0.00, 0.05, 0.05, 0.00, 0.00, 0.00],
  ];

  static PST_QUEEN = [
    [-0.20,-0.10,-0.10,-0.05,-0.05,-0.10,-0.10,-0.20],
    [-0.10, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.10],
    [-0.10, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.10],
    [-0.05, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.05],
    [ 0.00, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.05],
    [-0.10, 0.05, 0.05, 0.05, 0.05, 0.05, 0.00,-0.10],
    [-0.10, 0.00, 0.05, 0.00, 0.00, 0.00, 0.00,-0.10],
    [-0.20,-0.10,-0.10,-0.05,-0.05,-0.10,-0.10,-0.20],
  ];

  static PST_KING_MID = [
    [-0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30],
    [-0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30],
    [-0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30],
    [-0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30],
    [-0.20,-0.30,-0.30,-0.40,-0.40,-0.30,-0.30,-0.20],
    [-0.10,-0.20,-0.20,-0.20,-0.20,-0.20,-0.20,-0.10],
    [ 0.20, 0.20, 0.00, 0.00, 0.00, 0.00, 0.20, 0.20],
    [ 0.20, 0.30, 0.10, 0.00, 0.00, 0.10, 0.30, 0.20],
  ];

  static PST_KING_END = [
    [-0.50,-0.40,-0.30,-0.20,-0.20,-0.30,-0.40,-0.50],
    [-0.30,-0.20,-0.10, 0.00, 0.00,-0.10,-0.20,-0.30],
    [-0.30,-0.10, 0.20, 0.30, 0.30, 0.20,-0.10,-0.30],
    [-0.30,-0.10, 0.30, 0.40, 0.40, 0.30,-0.10,-0.30],
    [-0.30,-0.10, 0.30, 0.40, 0.40, 0.30,-0.10,-0.30],
    [-0.30,-0.10, 0.20, 0.30, 0.30, 0.20,-0.10,-0.30],
    [-0.30,-0.30, 0.00, 0.00, 0.00, 0.00,-0.30,-0.30],
    [-0.50,-0.30,-0.30,-0.30,-0.30,-0.30,-0.30,-0.50],
  ];

  // Material values (centipawn-ish but as floats)
  static MATERIAL = { 1: 1.0, 3: 3.2, 4: 3.3, 5: 5.0, 9: 9.5 };

  constructor(size = MoveGenerator.BOARD_SIZE) {
    this.size = size;
    this.grid = MoveGenerator.DEFAULT_POSITION.map((row) => [...row]);
    this.turn = 0;
    this.moves = [];
    this.gameover = false;
    this.epos = [-1, -1];
    this.castles = [true, true, true, true, 0];
    this.flipped = false;
    this.onlyKing = false;
    this.lastKingPos = [0, 0];
    this.leafScore = 0;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  isInBounds(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getGrid() { return this.grid; }

  isOutside(pos) {
    return pos[0] < 0 || pos[1] < 0 || pos[1] >= this.grid.length || pos[0] >= this.grid[0].length;
  }

  addVec(pos, vel) { return [pos[0] + vel[0], pos[1] + vel[1]]; }
  indexAt(pos) { return this.grid[pos[1]][pos[0]]; }
  updateCell(index, pos) { this.grid[pos[1]][pos[0]] = index; }

  isEnemy(cellValue, pieceIndex) {
    return (cellValue < 0 && pieceIndex > 0) || (cellValue > 0 && pieceIndex < 0);
  }

  normalize(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }

  distance(p1, p2) {
    return Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]);
  }

  // ── Piece-square table lookup ────────────────────────────────────────

  getPST(id, x, y, isWhite, isEndgame) {
    // For white: use table directly. For black: flip y.
    const ty = isWhite ? y : (7 - y);
    switch (id) {
      case 1: return MoveGenerator.PST_PAWN[ty][x];
      case 3: return MoveGenerator.PST_KNIGHT[ty][x];
      case 4: return MoveGenerator.PST_BISHOP[ty][x];
      case 5: return MoveGenerator.PST_ROOK[ty][x];
      case 9: return MoveGenerator.PST_QUEEN[ty][x];
      default:
        if (id > 10) {
          return isEndgame
            ? MoveGenerator.PST_KING_END[ty][x]
            : MoveGenerator.PST_KING_MID[ty][x];
        }
        return 0;
    }
  }

  // ── Sliding / stepping move generator ────────────────────────────────

  generateSlidingMoves(index, pos, vel, store = [], maxSteps = 8) {
    let count = 0;
    let current = this.addVec(pos, vel);
    while (count < maxSteps) {
      if (this.isOutside(current)) break;
      const cell = this.grid[current[1]][current[0]];
      if (this.isEnemy(cell, index)) {
        if (Math.abs(index) !== 1 || vel[0] !== 0) store.push([...current]);
        break;
      }
      if (cell === 0) { store.push([...current]); }
      else break;
      current = this.addVec(current, vel);
      count++;
    }
    return store;
  }

  // ── Move equality ────────────────────────────────────────────────────

  movesEqual(m1, m2) {
    if (m1.length !== m2.length || m1.length < 4) return false;
    return m1[1][0] === m2[1][0] && m1[1][1] === m2[1][1] &&
           m1[3][0] === m2[3][0] && m1[3][1] === m2[3][1];
  }

  // ── Draw detection ──────────────────────────────────────────────────

  checkThreefoldRepetition() {
    if (this.moves.length < 8) return false;
    const len = this.moves.length;
    const r = this.moves.slice(len - 8);
    return this.movesEqual(r[7], r[3]) && this.movesEqual(r[6], r[2]) &&
           this.movesEqual(r[5], r[1]) && this.movesEqual(r[4], r[0]);
  }

  checkDraw() { return this.checkThreefoldRepetition(); }

  isDraw() {
    if (this.castles[4] >= 50) return 'draw by 50 move rule';
    if (this.checkThreefoldRepetition()) return 'draw by 3 folds repetition';
    if (this.isStalemate()) return 'stalemate';
    let minorCount = 0;
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const id = Math.abs(this.grid[y][x]);
        if (id === 0 || id > 10) continue;
        if (id === 3 || id === 4) { minorCount++; if (minorCount > 1) return null; }
        else if (id > 0) return null;
      }
    }
    return 'draw by insuffient material';
  }

  // ── Evaluation ──────────────────────────────────────────────────────

  getScore() {
    let score = 0;

    const bishopCount = [0, 0];
    const whitePawns = new Array(8).fill(0);
    const blackPawns = new Array(8).fill(0);
    const whitePawnY = new Array(8).fill(0);
    const blackPawnY = new Array(8).fill(0);

    let whiteKing = false, blackKing = false;
    let whiteKingPos = [0, 0], blackKingPos = [0, 0];
    const whiteRooks = [], blackRooks = [];
    let whiteMaterial = 0, blackMaterial = 0;
    let whitePieceCount = 0, blackPieceCount = 0;

    // First pass: material + piece-square tables
    const totalMaterial = this._countMaterial();
    const isEndgame = totalMaterial < 26; // roughly when queens are traded + some pieces

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const piece = this.grid[y][x];
        if (piece === 0) continue;
        const id = Math.abs(piece);
        const isWhite = piece > 0;

        // King tracking
        if (id > 10) {
          if (isWhite) { whiteKing = true; whiteKingPos = [x, y]; }
          else { blackKing = true; blackKingPos = [x, y]; }
        }

        // Material value
        const matVal = MoveGenerator.MATERIAL[id] || 0;
        if (isWhite && id < 10) { whiteMaterial += matVal; whitePieceCount++; }
        if (!isWhite && id < 10) { blackMaterial += matVal; blackPieceCount++; }

        // Base material score
        const sign = isWhite ? 1 : -1;
        score += matVal * sign;

        // Piece-square table bonus
        score += this.getPST(id, x, y, isWhite, isEndgame) * sign;

        // Rook tracking
        if (id === 5) {
          if (isWhite) whiteRooks.push([x, y]); else blackRooks.push([x, y]);
        }

        // Bishop count
        if (id === 4) {
          isWhite ? bishopCount[0]++ : bishopCount[1]++;
        }

        // Pawn tracking
        if (id === 1) {
          if (isWhite) { whitePawns[x]++; whitePawnY[x] = y; }
          else { blackPawns[x]++; blackPawnY[x] = y; }
        }
      }
    }

    if (!whiteKing) return -200;
    if (!blackKing) return 200;

    // Bishop pair
    if (bishopCount[0] >= 2) score += 0.5;
    if (bishopCount[1] >= 2) score -= 0.5;

    // Pawn structure
    for (let f = 0; f < 8; f++) {
      // Doubled pawns
      if (whitePawns[f] > 1) score -= 0.3 * (whitePawns[f] - 1);
      if (blackPawns[f] > 1) score += 0.3 * (blackPawns[f] - 1);

      // Isolated pawns
      if (!this.isPawnProtected(f, whitePawns)) score -= 0.15;
      if (!this.isPawnProtected(f, blackPawns)) score += 0.15;

      // Passed pawns
      score += this._passedPawnBonus(f, whitePawns, blackPawns, whitePawnY, blackPawnY);
    }

    // Connected rooks
    if (whiteRooks.length > 1 && this.areRooksConnected(whiteRooks[0], whiteRooks[1])) score += 0.25;
    if (blackRooks.length > 1 && this.areRooksConnected(blackRooks[0], blackRooks[1])) score -= 0.25;

    // Rook on open/semi-open file
    for (const rp of whiteRooks) {
      if (whitePawns[rp[0]] === 0) score += (blackPawns[rp[0]] === 0 ? 0.25 : 0.15);
    }
    for (const rp of blackRooks) {
      if (blackPawns[rp[0]] === 0) score -= (whitePawns[rp[0]] === 0 ? 0.25 : 0.15);
    }

    // King safety — penalise open files near king in middlegame
    if (!isEndgame) {
      score -= this._kingSafety(whiteKingPos, whitePawns, true) * 0.15;
      score += this._kingSafety(blackKingPos, blackPawns, false) * 0.15;
    }

    // Endgame: drive enemy king to edge when ahead
    if (isEndgame) {
      const whiteKingDist = this.distance(whiteKingPos, [3.5, 3.5]);
      const blackKingDist = this.distance(blackKingPos, [3.5, 3.5]);
      const kingsDist = this.distance(whiteKingPos, blackKingPos);

      if (whiteMaterial > blackMaterial + 2) {
        // White is winning — centralise white king, push black king to edge
        score += (blackKingDist * 0.05) - (whiteKingDist * 0.02) - (kingsDist * 0.03);
      } else if (blackMaterial > whiteMaterial + 2) {
        score -= (whiteKingDist * 0.05) - (blackKingDist * 0.02) - (kingsDist * 0.03);
      }
    }

    return score;
  }

  _countMaterial() {
    let total = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const id = Math.abs(this.grid[y][x]);
        if (id > 0 && id < 10) total += (MoveGenerator.MATERIAL[id] || 0);
      }
    }
    return total;
  }

  _passedPawnBonus(file, wPawns, bPawns, wY, bY) {
    let bonus = 0;
    // White passed pawn: no black pawns on same or adjacent files ahead
    if (wPawns[file] > 0 && bPawns[file] === 0) {
      const leftBlocked = file > 0 ? bPawns[file - 1] > 0 : false;
      const rightBlocked = file < 7 ? bPawns[file + 1] > 0 : false;
      if (!leftBlocked && !rightBlocked) {
        const rank = 7 - wY[file]; // distance advanced (0–6)
        bonus += 0.1 + rank * 0.1;
      }
    }
    // Black passed pawn
    if (bPawns[file] > 0 && wPawns[file] === 0) {
      const leftBlocked = file > 0 ? wPawns[file - 1] > 0 : false;
      const rightBlocked = file < 7 ? wPawns[file + 1] > 0 : false;
      if (!leftBlocked && !rightBlocked) {
        const rank = bY[file];
        bonus -= 0.1 + rank * 0.1;
      }
    }
    return bonus;
  }

  _kingSafety(kingPos, friendlyPawns, isWhite) {
    // Count missing pawn shield squares near the king
    let penalty = 0;
    const kx = kingPos[0];
    const shieldRank = isWhite ? kingPos[1] - 1 : kingPos[1] + 1;
    if (shieldRank < 0 || shieldRank > 7) return 0;

    for (let dx = -1; dx <= 1; dx++) {
      const fx = kx + dx;
      if (fx < 0 || fx > 7) continue;
      if (friendlyPawns[fx] === 0) penalty += 1;
    }

    // Extra penalty if king is on an open file
    if (friendlyPawns[kx] === 0) penalty += 0.5;

    return penalty;
  }

  passedPawnScore(a, b, ay, by, sa, sb) {
    if (a > 0 && b > 0) return 0;
    const diff = a - b;
    if (diff < 0) return -0.1 - by * sb;
    if (diff > 0) return 0.1 + (7 - ay) * sa;
    return 0;
  }

  isPawnProtected(file, pawns) {
    return (file > 0 && pawns[file - 1] !== 0) || (file < 7 && pawns[file + 1] !== 0);
  }

  areRooksConnected(p1, p2) {
    if (p1[0] !== p2[0] && p1[1] !== p2[1]) return false;
    const vel = [this.normalize(p2[0] - p1[0]), this.normalize(p2[1] - p1[1])];
    let pos = this.addVec(p1, vel);
    while (!this.isOutside(pos)) {
      if (pos[0] === p2[0] && pos[1] === p2[1]) return true;
      if (this.indexAt(pos) !== 0) return false;
      pos = this.addVec(pos, vel);
    }
    return false;
  }

  // ── Pawn captures ────────────────────────────────────────────────────

  generatePawnCaptures(index, pos, vel, store) {
    const target = this.addVec(pos, vel);
    const epSq = [pos[0] + vel[0], pos[1]];
    if (this.isOutside(target)) return store;
    const tCell = this.grid[target[1]][target[0]];
    if (this.isEnemy(tCell, index)) return this.generateSlidingMoves(index, pos, vel, store, 1);
    const epCell = this.grid[epSq[1]][epSq[0]];
    if (this.isEnemy(epCell, index)) {
      const ok = (index > 0 && pos[1] === 3) || (index < 0 && pos[1] === 4);
      if (ok) {
        const lm = this.getLastMove();
        if (lm.length > 0 && lm[3][0] === epSq[0] && lm[3][1] === epSq[1] &&
            Math.abs(lm[1][1] - lm[3][1]) === 2)
          return this.generateSlidingMoves(index, pos, vel, store, 1);
      }
    }
    return store;
  }

  // ── Stalemate ────────────────────────────────────────────────────────

  isStalemate() {
    if (this.castles[4] >= 50) return true;
    if (this.hasMove()) return false;
    const legalMoves = this.getAllLegalMoves();
    if (legalMoves.length === 0) {
      const kingId = this.turn % 2 === 0 ? 45 : -45;
      const kingPos = this.findPiece(kingId);
      if (kingPos !== null && !this.isKingChecked(kingPos)) return true;
    }
    return false;
  }

  findPiece(id) {
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[y].length; x++)
        if (this.grid[y][x] === id) return [x, y];
    return null;
  }

  // ── Castling helpers ────────────────────────────────────────────────

  adjustCastlingRights(from) {
    const piece = this.indexAt(from);
    if (Math.abs(piece) > 9) {
      if (piece > 0) { this.castles[0] = false; this.castles[1] = false; }
      else { this.castles[2] = false; this.castles[3] = false; }
    }
    if (Math.abs(piece) === 5) {
      if (from[1] === 7) { if (from[0] === 7) this.castles[0] = false; else if (from[0] === 0) this.castles[1] = false; }
      else if (from[1] === 0) { if (from[0] === 7) this.castles[2] = false; else if (from[0] === 0) this.castles[3] = false; }
    }
  }

  getCastleIndex(pos, vel) {
    let idx = 0;
    if (pos[1] === 0) idx += 2;
    if (vel[0] < 0) idx += 1;
    return idx;
  }

  generateCastleMoves(index, pos, vel, store) {
    if (pos[0] !== 4 || !this.castles[this.getCastleIndex(pos, vel)]) return store;
    const rookPos = this.findRook(pos, vel[0]);
    if (rookPos !== null && (rookPos[0] === 0 || rookPos[0] === 7))
      store = this.generateSlidingMoves(index, pos, vel, store, 2);
    return store;
  }

  findRook(pos, xDir) {
    const vel = [xDir, 0];
    let cur = this.addVec(pos, vel);
    while (!this.isOutside(cur)) {
      const cell = Math.abs(this.grid[cur[1]][cur[0]]);
      if (cell === 5) return [...cur];
      if (cell !== 0) return null;
      cur = this.addVec(cur, vel);
    }
    return null;
  }

  isTurnValid(index) {
    return (index > 0 && this.turn % 2 === 0) || (index < 0 && this.turn % 2 === 1);
  }

  // ── Check detection ─────────────────────────────────────────────────

  isCheck(positions) {
    return positions.some((pos) => Math.abs(this.indexAt(pos)) > 11);
  }

  isKingChecked(kingPos) {
    const savedTurn = this.turn;
    this.turn = this.indexAt(kingPos) > 0 ? 1 : 0;
    const allMoves = this.getAllMoves();
    const checked = allMoves.some(([, to]) => Math.abs(this.indexAt(to)) > 11);
    this.turn = savedTurn;
    return checked;
  }

  // ── Move legalization ───────────────────────────────────────────────

  legalize(index, pos, rawMoves) {
    const legal = [];
    for (const target of rawMoves) {
      this.makeMove(pos, target);
      const opMoves = this.getAllMoves();
      let isLegal = true;
      for (const [, opTo] of opMoves) {
        if (Math.abs(index) > 9 && Math.abs(pos[0] - target[0]) > 1) {
          const dir = pos[0] < target[0] ? 1 : -1;
          for (let step = 0; step < Math.abs(pos[0] - target[0]); step++) {
            const inter = [pos[0] + dir * step, pos[1]];
            if (opTo[0] === inter[0] && opTo[1] === inter[1]) { isLegal = false; break; }
          }
          if (!isLegal) break;
        }
        if (this.isCheck([opTo])) { isLegal = false; break; }
      }
      this.undo();
      if (isLegal) legal.push(target);
    }
    return legal;
  }

  // ── En passant / castling execution ─────────────────────────────────

  executeEnPassant(rec) {
    const [index, from, , to] = rec;
    const epSq = [to[0], from[1]];
    const epCell = this.grid[epSq[1]][epSq[0]];
    if (Math.abs(index) !== 1 || Math.abs(epCell) !== 1 || !this.isEnemy(epCell, index)) return rec;
    const ok = (index > 0 && from[1] === 3) || (index < 0 && from[1] === 4);
    if (!ok) return rec;
    const lm = this.getLastMove();
    if (lm.length > 0 && lm[3][0] === epSq[0] && lm[3][1] === epSq[1] && Math.abs(lm[1][1] - lm[3][1]) === 2) {
      rec.push(this.indexAt(epSq)); rec.push([...epSq]); this.updateCell(0, epSq);
    }
    return rec;
  }

  executeCastle(rec) {
    const [pi, from, , to] = rec;
    const dx = to[0] - from[0];
    if (Math.abs(pi) <= 9 || Math.abs(dx) <= 1 || from[0] !== 4) return rec;
    const rookX = dx > 0 ? 7 : 0;
    const rookDir = dx > 0 ? -1 : 1;
    const rookFrom = [rookX, to[1]];
    const rookTo = [to[0] + rookDir, to[1]];
    if (Math.abs(this.indexAt(rookFrom)) === 5) {
      rec.push(this.indexAt(rookFrom)); rec.push([...rookFrom]);
      rec.push(this.indexAt(rookTo)); rec.push([...rookTo]);
      this.updateCell(this.indexAt(rookFrom), rookTo); this.updateCell(0, rookFrom);
    }
    return rec;
  }

  // ── Make / undo ─────────────────────────────────────────────────────

  makeMove(from, to, promoteTo = 9) {
    let rec = [this.indexAt(from), [...from], this.indexAt(to), [...to]];
    rec = this.executeEnPassant(rec);
    rec = this.executeCastle(rec);
    rec.push([...this.castles]);
    this.moves.push(rec);
    if (!this.isOutside(from) && !this.isOutside(to)) {
      if (Math.abs(rec[0]) === 1 || Math.abs(rec[2]) > 0) this.castles[4] = 0; else this.castles[4]++;
      this.adjustCastlingRights(from);
      this.updateCell(this.indexAt(from), to);
      this.updateCell(0, from);
      if ((to[1] === 0 || to[1] === 7) && Math.abs(this.indexAt(to)) === 1) {
        const sign = this.indexAt(to) > 0 ? 1 : -1;
        this.updateCell(promoteTo * sign, to);
      }
      this.turn++;
    }
  }

  undo() {
    if (this.moves.length === 0) return;
    const rec = this.moves[this.moves.length - 1];
    for (let i = 0; i < rec.length; i += 2) {
      if (i + 1 < rec.length && Array.isArray(rec[i + 1])) this.updateCell(rec[i], rec[i + 1]);
    }
    this.castles = [...rec[rec.length - 1]];
    this.moves.pop();
    this.turn--;
  }

  getLastMove() {
    return this.moves.length > 0 ? this.moves[this.moves.length - 1] : [];
  }

  // ── Move generation ─────────────────────────────────────────────────

  generatePieceMoves(index, pos, store = []) {
    const absIndex = Math.abs(index);
    if (absIndex < 10) this.onlyKing = false;

    if (absIndex === 1) {
      const yVel = index > 0 ? -1 : 1;
      const startRank = (index < 0 && pos[1] === 1) || (index > 0 && pos[1] === this.size - 2);
      store = this.generateSlidingMoves(index, pos, [0, yVel], store, startRank ? 2 : 1);
      store = this.generatePawnCaptures(index, pos, [1, yVel], store);
      store = this.generatePawnCaptures(index, pos, [-1, yVel], store);
    }
    if (absIndex === 3) {
      for (const v of [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]])
        store = this.generateSlidingMoves(index, pos, v, store, 1);
    }
    if (absIndex === 4) {
      for (const v of [[1,1],[1,-1],[-1,1],[-1,-1]])
        store = this.generateSlidingMoves(index, pos, v, store);
    }
    if (absIndex === 5) {
      for (const v of [[1,0],[-1,0],[0,1],[0,-1]])
        store = this.generateSlidingMoves(index, pos, v, store);
    }
    if (absIndex === 9) {
      for (const v of [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]])
        store = this.generateSlidingMoves(index, pos, v, store);
    }
    if (absIndex > 10) {
      for (const v of [[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[0,-1],[1,0],[-1,0]])
        store = this.generateSlidingMoves(index, pos, v, store, 1);
      store = this.generateCastleMoves(index, pos, [1, 0], store);
      store = this.generateCastleMoves(index, pos, [-1, 0], store);
    }
    return store;
  }

  getMovesForPiece(index, pos, store = []) {
    if (!this.isTurnValid(index)) return store;
    return this.generatePieceMoves(index, pos, store);
  }

  getLegalMoves(index, pos, store = []) {
    store = this.getMovesForPiece(index, pos, store);
    return this.legalize(index, pos, store);
  }

  /**
   * Get all pseudo-legal moves with MVV-LVA ordering for captures.
   * Returns captures sorted by (victim value - attacker value) descending,
   * then quiet moves.
   */
  getAllMoves() {
    const captures = [];
    const quietMoves = [];

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const index = this.grid[y][x];
        if (index === 0) continue;
        const moves = this.getMovesForPiece(index, [x, y]);
        const attackerId = Math.abs(index);
        const attackerVal = MoveGenerator.MATERIAL[attackerId] || 0;

        for (const target of moves) {
          const victimId = Math.abs(this.indexAt(target));
          const isPawnPromo = attackerId === 1 && (target[1] === 0 || target[1] === 7);

          if (isPawnPromo) {
            // Generate all 4 promotion options
            for (const promo of [9, 5, 4, 3]) {
              const victimVal = MoveGenerator.MATERIAL[victimId] || 0;
              const promoVal = MoveGenerator.MATERIAL[promo] || 0;
              const mvvlva = (victimVal * 10) + (promoVal * 10);
              captures.push({ from: [x, y], to: target, promo, score: mvvlva });
            }
          } else if (victimId > 0) {
            const victimVal = MoveGenerator.MATERIAL[victimId] || 0;
            const mvvlva = (victimVal * 10) - attackerVal;
            captures.push({ from: [x, y], to: target, promo: 0, score: mvvlva });
          } else {
            quietMoves.push([[x, y], target, 0]);
          }
        }
      }
    }

    // Sort captures by MVV-LVA score descending
    captures.sort((a, b) => b.score - a.score);
    const sorted = captures.map((c) => [c.from, c.to, c.promo]);
    return [...sorted, ...quietMoves];
  }

  getQuietMoves() {
    const captures = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const index = this.grid[y][x];
        if (index === 0) continue;
        const moves = this.getMovesForPiece(index, [x, y]);
        for (const target of moves) {
          const capturedId = Math.abs(this.indexAt(target));
          const isPawnPromo = Math.abs(index) === 1 && (target[1] === 0 || target[1] === 7);
          if (isPawnPromo) {
            for (const promo of [9, 5, 4, 3]) {
              captures.push([[x, y], target, promo]);
            }
          } else if (capturedId > 0) {
            captures.push([[x, y], target, 0]);
          }
        }
      }
    }
    return captures;
  }

  hasMove() {
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[y].length; x++) {
        const index = this.grid[y][x];
        if (index !== 0 && Math.abs(index) < 10)
          if (this.getMovesForPiece(index, [x, y]).length > 0) return true;
      }
    return false;
  }

  getAllLegalMoves() {
    const result = [];
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[y].length; x++) {
        const index = this.grid[y][x];
        if (index === 0) continue;
        const legal = this.getLegalMoves(index, [x, y]);
        for (const target of legal) {
          const isPawnPromo = Math.abs(index) === 1 && (target[1] === 0 || target[1] === 7);
          if (isPawnPromo) {
            for (const promo of [9, 5, 4, 3]) {
              result.push([[x, y], target, promo]);
            }
          } else {
            result.push([[x, y], target, 0]);
          }
        }
      }
    return result;
  }
}
