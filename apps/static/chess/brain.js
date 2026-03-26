/**
 * Chess AI engine — iterative deepening + alpha-beta with:
 *   • Principal variation (PV) move ordering
 *   • MVV-LVA capture ordering (in MoveGenerator.getAllMoves)
 *   • Killer move heuristic
 *   • History heuristic for quiet move ordering
 *   • Quiescence search (captures only at leaf nodes)
 *   • Null move pruning (R=2)
 *   • Late move reductions
 *   • Underpromotion search (all 4 promotion options)
 *
 * Moves are [from, to, promo] triples where promo is 0 (no promotion)
 * or the piece id to promote to (9=Q, 5=R, 4=B, 3=N).
 */
class Brain {
  constructor() {
    this.maxDepth = 4;
    this.maxTime = 0;
    this.useTimeLimit = false;
    this.nodesSearched = 0;

    this.killers = [];
    this.history = new Array(64).fill(null).map(() => new Array(64).fill(0));
    this.pvMove = null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  getBestIndex(scores, turn) {
    if (scores.length === 0) return null;
    const max = turn % 2 === 0;
    let bi = 0, bv = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (max ? scores[i] > bv : scores[i] < bv) { bv = scores[i]; bi = i; }
    }
    return bi;
  }

  /** Compare two moves including promotion type. */
  moveEquals(m1, m2) {
    return m1[0][0] === m2[0][0] && m1[0][1] === m2[0][1] &&
           m1[1][0] === m2[1][0] && m1[1][1] === m2[1][1] &&
           (m1[2] || 0) === (m2[2] || 0);
  }

  // ── Move ordering ───────────────────────────────────────────────────

  orderMoves(moves, depth, board) {
    const pvMove = (depth === 1) ? this.pvMove : null;

    const scored = moves.map((m) => {
      const [from, to, promo] = m;
      let priority = 0;

      if (pvMove && this.moveEquals(m, pvMove)) {
        priority = 100000;
      }

      const victimId = Math.abs(board.indexAt(to));
      if (victimId > 0) {
        const attackerId = Math.abs(board.indexAt(from));
        const victimVal = MoveGenerator.MATERIAL[victimId] || 0;
        const attackerVal = MoveGenerator.MATERIAL[attackerId] || 0;
        priority += 10000 + (victimVal * 10) - attackerVal;
      }

      // Promotion bonus — queen promotion first, then others
      if (promo > 0) {
        priority += 8000 + (MoveGenerator.MATERIAL[promo] || 0) * 10;
      }

      if (this.killers[depth]) {
        for (const km of this.killers[depth]) {
          if (km && this.moveEquals(m, km)) { priority += 5000; break; }
        }
      }

      if (victimId === 0 && !promo) {
        const fi = from[1] * 8 + from[0];
        const ti = to[1] * 8 + to[0];
        priority += this.history[fi][ti];
      }

      return { move: m, priority };
    });

    scored.sort((a, b) => b.priority - a.priority);
    return scored.map((s) => s.move);
  }

  recordKiller(move, depth) {
    if (!this.killers[depth]) this.killers[depth] = [null, null];
    if (this.killers[depth][0] && this.moveEquals(this.killers[depth][0], move)) return;
    this.killers[depth][1] = this.killers[depth][0];
    this.killers[depth][0] = move;
  }

  recordHistory(from, to, depth) {
    const fi = from[1] * 8 + from[0];
    const ti = to[1] * 8 + to[0];
    this.history[fi][ti] += depth * depth;
    if (this.history[fi][ti] > 50000) {
      for (let a = 0; a < 64; a++)
        for (let b = 0; b < 64; b++)
          this.history[a][b] = Math.floor(this.history[a][b] / 2);
    }
  }

  // ── Quiescence search ───────────────────────────────────────────────

  quiescence(board, alpha, beta, qDepth = 0) {
    this.nodesSearched++;

    // Hard depth limit on quiescence to prevent runaway searches
    if (qDepth >= 8 || this.isTimeUp()) {
      return board.getScore();
    }

    const nodeTurn = board.turn;
    const maximize = nodeTurn % 2 === 0;

    const standPat = board.getScore();

    if (maximize) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const captures = board.getQuietMoves();

    for (const [from, to, promo] of captures) {
      if (this.isTimeUp()) break;

      board.makeMove(from, to, promo || 9);
      const score = this.quiescence(board, alpha, beta, qDepth + 1);
      board.undo();

      if (maximize) {
        if (score > alpha) alpha = score;
        if (alpha >= beta) return beta;
      } else {
        if (score < beta) beta = score;
        if (alpha >= beta) return alpha;
      }
    }

    return maximize ? alpha : beta;
  }

  // ── Alpha-Beta ──────────────────────────────────────────────────────

  alphaBeta(board, depth, alpha, beta, allowNull = true) {
    this.nodesSearched++;

    const nodeTurn = board.turn;
    const maximize = nodeTurn % 2 === 0;

    if (depth >= this.maxDepth || this.isTimeUp()) {
      return this.quiescence(board, alpha, beta);
    }

    if (board.checkDraw()) return 0;

    // Null move pruning
    const R = 2;
    if (allowNull && depth >= 3 && !this.isTimeUp()) {
      const totalMat = board._countMaterial();
      if (totalMat > 12) {
        board.turn++;
        const nullScore = this.alphaBeta(board, depth + 1 + R, alpha, beta, false);
        board.turn--;

        if (maximize && nullScore >= beta) return beta;
        if (!maximize && nullScore <= alpha) return alpha;
      }
    }

    let moves = board.getAllMoves();
    if (moves.length === 0) {
      if (board.isStalemate()) return 0;
      return board.getScore();
    }

    moves = this.orderMoves(moves, depth, board);

    let bestScore = maximize ? -100000 : 100000;
    let moveCount = 0;

    for (const [from, to, promo] of moves) {
      if (alpha >= beta) break;
      if (this.isTimeUp()) break;

      board.makeMove(from, to, promo || 9);
      moveCount++;

      let score;

      const victimId = Math.abs(board.moves[board.moves.length - 1]?.[2] || 0);
      const lmrOk = moveCount > 4 && depth >= 3 && victimId === 0 && !promo;

      if (lmrOk && !this.isTimeUp()) {
        score = this.alphaBeta(board, depth + 2, alpha, beta, true);
        if (maximize ? score > alpha : score < beta) {
          score = this.alphaBeta(board, depth + 1, alpha, beta, true);
        }
      } else {
        score = this.alphaBeta(board, depth + 1, alpha, beta, true);
      }

      board.undo();

      if (maximize) {
        if (score > bestScore) bestScore = score;
        if (score > alpha) {
          alpha = score;
          if (victimId === 0 && !promo) {
            this.recordKiller([from, to, promo || 0], depth);
            this.recordHistory(from, to, this.maxDepth - depth);
          }
        }
      } else {
        if (score < bestScore) bestScore = score;
        if (score < beta) {
          beta = score;
          if (victimId === 0 && !promo) {
            this.recordKiller([from, to, promo || 0], depth);
            this.recordHistory(from, to, this.maxDepth - depth);
          }
        }
      }
    }

    return bestScore;
  }

  // ── Root search ─────────────────────────────────────────────────────

  searchRoot(board, moves) {
    const rootTurn = board.turn;
    const maximize = rootTurn % 2 === 0;
    let alpha = -100000;
    let beta = 100000;

    const ordered = this.orderMoves(moves, 1, board);
    const scores = [];
    let bestMove = null;
    let bestScore = maximize ? -100000 : 100000;

    for (const [from, to, promo] of ordered) {
      if (this.isTimeUp()) break;

      board.makeMove(from, to, promo || 9);
      const score = this.alphaBeta(board, 1, alpha, beta, true);
      board.undo();
      scores.push(score);

      if (maximize) {
        if (score > bestScore) { bestScore = score; bestMove = [from, to, promo || 0]; }
        if (score > alpha) alpha = score;
      } else {
        if (score < bestScore) { bestScore = score; bestMove = [from, to, promo || 0]; }
        if (score < beta) beta = score;
      }
    }

    this.pvMove = bestMove;
    return { moves: ordered, scores, bestMove, bestScore };
  }

  // ── Time management ─────────────────────────────────────────────────

  now() { return Date.now(); }
  isTimeUp() {
    if (this.nodesSearched > 500000) return true;  // safety: hard node limit
    return this.useTimeLimit && this.now() > this.maxTime;
  }

  // ── Iterative deepening ─────────────────────────────────────────────

  play(board, timeLimitSeconds = 1) {
    this.useTimeLimit = true;
    this.nodesSearched = 0;
    this.pvMove = null;
    this.killers = [];

    const rootTurn = board.turn;
    const moves = board.getAllLegalMoves();

    if (moves.length === 0) { board.gameover = true; return null; }
    if (moves.length === 1) return moves[0];

    this.maxTime = this.now() + timeLimitSeconds * 1000;
    // Hard safety cap: never exceed 3× the requested time
    const hardDeadline = this.now() + timeLimitSeconds * 3000;
    this.maxDepth = 0;

    let bestResult = null;

    for (let depth = 1; depth <= 20; depth++) {
      if (this.isTimeUp()) break;
      // Hard safety: abort if we've vastly exceeded time
      if (this.now() > hardDeadline) break;

      this.maxDepth = depth;
      const result = this.searchRoot(board, moves);

      if (!this.isTimeUp() && result.bestMove) {
        bestResult = result;
      }

      // Stop if we found a forced checkmate
      if (bestResult && Math.abs(bestResult.bestScore) > 9000) break;
    }

    if (bestResult) {
      console.log(`Depth: ${this.maxDepth} | Nodes: ${this.nodesSearched} | Eval: ${bestResult.bestScore.toFixed(2)}`);
      return bestResult.bestMove || moves[0];
    }

    return moves[0];
  }
}
