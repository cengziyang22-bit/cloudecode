// checkmate.js — 绝杀类型检测
'use strict';

import { ROWS, COLS, RED, BLACK, PIECE, opponent, findGeneral, getRawMoves, isInCheck } from './board.js';

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
export function detectCheckmateType(board, lastMove, moveHistory) {
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

function isRed(color) {
  return color === RED;
}
