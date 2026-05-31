// board.js — 棋盘状态、走法生成、将军检测、FEN转换
'use strict';

const ROWS = 10, COLS = 9;
const RED = 1, BLACK = 2;
const EMPTY = 0;
const PIECE = { GENERAL: 1, ADVISOR: 2, ELEPHANT: 3, HORSE: 4, ROOK: 5, CANNON: 6, PAWN: 7 };

const PIECE_NAMES = {
  [RED]: { 1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵' },
  [BLACK]: { 1: '将', 2: '士', 3: '象', 4: '马', 5: '车', 6: '炮', 7: '卒' }
};

// FEN piece characters: uppercase=RED, lowercase=BLACK
const FEN_CHARS = {
  [RED]: { 1: 'K', 2: 'A', 3: 'B', 4: 'N', 5: 'R', 6: 'C', 7: 'P' },
  [BLACK]: { 1: 'k', 2: 'a', 3: 'b', 4: 'n', 5: 'r', 6: 'c', 7: 'p' }
};

export { ROWS, COLS, RED, BLACK, PIECE, PIECE_NAMES, FEN_CHARS };

export function createPiece(t, c) { return { type: t, color: c }; }
export function opponent(c) { return c === RED ? BLACK : RED; }
export function isRed(c) { return c === RED; }
export function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
export function hasPiece(r, c, board) { return board[r][c] !== null; }
export function isOwnPiece(r, c, color, board) { var p = board[r][c]; return p && p.color === color; }
export function isOpponent(r, c, color, board) { var p = board[r][c]; return p && p.color !== color; }

export function initBoard() {
  var board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  var back = [PIECE.ROOK, PIECE.HORSE, PIECE.ELEPHANT, PIECE.ADVISOR, PIECE.GENERAL, PIECE.ADVISOR, PIECE.ELEPHANT, PIECE.HORSE, PIECE.ROOK];
  for (var c = 0; c < 9; c++) board[0][c] = createPiece(back[c], BLACK);
  for (var c = 0; c < 9; c++) board[9][c] = createPiece(back[c], RED);
  board[2][1] = createPiece(PIECE.CANNON, BLACK);
  board[2][7] = createPiece(PIECE.CANNON, BLACK);
  board[7][1] = createPiece(PIECE.CANNON, RED);
  board[7][7] = createPiece(PIECE.CANNON, RED);
  for (var c2 = 0; c2 < 9; c2 += 2) board[3][c2] = createPiece(PIECE.PAWN, BLACK);
  for (var c3 = 0; c3 < 9; c3 += 2) board[6][c3] = createPiece(PIECE.PAWN, RED);
  return board;
}

// ============ 走法生成 ============
function getGeneralMoves(r, c, color, board) {
  var moves = [], dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  var minR = isRed(color) ? 7 : 0, maxR = isRed(color) ? 9 : 2;
  for (var i = 0; i < dirs.length; i++) {
    var nr = r + dirs[i][0], nc = c + dirs[i][1];
    if (nr >= minR && nr <= maxR && nc >= 3 && nc <= 5 && !isOwnPiece(nr, nc, color, board))
      moves.push({ row: nr, col: nc });
  }
  return moves;
}
function getAdvisorMoves(r, c, color, board) {
  var moves = [], dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var minR = isRed(color) ? 7 : 0, maxR = isRed(color) ? 9 : 2;
  for (var i = 0; i < dirs.length; i++) {
    var nr = r + dirs[i][0], nc = c + dirs[i][1];
    if (nr >= minR && nr <= maxR && nc >= 3 && nc <= 5 && !isOwnPiece(nr, nc, color, board))
      moves.push({ row: nr, col: nc });
  }
  return moves;
}
function getElephantMoves(r, c, color, board) {
  var moves = [], def = [[2, 2, 1, 1], [2, -2, 1, -1], [-2, 2, -1, 1], [-2, -2, -1, -1]];
  var minR = isRed(color) ? 5 : 0, maxR = isRed(color) ? 9 : 4;
  for (var i = 0; i < def.length; i++) {
    var dr = def[i][0], dc = def[i][1], er = def[i][2], ec = def[i][3];
    var nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && nr >= minR && nr <= maxR && !hasPiece(r + er, c + ec, board) && !isOwnPiece(nr, nc, color, board))
      moves.push({ row: nr, col: nc });
  }
  return moves;
}
function getHorseMoves(r, c, color, board) {
  var moves = [];
  var def = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
             [-1, -2, 0, -1], [-1, 2, 0, 1], [1, -2, 0, -1], [1, 2, 0, 1]];
  for (var i = 0; i < def.length; i++) {
    var dr = def[i][0], dc = def[i][1], lr = def[i][2], lc = def[i][3];
    var nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && !hasPiece(r + lr, c + lc, board) && !isOwnPiece(nr, nc, color, board))
      moves.push({ row: nr, col: nc });
  }
  return moves;
}
function getRookMoves(r, c, color, board) {
  var moves = [], dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (!hasPiece(nr, nc, board)) moves.push({ row: nr, col: nc });
      else { if (isOpponent(nr, nc, color, board)) moves.push({ row: nr, col: nc }); break; }
      nr += dr; nc += dc;
    }
  }
  return moves;
}
function getCannonMoves(r, c, color, board) {
  var moves = [], dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc) && !hasPiece(nr, nc, board)) {
      moves.push({ row: nr, col: nc }); nr += dr; nc += dc;
    }
    if (inBounds(nr, nc)) { nr += dr; nc += dc; } // 跳过炮架
    while (inBounds(nr, nc) && !hasPiece(nr, nc, board)) { nr += dr; nc += dc; }
    if (inBounds(nr, nc) && isOpponent(nr, nc, color, board)) moves.push({ row: nr, col: nc });
  }
  return moves;
}
function getPawnMoves(r, c, color, board) {
  var moves = [], forward = isRed(color) ? -1 : 1;
  var crossed = isRed(color) ? r <= 4 : r >= 5;
  var nr = r + forward;
  if (inBounds(nr, c) && !isOwnPiece(nr, c, color, board)) moves.push({ row: nr, col: c });
  if (crossed) {
    for (var dc = -1; dc <= 1; dc += 2) {
      var nc = c + dc;
      if (inBounds(r, nc) && !isOwnPiece(r, nc, color, board)) moves.push({ row: r, col: nc });
    }
  }
  return moves;
}
export function getRawMoves(r, c, color, type, board) {
  switch (type) {
    case PIECE.GENERAL: return getGeneralMoves(r, c, color, board);
    case PIECE.ADVISOR: return getAdvisorMoves(r, c, color, board);
    case PIECE.ELEPHANT: return getElephantMoves(r, c, color, board);
    case PIECE.HORSE: return getHorseMoves(r, c, color, board);
    case PIECE.ROOK: return getRookMoves(r, c, color, board);
    case PIECE.CANNON: return getCannonMoves(r, c, color, board);
    case PIECE.PAWN: return getPawnMoves(r, c, color, board);
    default: return [];
  }
}

// ============ 将军检测 ============
export function findGeneral(color, board) {
  for (var r = 0; r < ROWS; r++)
    for (var c = 0; c < COLS; c++) {
      var p = board[r][c];
      if (p && p.type === PIECE.GENERAL && p.color === color) return { row: r, col: c };
    }
  return null;
}
function moveLeavesInCheck(fromR, fromC, toR, toC, color, board) {
  var captured = board[toR][toC];
  board[toR][toC] = board[fromR][fromC];
  board[fromR][fromC] = null;
  var result = isInCheck(color, board);
  board[fromR][fromC] = board[toR][toC];
  board[toR][toC] = captured;
  return result;
}
function isSquareAttacked(r, c, attackerColor, board) {
  for (var row = 0; row < ROWS; row++)
    for (var col = 0; col < COLS; col++) {
      var p = board[row][col];
      if (p && p.color === attackerColor) {
        var moves = getRawMoves(row, col, attackerColor, p.type, board);
        for (var i = 0; i < moves.length; i++)
          if (moves[i].row === r && moves[i].col === c) return true;
      }
    }
  return false;
}
function flyingGenerals(board) {
  var redG = findGeneral(RED, board), blackG = findGeneral(BLACK, board);
  if (!redG || !blackG || redG.col !== blackG.col) return false;
  var minR = Math.min(redG.row, blackG.row), maxR = Math.max(redG.row, blackG.row);
  for (var r = minR + 1; r < maxR; r++)
    if (hasPiece(r, redG.col, board)) return false;
  return true;
}
export function isInCheck(color, board) {
  var g = findGeneral(color, board);
  if (!g) return true;
  if (isSquareAttacked(g.row, g.col, opponent(color), board)) return true;
  return flyingGenerals(board);
}
export function getLegalMoves(r, c, color, type, board) {
  var raw = getRawMoves(r, c, color, type, board);
  var b = board;
  return raw.filter(function (m) { return !moveLeavesInCheck(r, c, m.row, m.col, color, b); });
}
export function hasAnyLegalMove(color, board) {
  for (var r = 0; r < ROWS; r++)
    for (var c = 0; c < COLS; c++) {
      var p = board[r][c];
      if (p && p.color === color && getLegalMoves(r, c, color, p.type, board).length > 0) return true;
    }
  return false;
}

// ============ FEN 转换 ============
// board[row][col], row 0=黑方底线, row 9=红方底线
export function boardToFen(board, currentTurn) {
  var fen = '';
  for (var r = 0; r < ROWS; r++) {
    var empty = 0;
    for (var c = 0; c < COLS; c++) {
      var p = board[r][c];
      if (p === null) { empty++; }
      else {
        if (empty > 0) { fen += empty; empty = 0; }
        fen += FEN_CHARS[p.color][p.type];
      }
    }
    if (empty > 0) fen += empty;
    if (r < ROWS - 1) fen += '/';
  }
  fen += ' ' + (currentTurn === RED ? 'w' : 'b');
  fen += ' - - 0 1';
  return fen;
}

// UCI move string → board coordinates
// Fairy-Stockfish xiangqi: 使用 1-based ranks (1=红方底线, 10=黑方底线)
// 所以 rank 数字是 1-10，需要解析变长数字
export function uciToMove(uci) {
  // 解析变长格式: file+rank+file+rank, rank 可能是 1 或 2 位数字
  var i = 1;
  var colFrom = uci.charCodeAt(0) - 97;
  var rankFromStr = '';
  while (i < uci.length && uci[i] >= '0' && uci[i] <= '9') { rankFromStr += uci[i]; i++; }
  var rowFrom = 10 - parseInt(rankFromStr);
  var colTo = uci.charCodeAt(i) - 97;
  i++;
  var rankToStr = '';
  while (i < uci.length && uci[i] >= '0' && uci[i] <= '9') { rankToStr += uci[i]; i++; }
  var rowTo = 10 - parseInt(rankToStr);
  return { fromR: rowFrom, fromC: colFrom, toR: rowTo, toC: colTo };
}

// board coordinates → UCI move string
export function moveToUci(fromR, fromC, toR, toC) {
  return String.fromCharCode(97 + fromC) + (10 - fromR) + String.fromCharCode(97 + toC) + (10 - toR);
}
