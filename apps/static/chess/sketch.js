/**
 * Main application – sets up the canvas, event listeners, and game loop.
 * Drives the redesigned UI: coordinates, move history, captured pieces,
 * turn indicator, engine stats, and synthesized move sounds.
 */

// ── Utility ───────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// ═══════════════════════════════════════════════════════════════════════
//  Sound Engine — Web Audio API synthesized chess sounds
// ═══════════════════════════════════════════════════════════════════════

const ChessAudio = (() => {
  let audioCtx = null;
  let enabled = true;

  /** Lazily create AudioContext (must follow a user gesture). */
  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ── Primitive helpers ────────────────────────────────────────────────

  /** Play a single oscillator tone with an ADSR-ish envelope. */
  function playTone(freq, type, attack, decay, sustain, release, volume, detune = 0) {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (detune) osc.detune.setValueAtTime(detune, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + attack + decay + release);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + attack + decay + release + 0.01);
  }

  /** Play a short burst of filtered noise (for percussive sounds). */
  function playNoise(duration, filterFreq, filterQ, volume, filterType = 'bandpass') {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);

    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(filterQ, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  // ── Sound definitions ────────────────────────────────────────────────

  /** Normal piece move — a soft wooden "tap" */
  function playMove() {
    if (!enabled) return;
    // Low woody thump
    playTone(220, 'sine', 0.003, 0.04, 0.0, 0.06, 0.18);
    // High click
    playNoise(0.04, 3200, 1.5, 0.08, 'highpass');
    // Subtle body
    playTone(330, 'triangle', 0.002, 0.03, 0.0, 0.04, 0.06);
  }

  /** Capture — a heavier "clack" with a low thud */
  function playCapture() {
    if (!enabled) return;
    // Low impact thud
    playTone(140, 'sine', 0.002, 0.06, 0.0, 0.1, 0.25);
    // Mid crack
    playTone(440, 'square', 0.001, 0.02, 0.0, 0.03, 0.07);
    // Noise burst (the "clatter")
    playNoise(0.07, 2500, 2.0, 0.14, 'bandpass');
    // High overtone
    playTone(880, 'sine', 0.002, 0.015, 0.0, 0.02, 0.04);
  }

  /** Castling — a two-part "tap-slide-tap" sound */
  function playCastle() {
    if (!enabled) return;
    const ctx = getCtx();
    const now = ctx.currentTime;

    // First tap (king)
    playTone(260, 'sine', 0.003, 0.04, 0.0, 0.05, 0.16);
    playNoise(0.03, 3000, 1.5, 0.06, 'highpass');

    // Slide sound (delayed)
    setTimeout(() => {
      playTone(180, 'triangle', 0.01, 0.06, 0.1, 0.08, 0.06);
    }, 80);

    // Second tap (rook) — delayed
    setTimeout(() => {
      playTone(300, 'sine', 0.003, 0.04, 0.0, 0.05, 0.14);
      playNoise(0.03, 3500, 1.5, 0.06, 'highpass');
    }, 160);
  }

  /** Check — a sharp alert ping */
  function playCheck() {
    if (!enabled) return;
    // The move sound first
    playMove();

    // Then a bright alert tone after a tiny delay
    setTimeout(() => {
      playTone(1046, 'sine', 0.005, 0.06, 0.2, 0.12, 0.12);
      playTone(1318, 'sine', 0.005, 0.04, 0.1, 0.10, 0.06);
    }, 60);
  }

  /** Promotion — ascending sparkle */
  function playPromotion() {
    if (!enabled) return;
    playMove();
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 'sine', 0.005, 0.05, 0.15, 0.10, 0.09 - i * 0.01);
      }, 50 + i * 60);
    });
  }

  /** Game over — a low resonant chord */
  function playGameOver() {
    if (!enabled) return;
    playTone(196, 'sine', 0.02, 0.3, 0.3, 0.6, 0.14);
    playTone(247, 'sine', 0.02, 0.3, 0.3, 0.6, 0.10);
    playTone(294, 'sine', 0.02, 0.3, 0.3, 0.6, 0.08);
    playNoise(0.15, 800, 0.5, 0.03, 'lowpass');
  }

  /** Illegal / revert — a dull muted tap */
  function playIllegal() {
    if (!enabled) return;
    playTone(160, 'sine', 0.003, 0.03, 0.0, 0.04, 0.08);
    playNoise(0.02, 1000, 0.5, 0.03, 'lowpass');
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    playMove,
    playCapture,
    playCastle,
    playCheck,
    playPromotion,
    playGameOver,
    playIllegal,
    toggle() { enabled = !enabled; return enabled; },
    get enabled() { return enabled; },
  };
})();

/**
 * Determine the correct sound for a move and play it.
 * @param {object} moveInfo  — { piece, captured, from, to, notation }
 */
function playMoveSound(moveInfo) {
  const absP = Math.abs(moveInfo.piece);
  const isCastle = absP > 10 && Math.abs(moveInfo.from[0] - moveInfo.to[0]) === 2;
  const isPromotion =
    absP === 1 && (moveInfo.to[1] === 0 || moveInfo.to[1] === 7);
  const isCapture = moveInfo.captured !== 0;

  // Check detection — only when viewing live position (not during review)
  let isCheck = false;
  if (reviewIndex === null) {
    const oppKingId = moveInfo.piece > 0 ? -45 : 45;
    const oppKingPos = board.moveGen.findPiece(oppKingId);
    if (oppKingPos) {
      isCheck = board.moveGen.isKingChecked(oppKingPos);
    }
  }

  if (isCheck) {
    ChessAudio.playCheck();
  } else if (isCastle) {
    ChessAudio.playCastle();
  } else if (isPromotion) {
    ChessAudio.playPromotion();
  } else if (isCapture) {
    ChessAudio.playCapture();
  } else {
    ChessAudio.playMove();
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Globals
// ═══════════════════════════════════════════════════════════════════════

let ctx;
let canvasWidth;
let canvasHeight;

let board;
let pieceBoard;

let mouseX = 0;
let mouseY = 0;

let searchTime = 1;
let playerId = 0;
let hasPlayed = false;

// Move history (for display)
const moveHistory = [];

// Review mode: view past positions after game ends
let reviewIndex = null;       // null = live view, 0..N-1 = viewing move N, -1 = start position
let startingGrid = null;      // grid snapshot before any moves

// Piece name maps
const FILE_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANK_NUMBERS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_SYMBOLS = {
  1: '', 3: 'N', 4: 'B', 5: 'R', 9: 'Q', 45: 'K',
};
const CAPTURED_UNICODE = {
  1: '♙', 3: '♘', 4: '♗', 5: '♖', 9: '♕',
  '-1': '♟', '-3': '♞', '-4': '♝', '-5': '♜', '-9': '♛',
};

// ═══════════════════════════════════════════════════════════════════════
//  Setup
// ═══════════════════════════════════════════════════════════════════════

function setup() {
  board = new Chessboard([0, 0], 560);
  pieceBoard = new SelectPiece([0, 0], 560);

  const canvas = document.getElementById('game');
  if (!canvas.getContext) {
    alert("Your browser doesn't support canvas.");
    return;
  }

  ctx = canvas.getContext('2d');
  canvasWidth = canvas.width;
  canvasHeight = canvas.height;

  // Mouse/touch events — scale from CSS size to canvas internal size
  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    ];
  }

  function touchCoords(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [
      (touch.clientX - rect.left) * scaleX,
      (touch.clientY - rect.top) * scaleY,
    ];
  }

  // ── Tap-to-move state ──────────────────────────────────────────────
  // On mobile, tapping a piece selects it (shows legal moves).
  // Tapping a highlighted square completes the move.
  let selectedSquare = null;  // the square whose piece is selected for tap-to-move

  function handleTapToMove(pos) {
    if (board.pendingPromotion) {
      board.handlePromoClick(pos);
      board.mouse = [...pos];
      if (!board.pendingPromotion) {
        const prevTurn = board.turn;
        // promotion was handled inside handlePromoClick which calls makeMove
        // check if turn changed (it should have)
      }
      return true;
    }

    const sq = board.clickToSquare(pos);
    if (!sq) { clearTapSelection(); return false; }

    // If a square is already selected and this tap is on a legal-move square
    if (selectedSquare && sq.selected) {
      // Execute the move
      const from = board.pixelToIndex(selectedSquare.getMid());
      const to = board.pixelToIndex(sq.getMid());
      const absP = Math.abs(selectedSquare.piece ? selectedSquare.piece.index : 0);

      // Check for pawn promotion
      const pieceOnFrom = board.moveGen.grid[from[1]][from[0]];
      const absPiece = Math.abs(pieceOnFrom);
      const isPromo = absPiece === 1 && (to[1] === 0 || to[1] === 7);

      if (isPromo) {
        // Find the piece on the from square
        const piece = selectedSquare.piece;
        if (piece) {
          board.pendingPromotion = {
            from, to,
            sign: piece.index > 0 ? 1 : -1,
            sq, piece,
            originSq: selectedSquare,
          };
          // Move piece visually
          const idx = board.pieces.indexOf(piece);
          if (idx !== -1) board.pieces.splice(idx, 1);
          if (sq.piece) {
            const ci = board.pieces.indexOf(sq.piece);
            if (ci !== -1) board.pieces.splice(ci, 1);
          }
          piece.updateMid(sq.getMid());
          board.pieces.push(piece);
          board.mouse = [...pos];
        }
        clearTapSelection();
        return true;
      }

      board.moveGen.makeMove(from, to);
      board.clearFocus();
      sq.focused = true;
      selectedSquare.focused = true;

      if (sq.piece) {
        const idx = board.pieces.indexOf(sq.piece);
        if (idx !== -1) board.pieces.splice(idx, 1);
      }

      // Move the piece visually
      const piece = selectedSquare.piece;
      if (piece) {
        piece.updateMid(sq.getMid());
        board.handleCastling(piece, sq);
        piece.sq = sq;
        sq.piece = piece;
      }

      board.turn++;
      board.syncFromGrid(board.moveGen.getGrid());
      board.turn = board.moveGen.turn;

      clearTapSelection();
      return true; // move was made
    }

    // If tapping own piece, select it
    if (sq.piece) {
      const isWhitePiece = sq.piece.index > 0;
      const isWhiteTurn = board.turn % 2 === 0;
      if (isWhitePiece === isWhiteTurn) {
        clearTapSelection();
        board.clearSelection();
        board.showLegalMoves(sq);
        sq.focused = true;
        selectedSquare = sq;
        return true;
      }
    }

    // Tapping empty/opponent square with no selection — clear
    clearTapSelection();
    return false;
  }

  function clearTapSelection() {
    if (selectedSquare) {
      selectedSquare = null;
    }
    board.clearSelection();
  }

  // ── Mouse events ───────────────────────────────────────────────────

  canvas.addEventListener('mouseup', (e) => {
    if (reviewIndex !== null) return;
    [mouseX, mouseY] = canvasCoords(e);

    const prevTurn = board.turn;
    board.mouseUp([mouseX, mouseY]);

    if (board.turn !== prevTurn) {
      recordLastMove(true);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    [mouseX, mouseY] = canvasCoords(e);
    if (reviewIndex !== null) { canvas.style.cursor = 'default'; return; }
    const cursor = board.mouseMove([mouseX, mouseY]);
    if (cursor) canvas.style.cursor = cursor;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (reviewIndex !== null) return;
    [mouseX, mouseY] = canvasCoords(e);
    const cursor = board.mouseDown([mouseX, mouseY]);
    if (cursor) canvas.style.cursor = cursor;
  });

  canvas.addEventListener('mouseleave', () => {
    if (board.currentPiece) {
      board.currentPiece.revert();
      board.pieces.push(board.currentPiece);
      board.currentPiece = null;
      board.clearSelection();
    }
  });

  // ── Touch events (mobile) ─────────────────────────────────────────
  let touchStartPos = null;
  let isDragging = false;
  const DRAG_THRESHOLD = 10; // pixels before a tap becomes a drag

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (reviewIndex !== null) return;
    const touch = e.touches[0];
    const pos = touchCoords(touch);
    touchStartPos = pos;
    isDragging = false;
    [mouseX, mouseY] = pos;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (reviewIndex !== null) return;
    const touch = e.touches[0];
    const pos = touchCoords(touch);

    // Check if we've moved enough to start dragging
    if (!isDragging && touchStartPos) {
      const dx = pos[0] - touchStartPos[0];
      const dy = pos[1] - touchStartPos[1];
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        isDragging = true;
        // Start dragging — pick up piece
        clearTapSelection();
        const cursor = board.mouseDown(touchStartPos);
      }
    }

    if (isDragging) {
      board.mouseMove(pos);
    }
    [mouseX, mouseY] = pos;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (reviewIndex !== null) return;

    const pos = [mouseX, mouseY];

    if (isDragging) {
      // Complete the drag-and-drop
      const prevTurn = board.turn;
      board.mouseUp(pos);
      if (board.turn !== prevTurn) {
        recordLastMove(true);
      }
      clearTapSelection();
    } else {
      // It was a tap — use tap-to-move
      const prevTurn = board.turn;
      const handled = handleTapToMove(pos);
      if (board.turn !== prevTurn) {
        recordLastMove(true);
      }
    }

    touchStartPos = null;
    isDragging = false;
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    if (board.currentPiece) {
      board.currentPiece.revert();
      board.pieces.push(board.currentPiece);
      board.currentPiece = null;
      board.clearSelection();
    }
    touchStartPos = null;
    isDragging = false;
    clearTapSelection();
  });

  // Sound toggle button
  const soundBtn = document.getElementById('btnSound');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const on = ChessAudio.toggle();
      soundBtn.textContent = on ? '🔊 Sound' : '🔇 Muted';
    });
  }

  board.init();
  startingGrid = board.getGridState().map(r => [...r]);
  buildCoordinates();
  updateUI();

  // Keyboard navigation for move review
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); reviewPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); reviewNext(); }
    else if (e.key === 'Home') { e.preventDefault(); reviewStart(); }
    else if (e.key === 'End') { e.preventDefault(); reviewEnd(); }
  });

  setInterval(gameLoop, 60);
}

// ═══════════════════════════════════════════════════════════════════════
//  Coordinate labels
// ═══════════════════════════════════════════════════════════════════════

function buildCoordinates() {
  const files = board.flipped ? [...FILE_LETTERS].reverse() : FILE_LETTERS;
  const ranks = board.flipped ? RANK_NUMBERS : [...RANK_NUMBERS];

  for (const id of ['coordTop', 'coordBottom']) {
    const el = document.getElementById(id);
    el.innerHTML = files.map((f) => `<span>${f}</span>`).join('');
  }
  for (const id of ['coordLeft', 'coordRight']) {
    const el = document.getElementById(id);
    el.innerHTML = ranks.map((r) => `<span>${r}</span>`).join('');
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Move notation & recording
// ═══════════════════════════════════════════════════════════════════════

function squareName(x, y) {
  return FILE_LETTERS[x] + RANK_NUMBERS[y];
}

/**
 * Record the most recent move from the engine's history and optionally
 * play the corresponding sound.
 * @param {boolean} withSound — whether to trigger audio
 */
function recordLastMove(withSound = false) {
  const lm = board.moveGen.getLastMove();
  if (lm.length < 4) return;

  const pieceIndex = lm[0];
  const from = lm[1];
  const capturedIndex = lm[2];
  const to = lm[3];
  const absP = Math.abs(pieceIndex);

  let notation = '';
  const sym = PIECE_SYMBOLS[absP > 10 ? 45 : absP] || '';
  notation += sym;

  if (capturedIndex !== 0) {
    if (absP === 1) notation += FILE_LETTERS[from[0]];
    notation += 'x';
  }

  notation += squareName(to[0], to[1]);

  // Castling override
  if (absP > 10 && Math.abs(from[0] - to[0]) === 2) {
    notation = to[0] > from[0] ? 'O-O' : 'O-O-O';
  }

  // Promotion notation — detect what piece is now on the target square
  if (absP === 1 && (to[1] === 0 || to[1] === 7)) {
    const promoId = Math.abs(board.moveGen.grid[to[1]][to[0]]);
    const promoSymbol = { 9: 'Q', 5: 'R', 4: 'B', 3: 'N' }[promoId] || 'Q';
    notation += '=' + promoSymbol;
  }

  const moveInfo = {
    notation,
    piece: pieceIndex,
    captured: capturedIndex,
    from: [...from],
    to: [...to],
    gridAfter: board.getGridState().map(r => [...r]),
  };

  moveHistory.push(moveInfo);
  reviewIndex = null;
  updateMoveList();
  updateCapturedPieces();

  if (withSound) {
    playMoveSound(moveInfo);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  UI Updates
// ═══════════════════════════════════════════════════════════════════════

function updateUI() {
  updateTurnIndicator();
  updateMoveList();
  updateCapturedPieces();
}

function updateTurnIndicator() {
  const dot = document.getElementById('turnDot');
  const label = document.getElementById('turnLabel');

  const isWhiteTurn = board.turn % 2 === 0;
  const isAiThinking = playerId !== 3 && (
    (playerId === 0 && !isWhiteTurn) ||
    (playerId === 1 && isWhiteTurn)
  );

  dot.className = 'turn-dot' +
    (isWhiteTurn ? '' : ' black') +
    (isAiThinking && !board.gameover ? ' thinking' : '');

  if (reviewIndex !== null) {
    if (reviewIndex === -1) {
      label.textContent = 'Start position';
    } else {
      const moveNum = Math.floor(reviewIndex / 2) + 1;
      const side = reviewIndex % 2 === 0 ? 'White' : 'Black';
      label.textContent = `Move ${moveNum} — ${side}`;
    }
    dot.className = 'turn-dot';
  } else if (board.pendingPromotion) {
    label.textContent = (isWhiteTurn ? 'Black' : 'White') + ' — choose promotion';
  } else if (board.gameover) {
    label.textContent = 'Game over';
  } else if (isAiThinking) {
    label.textContent = (isWhiteTurn ? 'White' : 'Black') + ' thinking…';
  } else {
    label.textContent = (isWhiteTurn ? 'White' : 'Black') + ' to move';
  }
}

function updateMoveList() {
  const container = document.getElementById('moveList');

  if (moveHistory.length === 0) {
    container.innerHTML = '<p class="empty-moves">No moves yet</p>';
    updateBoardControlsMoves();
    updateNavArrows();
    return;
  }

  let html = '';
  for (let i = 0; i < moveHistory.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const whiteNote = moveHistory[i]?.notation || '';
    const blackNote = moveHistory[i + 1]?.notation || '';

    const wActive = reviewIndex === i ? ' active' : '';
    const bActive = (i + 1 < moveHistory.length && reviewIndex === i + 1) ? ' active' : '';

    html += `<div class="move-row">
      <span class="move-num">${num}.</span>
      <span class="move-white move-cell${wActive}" onclick="goToMove(${i})">${whiteNote}</span>`;
    if (blackNote) {
      html += `<span class="move-black move-cell${bActive}" onclick="goToMove(${i + 1})">${blackNote}</span>`;
    } else {
      html += `<span class="move-black"></span>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
  if (reviewIndex === null) {
    container.scrollTop = container.scrollHeight;
  }

  updateBoardControlsMoves();
  updateNavArrows();
}

/** Populate the compact mobile move strip under the board. */
function updateBoardControlsMoves() {
  const strip = document.getElementById('bcbMoves');
  if (!strip) return;

  if (moveHistory.length === 0) {
    strip.innerHTML = '<span class="bcb-placeholder">No moves yet</span>';
    return;
  }

  let html = '';
  for (let i = 0; i < moveHistory.length; i++) {
    const isWhite = i % 2 === 0;
    const num = Math.floor(i / 2) + 1;
    const active = reviewIndex === i ? ' active' : '';

    if (isWhite) {
      html += `<span class="bcb-num">${num}.</span>`;
    }
    html += `<span class="bcb-move${active}" onclick="goToMove(${i})">${moveHistory[i].notation}</span>`;
  }

  strip.innerHTML = html;

  // Auto-scroll to the active or latest move
  const activeEl = strip.querySelector('.bcb-move.active') || strip.lastElementChild;
  if (activeEl) {
    activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

function updateCapturedPieces() {
  const whiteCaptures = [];
  const blackCaptures = [];

  for (const m of moveHistory) {
    if (m.captured === 0) continue;
    if (m.captured > 0) {
      blackCaptures.push(m.captured);
    } else {
      whiteCaptures.push(m.captured);
    }
  }

  const renderCaptures = (ids, container) => {
    container.innerHTML = ids
      .sort((a, b) => Math.abs(b) - Math.abs(a))
      .map((id) => {
        const key = String(id);
        return `<span class="captured-piece">${CAPTURED_UNICODE[key] || ''}</span>`;
      })
      .join('');
  };

  renderCaptures(whiteCaptures, document.getElementById('capturedWhite'));
  renderCaptures(blackCaptures, document.getElementById('capturedBlack'));
}

function updateEngineStats(depth, nodes) {
  document.getElementById('statDepth').textContent = depth || '—';
  document.getElementById('statEval').textContent =
    nodes ? nodes.toLocaleString() : '—';
}

// ═══════════════════════════════════════════════════════════════════════
//  Game loop
// ═══════════════════════════════════════════════════════════════════════

let gameoverSoundPlayed = false;

function gameLoop() {
  clearScreen();

  const prevTurn = board.turn;

  // ── AI plays its turn ─────────────────────────────────────────────
  if (!board.pendingPromotion && playerId !== 3 && reviewIndex === null) {
    if (playerId === 0 && board.turn % 2 === 1) {
      board.play(searchTime);
    } else if (playerId === 1 && board.turn % 2 === 0) {
      board.play(searchTime);
    } else if (playerId === 2) {
      board.play(searchTime);
    }
  }

  // If AI moved, record it
  if (board.turn !== prevTurn) {
    recordLastMove(true);
    hasPlayed = true;

    if (board.ai.maxDepth !== undefined) {
      updateEngineStats(board.ai.maxDepth, board.ai.nodesSearched || 0);
    }
  }

  // Check game-ending conditions (not during promotion chooser)
  if (!board.currentPiece && !board.pendingPromotion && !board.gameover) {
    board.moveGen.turn = board.turn;
    board.moveGen.grid = board.getGridState();

    const drawResult = board.moveGen.isDraw();
    if (drawResult !== null) {
      board.gameover = true;
      setGameState(drawResult);
    }

    if (!board.gameover) {
      const legalMoves = board.moveGen.getAllLegalMoves();
      if (legalMoves.length === 0) {
        board.gameover = true;
        const kingId = board.turn % 2 === 0 ? 45 : -45;
        const kingPos = board.moveGen.findPiece(kingId);
        const isChecked = kingPos !== null && board.moveGen.isKingChecked(kingPos);

        if (isChecked) {
          if (playerId === 3) {
            // Human vs Human
            const winner = board.turn % 2 === 0 ? 'Black' : 'White';
            setGameState(`Checkmate — ${winner} wins!`);
          } else if (board.turn % 2 === 0) {
            setGameState(playerId === 1 ? 'Checkmate — you win!' : 'Checkmate — you lose');
          } else {
            setGameState(playerId === 0 ? 'Checkmate — you win!' : 'Checkmate — you lose');
          }
        }
      }
    }
  }

  // Game-over sound (once)
  if (board.gameover && !gameoverSoundPlayed) {
    gameoverSoundPlayed = true;
    ChessAudio.playGameOver();
  }

  updateTurnIndicator();

  // Render
  board.draw(ctx);
}

// ═══════════════════════════════════════════════════════════════════════
//  UI actions
// ═══════════════════════════════════════════════════════════════════════

function setGameState(text) {
  const el = document.getElementById('gamestate');
  el.textContent = text;
  el.classList.toggle('gameover', board.gameover);
}

function flip() {
  board.flip();
  buildCoordinates();
}

function undo() {
  if (board.gameover) return;
  if (reviewIndex !== null) return;

  if (playerId === 3) {
    board.undo();
    moveHistory.splice(-1, 1);
  } else {
    board.undo();
    board.undo();
    moveHistory.splice(-2, 2);
  }
  updateMoveList();
  updateCapturedPieces();
  setGameState('Your move');
  board.gameover = false;
  gameoverSoundPlayed = false;
}

function resetGame() {
  moveHistory.length = 0;
  reviewIndex = null;
  startingGrid = board.getGridState().map(r => [...r]);
  updateMoveList();
  updateCapturedPieces();
  updateEngineStats(null, 0);
  setGameState('Your move');
  hasPlayed = false;
  gameoverSoundPlayed = false;
  buildCoordinates();
}

function playAsWhite() {
  board.init();
  playerId = 0;
  resetGame();
  updateModeButtons();
}

function playAsBlack() {
  board.init();
  playerId = 1;
  board.flip();
  resetGame();
  updateModeButtons();
}

function playTwoPlayer() {
  board.init();
  playerId = 3;
  resetGame();
  updateModeButtons();
}

function updateModeButtons() {
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    const mode = btn.dataset.mode;
    const isActive =
      (mode === 'white' && playerId === 0) ||
      (mode === 'black' && playerId === 1) ||
      (mode === '2player' && playerId === 3);
    btn.classList.toggle('active', isActive);
  });
}

function setDifficulty(level) {
  document.querySelectorAll('.btn-diff').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
}

function playEasy() {
  searchTime = 0.25;
  setDifficulty('easy');
  document.getElementById('searchInfo').textContent = 'Depth limit: 0.25 s';
}

function playMedium() {
  searchTime = 1;
  setDifficulty('medium');
  document.getElementById('searchInfo').textContent = 'Depth limit: 1 s';
}

function playHard() {
  searchTime = 3;
  setDifficulty('hard');
  document.getElementById('searchInfo').textContent = 'Depth limit: 3 s';
}

// (Premove functionality removed)

// ═══════════════════════════════════════════════════════════════════════
//  Move review / replay
// ═══════════════════════════════════════════════════════════════════════

/** Play the sound for the move at the given history index. */
function playReviewSound(idx) {
  if (idx < 0 || idx >= moveHistory.length) return;
  playMoveSound(moveHistory[idx]);
}

function goToMove(idx) {
  if (moveHistory.length === 0) return;
  idx = Math.max(0, Math.min(idx, moveHistory.length - 1));
  reviewIndex = idx;
  showReviewPosition();
  updateMoveList();
  playReviewSound(idx);
}

function reviewPrev() {
  if (moveHistory.length === 0) return;
  if (reviewIndex === null) {
    reviewIndex = moveHistory.length - 2;
  } else if (reviewIndex > 0) {
    reviewIndex--;
  } else {
    reviewIndex = -1;
  }
  showReviewPosition();
  updateMoveList();
  if (reviewIndex >= 0) playReviewSound(reviewIndex);
}

function reviewNext() {
  if (moveHistory.length === 0) return;
  if (reviewIndex === null) return;
  if (reviewIndex < moveHistory.length - 1) {
    reviewIndex++;
  } else {
    reviewIndex = null;
  }
  showReviewPosition();
  updateMoveList();
  if (reviewIndex !== null) playReviewSound(reviewIndex);
  else playReviewSound(moveHistory.length - 1);
}

function reviewStart() {
  if (moveHistory.length === 0) return;
  reviewIndex = -1;
  showReviewPosition();
  updateMoveList();
}

function reviewEnd() {
  if (reviewIndex === null) return;
  reviewIndex = null;
  showReviewPosition();
  updateMoveList();
  playReviewSound(moveHistory.length - 1);
}

function showReviewPosition() {
  if (reviewIndex === null) {
    board.syncFromGrid(board.moveGen.getGrid());
    board.turn = board.moveGen.turn;
    return;
  }
  let grid;
  if (reviewIndex === -1) {
    grid = startingGrid || Chessboard.DEFAULT_POSITION;
  } else {
    grid = moveHistory[reviewIndex].gridAfter;
  }
  if (grid) {
    board.syncFromGrid(grid);
  }
}

function updateNavArrows() {
  const hasMoves = moveHistory.length > 0;
  const atStart = reviewIndex !== null && reviewIndex <= -1;
  const atLive = reviewIndex === null;

  // Desktop sidebar nav
  const ids = ['navStart', 'navPrev', 'navNext', 'navEnd'];
  // Mobile board bar nav
  const idsM = ['navStartM', 'navPrevM', 'navNextM', 'navEndM'];

  for (const set of [ids, idsM]) {
    const [sBtn, pBtn, nBtn, eBtn] = set.map(id => document.getElementById(id));
    if (!sBtn) continue;
    sBtn.disabled = !hasMoves || atStart;
    pBtn.disabled = !hasMoves || atStart;
    nBtn.disabled = !hasMoves || atLive;
    eBtn.disabled = !hasMoves || atLive;
  }
}

function clearScreen() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}
