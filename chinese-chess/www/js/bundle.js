// bundle.js - Chinese Chess non-module bundle
'use strict';

// ============ board.js ============
// board.js — 棋盘状态、走法生成、将军检测、FEN转换

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

function createPiece(t, c) { return { type: t, color: c }; }
function opponent(c) { return c === RED ? BLACK : RED; }
function isRed(c) { return c === RED; }
function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function hasPiece(r, c, board) { return board[r][c] !== null; }
function isOwnPiece(r, c, color, board) { var p = board[r][c]; return p && p.color === color; }
function isOpponent(r, c, color, board) { var p = board[r][c]; return p && p.color !== color; }
function initBoard() {
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
function getRawMoves(r, c, color, type, board) {
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
function findGeneral(color, board) {
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
function isInCheck(color, board) {
  var g = findGeneral(color, board);
  if (!g) return true;
  if (isSquareAttacked(g.row, g.col, opponent(color), board)) return true;
  return flyingGenerals(board);
}
function getLegalMoves(r, c, color, type, board) {
  var raw = getRawMoves(r, c, color, type, board);
  var b = board;
  return raw.filter(function (m) { return !moveLeavesInCheck(r, c, m.row, m.col, color, b); });
}
function hasAnyLegalMove(color, board) {
  for (var r = 0; r < ROWS; r++)
    for (var c = 0; c < COLS; c++) {
      var p = board[r][c];
      if (p && p.color === color && getLegalMoves(r, c, color, p.type, board).length > 0) return true;
    }
  return false;
}

// ============ FEN 转换 ============
// board[row][col], row 0=黑方底线, row 9=红方底线
function boardToFen(board, currentTurn) {
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
function uciToMove(uci) {
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
function moveToUci(fromR, fromC, toR, toC) {
  return String.fromCharCode(97 + fromC) + (10 - fromR) + String.fromCharCode(97 + toC) + (10 - toR);
}


// ============ checkmate.js ============
// checkmate.js — 绝杀类型检测


// 检测哪些对方棋子攻击指定位置
function findAttackers(r, c, color, board) {
  var attackers = [];
  for (var row = 0; row < ROWS; row++) {
    for (var col = 0; col < COLS; col++) {
      var p = board[row][col];
      if (p && p.color === color) {
        var moves = getRawMoves(row, col, color, p.type, board);
        for (var mi = 0; mi < moves.length; mi++) {
          if (moves[mi].row === r && moves[mi].col === c) {
            attackers.push({ row: row, col: col, piece: p });
            break;
          }
        }
      }
    }
  }
  return attackers;
}

// 两将是否面对面
function isFlyingGeneral(board) {
  var redG = findGeneral(RED, board);
  var blackG = findGeneral(BLACK, board);
  if (!redG || !blackG || redG.col !== blackG.col) return false;
  var minR = Math.min(redG.row, blackG.row);
  var maxR = Math.max(redG.row, blackG.row);
  for (var r = minR + 1; r < maxR; r++) {
    if (board[r][redG.col] !== null) return false;
  }
  return true;
}

// 检测绝杀类型
// board: 绝杀后的棋盘状态
// lastMove: {piece:{type,color}, fromR,fromC, toR,toC, captured}
// moveHistory: 完整走法历史
function detectCheckmateType(board, lastMove, moveHistory) {
  if (!lastMove) return '绝杀';

  var piece = lastMove.piece;
  var attackerColor = piece.color;
  var loserColor = opponent(attackerColor);

  // ── 困毙（无子可动但未被将军）──
  if (!isInCheck(loserColor, board)) return '困毙';

  var general = findGeneral(loserColor, board);
  if (!general) return '绝杀';

  var gr = general.row, gc = general.col;
  var attackers = findAttackers(gr, gc, attackerColor, board);

  // ══════ 重炮杀（最高优先级，独立扫描不依赖 findAttackers） ══════
  // 两个炮在将的同一直线上，前炮与将之间恰好 1 个子，两炮之间无子
  {
    var allCannons = [];
    for (var sr = 0; sr < ROWS; sr++) {
      for (var sc = 0; sc < COLS; sc++) {
        var cp = board[sr][sc];
        if (cp && cp.type === PIECE.CANNON && cp.color === attackerColor) {
          allCannons.push({r: sr, c: sc});
        }
      }
    }
    if (allCannons.length >= 2) {
      // 只考虑实际在将军的炮
      var attackerCannons = attackers.filter(function(a) { return a.piece.type === PIECE.CANNON; });
      var attackerSet = {};
      for (var aiC = 0; aiC < attackerCannons.length; aiC++) {
        var key = attackerCannons[aiC].row + ',' + attackerCannons[aiC].col;
        attackerSet[key] = true;
      }
      for (var i = 0; i < allCannons.length; i++) {
        for (var j = i + 1; j < allCannons.length; j++) {
          var a = allCannons[i], b = allCannons[j];
          // 两炮必须在同一直线上
          var sameLineRow = (a.r === b.r) ? a.r : -1;
          var sameLineCol = (a.c === b.c) ? a.c : -1;
          if (sameLineRow < 0 && sameLineCol < 0) continue;
          // 将必须在同一直线上
          if (sameLineRow >= 0 && gr !== sameLineRow) continue;
          if (sameLineCol >= 0 && gc !== sameLineCol) continue;
          // 两炮必须在将的同一侧
          if (sameLineRow >= 0) {
            if (!((gc > a.c && gc > b.c) || (gc < a.c && gc < b.c))) continue;
          } else {
            if (!((gr > a.r && gr > b.r) || (gr < a.r && gr < b.r))) continue;
          }
          // 至少一个炮实际在将军
          if (!attackerSet[a.r + ',' + a.c] && !attackerSet[b.r + ',' + b.c]) continue;
          // 两炮之间无子
          var blocked = false;
          if (sameLineRow >= 0) {
            var minC = Math.min(a.c, b.c), maxC = Math.max(a.c, b.c);
            for (var col = minC + 1; col < maxC; col++) { if (board[sameLineRow][col] !== null) { blocked = true; break; } }
          } else {
            var minR = Math.min(a.r, b.r), maxR = Math.max(a.r, b.r);
            for (var row = minR + 1; row < maxR; row++) { if (board[row][sameLineCol] !== null) { blocked = true; break; } }
          }
          if (blocked) continue;
          // 前炮（离将近的）必须与将之间恰好 1 个子
          var frontR, frontC;
          if (sameLineRow >= 0) {
            if (Math.abs(a.c - gc) < Math.abs(b.c - gc)) { frontR = a.r; frontC = a.c; } else { frontR = b.r; frontC = b.c; }
          } else {
            if (Math.abs(a.r - gr) < Math.abs(b.r - gr)) { frontR = a.r; frontC = a.c; } else { frontR = b.r; frontC = b.c; }
          }
          var betweenCount = 0;
          if (sameLineRow >= 0) {
            var minFc = Math.min(frontC, gc), maxFc = Math.max(frontC, gc);
            for (var fc = minFc + 1; fc < maxFc; fc++) { if (board[frontR][fc] !== null) betweenCount++; }
          } else {
            var minFr = Math.min(frontR, gr), maxFr = Math.max(frontR, gr);
            for (var fr = minFr + 1; fr < maxFr; fr++) { if (board[fr][frontC] !== null) betweenCount++; }
          }
          if (betweenCount === 1) return '重炮';
        }
      }
    }
  }

  // 提取攻击子的类型和位置信息
  var types = attackers.map(function(a) { return a.piece.type; });
  var hasRook = types.indexOf(PIECE.ROOK) >= 0;
  var hasCannon = types.indexOf(PIECE.CANNON) >= 0;
  var hasHorse = types.indexOf(PIECE.HORSE) >= 0;
  var hasPawn = types.indexOf(PIECE.PAWN) >= 0;
  var rookCount = types.filter(function(t) { return t === PIECE.ROOK; }).length;
  var cannonCount = types.filter(function(t) { return t === PIECE.CANNON; }).length;
  var horseCount = types.filter(function(t) { return t === PIECE.HORSE; }).length;
  var pawnCount = types.filter(function(t) { return t === PIECE.PAWN; }).length;

  // 马的位置（如果有马参与攻击）
  var horsePos = null;
  for (var ai = 0; ai < attackers.length; ai++) {
    if (attackers[ai].piece.type === PIECE.HORSE) {
      horsePos = attackers[ai];
      break;
    }
  }

  // ── 白脸将（对面笑）──
  if (isFlyingGeneral(board)) {
    return '白脸将（对面笑）';
  }

  // ══════ 马类杀法（特异性高，优先检测） ══════

  if (horsePos) {
    var hr = horsePos.row, hc = horsePos.col;
    var dr = Math.abs(hr - gr), dc = Math.abs(hc - gc);
    var isHorseCheck = (dr === 2 && dc === 1) || (dr === 1 && dc === 2);

    if (isHorseCheck) {
      // 挂角马：马在九宫斜角 (2,2)/(2,6) 或 (7,2)/(7,6)
      if ((hr === 2 || hr === 7) && (hc === 2 || hc === 6)) {
        return '挂角马';
      }

      // 卧槽马：马在 (0,1)/(0,7) 或 (9,1)/(9,7)
      if ((hr === 0 || hr === 9) && (hc === 1 || hc === 7)) {
        return '卧槽马';
      }

      // 钓鱼马：马在 (1,1)/(1,7) 或 (8,1)/(8,7)
      if ((hr === 1 || hr === 8) && (hc === 1 || hc === 7)) {
        return '钓鱼马';
      }

      // 侧面虎（高钓马）：马在 (3,2)/(3,6) 或 (6,2)/(6,6)
      if ((hr === 3 || hr === 6) && (hc === 2 || hc === 6)) {
        return '侧面虎（高钓马）';
      }

      // 八角马：马在将的周围但不是以上特定位置
      return '八角马';
    }

    // 白马现蹄：马将军且将被己方子堵死所有退路（攻击者只有马一子）
    if (horsePos && attackers.length === 1) {
      var gMinR = isRed(loserColor) ? 7 : 0;
      var gMaxR = isRed(loserColor) ? 9 : 2;
      var anyEscape = false;
      var gDirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (var di = 0; di < gDirs.length; di++) {
        var nr = gr + gDirs[di][0], nc = gc + gDirs[di][1];
        if (nr >= gMinR && nr <= gMaxR && nc >= 3 && nc <= 5) {
          if (board[nr][nc] === null) {
            var rawMoves = getRawMoves(hr, hc, attackerColor, PIECE.HORSE, board);
            var attacked = false;
            for (var ri = 0; ri < rawMoves.length; ri++) {
              if (rawMoves[ri].row === nr && rawMoves[ri].col === nc) { attacked = true; break; }
            }
            if (!attacked) { anyEscape = true; break; }
          }
        }
      }
      if (!anyEscape) return '白马现蹄';
    }
  }

  // ══════ 炮类杀法 ══════

  // 马后炮：炮和马配合，马做炮架
  if (hasHorse && hasCannon) {
    for (var ai2 = 0; ai2 < attackers.length; ai2++) {
      if (attackers[ai2].piece.type === PIECE.CANNON) {
        var cr = attackers[ai2].row, cc = attackers[ai2].col;
        if (cr === gr || cc === gc) {
          var between = 0, betweenHorse = false;
          if (cr === gr) {
            var minC = Math.min(cc, gc), maxC = Math.max(cc, gc);
            for (var ci = minC + 1; ci < maxC; ci++) {
              var bp = board[cr][ci];
              if (bp) {
                between++;
                if (bp.type === PIECE.HORSE && bp.color === attackerColor) betweenHorse = true;
              }
            }
          } else {
            var minR = Math.min(cr, gr), maxR = Math.max(cr, gr);
            for (var ri2 = minR + 1; ri2 < maxR; ri2++) {
              var bp2 = board[ri2][cc];
              if (bp2) {
                between++;
                if (bp2.type === PIECE.HORSE && bp2.color === attackerColor) betweenHorse = true;
              }
            }
          }
          if (between === 1 && betweenHorse) return '马后炮';
        }
      }
    }
  }

  // 闷宫：炮隔着对方士/象打将，将被自己的子堵住
  if (hasCannon) {
    for (var ai9 = 0; ai9 < attackers.length; ai9++) {
      if (attackers[ai9].piece.type === PIECE.CANNON) {
        var ccr = attackers[ai9].row, ccc = attackers[ai9].col;
        if (ccr === gr || ccc === gc) {
          var minR4 = Math.min(ccr, gr), maxR4 = Math.max(ccr, gr);
          var minC4 = Math.min(ccc, gc), maxC4 = Math.max(ccc, gc);
          var betweenCount = 0, betweenIsFriend = true, betweenIsAdvisorElephant = false;
          if (ccr === gr) {
            for (var ci4 = minC4 + 1; ci4 < maxC4; ci4++) {
              var bp3 = board[ccr][ci4];
              if (bp3) {
                betweenCount++;
                if (bp3.color !== loserColor) betweenIsFriend = false;
                if (bp3.type === PIECE.ADVISOR || bp3.type === PIECE.ELEPHANT) betweenIsAdvisorElephant = true;
              }
            }
          } else {
            for (var ri5 = minR4 + 1; ri5 < maxR4; ri5++) {
              var bp4 = board[ri5][ccc];
              if (bp4) {
                betweenCount++;
                if (bp4.color !== loserColor) betweenIsFriend = false;
                if (bp4.type === PIECE.ADVISOR || bp4.type === PIECE.ELEPHANT) betweenIsAdvisorElephant = true;
              }
            }
          }
          // 炮架是己方的士/象（即将的贴身护卫），无法移开
          if (betweenCount === 1 && betweenIsFriend && betweenIsAdvisorElephant) {
            return '闷宫';
          }
        }
      }
    }
  }

  // 天地炮：一炮在中路，一炮在侧面，车配合
  if (cannonCount >= 2 && hasRook) {
    var hasAboveBelow = false, hasSide = false;
    for (var ai3 = 0; ai3 < attackers.length; ai3++) {
      if (attackers[ai3].piece.type === PIECE.CANNON) {
        if (attackers[ai3].col === gc) hasAboveBelow = true;
        else hasSide = true;
      }
    }
    if (hasAboveBelow && hasSide) return '天地炮';
  }

  // 空头炮：炮在中路且将和炮之间无子
  if (hasCannon) {
    for (var ai4 = 0; ai4 < attackers.length; ai4++) {
      if (attackers[ai4].piece.type === PIECE.CANNON && attackers[ai4].col === gc) {
        var cr2 = attackers[ai4].row, cc2 = attackers[ai4].col;
        var minR3 = Math.min(cr2, gr), maxR3 = Math.max(cr2, gr);
        var between2 = 0;
        for (var ri4 = minR3 + 1; ri4 < maxR3; ri4++) {
          if (board[ri4][cc2] !== null) between2++;
        }
        if (between2 === 0) return '空头炮';
      }
    }
  }

  // ══════ 车类杀法 ══════

  // 双车错：两个车在不同方向攻击将
  if (rookCount >= 2) {
    var rookDirs = 0;
    var firstRookRow = null, firstRookCol = null;
    for (var aiR = 0; aiR < attackers.length; aiR++) {
      if (attackers[aiR].piece.type === PIECE.ROOK) {
        if (firstRookRow === null) {
          firstRookRow = attackers[aiR].row;
          firstRookCol = attackers[aiR].col;
        } else {
          if (attackers[aiR].row !== firstRookRow && attackers[aiR].col !== firstRookCol)
            rookDirs = 2; // 不同方向
        }
      }
    }
    return '双车错';
  }

  // 大胆穿心 / 大刀剜心：车吃中心士/象绝杀
  if (lastMove.piece.type === PIECE.ROOK) {
    var lr = lastMove.toR, lc = lastMove.toC;
    if (lc === 4 && (lr === 0 || lr === 9)) {
      if (lastMove.captured) {
        if (lastMove.captured.type === PIECE.ADVISOR) return '大刀剜心';
        if (lastMove.captured.type === PIECE.ELEPHANT || lastMove.captured.type === PIECE.GENERAL) return '大胆穿心';
      }
    }
  }

  // 车炮抽杀：车+炮配合的抽将杀
  if (hasRook && hasCannon && attackers.length <= 3) {
    return '车炮抽杀';
  }

  // 夹车炮：两个炮一个车配合
  if (hasRook && cannonCount >= 2) {
    return '夹车炮';
  }

  // ══════ 兵类杀法 ══════

  // 小鬼坐龙庭：兵坐到将的位置上
  if (hasPawn) {
    for (var ai7 = 0; ai7 < attackers.length; ai7++) {
      if (attackers[ai7].piece.type === PIECE.PAWN) {
        if (attackers[ai7].row === gr && attackers[ai7].col === gc) return '小鬼坐龙庭';
      }
    }
  }

  // 二鬼拍门：两个兵在将的宫门口
  if (pawnCount >= 2) {
    var pawnsAtGate = 0;
    var gateRow = loserColor === RED ? 9 : 0;
    for (var ai6 = 0; ai6 < attackers.length; ai6++) {
      if (attackers[ai6].piece.type === PIECE.PAWN) {
        if (attackers[ai6].row === gateRow && attackers[ai6].col >= 3 && attackers[ai6].col <= 5)
          pawnsAtGate++;
      }
    }
    if (pawnsAtGate >= 2) return '二鬼拍门';
  }

  // 老兵搜林：兵到底线将军
  if (hasPawn) {
    for (var ai8 = 0; ai8 < attackers.length; ai8++) {
      if (attackers[ai8].piece.type === PIECE.PAWN) {
        if ((attackerColor === RED && attackers[ai8].row === 0) ||
            (attackerColor === BLACK && attackers[ai8].row === 9)) {
          return '老兵搜林';
        }
      }
    }
  }

  // ══════ 多子配合 ══════

  // 双马饮泉：双马配合杀
  if (horseCount >= 2) {
    return '双马饮泉';
  }

  // 拔簧马：马+车配合（马做炮架式助攻）
  if (hasHorse && hasRook && horsePos && attackers.length >= 2) {
    return '拔簧马';
  }

  // 三车闹士：双车+兵攻士
  if (rookCount >= 2 && pawnCount >= 1) {
    return '三车闹士';
  }

  // 三子归边：三个攻击子在将的一侧
  {
    var leftCount = 0, rightCount = 0;
    for (var ai10 = 0; ai10 < attackers.length; ai10++) {
      if (attackers[ai10].col < gc) leftCount++;
      else if (attackers[ai10].col > gc) rightCount++;
    }
    if (leftCount >= 3 || rightCount >= 3) {
      return '三子归边';
    }
  }

  // ══════ 笼统模式（特异性低，放最后） ══════

  // 送佛归殿：车追将到角落无法动弹
  if (hasRook && attackers.length === 1) {
    var gMinR3 = isRed(loserColor) ? 7 : 0;
    var gMaxR3 = isRed(loserColor) ? 9 : 2;
    var generalEscapes = 0;
    var gDirs3 = [[0,1],[0,-1],[1,0],[-1,0]];
    for (var di3 = 0; di3 < gDirs3.length; di3++) {
      var nr3 = gr + gDirs3[di3][0], nc3 = gc + gDirs3[di3][1];
      if (nr3 >= gMinR3 && nr3 <= gMaxR3 && nc3 >= 3 && nc3 <= 5) {
        if (board[nr3][nc3] === null) generalEscapes++;
      }
    }
    if (generalEscapes === 0) return '送佛归殿';
  }

  // 臣压君：将/帅被自己的子堵住出路，且攻击子紧贴将/帅
  if (attackers.length === 1) {
    var att = attackers[0];
    var ar = att.row, ac = att.col;
    var rowDiff = Math.abs(ar - gr);
    var colDiff = Math.abs(ac - gc);

    // Condition 1: attacker must be directly adjacent (orthogonal/diagonal or knight move)
    var isAdjacent = (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    if (!isAdjacent) {
      isAdjacent = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }
    if (!isAdjacent) { /* skip if not adjacent */ } else {
      // Condition 2: general cannot capture the attacker (attacker is protected)
      var canCapture = false;
      if (rowDiff <= 1 && colDiff <= 1) {
        var savedPiece = board[ar][ac];
        var savedGen = board[gr][gc];
        board[gr][gc] = null;
        board[ar][ac] = { type: PIECE.GENERAL, color: loserColor };
        canCapture = !isInCheck(loserColor, board);
        board[gr][gc] = savedGen;
        board[ar][ac] = savedPiece;
      }

      if (!canCapture) {
        // Condition 3: no escape squares (all blocked or attacked)
        var gMinR2 = isRed(loserColor) ? 7 : 0;
        var gMaxR2 = isRed(loserColor) ? 9 : 2;
        var anyEscape = false;
        var gDirs2 = [[0,1],[0,-1],[1,0],[-1,0]];
        for (var di2 = 0; di2 < gDirs2.length; di2++) {
          var nr = gr + gDirs2[di2][0], nc = gc + gDirs2[di2][1];
          if (nr < gMinR2 || nr > gMaxR2 || nc < 3 || nc > 5) continue;
          var target = board[nr][nc];
          if (target === null) {
            // Empty square — check if attacked
            var savedGen2 = board[gr][gc];
            board[gr][gc] = null;
            var sqAttackers = findAttackers(nr, nc, attackerColor, board);
            board[gr][gc] = savedGen2;
            if (sqAttackers.length === 0) { anyEscape = true; break; }
          } else if (target.color === attackerColor) {
            // Enemy piece — general can capture if not protected
            var savedTarget = board[nr][nc];
            var savedGen3 = board[gr][gc];
            board[gr][gc] = null;
            board[nr][nc] = { type: PIECE.GENERAL, color: loserColor };
            if (!isInCheck(loserColor, board)) { anyEscape = true; board[gr][gc] = savedGen3; board[nr][nc] = savedTarget; break; }
            board[gr][gc] = savedGen3;
            board[nr][nc] = savedTarget;
          }
        }
        if (!anyEscape) return '臣压君';
      }
    }
  }

  // 铁门栓：车控制将的出路（放到最后，特异性最低）
  if (hasRook && attackers.length === 1) {
    for (var ai5 = 0; ai5 < attackers.length; ai5++) {
      if (attackers[ai5].piece.type === PIECE.ROOK) {
        return '铁门栓';
      }
    }
  }

  // 默认绝杀
  return '绝杀';
}

// isRed from board.js


// ============ opening-book.js ============
// opening-book.js — 开局库匹配：根据前几步走法识别开局名称


// ============ 通用匹配工具 ============

function match(m, opts) {
  if (!m) return false;
  if (opts.color !== undefined && m.piece.color !== opts.color) return false;
  if (opts.type !== undefined && m.piece.type !== opts.type) return false;
  if (opts.fr !== undefined && m.fromR !== opts.fr) return false;
  if (opts.fc !== undefined && m.fromC !== opts.fc) return false;
  if (opts.tr !== undefined && m.toR !== opts.tr) return false;
  if (opts.tc !== undefined && m.toC !== opts.tc) return false;
  return true;
}

// ============ 红方第一步识别 ============

function redFirstMove(moves) {
  if (moves.length < 1) return 'unknown';
  var m = moves[0];
  // 中炮: 炮从 (7,1) 或 (7,7) 移到 (7,4)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:4 })) return '中炮_右';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:4 })) return '中炮_左';
  // 仙人指路: 兵从 (6,4) 进到 (5,4)
  if (match(m, { color:RED, type:PIECE.PAWN, fr:6, fc:4, tr:5, tc:4 })) return '仙人指路';
  // 飞相局: 相从 (9,2) 或 (9,6) 走到 (8,4)
  if (match(m, { color:RED, type:PIECE.ELEPHANT, fr:9, fc:2, tr:8, tc:4 })) return '飞相局';
  if (match(m, { color:RED, type:PIECE.ELEPHANT, fr:9, fc:6, tr:8, tc:4 })) return '飞相局';
  // 起马局: 马二进三 (9,1)→(7,2) 或 马八进七 (9,7)→(7,6)
  if (match(m, { color:RED, type:PIECE.HORSE, fr:9, fc:1, tr:7, tc:2 })) return '起马局';
  if (match(m, { color:RED, type:PIECE.HORSE, fr:9, fc:7, tr:7, tc:6 })) return '起马局';
  // 过宫炮: 炮从 (7,1) 到 (7,3) 或 (7,7) 到 (7,5)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:3 })) return '过宫炮';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:5 })) return '过宫炮';
  // 仕角炮: 炮从 (7,1) 到 (7,2) 或 (7,7) 到 (7,6)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:2 })) return '仕角炮';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:6 })) return '仕角炮';
  return '其他';
}

// ============ 黑方走法检查工具 ============

function getMove(moves, idx) { return idx < moves.length ? moves[idx] : null; }

function blackHorseAdvance(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.HORSE, fr:0, fc:1, tr:2, tc:2 }) ||
           match(m, { color:BLACK, type:PIECE.HORSE, fr:0, fc:7, tr:2, tc:6 });
  };
}

// 黑方是否在指定步走了中炮（同侧/异侧）
function blackCannonCenterAt(idx, sameSide) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON, tr:2, tc:4 })) return false;
    // 同侧/异侧：检查红方第一步炮的来源列
    if (sameSide === undefined) return true;
    var r1 = getMove(moves, 0);
    var redFromC = r1 ? r1.fromC : -1;
    if (sameSide) return m.fromC === redFromC;
    else return m.fromC !== redFromC;
  };
}

function blackPawnCenterAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    // 黑卒从 (3,2) 进到 (4,2) 或 (3,6) 进到 (4,6)
    return match(m, { color:BLACK, type:PIECE.PAWN, fr:3, fc:2, tr:4, tc:2 }) ||
           match(m, { color:BLACK, type:PIECE.PAWN, fr:3, fc:6, tr:4, tc:6 });
  };
}

function blackElephantCenterAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.ELEPHANT, fr:0, fc:2, tr:1, tc:4 }) ||
           match(m, { color:BLACK, type:PIECE.ELEPHANT, fr:0, fc:6, tr:1, tc:4 });
  };
}

// 黑方士角炮：炮8平6 (2,7)→(2,5) 或 炮2平4 (2,1)→(2,3) 或 炮2平6 等
function blackAdvisorCannonAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON })) return false;
    // 从炮位 (2,1) 或 (2,7) 平到士角 (2,2)/(2,3)/(2,5)/(2,6)
    return (m.fromR === 2 && (m.fromC === 1 || m.fromC === 7) &&
            m.toR === 2 && (m.toC === 2 || m.toC === 3 || m.toC === 5 || m.toC === 6));
  };
}

// 黑方过宫炮：炮8平6 (2,7)→(2,5) 或 炮2平6 (2,1)→(2,3)
function blackPalaceCannonAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON })) return false;
    return (m.fromR === 2 && m.fromC === 7 && m.toR === 2 && m.toC === 5) ||
           (m.fromR === 2 && m.fromC === 1 && m.toR === 2 && m.toC === 3);
  };
}

// 黑方出车：车1进1 (0,0)→(1,0) 或 车9进1 (0,8)→(1,8)
function blackRookAdvanceAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.ROOK, tr:1 }) &&
           (m.fromC === m.toC) && (m.toR > m.fromR);
  };
}

// 黑方任意位置上有马前进（用于检查是否只动了一马）
function countBlackHorseMoves(moves, maxIdx) {
  var cnt = 0;
  for (var i = 0; i <= maxIdx && i < moves.length; i++) {
    var m = moves[i];
    if (m && m.piece.color === BLACK && m.piece.type === PIECE.HORSE) cnt++;
  }
  return cnt;
}

// ============ 开局匹配规则 ============

var RULES = [];

function rule(name, style, desc, check) {
  RULES.push({ name: name, style: style, description: desc, check: check });
}

// --- 中炮变例 ---

rule('中炮对屏风马', '主动进攻',
  '红方中炮开局，黑方双马保中卒，经典布局，攻防体系完善',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方前3步内走出双马
    var bMa1 = blackHorseAdvance(1)(moves);
    var bMa3 = moves.length >= 3 && blackHorseAdvance(3)(moves);
    // 或者黑方前两个黑棋走法都是马
    var bMaAlt = moves.length >= 4 && blackHorseAdvance(3)(moves);
    return bMa1 && (bMaAlt || countBlackHorseMoves(moves, 5) >= 2);
  }
);

rule('中炮对顺炮', '激烈对攻',
  '双方都走中炮，形成对攻局面，往往短兵相接',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackCannonCenterAt(1, true)(moves);
  }
);

rule('中炮对列炮', '激烈对攻',
  '双方中炮方向相反，两翼展开激烈对攻',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackCannonCenterAt(1, false)(moves);
  }
);

rule('中炮对反宫马', '稳健防守',
  '红方中炮，黑方士角炮配合单马防御，弹性较强',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方一马 + 士角炮（前5步内）
    var hasHorse = blackHorseAdvance(1)(moves);
    if (!hasHorse) return false;
    // 检查士角炮在步1或步3或步5
    var hasCannon = moves.length >= 4 && blackAdvisorCannonAt(3)(moves);
    if (!hasCannon && moves.length >= 6) hasCannon = blackAdvisorCannonAt(5)(moves);
    if (!hasCannon && moves.length >= 2) hasCannon = blackAdvisorCannonAt(1)(moves); // 第一步就炮
    // 确保不是双马（屏风马）
    var isScreenHorses = moves.length >= 4 && blackHorseAdvance(3)(moves);
    return hasCannon && !isScreenHorses;
  }
);

rule('中炮对三步虎', '灵活多变',
  '黑方先出车后上马，阵型灵活，反弹性强',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方在自己的前2步内出车，且最多只有一马
    var hasRook = blackRookAdvanceAt(1)(moves) || (moves.length >= 4 && blackRookAdvanceAt(3)(moves));
    if (!hasRook) return false;
    var horseCount = countBlackHorseMoves(moves, 5);
    return horseCount < 2;
  }
);

rule('中炮对单提马', '稳健防守',
  '黑方仅用一马守护中路，另一翼子力较弱，但反击直接',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 前4个黑方走法内只有1个马（另一马没出）
    if (moves.length < 2) return false;
    var maxCheckIdx = Math.min(moves.length - 1, 7);
    var horseCount = countBlackHorseMoves(moves, maxCheckIdx);
    // 有且仅有一马，且没有出另一马
    if (horseCount !== 1) return false;
    // 也没走中炮（排除顺炮列炮）
    if (blackCannonCenterAt(1)(moves)) return false;
    // 也没走士角炮（排除反宫马）
    if (blackAdvisorCannonAt(1)(moves) || (moves.length >= 4 && blackAdvisorCannonAt(3)(moves))) return false;
    // 也没出车（排除三步虎）
    if (blackRookAdvanceAt(1)(moves) || (moves.length >= 4 && blackRookAdvanceAt(3)(moves))) return false;
    return true;
  }
);

rule('中炮对进卒', '灵活多变',
  '红方中炮，黑方先进卒，阵型灵活，可根据红方动向调整',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 仙人指路变例 ---

rule('仙人指路对卒底炮', '激烈对攻',
  '红方挺七兵，黑方炮打中兵，形成激烈对攻局势',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackCannonCenterAt(1)(moves);
  }
);

rule('仙人指路对飞象', '散手缠斗',
  '红方挺兵，黑方飞象，双方比拼内功，节奏较缓',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackElephantCenterAt(1)(moves);
  }
);

rule('仙人指路对起马', '灵活多变',
  '红方挺兵，黑方跳马，双方正常出子，可转向多种布局',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackHorseAdvance(1)(moves);
  }
);

rule('仙人指路对挺卒', '散手缠斗',
  '双方对挺兵卒，互不干涉，比拼中局功力',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 飞相局变例 ---

rule('飞相对过宫炮', '稳健防守',
  '红方飞相巩固阵地，黑方过宫炮瞄向红方薄弱侧翼',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackPalaceCannonAt(1)(moves);
  }
);

rule('飞相对左中炮', '激烈对攻',
  '红方飞相，黑方左中炮直接攻击红方中路',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    // 左中炮：炮8平5 (2,7)→(2,4)
    return match(getMove(moves, 1), { color:BLACK, type:PIECE.CANNON, fr:2, fc:7, tr:2, tc:4 });
  }
);

rule('飞相对士角炮', '散手缠斗',
  '红方飞相，黑方士角炮，双方稳健出子，注重阵地战',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackAdvisorCannonAt(1)(moves);
  }
);

rule('飞相对起马', '灵活多变',
  '红方飞相，黑方跳马，双方正常出子',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackHorseAdvance(1)(moves);
  }
);

rule('飞相对挺卒', '散手缠斗',
  '红方飞相，黑方挺卒，局面平稳，比拼中局',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 其他开局 ---

rule('起马对挺卒', '灵活多变',
  '红方起马，黑方挺卒制马，开局正常出子',
  function(moves) {
    if (redFirstMove(moves) !== '起马局') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

rule('起马对中炮', '激烈对攻',
  '红方起马，黑方直接中炮反击，对攻激烈',
  function(moves) {
    if (redFirstMove(moves) !== '起马局') return false;
    return blackCannonCenterAt(1)(moves);
  }
);

rule('过宫炮', '稳健防守',
  '红方过宫炮，子力集中于一侧，稳健中暗藏反击',
  function(moves) {
    return redFirstMove(moves) === '过宫炮';
  }
);

rule('仕角炮', '灵活多变',
  '红方仕角炮，阵型灵活，可转向多种布局',
  function(moves) {
    return redFirstMove(moves) === '仕角炮';
  }
);

// ============ 导出接口 ============
function identifyOpening(moveHistory) {
  if (!moveHistory || moveHistory.length < 2) return null;

  // 依次检查规则
  for (var i = 0; i < RULES.length; i++) {
    if (RULES[i].check(moveHistory)) {
      return {
        name: RULES[i].name,
        style: RULES[i].style,
        description: RULES[i].description
      };
    }
  }

  // 能识别出第一步但无完全匹配
  var family = redFirstMove(moveHistory);
  if (family !== 'unknown' && family !== '其他') {
    var nameMap = {
      '中炮_右': '中炮', '中炮_左': '中炮',
      '仙人指路': '仙人指路', '飞相局': '飞相局',
      '起马局': '起马局', '过宫炮': '过宫炮',
      '仕角炮': '仕角炮'
    };
    return {
      name: nameMap[family] || family,
      style: '布局阶段',
      description: '对局初期，双方正在出子布阵'
    };
  }

  return null;
}


// ============ sound.js ============
// sound.js — 古风武侠音效（真人语音 + 战鼓 + 锣）

let audioCtx = null;
let voiceBuffers = {};
let audioFallback = {}; // file:// fallback: Audio element

// 预加载语音音频
function preloadSounds() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var files = { capture: '吃', check: '将军', checkmate: '绝杀' };
  var keys = Object.keys(files);
  var isFile = location.protocol === 'file:';
  keys.forEach(function(key) {
    if (isFile) {
      // file:// 下 fetch 不可用，直接创建 Audio 元素
      var fb = new Audio('sounds/' + key + '.mp3');
      fb.volume = 1.0;
      audioFallback[key] = fb;
      return;
    }
    fetch('sounds/' + key + '.mp3')
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) {
        return audioCtx.decodeAudioData(buf);
      })
      .then(function(audioBuf) {
        voiceBuffers[key] = audioBuf;
        console.log('[Sound] 已加载语音:', files[key]);
      })
      .catch(function() {
        var fb = new Audio('sounds/' + key + '.mp3');
        fb.volume = 1.0;
        audioFallback[key] = fb;
      });
  });
}

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 播放预加载的语音
function playVoice(key, delay, vol) {
  var c = ctx();
  var buf = voiceBuffers[key];
  if (!buf) return;
  var src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 1.12;
  var gain = c.createGain();
  gain.gain.value = vol || 1.0;
  src.connect(gain);
  gain.connect(c.destination);
  src.start(c.currentTime + (delay || 0));
}

// 战鼓
function warDrum(delay, freq, vol, decay) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq || 90, t);
  osc.frequency.exponentialRampToValueAtTime((freq || 90) * 0.3, t + (decay || 0.2));
  gain.gain.setValueAtTime(vol || 0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (decay || 0.2));
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t); osc.stop(t + (decay || 0.2) + 0.02);
}

// 铜锣
function gong(delay, vol, decay) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var dur = decay || 0.25;
  var bufSize = Math.floor(c.sampleRate * dur);
  var buf = c.createBuffer(1, bufSize, c.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < bufSize; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
  }
  var src = c.createBufferSource();
  src.buffer = buf;
  var gain = c.createGain();
  gain.gain.setValueAtTime(vol || 0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  var bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.8;
  src.connect(bp); bp.connect(gain); gain.connect(c.destination);
  src.start(t);
}

// 战场低吼
function warGrowl(delay, vol, dur) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.linearRampToValueAtTime(35, t + (dur || 0.3));
  gain.gain.setValueAtTime(0.01, t);
  gain.gain.linearRampToValueAtTime(vol || 0.25, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.3));
  var lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 200;
  osc.connect(lp); lp.connect(gain); gain.connect(c.destination);
  osc.start(t); osc.stop(t + (dur || 0.3) + 0.02);
}

// ========== 绝杀种类语音播报（从MP3加载，与吃/将军/绝杀同款男声） ==========
function playCheckmateTypeVoice(typeName, onDone) {
  // "绝杀" 没有单独语音文件（由 playCheckmateSound 播 checkmate.mp3）
  if (typeName === '绝杀' || !typeName) {
    if (onDone) onDone();
    return;
  }
  if (location.protocol === 'file:') { if (onDone) onDone(); return; }
  var c = ctx();
  var fileName = typeName.replace(/[\/\\:：<>"|?*\（\(）\)]/g, '').trim();
  fetch('sounds/' + encodeURIComponent(fileName) + '.mp3')
    .then(function(r) { if (!r.ok) throw new Error('no file'); return r.arrayBuffer(); })
    .then(function(buf) { return c.decodeAudioData(buf); })
    .then(function(audioBuf) {
      var src = c.createBufferSource();
      src.buffer = audioBuf;
      var gain = c.createGain();
      gain.gain.value = 1.0;
      src.connect(gain);
      gain.connect(c.destination);
      src.onended = function() { if (onDone) onDone(); };
      src.start(c.currentTime);
    })
    .catch(function() {
      // 没有语音文件则跳过（不出声）
      if (onDone) onDone();
    });
}

// ========== 走棋 ==========
function playMoveSound() {
  var c = ctx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var g = c.createGain();
  osc.type = 'sine'; osc.frequency.value = 500;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g); g.connect(c.destination);
  osc.start(t); osc.stop(t + 0.06);
}

// ========== 吃子 ==========
function playCaptureSound() {
  warDrum(0, 100, 0.7, 0.22);
  gong(0.02, 0.3, 0.2);
  warGrowl(0, 0.2, 0.25);
  playVoice('capture', 0.04, 1.0);
}

// ========== 将军 ==========
function playCheckSound() {
  warGrowl(0, 0.3, 0.35);
  warDrum(0, 80, 0.75, 0.25);
  warDrum(0.12, 65, 0.6, 0.2);
  gong(0.15, 0.4, 0.3);
  playVoice('check', 0.06, 1.0);
}

// ========== 绝杀 ==========
function playCheckmateSound() {
  warGrowl(0, 0.35, 0.5);
  warDrum(0, 60, 0.8, 0.3);
  warDrum(0.1, 50, 0.65, 0.25);
  warDrum(0.2, 42, 0.55, 0.22);
  gong(0.15, 0.5, 0.4);
  var c = ctx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(22, t + 0.65);
  gain.gain.setValueAtTime(0.5, t + 0.15);
  gain.gain.setValueAtTime(0.5, t + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(t + 0.15); osc.stop(t + 0.75);
  playVoice('checkmate', 0.1, 1.0);
}


// ============ ai.js ============
// ai.js — Wukong 纯 JS 引擎封装（无需 WASM/SharedArrayBuffer）


let engine = null;
function initEngine() {
  if (engine) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (typeof WukongEngine === 'undefined') {
      reject(new Error('Wukong 引擎未加载'));
      return;
    }
    try {
      engine = WukongEngine();
      console.log('[AI] Wukong 引擎初始化完成');
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

function wukongToGameMove(moveStr) {
  // Wukong moveToString 格式: "a9a8" (file+rank+file+rank), rank 0=底线(红), 9=底线(黑)
  var srcCol = moveStr.charCodeAt(0) - 97;
  var srcRank = parseInt(moveStr[1]);
  var dstCol = moveStr.charCodeAt(2) - 97;
  var dstRank = parseInt(moveStr[3]);
  return {
    fromR: 9 - srcRank,
    fromC: srcCol,
    toR: 9 - dstRank,
    toC: dstCol
  };
}

// 将 Wukong PV (rank 0-9) 转为 Fairy-Stockfish UCI 格式 (rank 1-10)
function wukongPvToUci(wukongPv) {
  if (!wukongPv) return '';
  return wukongPv.split(' ').map(function(move) {
    if (move.length < 4) return move;
    return move[0] + (parseInt(move[1]) + 1) + move[2] + (parseInt(move[3]) + 1);
  }).join(' ');
}
function getBestMove(board, color, thinkTimeMs) {
  var thinkTime = thinkTimeMs || 2000;
  return new Promise((resolve) => {
    if (!engine) { resolve(null); return; }

    var fen = boardToFen(board, color);
    console.log('[AI] 请求走棋, FEN:', fen, 'thinkTime:', thinkTime);

    engine.setBoard(fen);
    engine.setTimeControl({
      timeSet: 1,
      stopTime: Date.now() + thinkTime,
      stopped: 0,
      time: thinkTime
    });

    // setTimeout 让浏览器有机会渲染 "AI 思考中..." 再开始同步搜索
    setTimeout(function () {
      var wukongMove = engine.search(64);
      if (!wukongMove) { resolve(null); return; }
      var moveStr = engine.moveToString(wukongMove);
      console.log('[AI] 最佳走法:', moveStr);
      resolve(wukongToGameMove(moveStr));
    }, 50);
  });
}
function wukongAnalyzePosition(board, color, onUpdate, onDone, thinkTimeMs) {
  if (!engine) {
    if (onDone) onDone(null);
    return;
  }

  var tt = thinkTimeMs || 3000;
  var fen = boardToFen(board, color);
  console.log('[AI] 分析局面, FEN:', fen, 'thinkTime:', tt);

  engine.setBoard(fen);
  engine.setTimeControl({
    timeSet: 1,
    stopTime: Date.now() + tt,
    stopped: 0,
    time: tt
  });

  setTimeout(function () {
    engine.search(64);
    var info = engine.getLastSearchInfo();

    if (info && info.score !== undefined) {
      var result;
      if (typeof info.score === 'string' && info.score.startsWith('M')) {
        result = {
          scoreType: 'mate',
          score: parseInt(info.score.substring(1)),
          depth: parseInt(info.depth) || 0,
          pv: wukongPvToUci(info.pv)
        };
      } else {
        result = {
          scoreType: 'cp',
          // Wukong 内部 pawn=30 分，转成 centipawn (pawn=100)
          score: (typeof info.score === 'number' ? info.score : parseInt(info.score) || 0) * 100 / 30,
          depth: parseInt(info.depth) || 0,
          pv: wukongPvToUci(info.pv)
        };
      }

      if (onUpdate) onUpdate(result);
      if (onDone) onDone(result);
    } else {
      if (onDone) onDone(null);
    }
  }, 50);
}
function stopEngine() {
  if (engine) engine.resetTimeControl();
}
function destroyEngine() {
  engine = null;
}


// ============ online.js ============
// online.js — 联机对战 WebRTC 直连（SDP 粘贴 + QR 双阶段握手）
// 零服务器、零注册：一人复制连接码发给对方即可 P2P 对弈
// QR 模式：第一阶段只交换最小 SDP（仅 host candidate），
//          确保二维码轻量可扫，STUN/公网候选靠 DataChannel 补发
// 适用场景：同一WiFi / 热点 / 局域网（互联网P2P因CGNAT可能失败）

// 多 STUN 服务器提高 candidate 获取成功率
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.qq.com:3478' }
  ]
};
const ICE_TIMEOUT = 5000; // ICE 收集超时（仅用于文本粘贴模式）

let _pc = null;       // RTCPeerConnection
let _dc = null;       // DataChannel (game data)
let _isHost = false;
let _roomId = null;   // 6位连接码（用作标识）
let _color = null;    // 'red' | 'black'
let _fullSDPEncoded = null; // ICE 收集完成后的完整 SDP（含 candidates）
let _dcConnected = false;   // DataChannel 是否曾经成功打开过
let _failedTimer = null;    // failed 延迟确认定时器

let _callbacks = {
  roomCreated: null,       // (roomId) - 主机：SDP已就绪
  gameStart: null,         // ({ roomId, color }) - DataChannel 已打开
  opponentMove: null,      // ({ fromR, fromC, toR, toC })
  opponentResigned: null,
  opponentDisconnected: null,
  iceFailed: null,         // () - ICE 连接失败（网络不可达）
  chat: null,
  error: null,
  qrOfferReady: null,      // (sdp) QR 主机 SDP 就绪
  qrAnswerReady: null,     // (sdp) QR 客机 Answer 就绪
};

// ============ 公开 API ============

// 主机：创建会话 → 回调返回 SDP 字符串（发给客机）
function hostSession(onOfferReady) {
  _isHost = true;
  _color = 'red';
  _createPeer();
  _dc = _pc.createDataChannel('game');
  _setupDataChannel();

  _pc.createOffer().then(offer => _pc.setLocalDescription(offer)).catch(function(e) {
    console.error('[hostSession] 创建Offer失败:', e.message);
    if (_callbacks.error) _callbacks.error('创建会话失败: ' + e.message);
  });

  _waitForIce(function(sdp) {
    if (_callbacks.roomCreated) _callbacks.roomCreated(sdp);
    if (onOfferReady) onOfferReady(sdp);
  });
}

// QR 主机模式：显示 Offer QR → 扫描对方的 Answer QR → 连接
// 等 100ms 仅收集 host candidate，二维码短小可扫
function startQRHost() {
  _isHost = true;
  _color = 'red';
  _createPeer();
  _dc = _pc.createDataChannel('game');
  _setupDataChannel();
  _pc.createOffer().then(function(offer) {
    return _pc.setLocalDescription(offer);
  }).then(function() {
    _waitForMinimalSDP(function(sdp) {
      if (_callbacks.qrOfferReady) _callbacks.qrOfferReady(sdp);
    });
  }).catch(function(e) {
    if (_callbacks.error) _callbacks.error('创建会话失败: ' + e.message);
  });
}
function onQROfferReady(cb) { _callbacks.qrOfferReady = cb; }

// 客机扫描到 Offer QR 后：解析 → 创建 Answer → 显示 Answer QR
// 同样只等 100ms，仅 host candidate
function startQRGuest(encodedOffer) {
  _isHost = false;
  _color = 'black';
  _createPeer();
  _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };
  try {
    var desc = JSON.parse(atob(encodedOffer));
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的二维码');
    return;
  }
  _pc.setRemoteDescription(new RTCSessionDescription(desc)).then(function() {
    return _pc.createAnswer();
  }).then(function(answer) {
    return _pc.setLocalDescription(answer);
  }).then(function() {
    _waitForMinimalSDP(function(sdp) {
      if (_callbacks.qrAnswerReady) _callbacks.qrAnswerReady(sdp);
    });
  }).catch(function(e) {
    if (_callbacks.error) _callbacks.error('应答失败: ' + e.message);
  });
}
function onQRAnswerReady(cb) { _callbacks.qrAnswerReady = cb; }

// 主机：收到客机的 answer 后调用
function connectGuest(encodedAnswer) {
  try {
    var desc = JSON.parse(atob(encodedAnswer));
    // ICE 可能已超时→failed，重建 peer 才能继续
    if (_pc && (_pc.connectionState === 'failed' || _pc.connectionState === 'closed')) {
      console.log('[connectGuest] 连接已失效(' + _pc.connectionState + ')，重建中...');
      _createPeer();
      if (_isHost) {
        _dc = _pc.createDataChannel('game');
        _setupDataChannel();
      } else {
        _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };
      }
    }
    _pc.setRemoteDescription(new RTCSessionDescription(desc)).catch(function(err) {
      console.error('[connectGuest] setRemoteDescription失败:', err.message);
      if (_callbacks.error) _callbacks.error('连接失败: ' + err.message);
    });
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的连接码');
  }
}

// 客机：接受主机的 SDP → 回调返回 answer SDP
function acceptOffer(encodedOffer, onAnswerReady) {
  _isHost = false;
  _color = 'black';
  _createPeer();
  _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };

  try {
    var desc = JSON.parse(atob(encodedOffer));
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的连接码');
    return;
  }

  _pc.setRemoteDescription(new RTCSessionDescription(desc)).then(function() {
    return _pc.createAnswer();
  }).then(function(answer) {
    return _pc.setLocalDescription(answer);
  }).catch(function(e) {
    console.error('[acceptOffer] 设置远端描述/创建Answer失败:', e.message);
    if (_callbacks.error) _callbacks.error('接受连接失败: ' + e.message);
  });

  _waitForIce(function(sdp) {
    if (_callbacks.roomCreated) _callbacks.roomCreated(sdp);
    if (onAnswerReady) onAnswerReady(sdp);
  });
}
function disconnect() {
  if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
  if (_dc) { _dc.close(); _dc = null; }
  if (_pc) { _pc.close(); _pc = null; }
  _isHost = false;
  _roomId = null;
  _color = null;
  _dcConnected = false;
}
function sendMove(fromR, fromC, toR, toC) {
  _sendDC({ type: 'move', move: { fromR, fromC, toR, toC } });
}
function sendResign() {
  _sendDC({ type: 'resign' });
}
function sendChat(text) {
  _sendDC({ type: 'chat', text });
}
function getMyColor() { return _color; }
function isConnected() { return _dc && _dc.readyState === 'open'; }

// ============ 回调 ============
function onRoomCreated(cb) { _callbacks.roomCreated = cb; }
function onGameStart(cb) { _callbacks.gameStart = cb; }
function onOpponentMove(cb) { _callbacks.opponentMove = cb; }
function onOpponentResigned(cb) { _callbacks.opponentResigned = cb; }
function onOpponentDisconnected(cb) { _callbacks.opponentDisconnected = cb; }
function onChat(cb) { _callbacks.chat = cb; }
function onError(cb) { _callbacks.error = cb; }
function onIceFailed(cb) { _callbacks.iceFailed = cb; }

// ============ 内部 ============

function _createPeer() {
  if (_pc) { _pc.close(); }
  _pc = new RTCPeerConnection(STUN_SERVERS);
  _fullSDPEncoded = null;
  _dcConnected = false;
  if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }

  // ICE 连接状态：disconnected 是瞬态抖动，忽略
  _pc.oniceconnectionstatechange = function() {
    if (_pc.iceConnectionState === 'failed') {
      console.warn('[ICE] 连接失败（网络不可达）');
    }
  };

  // 连接状态：以 DataChannel 为唯一依据
  // disconnected → 忽略（网络抖动）
  // failed → 延迟确认，给 ICE 重试机会
  // closed → 真关闭
  _pc.onconnectionstatechange = function() {
    var state = _pc.connectionState;
    if (state === 'failed') {
      if (!_failedTimer) {
        _failedTimer = setTimeout(function() {
          _failedTimer = null;
          // 3秒后 still failed → 真失败
          if (_callbacks.iceFailed) _callbacks.iceFailed();
        }, 3000);
      }
    } else if (state === 'connected') {
      if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
    } else if (state === 'closed') {
      if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
      if (_dcConnected && _callbacks.opponentDisconnected) _callbacks.opponentDisconnected();
    }
  };

  // ICE 收集完成时保存完整 SDP，以备 DataChannel 打开后补发
  _pc.onicegatheringstatechange = function() {
    if (_pc.iceGatheringState === 'complete') {
      _fullSDPEncoded = _encodeDesc();
      if (_dc && _dc.readyState === 'open') {
        _sendDC({ type: 'sdp_sync', sdp: _fullSDPEncoded });
      }
    }
  };
}

// QR 模式：只收集 host candidate，不等 srflx（中国大陆移动网络
// 常无公网 srflx，等再久也等不到）。100ms 足够 host 就绪，
// 二维码大小稳定在数百字符，任何手机都能扫。
// 跨网连接失败由 onIceFailed 回调处理，提示用户切换网络。
function _waitForMinimalSDP(cb) {
  var timer = setTimeout(function() {
    cb(_encodeDesc());
  }, 100);

  // 如果 ICE 提前完成（极少情况），提前返回
  _pc.onicegatheringstatechange = function() {
    if (_pc.iceGatheringState === 'complete') {
      clearTimeout(timer);
      _fullSDPEncoded = _encodeDesc();
      cb(_fullSDPEncoded);
    }
  };
}

function _setupDataChannel() {
  _dc.onopen = function() {
    _dcConnected = true;
    if (_callbacks.gameStart) _callbacks.gameStart({ roomId: _roomId || '', color: _color });
    // DataChannel 打开后，如果完整 SDP 已就绪，补发 candidates
    if (_fullSDPEncoded) {
      _sendDC({ type: 'sdp_sync', sdp: _fullSDPEncoded });
    }
  };

  _dc.onmessage = function(e) {
    var msg;
    try { msg = JSON.parse(e.data); }
    catch (_) { return; }
    switch (msg.type) {
      case 'move':
        if (_callbacks.opponentMove) _callbacks.opponentMove(msg.move);
        break;
      case 'resign':
        if (_callbacks.opponentResigned) _callbacks.opponentResigned();
        break;
      case 'chat':
        if (_callbacks.chat) _callbacks.chat(msg.text);
        break;
      case 'sdp_sync':
        _handleSDPSync(msg.sdp);
        break;
    }
  };

  _dc.onclose = function() {
    var wasConnected = _dcConnected;
    _dcConnected = false;
    if (wasConnected && _callbacks.opponentDisconnected) _callbacks.opponentDisconnected();
  };
}

// 收到对方补发的完整 SDP → 解析并添加新 candidate
function _handleSDPSync(encodedSdp) {
  if (!_pc) return;
  try {
    var raw = atob(encodedSdp);
    var desc = JSON.parse(raw);
    var lines = desc.sdp ? desc.sdp.split('\n') : [];
    var added = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('a=candidate:') === 0) {
        var candStr = line.substring(12).trim();
        if (candStr) {
          try {
            _pc.addIceCandidate(new RTCIceCandidate({ candidate: candStr }));
            added++;
          } catch(e) { /* ignore dup/invalid */ }
        }
      }
    }
    console.log('[ICE] 收到 ' + added + ' 个补发 candidate');
  } catch(e) {
    console.warn('[ICE] 解析补发 SDP 失败:', e.message);
  }
}

function _sendDC(msg) {
  if (_dc && _dc.readyState === 'open') _dc.send(JSON.stringify(msg));
}

function _waitForIce(cb) {
  var done = false;
  function tryEmit() {
    if (_pc.localDescription) {
      cb(_encodeDesc());
    } else {
      console.warn('[waitForIce] localDescription 未就绪，延迟重试...');
      setTimeout(tryEmit, 500);
    }
  }
  var timer = setTimeout(function() {
    if (!done) { done = true; tryEmit(); }
  }, ICE_TIMEOUT);

  _pc.onicecandidate = function(e) {
    if (!e.candidate && !done) {
      done = true;
      clearTimeout(timer);
      setTimeout(tryEmit, 150);
    }
  };
}

function _encodeDesc() {
  return btoa(JSON.stringify(_pc.localDescription));
}

// 紧凑编码用于二维码：去掉 JSON 包装，type 缩为 1 字母，节省约 40%
// 格式: "o|base64_of_full_sdp"  (o=offer) 或 "a|base64_of_full_sdp" (a=answer)
function _encodeDescCompact() {
  var desc = _pc.localDescription;
  var prefix = desc.type === 'offer' ? 'o|' : 'a|';
  return prefix + btoa(desc.sdp);
}

// 解码紧凑格式为标准 {type, sdp} 对象
function _decodeCompact(encoded) {
  if (encoded.length < 3 || encoded[1] !== '|') return null;
  var type = encoded[0] === 'o' ? 'offer' : encoded[0] === 'a' ? 'answer' : null;
  if (!type) return null;
  var sdp = atob(encoded.substring(2));
  return { type: type, sdp: sdp };
}

// ============ 色块编码（汉字压缩） ============
// 将 gzip 压缩后的 O|/A| 格式 base64 进一步压缩为汉字串
// 每 2 个 base64 字符 → 1 个汉字，长度再减 50%
// 前缀 C|O 或 C|A 表示色块编码（C=ColorBlock, O/A=原始类型）
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const _B64_MAP = {};
for (var _i = 0; _i < 64; _i++) _B64_MAP[_B64[_i]] = _i;
const _HANZI_START = 0x4E00; // CJK 统一表意文字起始

// 压缩 SDP → 汉字色块串
function toColorBlocks(compressed) {
  var type = compressed[0]; // 'O' | 'A'
  var data = compressed.substring(2);
  var out = '';
  for (var i = 0; i < data.length; i += 2) {
    if (i + 1 < data.length) {
      var idx = _B64_MAP[data[i]] * 64 + _B64_MAP[data[i + 1]];
      out += String.fromCharCode(_HANZI_START + idx);
    } else {
      out += data[i]; // 奇数长度保留
    }
  }
  return 'C|' + type + out;
}

// 汉字色块串 → 压缩 SDP
function fromColorBlocks(code) {
  if (code[0] !== 'C' || code[1] !== '|') return code;
  var type = code[2];
  var data = code.substring(3);
  var out = '';
  for (var i = 0; i < data.length; i++) {
    var cp = data.charCodeAt(i);
    if (cp >= _HANZI_START) {
      var offset = cp - _HANZI_START;
      out += _B64[Math.floor(offset / 64)] + _B64[offset % 64];
    } else {
      out += data[i];
    }
  }
  return type + '|' + out;
}

// 压缩 SDP：gzip → O|base64 或 A|base64
// 输入是标准 base64 JSON SDP，输出压缩串，体积缩小 60-70%
async function compressSDP(sdpBase64) {
  try {
    var desc = JSON.parse(atob(sdpBase64));
    var enc = new TextEncoder();
    var prefix = desc.type === 'offer' ? 'O|' : 'A|';
    var comp = await new Response(
      new Blob([enc.encode(desc.sdp)]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer();
    var bytes = new Uint8Array(comp);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var result = prefix + btoa(bin);
    console.log('[compressSDP] ' + desc.type + ' | 原始=' + sdpBase64.length + 'B → 压缩=' + result.length + 'B');
    return result;
  } catch(e) {
    console.warn('[compressSDP] 压缩失败:', e.message);
    return sdpBase64;
  }
}

// 通用解码：支持原始格式和压缩格式，返回标准 base64 编码
// 格式: o| / a| (紧凑), O| / A| (压缩+gzip), 或直接标准 base64
async function normalizeSDP(encoded) {
  // 色块编码 C|O / C|A → 先解码为 O| / A| 再继续
  if (encoded.length > 3 && encoded[0] === 'C' && encoded[1] === '|') {
    console.log('[normalizeSDP] 检测到色块编码，解码中...');
    encoded = fromColorBlocks(encoded);
  }
  // 压缩格式 O| / A|
  if (encoded.length > 2 && encoded[1] === '|' && (encoded[0] === 'O' || encoded[0] === 'A')) {
    try {
      var type = encoded[0] === 'O' ? 'offer' : 'answer';
      var compressed = atob(encoded.substring(2));
      var bytes = new Uint8Array(compressed.length);
      for (var i = 0; i < compressed.length; i++) bytes[i] = compressed.charCodeAt(i);
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      var buf = await new Response(stream).arrayBuffer();
      var sdp = new TextDecoder().decode(buf);
      console.log('[normalizeSDP] 解压成功 | type=' + type + ' sdp_len=' + sdp.length);
      return btoa(JSON.stringify({type: type, sdp: sdp}));
    } catch(e) {
      console.warn('[normalizeSDP] 解压失败:', e.message);
      // O|/A| 解压失败 → 不降级到 o| 原始文本格式（数据是 gzip base64 而非 SDP 文本）
      return encoded;
    }
  }

  // 紧凑格式（o|base64sdp 或 a|base64sdp）
  try {
    var compact = _decodeCompact(encoded);
    if (compact) {
      var result = btoa(JSON.stringify(compact));
      console.log('[normalizeSDP] 紧凑格式解码成功 | type=' + compact.type + ' sdp_len=' + compact.sdp.length);
      return result;
    }
  } catch(e) { /* not compact format, fall through */ }
  // 原始文本紧凑格式（o| + 原始SDP，无base64）
  if (encoded.length > 2 && encoded[1] === '|') {
    var t = encoded[0] === 'o' ? 'offer' : 'answer';
    console.log('[normalizeSDP] 原始文本紧凑格式 type=' + t);
    return btoa(JSON.stringify({type: t, sdp: encoded.substring(2)}));
  }
  // 标准格式
  console.log('[normalizeSDP] 标准base64格式');
  return encoded;
}

// ============ 色块图编码（图片分享） ============
// 每3个base64字符→1个RGB色块，排列成20列网格，生成PNG图片
// 用户保存图片发给对方，对方选图自动解码
const CB_SIZE = 32;   // 色块像素
const CB_GAP = 4;     // 间隙
const CB_CELL = CB_SIZE + CB_GAP; // 36
const CB_COLS = 20;   // 每行20块
const CB_MUL = 4;     // 0-63 → 0-252（留容差）

// 生成色块图Canvas，输入 O|base64 或 A|base64
function generateColorImage(compressed) {
  var type = compressed[0]; // O|A
  var data = compressed.substring(2);
  var total = data.length;
  // 补齐到3的倍数
  var pad = (3 - total % 3) % 3;
  for (var p = 0; p < pad; p++) data += 'A';
  var blocks = data.length / 3; // 数据块数
  var all = 1 + blocks;         // 含1个头部
  var rows = Math.ceil(all / CB_COLS);
  var W = CB_COLS * CB_CELL + CB_GAP;
  var H = rows * CB_CELL + CB_GAP;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var cx = cv.getContext('2d');
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, W, H);

  function blk(idx, r, g, b) {
    var col = idx % CB_COLS, row = (idx / CB_COLS) | 0;
    cx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    cx.fillRect(col * CB_CELL + CB_GAP, row * CB_CELL + CB_GAP, CB_SIZE, CB_SIZE);
  }

  // 头部：count=12bits, type=1bit (O=0, A=63)
  blk(0,
    ((total >> 6) & 0x3F) * CB_MUL,
    (total & 0x3F) * CB_MUL,
    type === 'A' ? 0xFC : 0); // 63*4=252(蓝全亮=A), 0=O

  // 数据块
  for (var i = 0; i < data.length; i += 3) {
    var idx = i / 3 + 1;
    blk(idx,
      _B64_MAP[data[i]] * CB_MUL,
      _B64_MAP[data[i + 1]] * CB_MUL,
      _B64_MAP[data[i + 2]] * CB_MUL);
  }
  return cv;
}

// 从图片元素解码色块图 → O|base64 或 A|base64
function decodeColorImage(img) {
  var W = img.naturalWidth, H = img.naturalHeight;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);
  // 推算网格行列
  var cell = W / CB_COLS;
  var rows = Math.round(H / cell);
  var vals = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < CB_COLS; c++) {
      var x = (c + 0.5) * cell | 0;
      var y = (r + 0.5) * cell | 0;
      if (x < W && y < H) {
        var px = cx.getImageData(x, y, 1, 1).data;
        vals.push(Math.round(px[0] / CB_MUL));
        vals.push(Math.round(px[1] / CB_MUL));
        vals.push(Math.round(px[2] / CB_MUL));
      }
    }
  }
  // 头部
  var count = (vals[0] << 6) | vals[1];
  var type = vals[2] >= 32 ? 'A' : 'O';
  // 数据
  var res = '';
  for (var i = 3; i < vals.length; i++) {
    var v = vals[i];
    res += _B64[v < 0 ? 0 : v > 63 ? 63 : v];
  }
  res = res.substring(0, count);
  return type + '|' + res;
}


// ============ analysis-engine.js ============
// analysis-fsfEngine.js -- Fairy-Stockfish WASM wrap, fallback to Wukong on failure


var fsfEngine = null;
var fsfReady = false;
var fsfInitPromise = null;
var useFallback = false;
var initTimeout = 8000;
var searchTimeoutPad = 30000;

async function ensureInit() {
  if (fsfReady) return Promise.resolve();
  if (useFallback) return Promise.reject(new Error('fallback'));
  if (fsfInitPromise) return fsfInitPromise;

  fsfInitPromise = new Promise(async function (resolve, reject) {
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      console.warn('[FSF] init timeout (' + initTimeout + 'ms), fallback to Wukong');
      useFallback = true;
      fsfInitPromise = null;
      reject(new Error('FSF init timeout'));
    }, initTimeout);

    try {
      console.log('[FSF] loading WASM...');
      console.log('[FSF] using global Stockfish factory, instantiating...');
      fsfEngine = await Stockfish({ mainScriptUrlOrBlob: 'js/engine/stockfish.js' });
      console.log('[FSF] WASM instantiated, starting UCI handshake...');

      if (timedOut) return;

      await new Promise(function (res) {
        var uciTimedOut = false;
        var uciTimer = setTimeout(function () {
          uciTimedOut = true;
          console.warn('[FSF] UCI handshake timeout');
          res();
        }, 5000);

        fsfEngine.addMessageListener(function (line) {
          console.log('[FSF] UCI:', line);
          if (uciTimedOut) return;
          // 检查 UCI_Variant 选项是否包含 xiangqi
          if (line.startsWith('option name UCI_Variant')) {
            if (line.indexOf(' var xiangqi ') < 0) {
              console.warn('[FSF] xiangqi variant not available in this build');
              useFallback = true;
            }
          }
          if (line === 'uciok') {
            console.log('[FSF] got uciok, setting options...');
            if (!useFallback) {
              fsfEngine.postMessage('setoption name UCI_Variant value xiangqi');
            }
            fsfEngine.postMessage('setoption name Hash value 32');
            fsfEngine.postMessage('isready');
          } else if (line === 'readyok') {
            console.log('[FSF] got readyok' + (useFallback ? ', xiangqi not available' : ', init complete'));
            clearTimeout(uciTimer);
            if (useFallback) {
              fsfInitPromise = null;
            } else {
              fsfReady = true;
            }
            res();
          }
        });
        fsfEngine.postMessage('uci');
      });

      clearTimeout(timer);
      if (!timedOut) resolve();
    } catch (e) {
      clearTimeout(timer);
      console.warn('[FSF] init failed:', e);
      useFallback = true;
      fsfInitPromise = null;
      reject(e);
    }
  });

  return fsfInitPromise;
}

function parseUciLine(line) {
  if (!line.startsWith('info ')) return null;
  var depth = 0, score = 0, scoreType = 'cp', pv = '';
  var d = line.match(/ depth (\d+)/);
  if (d) depth = parseInt(d[1]);
  var cp = line.match(/ score cp (-?\d+)/);
  var mate = line.match(/ score mate (-?\d+)/);
  if (cp) { scoreType = 'cp'; score = parseInt(cp[1]); }
  else if (mate) { scoreType = 'mate'; score = parseInt(mate[1]); }
  else return null;
  var p = line.match(/ pv (.+)$/);
  if (p) pv = p[1].trim();
  return { scoreType: scoreType, score: score, depth: depth, pv: pv };
}

var wukongAnalyze = null;

async function getWukongAnalyze() {
  if (!wukongAnalyze) {
    
    wukongAnalyze = wukongAnalyzePosition;
  }
  return wukongAnalyze;
}

function fsfPvToNative(pv) {
  return pv;
}
async function analyzePosition(board, color, onUpdate, onDone, thinkTimeMs) {
  // 没有 cross-origin isolation 就直接用 Wukong
  if (!self.crossOriginIsolated) {
    useFallback = true;
    var wu0 = await getWukongAnalyze();
    wu0(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  if (useFallback) {
    var wu = await getWukongAnalyze();
    wu(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  if (!fsfReady) {
    try {
      await ensureInit();
    } catch (e) {
      var wu2 = await getWukongAnalyze();
      wu2(board, color, onUpdate, onDone, thinkTimeMs);
      return;
    }
  }

  if (useFallback) {
    var wu3 = await getWukongAnalyze();
    wu3(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  var fen = boardToFen(board, color);
  var tt = thinkTimeMs || 2000;
  var bestResult = null;
  var doneCalled = false;
  var analysisListener = null;
  var searchTimer = setTimeout(function () {
    if (!doneCalled) {
      doneCalled = true;
      if (analysisListener) fsfEngine.removeMessageListener(analysisListener);
      if (onDone) onDone(bestResult);
    }
  }, tt + searchTimeoutPad);

  analysisListener = function (line) {
    if (doneCalled) return;
    if (line.startsWith('info ')) {
      var result = parseUciLine(line);
      if (result) {
        result.pv = fsfPvToNative(result.pv);
        bestResult = result;
        if (onUpdate) onUpdate(result);
      }
    } else if (line.startsWith('bestmove')) {
      clearTimeout(searchTimer);
      doneCalled = true;
      fsfEngine.removeMessageListener(analysisListener);
      if (onDone) onDone(bestResult);
    }
  };
  fsfEngine.addMessageListener(analysisListener);

  fsfEngine.postMessage('position fen ' + fen);
  fsfEngine.postMessage('go movetime ' + tt);
}
function fsfStopEngine() {
  if (fsfEngine) fsfEngine.postMessage('stop');
}
function fsfDestroyEngine() {
  fsfEngine = null;
  fsfReady = false;
  fsfInitPromise = null;
  useFallback = false;
}


// ============ game.js ============
// game.js — 游戏主控、UI渲染、人机对战流程


// ============ 游戏状态 ============
let board, currentTurn, selectedPos, legalMoves, moveHistory;
let capturedPieces, gameOver, inCheck;
let gameMode = 'pvp'; // 'pvp' | 'ai' | 'online' | 'custom'
let aiThinking = false;
let analysisHint = null; // { fromR, fromC, toR, toC } | null
let onlineReady = false;      // 联机房间双方就绪

let onlineColor = null;       // 我方颜色 (RED/BLACK)
let isEditing = false;        // 编辑器模式
let editorPiece = { type: PIECE.GENERAL, color: RED }; // 编辑器当前选中棋子

// ============ 赛后分析状态 ============
let postGameEvals = [];
let isPostGameAnalysis = false;
let analysisMoveIndex = -1;
let isAnalysisRunning = false;
let analysisQueue = [];       // 待分析队列（moveIndex）
let isProcessingAnalysis = false;
let matePath = [];            // [{fromR,fromC,toR,toC,step,isMoverMove}]
let showMatePath = false;     // 是否绘制杀法路径

// ============ 游戏设置 ============
let gameSettings = { totalTime: null, moveTime: null, difficulty: 10, aiColor: 'red' };

// ============ 计时器状态 ============
let redTimeRemaining = null;
let blackTimeRemaining = null;
let moveTimeRemaining = null; // 当前步剩余毫秒
let moveStartTime = null;
let lastTotalTimeSample = null;
let timerInterval = null;

// ============ 纹理预加载 ============
let textureImages = {};
function preloadTextures() {
  var map = {
    'wood-pattern': 'img/wood-pattern.png',
    'dark-wood': 'img/dark-wood.png',
    'retina-wood': 'img/retina-wood.png',
    'paper': 'img/paper.png',
    'wood-clean': 'img/wood-clean.png'
  };
  var keys = Object.keys(map);
  keys.forEach(function(k) {
    var img = new Image();
    img.src = map[k];
    img.onload = function() { textureImages[k] = img; if (document.getElementById('board').querySelector('canvas')) drawBoardLines(); };
    img.onerror = function() { console.warn('[Texture] load failed:', k); };
  });
}

// ============ 皮肤主题 ============
const THEMES = {
  classic: {
    name: '经典木纹',
    bodyBg: '#c8944a', boardBg: '#d4a854', boardLine: '#3e2723',
    pieceBgRed: 'radial-gradient(circle at 35% 32%,#fff8e8 0%,#f5e0b0 25%,#e2c090 70%,#c89860 100%)',
    pieceBgBlack: 'radial-gradient(circle at 35% 32%,#fff8e8 0%,#f5e0b0 25%,#e2c090 70%,#c89860 100%)',
    pieceBorder: '#5d4037', pieceRed: '#b71c1c', pieceBlack: '#1a1a1a',
    turnBg: '#3e2723', turnText: '#ffd54f',
    infoBg: 'rgba(255,255,255,0.3)',
    texture: 'wood-clean'
  },
  rosewood: {
    name: '红木',
    bodyBg: '#3a1000', boardBg: '#5a2a10', boardLine: '#1a0500',
    pieceBgRed: 'radial-gradient(circle at 35% 32%,#ffe8d0 0%,#f0c898 25%,#d4a068 70%,#b07840 100%)',
    pieceBgBlack: 'radial-gradient(circle at 35% 32%,#ffe8d0 0%,#f0c898 25%,#d4a068 70%,#b07840 100%)',
    pieceBorder: '#3a1000', pieceRed: '#d4a060', pieceBlack: '#f5ead0',
    turnBg: '#1a0500', turnText: '#d4a060',
    infoBg: 'rgba(255,255,255,0.15)',
    texture: 'dark-wood'
  },
  porcelain: {
    name: '青花瓷',
    bodyBg: '#c8c0b0', boardBg: '#ece5d8', boardLine: '#1a3050',
    pieceBgRed: 'radial-gradient(circle at 35% 32%,#ffffff 0%,#f0ece4 25%,#e0d8cc 70%,#c8bfb0 100%)',
    pieceBgBlack: 'radial-gradient(circle at 35% 32%,#ffffff 0%,#f0ece4 25%,#e0d8cc 70%,#c8bfb0 100%)',
    pieceBorder: '#2a4070', pieceRed: '#1a4070', pieceBlack: '#1a1a2e',
    turnBg: '#1a3050', turnText: '#e8d8c0',
    infoBg: 'rgba(255,255,255,0.45)',
    texture: 'paper'
  },
  ink: {
    name: '水墨',
    bodyBg: '#d5cdb8', boardBg: '#e8e0d0', boardLine: '#3a3028',
    pieceBgRed: 'radial-gradient(circle at 35% 32%,#fefcf6 0%,#f0e8d4 25%,#e0d4bc 70%,#c8b898 100%)',
    pieceBgBlack: 'radial-gradient(circle at 35% 32%,#fefcf6 0%,#f0e8d4 25%,#e0d4bc 70%,#c8b898 100%)',
    pieceBorder: '#4a3a28', pieceRed: '#8b2500', pieceBlack: '#2a1a0a',
    turnBg: '#3a3028', turnText: '#e8d8b8',
    infoBg: 'rgba(255,255,255,0.4)',
    texture: 'paper'
  }
};
let currentTheme = 'classic';

function applyTheme(name) {
  currentTheme = name || 'classic';
  var t = THEMES[currentTheme];
  var root = document.documentElement.style;
  root.setProperty('--body-bg', t.bodyBg);
  root.setProperty('--piece-bg-red', t.pieceBgRed);
  root.setProperty('--piece-bg-black', t.pieceBgBlack);
  root.setProperty('--piece-border', t.pieceBorder);
  root.setProperty('--piece-red', t.pieceRed);
  root.setProperty('--piece-black', t.pieceBlack);
  root.setProperty('--turn-bg', t.turnBg);
  root.setProperty('--turn-text', t.turnText);
  root.setProperty('--info-bg', t.infoBg);
}
function getGameMode() { return gameMode; }
function isAiThinking() { return aiThinking; }

// 从开始界面初始化游戏
function initGame(mode, settings) {
  gameMode = mode || 'pvp';
  if (settings) {
    gameSettings.totalTime = settings.totalTime;
    gameSettings.moveTime = settings.moveTime;
    gameSettings.difficulty = settings.difficulty || 10;
    if (settings.aiColor) gameSettings.aiColor = settings.aiColor;
    if (settings.theme) applyTheme(settings.theme);
  }
  preloadSounds();
  preloadTextures();
  document.querySelectorAll('.mode-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.mode === gameMode);
  });
  document.getElementById('analysisPanel').style.display = 'none';
  document.getElementById('btnAnalyze').textContent = '分析局面';
  if (gameMode === 'online') {
    setupOnlineCallbacks();
    document.getElementById('onlinePanel').style.display = 'flex';
    document.getElementById('onlineStatusBar').style.display = 'none';
    document.getElementById('sdpPanel').style.display = 'flex';
    document.getElementById('sdpOutput').style.display = 'none';
    document.getElementById('sdpInput').style.display = 'none';
    onlineReady = false;
    onlineColor = null;
  } else if (gameMode === 'custom') {
    document.getElementById('onlinePanel').style.display = 'none';
    document.getElementById('onlineStatusBar').style.display = 'none';
  } else {
    initEngine().catch(function(e) {
      document.getElementById('aiStatus').textContent = 'AI加载失败: ' + e.message;
    });
    document.getElementById('onlinePanel').style.display = 'none';
    document.getElementById('onlineStatusBar').style.display = 'none';
  }
  if (gameMode === 'custom') {
    enterEditor();
  } else {
    newGame();
  }
}

// ============ 初始化 ============
function newGame() {
  board = createBoard();
  currentTurn = RED;
  analysisHint = null;
  selectedPos = null;
  legalMoves = [];
  moveHistory = [];
  capturedPieces = { [RED]: [], [BLACK]: [] };
  gameOver = false;
  inCheck = false;
  aiThinking = false;
  isPostGameAnalysis = false;
  analysisMoveIndex = -1;
  isAnalysisRunning = false;
  isProcessingAnalysis = false;
  analysisQueue = [];
  postGameEvals = [];
  matePath = [];
  showMatePath = false;
  document.getElementById('checkWarning').innerHTML = '';
  document.getElementById('message').style.display = 'none';
  var vm = document.getElementById('victoryMessage');
  vm.classList.remove('show');
  vm.textContent = '';
  document.getElementById('aiStatus').textContent = '';
  updateTurnIndicator();

  // 重置计时器
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  redTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  blackTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  moveTimeRemaining = null;
  moveStartTime = null;
  lastTotalTimeSample = null;
  updateTimerDisplay();
  startTimer();
  // 开局即开始计时
  if (gameSettings.totalTime) { moveStartTime = Date.now(); lastTotalTimeSample = Date.now(); }

  render();

  // AI 执红时自动走第一步
  if (gameMode === 'ai' && gameSettings.aiColor === 'black') {
    moveStartTime = Date.now(); lastTotalTimeSample = Date.now();
    initEngine().then(() => { if (!gameOver) triggerAI(); }).catch(() => {});
  }
}
function setGameMode(mode) {
  // 离开编辑器模式时清理
  if (isEditing && mode !== 'custom') {
    isEditing = false;
    document.getElementById('editorPanel').style.display = 'none';
    var infoEl = document.querySelector('.info-panel'); if (infoEl) infoEl.style.display = '';
    document.getElementById('timerRow').style.display = '';
    document.getElementById('controls').style.display = '';
    var modeEl = document.querySelector('.mode-selector'); if (modeEl) modeEl.style.display = '';
    document.getElementById('redTimer').style.display = '';
    document.getElementById('blackTimer').style.display = '';
    updateTurnIndicator();
  }
  gameMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  if (gameMode === 'ai') {
    initEngine().catch(e => {
      document.getElementById('aiStatus').textContent = 'AI加载失败: ' + e.message;
    });
  }
  if (gameMode === 'online') {
    setupOnlineCallbacks();
    document.getElementById('onlinePanel').style.display = 'flex';
    document.getElementById('onlineStatusBar').style.display = 'none';
    document.getElementById('sdpPanel').style.display = 'flex';
    document.getElementById('sdpOutput').style.display = 'none';
    document.getElementById('sdpInput').style.display = 'none';
  }
  if (gameMode !== 'online') {
    disconnect();
    onlineReady = false;
    onlineColor = null;
    document.getElementById('onlinePanel').style.display = 'none';
    document.getElementById('onlineStatusBar').style.display = 'none';
  }
  if (gameMode === 'custom') {
    enterEditor();
  } else {
    newGame();
  }
}

// ============ 计时器 ============
function getAIThinkTime() {
  var level = gameSettings.difficulty || 10;
  var baseTime = 500 + (level - 1) * 500; // 1→500ms ... 10→5000ms
  if (gameSettings.moveTime) {
    var maxThink = (gameSettings.moveTime - 2) * 1000;
    if (maxThink < 500) maxThink = 500;
    return Math.min(baseTime, maxThink);
  }
  return baseTime;
}

function formatTime(ms) {
  if (ms === null || ms === undefined) return '--:--';
  if (ms <= 0) return '00:00';
  var totalSec = Math.ceil(ms / 1000);
  var min = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
}

function updateTimerDisplay() {
  document.getElementById('redTimerTime').textContent = formatTime(redTimeRemaining);
  document.getElementById('blackTimerTime').textContent = formatTime(blackTimeRemaining);
  // 步时显示
  var redMoveEl = document.getElementById('redMoveTime');
  var blackMoveEl = document.getElementById('blackMoveTime');
  if (gameSettings.moveTime && moveTimeRemaining !== null && !gameOver) {
    var moveSec = Math.ceil(moveTimeRemaining / 1000);
    var moveText = '[' + moveSec + 's]';
    document.getElementById('redMoveTime').textContent = currentTurn === RED ? moveText : '';
    document.getElementById('blackMoveTime').textContent = currentTurn === BLACK ? moveText : '';
    document.getElementById('redMoveTime').className = 'move-time' + (currentTurn === RED && moveSec <= 5 ? ' low-time' : '');
    document.getElementById('blackMoveTime').className = 'move-time' + (currentTurn === BLACK && moveSec <= 5 ? ' low-time' : '');
  } else {
    document.getElementById('redMoveTime').textContent = '';
    document.getElementById('blackMoveTime').textContent = '';
  }
  var redEl = document.getElementById('redTimer');
  var blackEl = document.getElementById('blackTimer');
  redEl.classList.toggle('active-timer', currentTurn === RED && !gameOver);
  blackEl.classList.toggle('active-timer', currentTurn === BLACK && !gameOver);
  redEl.classList.toggle('low-time', redTimeRemaining !== null && redTimeRemaining < 30000 && currentTurn === RED);
  blackEl.classList.toggle('low-time', blackTimeRemaining !== null && blackTimeRemaining < 30000 && currentTurn === BLACK);
}

function startTimer() {
  if (gameMode === 'online' && !onlineReady) return;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(function() {
    if (gameOver) return;
    var now = Date.now();
    // 步时倒计时（在 moveStartTime 被总时更新前先算）
    if (moveStartTime && gameSettings.moveTime) {
      moveTimeRemaining = gameSettings.moveTime * 1000 - (now - moveStartTime);
      if (moveTimeRemaining <= 0) {
        handleTimeUp(currentTurn);
        return;
      }
    } else {
      moveTimeRemaining = null;
    }
    // 总时间（用独立变量避免干扰 moveStartTime）
    if (lastTotalTimeSample && gameSettings.totalTime) {
      var elapsed = now - lastTotalTimeSample;
      lastTotalTimeSample = now;
      if (currentTurn === RED && redTimeRemaining !== null) {
        redTimeRemaining = Math.max(0, redTimeRemaining - elapsed);
        if (redTimeRemaining <= 0) { handleTimeUp(RED); return; }
      } else if (currentTurn === BLACK && blackTimeRemaining !== null) {
        blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsed);
        if (blackTimeRemaining <= 0) { handleTimeUp(BLACK); return; }
      }
    }
    updateTimerDisplay();
  }, 200);
}

function handleTimeUp(color) {
  gameOver = true;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  stopEngine();
  document.getElementById('btnAnalyze').textContent = '赛后分析';
  var loser = color === RED ? '红方' : '黑方';
  var win = color === RED ? '黑方' : '红方';
  document.getElementById('message').textContent = loser + '超时判负';
  document.getElementById('message').style.display = 'block';
  showVictoryMessage(win + '获胜');
  updateTimerDisplay();
  render();
}
function cleanupGame() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  moveStartTime = null; lastTotalTimeSample = null;
  stopEngine();
  if (isEditing) {
    isEditing = false;
    document.getElementById('editorPanel').style.display = 'none';
    var infoEl = document.querySelector('.info-panel'); if (infoEl) infoEl.style.display = '';
    document.getElementById('timerRow').style.display = '';
    document.getElementById('controls').style.display = '';
    var modeEl = document.querySelector('.mode-selector'); if (modeEl) modeEl.style.display = '';
    document.getElementById('redTimer').style.display = '';
    document.getElementById('blackTimer').style.display = '';
  }
}

// ============ 事件处理 ============
function onPieceClick(row, col) {
  if (isEditing) { editPlacePiece(row, col); return; }
  if (gameOver || aiThinking) return;
  if (gameMode === 'ai' && currentTurn !== (gameSettings.aiColor === 'red' ? RED : BLACK)) return;
  if (gameMode === 'online' && currentTurn !== onlineColor) return;

  var piece = board[row][col];
  // 已选棋子时，点击对方棋子→吃子
  if (selectedPos && piece && piece.color !== currentTurn) {
    if (isLegalTarget(row, col)) {
      makeMove(selectedPos.row, selectedPos.col, row, col);
      selectedPos = null; legalMoves = [];
    } else { selectedPos = null; legalMoves = []; render(); }
    return;
  }
  if (!piece || piece.color !== currentTurn) return;
  if (selectedPos && selectedPos.row === row && selectedPos.col === col) {
    selectedPos = null; legalMoves = [];
  } else {
    selectedPos = { row, col };
    legalMoves = getLegalMoves(row, col, piece.color, piece.type, board);
  }
  render();
}
function onCellClick(row, col) {
  if (isEditing) { editPlacePiece(row, col); return; }
  if (gameOver || aiThinking || !selectedPos) return;
  if (!isLegalTarget(row, col)) { selectedPos = null; legalMoves = []; render(); return; }
  makeMove(selectedPos.row, selectedPos.col, row, col);
  selectedPos = null; legalMoves = [];
}

function isLegalTarget(row, col) {
  for (var i = 0; i < legalMoves.length; i++)
    if (legalMoves[i].row === row && legalMoves[i].col === col) return true;
  return false;
}

// ============ 特效 ============
function cellToScreen(row, col) {
  var boardEl = document.getElementById('board');
  var rect = boardEl.getBoundingClientRect();
  var cellW = rect.width / COLS;
  var cellH = rect.height / ROWS;
  return {
    x: rect.left + col * cellW + cellW / 2,
    y: rect.top + row * cellH + cellH / 2
  };
}

function triggerInkEffect(row, col, text, type) {
  var overlay = document.getElementById('effectOverlay');
  var ink = document.createElement('div');
  ink.className = 'effect-ink' + (type ? ' ' + type : '');
  ink.setAttribute('data-text', text);
  ink.style.left = '50%';
  ink.style.top = '50%';
  overlay.appendChild(ink);
  setTimeout(function() { ink.remove(); }, 1400);
}

// ============ 走棋逻辑 ============
function makeMove(fromR, fromC, toR, toC) {
  // 每步限时检查
  if (gameSettings.moveTime && moveStartTime) {
    if ((Date.now() - moveStartTime) / 1000 > gameSettings.moveTime) {
      handleTimeUp(currentTurn);
      return;
    }
  }
  analysisHint = null;
  selectedPos = null;
  legalMoves = [];
  var piece = board[fromR][fromC];
  var captured = board[toR][toC];
  moveHistory.push({
    fromR, fromC, toR, toC,
    piece: { type: piece.type, color: piece.color },
    captured: captured ? { type: captured.type, color: captured.color } : null
  });
  if (captured) {
    capturedPieces[captured.color].push(captured);
    triggerInkEffect(toR, toC, '吃', '');
    playCaptureSound();
  } else {
    playMoveSound();
  }
  board[toR][toC] = piece;
  board[fromR][fromC] = null;

  var opp = opponent(piece.color);
  inCheck = isInCheck(opp, board);

  if (!hasAnyLegalMove(opp, board)) {
    gameOver = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    document.getElementById('btnAnalyze').textContent = '赛后分析';
    // 检测绝杀类型
    var lastMoveData = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
    var mateType = detectCheckmateType(board, lastMoveData, moveHistory);
    // 先报种类（TTS），播完再报"绝杀"（音效）
    playCheckmateTypeVoice(mateType, function() {
      setTimeout(function() { playCheckmateSound(); }, 200);
    });
    // 文字显示在特效上
    var g = findGeneral(opp, board);
    if (g) triggerInkEffect(g.row, g.col, mateType, 'checkmate');
    var winner = piece.color === RED ? '红方' : '黑方';
    setTimeout(function() { showVictoryMessage(mateType + '！' + winner + '获胜'); }, 1400);
  } else if (inCheck) {
    playCheckSound();
    var gen = findGeneral(opp, board);
    if (gen) triggerInkEffect(gen.row, gen.col, '将军', 'check');
    document.getElementById('checkWarning').innerHTML = '<span class="check-icon"></span>将军！';
  } else {
    document.getElementById('checkWarning').innerHTML = '';
  }
  currentTurn = opp;
  updateTurnIndicator();
  render();

  // 联机模式：发送走法给对方
  if (gameMode === 'online' && piece.color === onlineColor) {
    sendMove(fromR, fromC, toR, toC);
  }

  // 人机模式：玩家走完后触发 AI
  moveStartTime = Date.now(); lastTotalTimeSample = Date.now();
  enqueueAnalysis(moveHistory.length - 1);
  if (!gameOver) {
    if (gameMode === 'ai' && currentTurn === (gameSettings.aiColor === 'red' ? BLACK : RED)) {
      triggerAI();
    } else {
      processAnalysisQueue(); // PvP/联机：引擎空闲，立即后台分析
    }
  }
}

async function triggerAI() {
  aiThinking = true;
  document.getElementById('aiStatus').textContent = 'AI 思考中...';
  updateTurnIndicator();
  render();

  try {
    var thinkTime = getAIThinkTime();
    var move = await getBestMove(board, currentTurn, thinkTime);
    if (move && !gameOver) {
      makeMove(move.fromR, move.fromC, move.toR, move.toC);
    }
  } catch (e) {
    document.getElementById('aiStatus').textContent = 'AI 出错: ' + e.message;
  }
  aiThinking = false;
  processAnalysisQueue(); // 触发后台分析队列
  if (!gameOver) document.getElementById('aiStatus').textContent = '';
  updateTurnIndicator();
  render();
}

// ============ 局面分析 ============
function closeAnalysis() {
  document.getElementById('analysisPanel').style.display = 'none';
  document.getElementById('btnAnalyze').textContent = '分析局面';
  analysisHint = null;
  stopEngine();
  render();
}
async function triggerAnalysis() {
  if (aiThinking) return;
  if (gameOver) {
    startPostGameAnalysis();
    return;
  }

  var panel = document.getElementById('analysisPanel');
  if (panel.style.display === 'block') {
    closeAnalysis();
    return;
  }

  panel.style.display = 'block';
  document.getElementById('analysisScore').textContent = '引擎加载中...';
  document.getElementById('analysisDepth').textContent = '';
  document.getElementById('analysisPv').textContent = '';
  document.getElementById('btnAnalyze').textContent = '停止分析';

  try {
    await initEngine();
  } catch (e) {
    document.getElementById('analysisScore').textContent = '引擎加载失败';
    document.getElementById('btnAnalyze').textContent = '分析局面';
    return;
  }

  document.getElementById('analysisScore').textContent = '分析中...';

  analyzePosition(board, currentTurn, function(info) {
    // 更新分析结果
    var scoreEl = document.getElementById('analysisScore');
    if (info.scoreType === 'cp') {
      var cp = info.score / 100;
      var sign = cp >= 0 ? '+' : '';
      var adv = cp > 0 ? '红方优势' : cp < 0 ? '黑方优势' : '均势';
      scoreEl.innerHTML = '<span class="score-val">' + sign + cp.toFixed(1) + '</span><span class="score-label">' + adv + '</span>';
    } else {
      var mateIn = info.score;
      var text = mateIn > 0 ? '红方' + mateIn + '步杀' : '黑方' + Math.abs(mateIn) + '步杀';
      scoreEl.innerHTML = '<span class="score-val mate">M' + Math.abs(mateIn) + '</span><span class="score-label">' + text + '</span>';
    }
    document.getElementById('analysisDepth').textContent = '深度: ' + info.depth;
    // 解析 PV — 取第一个走法标记在棋盘上
    if (info.pv) {
      var pvMoves = info.pv.split(' ');
      document.getElementById('analysisPv').textContent = '推荐走法: ' + pvMoves.slice(0, 5).join(' → ');
      if (pvMoves.length > 0) {
        var hint = uciToMove(pvMoves[0]);
        analysisHint = { fromR: hint.fromR, fromC: hint.fromC, toR: hint.toR, toC: hint.toC };
        render();
      }
    }
  }, function(result) {
    document.getElementById('btnAnalyze').textContent = '分析局面';
    if (!result) {
      analysisHint = null;
      document.getElementById('analysisScore').textContent = '分析失败';
      render();
    }
  });
}

// ============ 赛后分析 ============

// 重建第 upToIndex 步走完后的棋盘 (-1=初始局面)
function reconstructBoardState(upToIndex) {
  if (upToIndex < 0) return { board: createBoard(), currentTurn: RED };
  var b = createBoard();
  var limit = upToIndex < moveHistory.length ? upToIndex : moveHistory.length - 1;
  for (var i = 0; i <= limit; i++) {
    var m = moveHistory[i];
    b[m.toR][m.toC] = b[m.fromR][m.fromC];
    b[m.fromR][m.fromC] = null;
  }
  var turn = opponent(moveHistory[limit].piece.color);
  return { board: b, currentTurn: turn };
}

// 增量分析队列：每下一步时后台分析，不用等到最后
function enqueueAnalysis(moveIdx) {
  if (gameOver || aiThinking) return;
  if (moveIdx < postGameEvals.length && postGameEvals[moveIdx] !== undefined) return;
  if (analysisQueue.indexOf(moveIdx) >= 0) return;
  analysisQueue.push(moveIdx);
  // processAnalysisQueue 由 makeMove/triggerAI 在引擎空闲时调用
}

function processAnalysisQueue() {
  if (analysisQueue.length === 0) { isProcessingAnalysis = false; return; }
  if (aiThinking || isProcessingAnalysis) return;
  isProcessingAnalysis = true;
  var idx = analysisQueue.shift();
  if (idx < postGameEvals.length && postGameEvals[idx] !== undefined) {
    isProcessingAnalysis = false;
    setTimeout(processAnalysisQueue, 20);
    return;
  }

  // 分析走棋前的局面，这样 PV 是走棋方的最佳走法，而非对方的最佳应着
  var state = reconstructBoardState(idx - 1);
  var mover = moveHistory[idx].piece.color;
  var sideToMove = mover;

  analyzePosition(state.board, sideToMove, null, function(result) {
    if (result) {
      var cpBefore = result.scoreType === 'cp' ? result.score
        : (result.score > 0 ? Math.max(1000, 2000 / result.score) : -Math.max(1000, 2000 / Math.abs(result.score)));
      postGameEvals[idx] = {
        moveIdx: idx,
        side: mover,
        cpBefore: cpBefore,
        depth: result.depth || 0,
        pv: result.pv || '',
        score: 0,
        scoreType: result.scoreType,
        rawScore: result.score
      };
    } else {
      postGameEvals[idx] = null;
    }
    isProcessingAnalysis = false;
    setTimeout(processAnalysisQueue, 20);
  }, 2000);
}

function computeQualityScores() {
  // 先根据 cpBefore（走前评估）算出 cp（走后评估），用于图表和质量分
  for (var i = 0; i < postGameEvals.length; i++) {
    var e = postGameEvals[i];
    if (!e || e.cpBefore === undefined) continue;
    // 下一步的 cpBefore 是从下一走棋方视角评估的本步走完后的局面
    if (i + 1 < postGameEvals.length && postGameEvals[i + 1] && postGameEvals[i + 1].cpBefore !== undefined) {
      var next = postGameEvals[i + 1];
      e.cp = e.side === next.side ? next.cpBefore : -next.cpBefore;
    } else {
      e.cp = e.cpBefore;
    }
  }

  for (var i = 0; i < postGameEvals.length; i++) {
    var e = postGameEvals[i];
    if (!e) continue;

    // 走之前 cp（从当前走棋方视角）：前一步 cp 取反
    var beforeCp = 0;
    for (var j = i - 1; j >= 0; j--) {
      if (postGameEvals[j] && postGameEvals[j].cp !== undefined) {
        beforeCp = -postGameEvals[j].cp;
        break;
      }
    }

    // 绝杀步不算漏着 — 引擎评估终局局面 cp=0，会导致误报
    var isLastMove = gameOver && i === postGameEvals.length - 1 && i === moveHistory.length - 1;
    var cpLoss;
    if (isLastMove) {
      cpLoss = 0;
    } else {
      cpLoss = Math.max(0, beforeCp - e.cp);
    }
    e.cpLoss = Math.round(cpLoss);
    e.score = Math.max(0, Math.min(100, Math.round(100 - cpLoss / 3)));
    // 招法评级
    if (isLastMove || cpLoss < 30) e.quality = '优';
    else if (cpLoss < 60) e.quality = '良';
    else if (cpLoss < 100) e.quality = '中';
    else if (cpLoss < 150) e.quality = '差';
    else if (cpLoss < 250) e.quality = '劣';
    else if (cpLoss < 400) e.quality = '错';
    else if (cpLoss < 600) e.quality = '漏';
    else e.quality = '败';

    // 杀法识别
    e.isMissedMate = false;
    e.isUnderMate = false;
    e.mateIn = 0;
    if (!isLastMove && e.scoreType === 'mate') {
      if (e.rawScore > 0) {
        // 走棋方有连杀机会 — 检查是否真的走了引擎推荐杀法
        var playedMateMove = false;
        if (e.pv) {
          var firstPv = e.pv.split(' ')[0];
          if (firstPv && firstPv.length >= 4) {
            var m = moveHistory[e.moveIdx];
            var uci = String.fromCharCode(97 + m.fromC) + (10 - m.fromR)
                   + String.fromCharCode(97 + m.toC) + (10 - m.toR);
            if (firstPv === uci) playedMateMove = true;
          }
        }
        if (!playedMateMove) {
          e.isMissedMate = true;
          e.mateIn = e.rawScore;
        }
      } else {
        // 走棋方被连杀
        e.isUnderMate = true;
        e.mateIn = -e.rawScore;
      }
    }
  }
  renderPostGameChart();
  renderMoveList();
  isAnalysisRunning = false;
  document.getElementById('postgameProgress').textContent = '分析完成 ✓';
  document.getElementById('btnAnalyze').textContent = '赛后分析';
}

function renderPostGameChart() {
  var canvas = document.getElementById('postgameChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, w, h);

  var evals = [];
  for (var i = 0; i < postGameEvals.length; i++) {
    if (postGameEvals[i]) evals.push(postGameEvals[i]);
  }
  // Shift end: last step has no true after-move eval, removes to avoid flat tail
  if (evals.length > 2) evals.pop();
  if (evals.length < 2) {
    ctx.fillStyle = '#888';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('走法太少，无法生成趋势图', w / 2, h / 2 + 5);
    return;
  }

  var redAdv = [];
  var minCp = Infinity, maxCp = -Infinity;
  for (var i = 0; i < evals.length; i++) {
    var adv = evals[i].side === RED ? evals[i].cp : -evals[i].cp;
    redAdv.push(adv);
    if (adv < minCp) minCp = adv;
    if (adv > maxCp) maxCp = adv;
  }
  if (minCp === maxCp) { minCp -= 100; maxCp += 100; }
  var range = maxCp - minCp || 200;
  var padding = 30, plotW = w - padding * 2, plotH = h - 24;

  function yForCp(cp) { return 12 + plotH - (cp - minCp) / range * plotH; }

  if (minCp < 0 && maxCp > 0) {
    var zeroY = yForCp(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padding, zeroY); ctx.lineTo(w - padding, zeroY); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = '#ef5350';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (var i = 0; i < redAdv.length; i++) {
    var x = padding + (i / (redAdv.length - 1)) * plotW;
    var y = yForCp(redAdv[i]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('红方优势 ↑', w - padding, 16);
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(maxCp) + 'cp', padding + 2, 20);
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(minCp) + 'cp', padding + 2, h - 8);
  ctx.textAlign = 'right';
  ctx.fillText('↓ 黑方优势', w - padding, h - 8);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px sans-serif';
  ctx.fillText('每步后红方优势(cp) — 共' + evals.length + '步', w / 2, h - 2);
}

function renderMoveList() {
  var container = document.getElementById('postgameMoveList');
  if (!container) return;
  container.innerHTML = '';
  var moveNum = 1;
  for (var i = 0; i < postGameEvals.length; i++) {
    var e = postGameEvals[i];
    if (!e) continue;
    var row = document.createElement('div');
    row.className = 'postgame-move-row';
    row.dataset.idx = e.moveIdx;

    // RED 方优势
    var redAdv = e.side === RED ? e.cp : -e.cp;
    // 前一步 RED 方优势
    var prevRedAdv = 0;
    for (var j = i - 1; j >= 0; j--) {
      if (postGameEvals[j]) {
        prevRedAdv = postGameEvals[j].side === RED ? postGameEvals[j].cp : -postGameEvals[j].cp;
        break;
      }
    }
    var delta = redAdv - prevRedAdv;
    // 用 e.quality 决定 CSS 高亮
    var qualityClass = e.quality || '';
    if (qualityClass === '差' || qualityClass === '劣') row.classList.add('mistake');
    else if (qualityClass === '错' || qualityClass === '漏' || qualityClass === '败') row.classList.add('blunder');
    if (e.isMissedMate) row.classList.add('mate-miss');
    if (e.isUnderMate) row.classList.add('mate-under');

    var qualityBadge = e.quality || '优';
    if (e.isMissedMate) qualityBadge = '漏杀';
    else if (e.isUnderMate) qualityBadge = '被杀';
    var num = Math.floor(moveNum / 2) + 1;
    var label = e.side === RED ? (num + '. ') : (num + '... ');
    var evalStr = (redAdv >= 0 ? '+' : '') + (redAdv / 100).toFixed(1);
    var deltaStr = (delta >= 0 ? '+' : '') + (delta / 100).toFixed(1);
    row.innerHTML = '<span class="move-label">' + label + '</span>' +
      '<span class="move-eval">' + evalStr + '</span>' +
      '<span class="move-delta">Δ' + deltaStr + '</span>' +
      '<span class="move-quality">' + qualityBadge + '</span>';
    (function(idx) {
      row.addEventListener('click', function() { goToAnalysisMove(idx); });
    })(e.moveIdx);
    container.appendChild(row);
    moveNum++;
  }
}

function countPieces(board) {
  var n = 0;
  for (var r = 0; r < ROWS; r++)
    for (var c = 0; c < COLS; c++)
      if (board[r][c]) n++;
  return n;
}

function renderPostGameStats() {
  var eq = { red: { sum: 0, n: 0, mistakes: { '错':0,'漏':0,'败':0 }, phases: { opening: { sum: 0, n: 0 }, midgame: { sum: 0, n: 0 }, endgame: { sum: 0, n: 0 } } },
             black: { sum: 0, n: 0, mistakes: { '错':0,'漏':0,'败':0 }, phases: { opening: { sum: 0, n: 0 }, midgame: { sum: 0, n: 0 }, endgame: { sum: 0, n: 0 } } } };

  for (var i = 0; i < postGameEvals.length; i++) {
    var e = postGameEvals[i];
    if (!e || e.score === undefined) continue;
    var side = e.side === RED ? 'red' : 'black';
    eq[side].sum += e.score;
    eq[side].n++;
    if (e.quality === '错' || e.quality === '漏' || e.quality === '败')
      eq[side].mistakes[e.quality] = (eq[side].mistakes[e.quality] || 0) + 1;

    // 阶段判定：用棋子数
    var state = reconstructBoardState(i - 1);
    var pc = countPieces(state.board);
    var phase = pc >= 26 ? 'opening' : (pc >= 16 ? 'midgame' : 'endgame');
    eq[side].phases[phase].sum += e.score;
    eq[side].phases[phase].n++;
  }

  var sid = function(id) { return document.getElementById(id); };
  var red = eq.red, black = eq.black;
  var redScore = red.n > 0 ? Math.round(red.sum / red.n) : 0;
  var blackScore = black.n > 0 ? Math.round(black.sum / black.n) : 0;
  sid('sqRed').textContent = '红方 ' + redScore + '分';
  sid('sqBlack').textContent = '黑方 ' + blackScore + '分';

  // 阶段分
  var phaseHtml = '';
  var phaseNames = { opening:'开局', midgame:'中局', endgame:'残局' };
  for (var p in phaseNames) {
    var rp = red.phases[p], bp = black.phases[p];
    var rs = rp.n > 0 ? Math.round(rp.sum / rp.n) : null;
    var bs = bp.n > 0 ? Math.round(bp.sum / bp.n) : null;
    phaseHtml += '<div class="stats-phase"><span class="sp-label">' + phaseNames[p] + '</span>' +
      '<span class="sp-bar-wrap"><span class="sp-bar sp-red" style="width:' + (rs != null ? rs : 0) + '%"></span></span>' +
      '<span class="sp-val sp-red-val">' + (rs != null ? rs : '--') + '</span>' +
      '<span class="sp-bar-wrap"><span class="sp-bar sp-black" style="width:' + (bs != null ? bs : 0) + '%"></span></span>' +
      '<span class="sp-val sp-black-val">' + (bs != null ? bs : '--') + '</span></div>';
  }
  sid('statsPhases').innerHTML = phaseHtml;

  // 失误统计
  var errHtml = '';
  for (var s in { red:1, black:1 }) {
    var name = s === 'red' ? '红方' : '黑方';
    var m = eq[s].mistakes;
    var parts = [];
    if (m['错']) parts.push('错' + m['错']);
    if (m['漏']) parts.push('漏' + m['漏']);
    if (m['败']) parts.push('败' + m['败']);
    errHtml += '<span class="em-row">' + name + '失误: ' + (parts.length ? parts.join(' ') : '无') + '</span>';
  }
  sid('statsMistakes').innerHTML = errHtml;
  sid('postgameStats').style.display = 'block';

  // 开局识别
  var opening = identifyOpening(moveHistory);
  if (opening) {
    sid('openingName').textContent = opening.name;
    sid('openingStyle').textContent = opening.style;
    sid('openingDesc').textContent = opening.description;
    sid('openingInfo').style.display = 'flex';
  }
}

function renderPostGameAnalysis() {
  renderPostGameChart();
  renderMoveList();
  renderPostGameStats();
  goToAnalysisMove(0);
}
function startPostGameAnalysis() {
  if (!gameOver || moveHistory.length === 0 || isAnalysisRunning) return;

  var panel = document.getElementById('postgamePanel');
  if (!panel) { console.warn('[Analysis] 面板元素未找到'); return; }
  panel.style.display = 'block';
  var el = function(id) { return document.getElementById(id); };
  (el('postgameProgress') || {}).textContent = '加载中...';
  (el('postgameProgressText') || {}).textContent = '';
  (el('postgameMoveList') || {}).innerHTML = '';
  (el('postgameNavInfo') || {}).textContent = '';
  (el('postgameDetailScore') || {}).textContent = '';
  (el('postgameDetailSuggestion') || {}).textContent = '';
  (el('btnAnalyze') || {}).textContent = '停止分析';

  // 检查哪些位置已缓存
  var missing = [];
  for (var i = 0; i < moveHistory.length; i++) {
    if (i >= postGameEvals.length || postGameEvals[i] === undefined) {
      missing.push(i);
    }
  }

  if (missing.length === 0) {
    (el('postgameProgress') || {}).textContent = '分析完成';
    computeQualityScores();
    renderPostGameAnalysis();
    return;
  }

  // 补齐缺失位置（通常只有最后几步）
  isAnalysisRunning = true;
  (el('postgameProgress') || {}).textContent = '补齐分析... ';
  (el('postgameProgressText') || {}).textContent = '0/' + missing.length;

  initEngine().then(function() {
    fillMissingAnalyses(missing, 0, function() {
      isAnalysisRunning = false;
      (el('postgameProgress') || {}).textContent = '分析完成 ✓';
      (el('btnAnalyze') || {}).textContent = '赛后分析';
      computeQualityScores();
      renderPostGameAnalysis();
    });
  }).catch(function() {
    isAnalysisRunning = false;
    (el('postgameProgress') || {}).textContent = '引擎加载失败';
    (el('btnAnalyze') || {}).textContent = '赛后分析';
  });
}

function fillMissingAnalyses(missing, idx, onDone) {
  if (idx >= missing.length) { if (onDone) onDone(); return; }
  var mi = missing[idx];
  var el = function(id) { return document.getElementById(id); };
  (el('postgameProgressText') || {}).textContent = (idx + 1) + '/' + missing.length;

  var state = reconstructBoardState(mi - 1);
  var mover = moveHistory[mi].piece.color;
  var sideToMove = mover;

  analyzePosition(state.board, sideToMove, null, function(result) {
    if (result) {
      var cpBefore = result.scoreType === 'cp' ? result.score
        : (result.score > 0 ? Math.max(1000, 2000 / result.score) : -Math.max(1000, 2000 / Math.abs(result.score)));
      postGameEvals[mi] = {
        moveIdx: mi,
        side: mover,
        cpBefore: cpBefore,
        depth: result.depth || 0,
        pv: result.pv || '',
        score: 0,
        scoreType: result.scoreType,
        rawScore: result.score
      };
    } else {
      postGameEvals[mi] = null;
    }
    setTimeout(function() { fillMissingAnalyses(missing, idx + 1, onDone); }, 20);
  }, 3000);
}
function goToAnalysisMove(idx) {
  if (isAnalysisRunning && idx >= postGameEvals.length) return;
  if (isAnalysisRunning && postGameEvals[idx] === undefined) return;
  if (idx < -1 || idx >= moveHistory.length) return;

  analysisMoveIndex = idx;
  isPostGameAnalysis = idx >= 0;

  var rows = document.querySelectorAll('#postgameMoveList .postgame-move-row');
  for (var i = 0; i < rows.length; i++) {
    rows[i].classList.toggle('active', parseInt(rows[i].dataset.idx) === idx);
  }

  var navInfo = document.getElementById('postgameNavInfo');
  var detailScore = document.getElementById('postgameDetailScore');
  var detailSug = document.getElementById('postgameDetailSuggestion');

  if (idx === -1) {
    analysisHint = null;
    navInfo.textContent = '最终局面';
    detailScore.textContent = '';
    detailSug.textContent = '点击走法查看分析';
  } else {
    var e = postGameEvals[idx];
    if (e) {
      var redAdv = e.side === RED ? e.cp : -e.cp;
      var prevRedAdv = 0;
      for (var j = idx - 1; j >= 0; j--) {
        if (postGameEvals[j]) {
          prevRedAdv = postGameEvals[j].side === RED ? postGameEvals[j].cp : -postGameEvals[j].cp;
          break;
        }
      }
      var delta = redAdv - prevRedAdv;
      var num = Math.floor((idx + 2) / 2);
      var sideLabel = e.side === RED ? '红方' : '黑方';
      var advLabel = redAdv >= 0 ? '红方+' + (redAdv/100).toFixed(1) : '黑方+' + (-redAdv/100).toFixed(1);
      // 大势判断
      var advText = redAdv > 50 ? '红方优势' : (redAdv < -50 ? '黑方优势' : '均势');
      // 走棋质量
      var qualityLabel = { '优':'优招','良':'良招','中':'中招','差':'差招','劣':'劣招','错':'错招','漏':'漏招','败':'败招' };
      var quality = (qualityLabel[e.quality] || '优招');
      // 杀法提示
      var mateText = '';
      if (e.isMissedMate) mateText = ' ⚡漏杀! 连杀' + e.mateIn + '步';
      else if (e.isUnderMate) mateText = ' ⚠被连杀' + e.mateIn + '步';
      navInfo.textContent = '第' + (idx + 1) + '步 (' + sideLabel + ') ' + advText + ' ' + quality + mateText;
      detailScore.textContent = advLabel + ' | 变化' + (delta >= 0 ? '+' : '') + (delta/100).toFixed(1);
      // 在棋盘上标出 AI 推荐走法
      matePath = [];
      showMatePath = false;
      if (e.pv) {
        var pvMoves = e.pv.split(' ');
        // 杀法路径：PV 超过1步且是杀法，用箭头标注全路径
        if ((e.isMissedMate || e.isUnderMate) && pvMoves.length >= 2) {
          var isMover = true;
          var maxSteps = Math.min(pvMoves.length, 10);
          for (var pi = 0; pi < maxSteps; pi++) {
            var mv = pvMoves[pi];
            if (mv.length < 4) continue;
            var h = uciToMove(mv);
            matePath.push({
              fromR: h.fromR, fromC: h.fromC,
              toR: h.toR, toC: h.toC,
              step: pi + 1,
              isMoverMove: isMover
            });
            isMover = !isMover;
          }
          showMatePath = matePath.length > 0;
          analysisHint = null;
          var prefix = e.isMissedMate ? '⚡漏杀! 应走: ' : '⚠被连杀: ';
          detailSug.textContent = prefix + pvMoves.slice(0, 5).join(' → ');
        } else {
          var hint = uciToMove(pvMoves[0]);
          analysisHint = { fromR: hint.fromR, fromC: hint.fromC, toR: hint.toR, toC: hint.toC };
          detailSug.textContent = 'AI推荐: ' + pvMoves.slice(0, 3).join(' → ');
        }
      } else {
        analysisHint = null;
        detailSug.textContent = '';
      }
    } else {
      analysisHint = null;
      navInfo.textContent = '第' + (idx + 1) + '步';
      detailScore.textContent = '分析不可用';
      detailSug.textContent = '';
    }
  }

  render();
}
function goToAnalysisPrev() {
  var next = analysisMoveIndex - 1;
  if (next < -1) next = -1;
  goToAnalysisMove(next);
}
function goToAnalysisNext() {
  var next = analysisMoveIndex + 1;
  if (next >= moveHistory.length) next = moveHistory.length - 1;
  goToAnalysisMove(next);
}
function closePostGameAnalysis() {
  document.getElementById('postgamePanel').style.display = 'none';
  document.getElementById('btnAnalyze').textContent = '赛后分析';
  isPostGameAnalysis = false;
  analysisMoveIndex = -1;
  matePath = [];
  showMatePath = false;
  stopEngine();
  render();
}

// ============ 悔棋（人机模式撤回两步） ============
function undoMove() {
  if (gameOver || aiThinking || gameMode === 'online') return;
  var steps = (gameMode === 'ai') ? 2 : 1;
  for (var i = 0; i < steps && moveHistory.length > 0; i++) {
    doUndoOne();
  }
}

function doUndoOne() {
  if (moveHistory.length === 0) return;
  var last = moveHistory.pop();
  board[last.fromR][last.fromC] = last.piece;
  board[last.toR][last.toC] = last.captured;
  if (last.captured) { var arr = capturedPieces[last.captured.color]; arr.pop(); }
  currentTurn = last.piece.color;
  inCheck = isInCheck(currentTurn, board);
  document.getElementById('checkWarning').innerHTML = inCheck ? '<span class="check-icon"></span>将军！' : '';
  gameOver = false;
  document.getElementById('message').style.display = 'none';
  selectedPos = null; legalMoves = [];
  updateTurnIndicator(); render();
}

// ============ 自定义残局编辑器 ============

function enterEditor() {
  isEditing = true;
  board = [];
  for (var r = 0; r < ROWS; r++) { board[r] = []; for (var c = 0; c < COLS; c++) board[r][c] = null; }
  currentTurn = RED;
  selectedPos = null; legalMoves = []; moveHistory = [];
  capturedPieces = { [RED]: [], [BLACK]: [] };
  gameOver = false; inCheck = false; aiThinking = false;
  document.getElementById('checkWarning').innerHTML = '';
  document.getElementById('message').style.display = 'none';
  var vm = document.getElementById('victoryMessage'); vm.classList.remove('show'); vm.textContent = '';
  var overlay = document.getElementById('effectOverlay'); if (overlay) overlay.innerHTML = '';
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  redTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  blackTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  moveStartTime = null; lastTotalTimeSample = null;
  updateTimerDisplay();
  document.getElementById('turnIndicator').textContent = '编辑残局';
  document.getElementById('turnIndicator').className = 'turn-indicator editor';
  document.getElementById('editorPanel').style.display = 'flex';
  var infoEl = document.querySelector('.info-panel'); if (infoEl) infoEl.style.display = 'none';
  document.getElementById('timerRow').style.display = 'none';
  document.getElementById('controls').style.display = 'none';
  var modeEl = document.querySelector('.mode-selector'); if (modeEl) modeEl.style.display = 'none';
  document.getElementById('aiStatus').textContent = '';
  document.getElementById('redTimer').style.display = 'none';
  document.getElementById('blackTimer').style.display = 'none';
  editorPiece = { type: PIECE.GENERAL, color: RED };
  updateEditorPalette();
  render();
}
function editSelectPiece(type, color) {
  if (type === 'eraser') { editorPiece = null; }
  else { editorPiece = { type: editorTypeToNum(type), color: color === 'red' ? RED : BLACK }; }
  updateEditorPalette();
}

function editorTypeToNum(t) {
  var map = { general: PIECE.GENERAL, advisor: PIECE.ADVISOR, elephant: PIECE.ELEPHANT,
              horse: PIECE.HORSE, rook: PIECE.ROOK, cannon: PIECE.CANNON, pawn: PIECE.PAWN };
  return map[t] || PIECE.GENERAL;
}

function updateEditorPalette() {
  var btns = document.querySelectorAll('#editorPalette .editor-piece-btn');
  btns.forEach(function(b) {
    b.classList.remove('selected');
    if (!editorPiece && b.dataset.type === 'eraser') { b.classList.add('selected'); }
    else if (editorPiece && b.dataset.type !== 'eraser') {
      var c = b.dataset.color === 'red' ? RED : BLACK;
      var t = editorTypeToNum(b.dataset.type);
      if (c === editorPiece.color && t === editorPiece.type) { b.classList.add('selected'); }
    }
  });
}
function editPlacePiece(row, col) {
  if (!isEditing) return;
  if (editorPiece && editorPiece.type === PIECE.GENERAL) {
    var ok = false;
    if (editorPiece.color === RED && row >= 7 && row <= 9 && col >= 3 && col <= 5) ok = true;
    if (editorPiece.color === BLACK && row >= 0 && row <= 2 && col >= 3 && col <= 5) ok = true;
    if (!ok) return;
  }
  if (editorPiece) { board[row][col] = createPiece(editorPiece.type, editorPiece.color); }
  else { board[row][col] = null; }
  render();
}
function clearEditBoard() {
  if (!isEditing) return;
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) board[r][c] = null;
  render();
}
function confirmCustomGame() {
  if (!isEditing) return;
  // 验证：双方各至少有一个将/帅
  var hasRedGen = false, hasBlackGen = false;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var p = board[r][c];
      if (!p) continue;
      if (p.type === PIECE.GENERAL && p.color === RED) hasRedGen = true;
      if (p.type === PIECE.GENERAL && p.color === BLACK) hasBlackGen = true;
    }
  }
  if (!hasRedGen || !hasBlackGen) {
    alert('双方都必须有将/帅才能开始对弈！');
    return;
  }

  isEditing = false;
  gameMode = 'pvp'; // 残局默认双人对弈
  document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.mode === 'pvp'); });
  currentTurn = gameSettings.aiColor === 'red' ? RED : BLACK;
  inCheck = isInCheck(currentTurn, board);
  gameOver = false;
  selectedPos = null; legalMoves = [];
  moveHistory = [];
  capturedPieces = { [RED]: [], [BLACK]: [] };
  aiThinking = false;
  document.getElementById('checkWarning').innerHTML = '';
  document.getElementById('message').style.display = 'none';
  var vm = document.getElementById('victoryMessage'); vm.classList.remove('show'); vm.textContent = '';
  var overlay = document.getElementById('effectOverlay'); if (overlay) overlay.innerHTML = '';

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  redTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  blackTimeRemaining = gameSettings.totalTime ? gameSettings.totalTime * 1000 : null;
  moveStartTime = null; lastTotalTimeSample = null;
  updateTimerDisplay();
  startTimer();

  document.getElementById('editorPanel').style.display = 'none';
  var infoEl = document.querySelector('.info-panel'); if (infoEl) infoEl.style.display = '';
  document.getElementById('timerRow').style.display = '';
  document.getElementById('controls').style.display = '';
  var modeEl = document.querySelector('.mode-selector'); if (modeEl) modeEl.style.display = '';
  document.getElementById('redTimer').style.display = '';
  document.getElementById('blackTimer').style.display = '';
  updateTurnIndicator();
  render();
}

// ============ 联机对战回调注册 ============

function setupOnlineCallbacks() {
  onRoomCreated(async function(sdp) {
    // guard: SDP 过短说明 localDescription 可能为空
    if (!sdp || sdp.length < 20) {
      console.error('[roomCreated] SDP无效, 长度=' + (sdp ? sdp.length : 0));
      if (_callbacks.error) _callbacks.error('SDP生成失败，请重试');
      return;
    }
    onlineColor = getMyColor() === 'red' ? RED : BLACK;
    var el = document.getElementById('sdpOutputText');
    var compressed = await compressSDP(sdp);
    if (el) el.value = compressed;
    document.getElementById('sdpOutput').style.display = 'flex';
    document.getElementById('sdpInput').style.display = onlineColor === RED ? 'flex' : 'none';
    document.getElementById('sdpPanel').style.display = 'flex';
    if (window._onQRUpdateSDP) window._onQRUpdateSDP(sdp);
    if (onlineColor === RED) {
      document.getElementById('sdpHint').textContent = '①复制连接码发给对手 ②将对手回复的码粘贴到下方 ③点确认';
      document.getElementById('sdpRoleLabel').textContent = '红方（先手）';
    } else {
      document.getElementById('sdpHint').textContent = '①复制连接码发给对手 ②等待连接...';
      document.getElementById('sdpRoleLabel').textContent = '黑方（后手）';
    }
  });

  onGameStart(function(data) {
    onlineColor = data.color === 'red' ? RED : BLACK;
    onlineReady = true;
    document.getElementById('onlinePanel').style.display = 'none';
    document.getElementById('onlineStatusBar').style.display = 'flex';
    document.getElementById('onlineBarColor').textContent = onlineColor === RED ? '红' : '黑';
    newGame();
    var text = onlineColor === RED ? '游戏开始，你执红先手' : '游戏开始，你执黑后手';
    showMessage(text);
    setTimeout(function() { document.getElementById('message').style.display = 'none'; }, 2000);
  });

  onOpponentMove(function(move) {
    if (gameOver || !onlineReady) return;
    makeMove(move.fromR, move.fromC, move.toR, move.toC);
  });

  onOpponentResigned(function() {
    if (gameOver) return;
    gameOver = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    var winner = onlineColor === RED ? '红方' : '黑方';
    showVictoryMessage('对手认输！' + winner + '获胜');
    updateTurnIndicator();
    render();
  });

  onOpponentDisconnected(function() {
    if (gameOver) return;
    onlineReady = false;
    showMessage('对手断开连接');
    gameOver = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updateTurnIndicator();
    render();
  });

  onIceFailed(function() {
    if (gameOver) return;
    showMessage('P2P连接失败：无法到达对方设备。请确保双方在同一WiFi/热点网络下');
    onlineReady = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updateTurnIndicator();
    render();
  });

  onError(function(msg) {
    var el = document.getElementById('sdpError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  });
}

// ============ 联机对战公开 API（SDP 粘贴模式）============
function hostOnlineSession() {
  hostSession(null);
}
async function acceptOnlineOffer(sdp) {
  var norm = await normalizeSDP(sdp);
  acceptOffer(norm, null);
}
async function joinOnlineSession(sdp) {
  var norm = await normalizeSDP(sdp);
  connectGuest(norm);
}
function resignOnline() {
  if (gameOver || !onlineReady) return;
  sendResign();
  gameOver = true;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  var loser = onlineColor === RED ? '红方' : '黑方';
  var winner = onlineColor === RED ? '黑方' : '红方';
  showVictoryMessage(loser + '认输！' + winner + '获胜');
  updateTurnIndicator();
  render();
}
function leaveOnlineRoom() {
  disconnect();
  onlineReady = false;
  onlineColor = null;
  document.getElementById('onlinePanel').style.display = 'flex';
  document.getElementById('onlineStatusBar').style.display = 'none';
  document.getElementById('sdpPanel').style.display = 'flex';
  document.getElementById('sdpOutput').style.display = 'none';
  document.getElementById('sdpInput').style.display = 'none';
  document.getElementById('sdpError').style.display = 'none';
  newGame();
}
function getOnlineReady() { return onlineReady; }
function getOnlineColor() { return onlineColor; }

// ============ UI 辅助 ============
function showMessage(msg) {
  var el = document.getElementById('message');
  el.textContent = msg; el.style.display = 'block';
}

function showVictoryMessage(msg) {
  var el = document.getElementById('victoryMessage');
  el.textContent = msg;
  el.classList.remove('show');
  setTimeout(function() { el.classList.add('show'); }, 50);
}

function updateTurnIndicator() {
  var el = document.getElementById('turnIndicator');
  var turn = currentTurn;
  if (isPostGameAnalysis) {
    var state = reconstructBoardState(analysisMoveIndex);
    turn = state.currentTurn;
  }
  var color = turn === RED ? 'red' : 'black';
  var text = turn === RED ? '红方走棋' : '黑方走棋';
  if (isPostGameAnalysis) text = '复盘: ' + text;
  else if (aiThinking) text += ' (AI思考中...)';
  el.textContent = text;
  el.className = 'turn-indicator ' + color;
}

// ============ 渲染 ============
function render() {
  // 赛后分析模式：重建历史局面
  var renderBoard = board;
  var renderTurn = currentTurn;
  var renderLastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
  var renderInCheck = inCheck;
  if (isPostGameAnalysis) {
    var state = reconstructBoardState(analysisMoveIndex);
    renderBoard = state.board;
    renderTurn = state.currentTurn;
    renderLastMove = analysisMoveIndex >= 0 && analysisMoveIndex < moveHistory.length ? moveHistory[analysisMoveIndex] : null;
    renderInCheck = isInCheck(renderTurn, renderBoard);
  }

  var boardEl = document.getElementById('board');
  var cells = boardEl.querySelectorAll('.cell');
  for (var i = 0; i < cells.length; i++) cells[i].remove();

  for (var row = 0; row < ROWS; row++) {
    for (var col = 0; col < COLS; col++) {
      var cell = document.createElement('div');
      cell.className = 'cell' + (isEditing ? ' editing' : '');
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (renderLastMove && ((row === renderLastMove.fromR && col === renderLastMove.fromC) || (row === renderLastMove.toR && col === renderLastMove.toC)))
        cell.classList.add('last-move');

      var piece = renderBoard[row][col];
      if (piece) {
        var pieceEl = document.createElement('div');
        pieceEl.className = 'piece ' + (piece.color === RED ? 'red' : 'black');
        pieceEl.textContent = PIECE_NAMES[piece.color][piece.type];
        if (selectedPos && row === selectedPos.row && col === selectedPos.col)
          pieceEl.classList.add('selected');
        // 将军高亮：对当前走棋方被将军的将/帅加红色脉冲
        if (renderInCheck && piece.type === PIECE.GENERAL && piece.color === renderTurn)
          pieceEl.classList.add('in-check');
        // 绝杀高亮（复盘时只在最终局面显示）
        if (gameOver && piece.type === PIECE.GENERAL && piece.color === renderTurn &&
            (!isPostGameAnalysis || analysisMoveIndex >= moveHistory.length - 1))
          pieceEl.classList.add('checkmated');
        // AI 分析：标记推荐走法的起点棋子
        if (analysisHint && row === analysisHint.fromR && col === analysisHint.fromC) {
          pieceEl.classList.add('analysis-from');
        }
        (function (r, c) {
          pieceEl.addEventListener('click', function (e) { e.stopPropagation(); onPieceClick(r, c); });
        })(row, col);
        cell.appendChild(pieceEl);
      }

      // AI 分析：起点格蓝色圆圈标记
      if (analysisHint && row === analysisHint.fromR && col === analysisHint.fromC) {
        var fromCircle = document.createElement('div');
        fromCircle.className = 'analysis-circle';
        cell.appendChild(fromCircle);
      }

      // 合法走法标记
      for (var j = 0; j < legalMoves.length; j++) {
        if (legalMoves[j].row === row && legalMoves[j].col === col) {
          if (board[row][col]) {
            var cap = document.createElement('div');
            cap.className = 'legal-capture'; cell.appendChild(cap);
          } else {
            var dot = document.createElement('div');
            dot.className = 'legal-move'; cell.appendChild(dot);
          }
          cell.style.cursor = 'pointer';
        }
      }

      // AI 分析：标记推荐走法的目标位置
      if (analysisHint && row === analysisHint.toR && col === analysisHint.toC) {
        var hintDot = document.createElement('div');
        hintDot.className = 'analysis-to';
        cell.appendChild(hintDot);
      }

      (function (r, c) {
        cell.addEventListener('click', function () { onCellClick(r, c); });
      })(row, col);
      boardEl.appendChild(cell);
    }
  }

  if (isPostGameAnalysis && analysisMoveIndex >= 0) {
    // 统计截至当前步的失子
    var capRed = [], capBlack = [];
    for (var ci = 0; ci <= analysisMoveIndex && ci < moveHistory.length; ci++) {
      var cap = moveHistory[ci].captured;
      if (cap) {
        if (cap.color === RED) capRed.push(cap);
        else capBlack.push(cap);
      }
    }
    document.getElementById('capturedBlack').innerHTML = '黑方失子：' +
      capBlack.map(function (p) { return PIECE_NAMES[RED][p.type]; }).join(' ');
    document.getElementById('capturedRed').innerHTML = '红方失子：' +
      capRed.map(function (p) { return PIECE_NAMES[BLACK][p.type]; }).join(' ');
  } else {
    document.getElementById('capturedBlack').innerHTML = '黑方失子：' +
      capturedPieces[BLACK].map(function (p) { return PIECE_NAMES[RED][p.type]; }).join(' ');
    document.getElementById('capturedRed').innerHTML = '红方失子：' +
      capturedPieces[RED].map(function (p) { return PIECE_NAMES[BLACK][p.type]; }).join(' ');
  }

  drawBoardLines();
  if (showMatePath && isPostGameAnalysis) drawMatePath();
  updateButtonStates();
}

function updateButtonStates() {
  var btnUndo = document.getElementById('btnUndo');
  btnUndo.disabled = gameOver || aiThinking || moveHistory.length === 0;
}

// ============ Canvas 棋盘线条绘制 ============
function drawBoardLines() {
  var boardEl = document.getElementById('board');
  var canvas = boardEl.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    boardEl.appendChild(canvas);
  }
  var rect = boardEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var w = rect.width, h = rect.height;
  var cellW = w / 9, cellH = h / 10;
  var ox = cellW / 2, oy = cellH / 2;

  var theme = THEMES[currentTheme] || THEMES.classic;
  ctx.clearRect(0, 0, w, h);

    // 底色
  ctx.fillStyle = theme.boardBg;
  ctx.fillRect(0, 0, w, h);

  // 光照
  var lightGrad = ctx.createRadialGradient(w * 0.45, h * 0.45, w * 0.05, w * 0.5, h * 0.5, w * 0.8);
  lightGrad.addColorStop(0, 'rgba(255,255,240,0.06)');
  lightGrad.addColorStop(0.4, 'rgba(255,255,240,0.02)');
  lightGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, w, h);

  // 外框
  ctx.strokeStyle = theme.boardLine;
  ctx.lineWidth = w * 0.018;
  ctx.globalAlpha = 0.9;
  ctx.strokeRect(ox, oy, w - cellW, h - cellH);

  // 格线
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.55;
  for (var r = 0; r < 10; r++) {
    var y = oy + r * cellH;
    ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(w - ox, y); ctx.stroke();
  }
  for (var c = 0; c < 9; c++) {
    var x = ox + c * cellW;
    if (c === 0 || c === 8) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + 9 * cellH); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + 4 * cellH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, oy + 5 * cellH); ctx.lineTo(x, oy + 9 * cellH); ctx.stroke();
    }
  }

  // 九宫格对角线
  ctx.lineWidth = 1.1;
  function drawPalace(topR) {
    var y1 = oy + topR * cellH, y2 = oy + (topR + 2) * cellH;
    var x1 = ox + 3 * cellW, x2 = ox + 5 * cellW;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y1); ctx.lineTo(x1, y2); ctx.stroke();
  }
  drawPalace(0);
  drawPalace(7);
  ctx.globalAlpha = 1;
}

// ============ 杀法路径箭头绘制 ============
function drawMatePath() {
  if (!showMatePath || matePath.length === 0) return;
  var boardEl = document.getElementById('board');
  var canvas = boardEl.querySelector('canvas');
  if (!canvas) return;
  var rect = boardEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  var w = rect.width, h = rect.height;
  var cellW = w / 9, cellH = h / 10;
  var ox = cellW / 2, oy = cellH / 2;
  var dpr = window.devicePixelRatio || 1;
  var ctx = canvas.getContext('2d');

  for (var i = 0; i < matePath.length; i++) {
    var step = matePath[i];
    var x1 = ox + step.fromC * cellW;
    var y1 = oy + step.fromR * cellH;
    var x2 = ox + step.toC * cellW;
    var y2 = oy + step.toR * cellH;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var color = step.isMoverMove ? '#4caf50' : '#ff7043';
    var alpha = 1 - (i / matePath.length) * 0.35;

    // 箭头线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 箭头尖端
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var headLen = 10;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    // 步数圆圈
    var circleR = 11;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.arc(x1, y1, circleR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.fillText(step.step, x1, y1);

    ctx.restore();
  }
}


// ============ UI Event Bindings ============
